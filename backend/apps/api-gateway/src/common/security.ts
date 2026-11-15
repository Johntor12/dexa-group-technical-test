import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { RpcClients } from '../../../../libs/common/src/rpc.js';
import { fail } from '../../../../libs/common/src/errors.js';
import type {
  Principal,
  Role,
} from '../../../../libs/contracts/src/contracts.js';
export interface ApiRequest extends Request {
  principal: Principal;
  token: string;
  requestId: string;
}
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly rpc: RpcClients,
    private readonly reflector: Reflector,
  ) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<ApiRequest>();
    const match = /^Bearer (\S+)$/.exec(req.headers.authorization ?? '');
    if (!match) fail(401, 'UNAUTHORIZED', 'Authentication required.');
    req.token = match[1];
    req.principal = await this.rpc.call(
      'employee',
      'auth.identity',
      {},
      req.token,
      req.requestId,
    );
    const roles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (roles && !roles.includes(req.principal.role))
      fail(403, 'FORBIDDEN', 'You do not have permission for this operation.');
    return true;
  }
}

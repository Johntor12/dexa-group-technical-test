import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RpcClients } from '../../../../libs/common/src/rpc.js';
import { secret } from '../../../../libs/common/src/config.js';
import type { LoginDto } from '../../../../libs/contracts/src/dto.js';
import type { Principal } from '../../../../libs/contracts/src/contracts.js';
@Injectable()
export class AuthService {
  private readonly jwt = new JwtService({
    secret: secret('JWT_SECRET'),
    signOptions: {
      algorithm: 'HS256',
      issuer: 'pharmawork',
      audience: 'pharmawork-web',
      expiresIn: '1h',
    },
  });
  constructor(private readonly rpc: RpcClients) {}
  async login(dto: LoginDto, requestId: string) {
    const result = await this.rpc.call<{
      sessionId: string;
      userId: string;
      expiresAt: string;
      user: Principal;
    }>('employee', 'auth.login', dto, undefined, requestId);
    return {
      accessToken: await this.jwt.signAsync({
        sub: result.userId,
        sid: result.sessionId,
      }),
      expiresAt: result.expiresAt,
      user: result.user,
    };
  }
}

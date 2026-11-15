import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AttendanceService } from './attendance.service.js';
import { RpcClients, verifyEnvelope } from '../../../../libs/common/src/rpc.js';
import { Database } from '../../../../libs/common/src/database.js';
import { rpcResult } from '../../../../libs/common/src/errors.js';
import { validated } from '../../../../libs/common/src/validation.js';
import {
  ListDto,
  SubmitDto,
  IdDto,
} from '../../../../libs/contracts/src/dto.js';
import { patterns as P } from '../../../../libs/contracts/src/contracts.js';
import type {
  Envelope,
  Principal,
} from '../../../../libs/contracts/src/contracts.js';
@Controller()
export class AttendanceMessageController {
  constructor(
    private readonly attendance: AttendanceService,
    private readonly rpc: RpcClients,
    private readonly db: Database,
  ) {}
  private async principal(e: Envelope) {
    verifyEnvelope(e);
    return this.rpc.call<Principal>(
      'employee',
      P.identity,
      {},
      e.token,
      e.requestId,
    );
  }
  @MessagePattern(P.submit) submit(@Payload() e: Envelope) {
    return rpcResult(async () =>
      this.attendance.submit(
        await this.principal(e),
        validated(SubmitDto, e.data),
      ),
    );
  }
  @MessagePattern(P.list) list(@Payload() e: Envelope) {
    return rpcResult(async () =>
      this.attendance.list(
        await this.principal(e),
        validated(ListDto, e.data),
        false,
      ),
    );
  }
  @MessagePattern(P.mine) mine(@Payload() e: Envelope) {
    return rpcResult(async () =>
      this.attendance.list(
        await this.principal(e),
        validated(ListDto, e.data),
        true,
      ),
    );
  }
  @MessagePattern(P.today) today(@Payload() e: Envelope) {
    return rpcResult(async () =>
      this.attendance.today(await this.principal(e)),
    );
  }
  @MessagePattern(P.attendance) detail(@Payload() e: Envelope) {
    return rpcResult(async () =>
      this.attendance.detail(
        await this.principal(e),
        validated(IdDto, e.data).id,
      ),
    );
  }
  @MessagePattern(P.evidence) evidence(@Payload() e: Envelope) {
    return rpcResult(async () =>
      this.attendance.evidence(
        await this.principal(e),
        validated(IdDto, e.data).id,
      ),
    );
  }
  @MessagePattern(P.health) health(@Payload() e: Envelope) {
    return rpcResult(async () => {
      verifyEnvelope(e);
      await this.db.client.$queryRaw`SELECT 1`;
      return { status: 'ok', service: 'attendance' };
    });
  }
}

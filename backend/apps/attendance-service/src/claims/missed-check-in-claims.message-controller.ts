import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { MissedCheckInClaimsService } from './missed-check-in-claims.service.js';
import { RpcClients, verifyEnvelope } from '../../../../libs/common/src/rpc.js';
import { rpcResult } from '../../../../libs/common/src/errors.js';
import { validated } from '../../../../libs/common/src/validation.js';
import {
  IdDto,
  ListDto,
  MissedCheckInClaimDecisionDto,
  MissedCheckInClaimDto,
  MissedCheckInClaimQueueDto,
  MissedCheckInClaimRejectDto,
} from '../../../../libs/contracts/src/dto.js';
import {
  patterns as P,
  type Envelope,
  type Principal,
} from '../../../../libs/contracts/src/contracts.js';

@Controller()
export class MissedCheckInClaimsMessageController {
  constructor(
    private readonly service: MissedCheckInClaimsService,
    private readonly rpc: RpcClients,
  ) {}

  private async principal(envelope: Envelope) {
    verifyEnvelope(envelope);
    return this.rpc.call<Principal>(
      'employee',
      P.identity,
      {},
      envelope.token,
      envelope.requestId,
    );
  }

  @MessagePattern(P.missedCheckInCreate)
  create(@Payload() envelope: Envelope) {
    return rpcResult(async () =>
      this.service.create(
        await this.principal(envelope),
        validated(MissedCheckInClaimDto, envelope.data),
      ),
    );
  }

  @MessagePattern(P.missedCheckInMine)
  mine(@Payload() envelope: Envelope) {
    return rpcResult(async () =>
      this.service.mine(
        await this.principal(envelope),
        validated(ListDto, envelope.data),
      ),
    );
  }

  @MessagePattern(P.missedCheckInPending)
  pending(@Payload() envelope: Envelope) {
    return rpcResult(async () =>
      this.service.pending(
        await this.principal(envelope),
        validated(MissedCheckInClaimQueueDto, envelope.data),
      ),
    );
  }

  @MessagePattern(P.missedCheckInApprove)
  approve(@Payload() envelope: Envelope) {
    return rpcResult(async () => {
      const principal = await this.principal(envelope);
      const data = envelope.data as { id: string; note?: string };
      return this.service.decide(
        principal,
        validated(IdDto, { id: data.id }).id,
        'APPROVED',
        validated(MissedCheckInClaimDecisionDto, { note: data.note }).note,
      );
    });
  }

  @MessagePattern(P.missedCheckInReject)
  reject(@Payload() envelope: Envelope) {
    return rpcResult(async () => {
      const principal = await this.principal(envelope);
      const data = envelope.data as { id: string; reason: string };
      return this.service.decide(
        principal,
        validated(IdDto, { id: data.id }).id,
        'REJECTED',
        validated(MissedCheckInClaimRejectDto, { reason: data.reason }).reason,
      );
    });
  }
}

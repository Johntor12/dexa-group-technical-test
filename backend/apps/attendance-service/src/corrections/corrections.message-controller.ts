import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CorrectionsService } from './corrections.service.js';
import { RpcClients, verifyEnvelope } from '../../../../libs/common/src/rpc.js';
import { rpcResult } from '../../../../libs/common/src/errors.js';
import { validated } from '../../../../libs/common/src/validation.js';
import {
  CorrectionCreateDto,
  CorrectionDecisionDto,
  CorrectionRejectDto,
  CorrectionInboxDto,
  IdDto,
  ListDto,
  MissedCheckInClaimDto,
} from '../../../../libs/contracts/src/dto.js';
import {
  patterns as P,
  type Envelope,
  type Principal,
} from '../../../../libs/contracts/src/contracts.js';
@Controller()
export class CorrectionsMessageController {
  constructor(
    private readonly service: CorrectionsService,
    private readonly rpc: RpcClients,
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
  @MessagePattern(P.correctionEligible) days(@Payload() e: Envelope) {
    return rpcResult(async () => this.service.days(await this.principal(e)));
  }
  @MessagePattern(P.correctionCreate) create(@Payload() e: Envelope) {
    return rpcResult(async () =>
      this.service.create(
        await this.principal(e),
        validated(CorrectionCreateDto, e.data),
      ),
    );
  }
  @MessagePattern(P.correctionMine) mine(@Payload() e: Envelope) {
    return rpcResult(async () =>
      this.service.mine(await this.principal(e), validated(ListDto, e.data)),
    );
  }
  @MessagePattern(P.correctionDetail) detail(@Payload() e: Envelope) {
    return rpcResult(async () =>
      this.service.detail(await this.principal(e), validated(IdDto, e.data).id),
    );
  }
  @MessagePattern(P.correctionPending) pending(@Payload() e: Envelope) {
    return rpcResult(async () =>
      this.service.pending(
        await this.principal(e),
        validated(CorrectionInboxDto, e.data),
      ),
    );
  }
  @MessagePattern(P.correctionCancel) cancel(@Payload() e: Envelope) {
    return rpcResult(async () =>
      this.service.cancel(await this.principal(e), validated(IdDto, e.data).id),
    );
  }
  @MessagePattern(P.correctionApprove) approve(@Payload() e: Envelope) {
    return rpcResult(async () => {
      const p = await this.principal(e);
      const d = e.data as { id: string; note?: string };
      return this.service.decide(
        p,
        validated(IdDto, { id: d.id }).id,
        'APPROVED',
        validated(CorrectionDecisionDto, { note: d.note }).note,
      );
    });
  }
  @MessagePattern(P.correctionReject) reject(@Payload() e: Envelope) {
    return rpcResult(async () => {
      const p = await this.principal(e);
      const d = e.data as { id: string; reason: string };
      return this.service.decide(
        p,
        validated(IdDto, { id: d.id }).id,
        'REJECTED',
        validated(CorrectionRejectDto, { reason: d.reason }).reason,
      );
    });
  }
  @MessagePattern(P.correctionEvidence) evidence(@Payload() e: Envelope) {
    return rpcResult(async () => {
      const p = await this.principal(e);
      const d = e.data as { id: string; evidenceId: string };
      return this.service.evidence(
        p,
        validated(IdDto, { id: d.id }).id,
        validated(IdDto, { id: d.evidenceId }).id,
      );
    });
  }
  @MessagePattern(P.missedCheckInCreate) createMissedCheckIn(@Payload() e: Envelope) {
    return rpcResult(async () => this.service.createMissedCheckIn(await this.principal(e), validated(MissedCheckInClaimDto, e.data)));
  }
  @MessagePattern(P.missedCheckInMine) missedCheckInMine(@Payload() e: Envelope) {
    return rpcResult(async () => this.service.missedCheckInMine(await this.principal(e), validated(ListDto, e.data)));
  }
  @MessagePattern(P.missedCheckInPending) missedCheckInPending(@Payload() e: Envelope) {
    return rpcResult(async () => this.service.missedCheckInPending(await this.principal(e), validated(CorrectionInboxDto, e.data)));
  }
  @MessagePattern(P.missedCheckInApprove) approveMissedCheckIn(@Payload() e: Envelope) {
    return rpcResult(async () => {
      const p = await this.principal(e);
      const d = e.data as { id: string; note?: string };
      return this.service.decideMissedCheckIn(p, validated(IdDto, { id: d.id }).id, 'APPROVED', validated(CorrectionDecisionDto, { note: d.note }).note);
    });
  }
  @MessagePattern(P.missedCheckInReject) rejectMissedCheckIn(@Payload() e: Envelope) {
    return rpcResult(async () => {
      const p = await this.principal(e);
      const d = e.data as { id: string; reason: string };
      return this.service.decideMissedCheckIn(p, validated(IdDto, { id: d.id }).id, 'REJECTED', validated(CorrectionRejectDto, { reason: d.reason }).reason);
    });
  }
}

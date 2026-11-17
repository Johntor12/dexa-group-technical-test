import {
  Body,
  Controller,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiHeader, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { RpcClients } from '../../../../libs/common/src/rpc.js';
import { PhotoStorage } from '../../../../libs/common/src/storage.js';
import { DomainError } from '../../../../libs/common/src/errors.js';
import { fail } from '../../../../libs/common/src/errors.js';
import {
  ListDto,
  MissedCheckInClaimDecisionDto,
  MissedCheckInClaimDto,
  MissedCheckInClaimFieldsDto,
  MissedCheckInClaimQueueDto,
  MissedCheckInClaimRejectDto,
} from '../../../../libs/contracts/src/dto.js';
import { patterns as P } from '../../../../libs/contracts/src/contracts.js';
import { AuthGuard, Roles, type ApiRequest } from '../common/security.js';

@ApiTags('Attendance Claims')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('attendance-claims')
export class AttendanceClaimsController {
  constructor(
    private readonly rpc: RpcClients,
    private readonly storage: PhotoStorage,
  ) {}

  @Post()
  @Roles('EMPLOYEE')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['workDate', 'claimedCheckInTime', 'claimedCheckOutTime', 'reason', 'truthConfirmed', 'evidence'],
      properties: {
        workDate: { type: 'string', format: 'date' },
        claimedCheckInTime: { type: 'string', example: '09:00' },
        claimedCheckOutTime: { type: 'string', example: '17:00' },
        reason: { type: 'string', maxLength: 1000 },
        truthConfirmed: { type: 'boolean' },
        evidence: { type: 'string', format: 'binary', description: 'JPEG, PNG, WebP, or PDF; maximum 5 MiB.' },
      },
    },
  })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @UseInterceptors(FileInterceptor('evidence', {
    storage: memoryStorage(),
    limits: { fileSize: 5242880, files: 1, fields: 5, parts: 6 },
  }))
  async create(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: MissedCheckInClaimFieldsDto,
    @Req() request: ApiRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const key = request.headers['idempotency-key'];
    if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(key))
      fail(400, 'INVALID_IDEMPOTENCY_KEY', 'Provide a valid Idempotency-Key header.');
    if (!file) fail(400, 'CLAIM_EVIDENCE_REQUIRED', 'Attach a photo or PDF as claim evidence.');
    const evidence = await this.storage.stageClaimEvidence(file.buffer, file.mimetype);
    try {
      const result = await this.rpc.call<{ claim: unknown; replayed: boolean }>(
        'attendance',
        P.missedCheckInCreate,
        { ...body, key, evidence } satisfies MissedCheckInClaimDto,
        request.token,
        request.requestId,
      );
      if (result.replayed) await this.storage.remove(evidence.storageKey);
      response.status(result.replayed ? 200 : 201);
      return result.claim;
    } catch (error) {
      if (error instanceof DomainError && error.statusCode < 500)
        await this.storage.remove(evidence.storageKey);
      throw error;
    }
  }

  @Get('me')
  @Roles('EMPLOYEE')
  mine(@Query() query: ListDto, @Req() request: ApiRequest) {
    return this.rpc.call('attendance', P.missedCheckInMine, query, request.token, request.requestId);
  }

  @Get('pending')
  pending(@Query() query: MissedCheckInClaimQueueDto, @Req() request: ApiRequest) {
    return this.rpc.call('attendance', P.missedCheckInPending, query, request.token, request.requestId);
  }

  @Get(':id/evidence')
  async evidence(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: ApiRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const metadata = await this.rpc.call<{ storageKey: string; mimeType: string; size: number }>(
      'attendance',
      P.missedCheckInEvidence,
      { id },
      request.token,
      request.requestId,
    );
    const bytes = await this.storage.read(metadata.storageKey);
    const extension = metadata.mimeType === 'application/pdf' ? 'pdf' : metadata.mimeType.split('/')[1];
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Disposition', 'inline; filename="claim-evidence.' + extension + '"');
    return new StreamableFile(bytes, { type: metadata.mimeType, length: metadata.size });
  }

  @Post(':id/approve')
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: MissedCheckInClaimDecisionDto,
    @Req() request: ApiRequest,
  ) {
    return this.rpc.call('attendance', P.missedCheckInApprove, { id, ...body }, request.token, request.requestId);
  }

  @Post(':id/reject')
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: MissedCheckInClaimRejectDto,
    @Req() request: ApiRequest,
  ) {
    return this.rpc.call('attendance', P.missedCheckInReject, { id, ...body }, request.token, request.requestId);
  }
}

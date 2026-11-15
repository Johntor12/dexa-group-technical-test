import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiHeader, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { open } from 'node:fs/promises';
import type { Response } from 'express';
import { RpcClients } from '../../../../libs/common/src/rpc.js';
import { PhotoStorage } from '../../../../libs/common/src/storage.js';
import { DomainError, fail } from '../../../../libs/common/src/errors.js';
import { CorrectionDecisionDto, CorrectionRejectDto, CorrectionInboxDto, ListDto } from '../../../../libs/contracts/src/dto.js';
import { patterns as P } from '../../../../libs/contracts/src/contracts.js';
import { AuthGuard, Roles, type ApiRequest } from '../common/security.js';
@ApiTags('Attendance Corrections')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('attendance-corrections')
export class AttendanceCorrectionsController {
  constructor(private readonly rpc: RpcClients, private readonly storage: PhotoStorage) {}
  @Get('eligible-days') @Roles('EMPLOYEE') days(@Req() r: ApiRequest) { return this.rpc.call('attendance', P.correctionEligible, {}, r.token, r.requestId); }
  @Post() @Roles('EMPLOYEE')
  @ApiConsumes('multipart/form-data')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiBody({ schema: { type: 'object', required: ['workDate', 'reason', 'evidence'], properties: { workDate: { type: 'string', format: 'date' }, reason: { type: 'string', minLength: 20, maxLength: 1000 }, evidence: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('evidence', { storage: memoryStorage(), limits: { fileSize: 5242880, files: 1, fields: 2, parts: 3 } }))
  async create(@UploadedFile() evidence: Express.Multer.File, @Body() body: { workDate: string; reason: string }, @Req() r: ApiRequest, @Res({ passthrough: true }) res: Response) {
    if (!evidence) fail(400, 'INVALID_CORRECTION_EVIDENCE', 'Supporting photo is required.');
    const key = r.headers['idempotency-key'];
    if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(key)) fail(400, 'INVALID_IDEMPOTENCY_KEY', 'Provide a valid Idempotency-Key header.');
    const staged = await this.storage.stage(evidence.buffer, evidence.mimetype);
    try {
      const result = await this.rpc.call<{ record: unknown; replayed: boolean }>('attendance', P.correctionCreate, { ...staged, ...body, key }, r.token, r.requestId);
      if (result.replayed) await this.storage.remove(staged.storageKey);
      res.status(result.replayed ? 200 : 201);
      return result.record;
    } catch (error) {
      if (error instanceof DomainError && error.statusCode < 500) await this.storage.remove(staged.storageKey);
      throw error;
    }
  }
  @Get('me') @Roles('EMPLOYEE') mine(@Query() q: ListDto, @Req() r: ApiRequest) { return this.rpc.call('attendance', P.correctionMine, q, r.token, r.requestId); }
  @Get('pending') pending(@Query() q: CorrectionInboxDto, @Req() r: ApiRequest) { return this.rpc.call('attendance', P.correctionPending, q, r.token, r.requestId); }
  @Get(':id') detail(@Param('id', ParseUUIDPipe) id: string, @Req() r: ApiRequest) { return this.rpc.call('attendance', P.correctionDetail, { id }, r.token, r.requestId); }
  @Post(':id/cancel') @Roles('EMPLOYEE') cancel(@Param('id', ParseUUIDPipe) id: string, @Req() r: ApiRequest) { return this.rpc.call('attendance', P.correctionCancel, { id }, r.token, r.requestId); }
  @Post(':id/approve') approve(@Param('id', ParseUUIDPipe) id: string, @Body() body: CorrectionDecisionDto, @Req() r: ApiRequest) { return this.rpc.call('attendance', P.correctionApprove, { id, ...body }, r.token, r.requestId); }
  @Post(':id/reject') reject(@Param('id', ParseUUIDPipe) id: string, @Body() body: CorrectionRejectDto, @Req() r: ApiRequest) { return this.rpc.call('attendance', P.correctionReject, { id, ...body }, r.token, r.requestId); }
  @Get(':id/evidence/:evidenceId') async evidence(@Param('id', ParseUUIDPipe) id: string, @Param('evidenceId', ParseUUIDPipe) evidenceId: string, @Req() r: ApiRequest, @Res({ passthrough: true }) res: Response) {
    const meta = await this.rpc.call<{ storageKey: string; mimeType: string; size: number }>('attendance', P.correctionEvidence, { id, evidenceId }, r.token, r.requestId);
    const handle = await open(this.storage.path(meta.storageKey), 'r').catch(() => fail(404, 'CORRECTION_NOT_FOUND', 'Evidence file not found.'));
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Content-Disposition', 'inline');
    return new StreamableFile(handle.createReadStream(), { type: meta.mimeType, length: meta.size });
  }
}

import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  ParseUUIDPipe,
  StreamableFile,
  Body,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiTags,
  ApiConsumes,
  ApiBody,
  ApiHeader,
  ApiResponse,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { AttendanceCaptureMetadataDto, CheckOutDto, CheckOutMetadataDto, ListDto } from '../../../../libs/contracts/src/dto.js';
import { RpcClients } from '../../../../libs/common/src/rpc.js';
import { PhotoStorage } from '../../../../libs/common/src/storage.js';
import { captureFingerprint, removeStagedCaptures, stageAttendanceCapturePair } from '../../../../libs/common/src/attendance-capture.js';
import { AttendanceEvidenceKind } from '../../../../libs/contracts/src/attendance-evidence.js';
import { DomainError, fail } from '../../../../libs/common/src/errors.js';
import { patterns as P } from '../../../../libs/contracts/src/contracts.js';
import { AuthGuard, Roles } from '../common/security.js';
import type { ApiRequest } from '../common/security.js';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('attendances')
export class AttendanceController {
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
      required: ['workProof', 'selfie', 'workProofType'],
      properties: {
        workProof: { type: 'string', format: 'binary' },
        selfie: { type: 'string', format: 'binary' },
        workProofType: { type: 'string', enum: ['SCREEN', 'WORKSPACE'] },
      },
    },
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: 'Retain the same key and photo when retrying.',
  })
  @ApiResponse({
    status: 409,
    description: 'Already submitted or conflicting idempotency key',
  })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'workProof', maxCount: 1 },
      { name: 'selfie', maxCount: 1 },
    ], {
      storage: memoryStorage(),
      limits: { fileSize: 5242880, files: 2, fields: 1, parts: 3 },
    }),
  )
  async submit(
    @UploadedFiles() files: { workProof?: Express.Multer.File[]; selfie?: Express.Multer.File[] },
    @Body() body: AttendanceCaptureMetadataDto,
    @Req() r: ApiRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const key = r.headers['idempotency-key'];
    if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(key))
      fail(400, 'INVALID_IDEMPOTENCY_KEY', 'Provide a valid Idempotency-Key header.');
    const evidence = await stageAttendanceCapturePair(this.storage, files, 'CHECKIN');
    const fingerprint = captureFingerprint(evidence);
    try {
      const result = await this.rpc.call<{ record: unknown; replayed: boolean }>(
        'attendance',
        'attendance.submit',
        { ...body, evidence, fingerprint, key },
        r.token,
        r.requestId,
      );
      if (result.replayed) await removeStagedCaptures(this.storage, evidence);
      res.status(result.replayed ? 200 : 201);
      return result.record;
    } catch (error) {
      if (error instanceof DomainError && error.statusCode < 500)
        await removeStagedCaptures(this.storage, evidence);
      throw error;
    }
  }
  @Get('me/today') @Roles('EMPLOYEE') today(@Req() r: ApiRequest) {
    return this.rpc.call(
      'attendance',
      'attendance.today',
      {},
      r.token,
      r.requestId,
    );
  }
  @Get('hr/dashboard') @Roles('HRD') hrDashboard(@Req() r: ApiRequest) {
    return this.rpc.call('attendance', P.hrDashboard, {}, r.token, r.requestId);
  }
  @Get('hr/today-monitoring') @Roles('HRD') hrTodayMonitoring(
    @Query() q: ListDto,
    @Req() r: ApiRequest,
  ) {
    return this.rpc.call('attendance', P.hrTodayMonitoring, q, r.token, r.requestId);
  }
  @Get('hr/missing-attendance') @Roles('HRD') hrMissingAttendance(
    @Query() q: ListDto,
    @Req() r: ApiRequest,
  ) {
    return this.rpc.call('attendance', P.hrMissingAttendance, q, r.token, r.requestId);
  }
  @Post('me/check-out')
  @Roles('EMPLOYEE')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['workProof', 'selfie', 'workProofType'],
      properties: {
        workProof: { type: 'string', format: 'binary' },
        selfie: { type: 'string', format: 'binary' },
        workProofType: { type: 'string', enum: ['SCREEN', 'WORKSPACE'] },
        activityDescription: {
          type: 'string',
          maxLength: 2000,
          description: 'Optional work activity summary.',
        },
      },
    },
  })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'workProof', maxCount: 1 },
      { name: 'selfie', maxCount: 1 },
    ], { storage: memoryStorage(), limits: { fileSize: 5242880, files: 2, fields: 2, parts: 4 } }),
  )
  async checkOut(
    @UploadedFiles() files: { workProof?: Express.Multer.File[]; selfie?: Express.Multer.File[] },
    @Body() body: CheckOutMetadataDto,
    @Req() r: ApiRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const key = r.headers['idempotency-key'];
    if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(key))
      fail(400, 'INVALID_IDEMPOTENCY_KEY', 'Provide a valid Idempotency-Key header.');
    const evidence = await stageAttendanceCapturePair(this.storage, files, 'CHECKOUT');
    const fingerprint = captureFingerprint(evidence, body.activityDescription?.trim() ?? "");
    try {
      const result = await this.rpc.call<{ record: unknown; replayed: boolean }>(
        'attendance', P.checkOut, { ...body, activityDescription: body.activityDescription?.trim() || undefined, evidence, fingerprint, key } satisfies CheckOutDto,
        r.token, r.requestId,
      );
      if (result.replayed) await removeStagedCaptures(this.storage, evidence);
      res.status(result.replayed ? 200 : 201);
      return result.record;
    } catch (error) {
      if (error instanceof DomainError && error.statusCode < 500)
        await removeStagedCaptures(this.storage, evidence);
      throw error;
    }
  }
  @Get('me') @Roles('EMPLOYEE') mine(
    @Query() q: ListDto,
    @Req() r: ApiRequest,
  ) {
    return this.rpc.call(
      'attendance',
      'attendance.mine',
      q,
      r.token,
      r.requestId,
    );
  }
  @Get() @Roles('HRD') list(@Query() q: ListDto, @Req() r: ApiRequest) {
    return this.rpc.call(
      'attendance',
      'attendance.list',
      q,
      r.token,
      r.requestId,
    );
  }
  private async streamEvidence(
    id: string,
    kind: AttendanceEvidenceKind,
    r: ApiRequest,
    res: Response,
  ) {
    const metadata = await this.rpc.call<{ storageKey: string; mimeType: string; size: number }>(
      'attendance', P.evidence, { id, kind }, r.token, r.requestId,
    );
    const bytes = await this.storage.read(metadata.storageKey);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', 'inline');
    return new StreamableFile(bytes, { type: metadata.mimeType, length: metadata.size });
  }
  @Get(':id/evidence')
  async evidence(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() r: ApiRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.streamEvidence(id, AttendanceEvidenceKind.CHECKIN_WORK_PROOF, r, res);
  }
  @Get(':id/evidence/:kind')
  async evidenceByKind(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('kind') kind: string,
    @Req() r: ApiRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!Object.values(AttendanceEvidenceKind).includes(kind as AttendanceEvidenceKind))
      fail(400, 'INVALID_EVIDENCE_KIND', 'Unknown attendance evidence type.');
    return this.streamEvidence(id, kind as AttendanceEvidenceKind, r, res);
  }
  @Get(':id') detail(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() r: ApiRequest,
  ) {
    return this.rpc.call(
      'attendance',
      'attendance.detail',
      { id },
      r.token,
      r.requestId,
    );
  }
}

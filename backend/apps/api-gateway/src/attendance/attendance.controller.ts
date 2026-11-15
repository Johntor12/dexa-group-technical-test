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
  UploadedFile,
  ParseUUIDPipe,
  StreamableFile,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiTags,
  ApiConsumes,
  ApiBody,
  ApiHeader,
  ApiResponse,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { open } from 'node:fs/promises';
import type { Response } from 'express';
import { AttendanceMetadataDto, ListDto } from '../../../../libs/contracts/src/dto.js';
import { RpcClients } from '../../../../libs/common/src/rpc.js';
import { PhotoStorage } from '../../../../libs/common/src/storage.js';
import { DomainError, fail } from '../../../../libs/common/src/errors.js';
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
      required: ['photo', 'latitude', 'longitude', 'locationAccuracy'],
      properties: {
        photo: { type: 'string', format: 'binary' },
        latitude: { type: 'number', minimum: -90, maximum: 90 },
        longitude: { type: 'number', minimum: -180, maximum: 180 },
        locationAccuracy: { type: 'number', minimum: 0 },
        wfhReason: { type: 'string', maxLength: 500 },
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
    FileInterceptor('photo', {
      storage: memoryStorage(),
      limits: { fileSize: 5242880, files: 1, fields: 4, parts: 5 },
    }),
  )
  async submit(
    @UploadedFile() photo: Express.Multer.File,
    @Body() body: AttendanceMetadataDto,
    @Req() r: ApiRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!photo) fail(400, 'PHOTO_REQUIRED', 'Please select a photo.');
    const key = r.headers['idempotency-key'];
    if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(key))
      fail(
        400,
        'INVALID_IDEMPOTENCY_KEY',
        'Provide a valid Idempotency-Key header.',
      );
    const staged = await this.storage.stage(photo.buffer, photo.mimetype);
    try {
      const result = await this.rpc.call<{
        record: unknown;
        replayed: boolean;
      }>(
        'attendance',
        'attendance.submit',
        { ...staged, ...body, key },
        r.token,
        r.requestId,
      );
      if (result.replayed) await this.storage.remove(staged.storageKey);
      res.status(result.replayed ? 200 : 201);
      return result.record;
    } catch (error) {
      // 5xx/timeout is ambiguous: preserve evidence until the aged-orphan reconciliation job.
      if (error instanceof DomainError && error.statusCode < 500)
        await this.storage.remove(staged.storageKey);
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
  @Get(':id/evidence') async evidence(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() r: ApiRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const metadata = await this.rpc.call<{
      storageKey: string;
      mimeType: string;
      size: number;
    }>('attendance', 'attendance.evidence', { id }, r.token, r.requestId);
    const handle = await open(
      this.storage.path(metadata.storageKey),
      'r',
    ).catch(() => fail(404, 'NOT_FOUND', 'Evidence file not found.'));
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', 'inline');
    return new StreamableFile(handle.createReadStream(), {
      type: metadata.mimeType,
      length: metadata.size,
    });
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

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
import exifr from 'exifr';
import type { Response } from 'express';
import { AttendanceMetadataDto, ListDto } from '../../../../libs/contracts/src/dto.js';
import { RpcClients } from '../../../../libs/common/src/rpc.js';
import { imageType, PhotoStorage } from '../../../../libs/common/src/storage.js';
import { DomainError, fail } from '../../../../libs/common/src/errors.js';
import { patterns as P } from '../../../../libs/contracts/src/contracts.js';
import { AuthGuard, Roles } from '../common/security.js';
import type { ApiRequest } from '../common/security.js';

async function readPhotoCapture(bytes: Buffer) {
  // Parse the complete metadata directory: some camera apps save the capture
  // timestamp as CreateDate or XMP rather than the EXIF DateTimeOriginal tag.
  const tags = await exifr.parse(bytes, { reviveValues: false }).catch(() => undefined);
  const candidates = [
    tags?.DateTimeOriginal,
    tags?.CreateDate,
    tags?.DateTimeDigitized,
    tags?.ModifyDate,
    tags?.DateTime,
    tags?.DateCreated,
    tags?.DateTimeCreated,
  ];
  const normalize = (value: unknown): string | null => {
    if (value instanceof Date && Number.isFinite(value.getTime()))
      return `${value.getUTCFullYear()}:${String(value.getUTCMonth() + 1).padStart(2, '0')}:${String(value.getUTCDate()).padStart(2, '0')} ${String(value.getUTCHours()).padStart(2, '0')}:${String(value.getUTCMinutes()).padStart(2, '0')}:${String(value.getUTCSeconds()).padStart(2, '0')}`;
    if (typeof value !== 'string') return null;
    const input = value.trim();
    const iso = input.match(/(?:^|\D)(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?(?:$|\D)/);
    if (iso) return `${iso[1]}:${iso[2]}:${iso[3]} ${iso[4]}:${iso[5]}:${iso[6]}`;
    const exif = input.match(/(?:^|\D)(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:$|\D)/);
    return exif ? `${exif[1]}:${exif[2]}:${exif[3]} ${exif[4]}:${exif[5]}:${exif[6]}` : null;
  };
  // Include free-text metadata fields used by some camera apps. This still
  // reads stored metadata, not text burned into the visible pixels.
  candidates.push(...Object.values(tags ?? {}).filter((value) => typeof value === 'string'));
  const raw = candidates.map(normalize).find((value) => value !== null) ?? null;
  if (!raw) return null;
  const match = raw.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match;
  const check = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)));
  if (check.getUTCFullYear() !== Number(year) || check.getUTCMonth() !== Number(month) - 1 || check.getUTCDate() !== Number(day) || check.getUTCHours() !== Number(hour) || check.getUTCMinutes() !== Number(minute) || check.getUTCSeconds() !== Number(second))
    return null;
  const capturedAt = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  const rawOffset = tags?.OffsetTimeOriginal ?? tags?.OffsetTimeDigitized;
  const offset = typeof rawOffset === 'string' && /^[+-](?:0\d|1\d|2[0-3]):[0-5]\d$/.test(rawOffset) ? rawOffset : null;
  return { capturedAt, offset };
}

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('attendances')
export class AttendanceController {
  constructor(
    private readonly rpc: RpcClients,
    private readonly storage: PhotoStorage,
  ) {}
  @Post('photo-metadata')
  @Roles('EMPLOYEE')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', required: ['photo'], properties: { photo: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('photo', { storage: memoryStorage(), limits: { fileSize: 5242880, files: 1, fields: 0, parts: 1 } }))
  async photoMetadata(@UploadedFile() photo: Express.Multer.File) {
    if (!photo) fail(400, 'PHOTO_REQUIRED', 'Please select a photo.');
    if (!photo.buffer.length || imageType(photo.buffer) !== photo.mimetype)
      fail(422, 'INVALID_PHOTO', 'Photo content does not match its MIME type.');
    return (await readPhotoCapture(photo.buffer)) ?? { capturedAt: null, offset: null };
  }

  @Post()
  @Roles('EMPLOYEE')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['photo', 'latitude', 'longitude', 'locationAccuracy', 'taskDescription'],
      properties: {
        photo: { type: 'string', format: 'binary' },
        latitude: { type: 'number', minimum: -90, maximum: 90 },
        longitude: { type: 'number', minimum: -180, maximum: 180 },
        locationAccuracy: { type: 'number', minimum: 0 },
        taskDescription: { type: 'string', minLength: 1, maxLength: 500 },
        wfhReason: { type: 'string', maxLength: 500 },
        checkInPhotoCapturedAt: { type: 'string', description: 'Waktu dari metadata foto atau pilihan manual employee.' },
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
      // Maximum payload: photo + coordinates (3) + task + optional reason +
      // optional manually selected photo capture timestamp.
      limits: { fileSize: 5242880, files: 1, fields: 6, parts: 7 },
    }),
  )
  async submit(
    @UploadedFile() photo: Express.Multer.File,
    @Body() body: AttendanceMetadataDto,
    @Req() r: ApiRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!photo) fail(400, 'PHOTO_REQUIRED', 'Please select a photo.');
    const capture = await readPhotoCapture(photo.buffer);
    const suppliedCapture = body.checkInPhotoCapturedAt?.trim();
    const manualMatch = suppliedCapture?.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
    let manualCapture: string | null = null;
    if (manualMatch) {
      const [, year, month, day, hour, minute, rawSecond = '00'] = manualMatch;
      const check = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(rawSecond)));
      if (check.getUTCFullYear() === Number(year) && check.getUTCMonth() === Number(month) - 1 && check.getUTCDate() === Number(day) && check.getUTCHours() === Number(hour) && check.getUTCMinutes() === Number(minute) && check.getUTCSeconds() === Number(rawSecond))
        manualCapture = `${year}-${month}-${day}T${hour}:${minute}:${rawSecond}`;
    }
    const capturedAt = capture?.capturedAt ?? manualCapture;
    if (!capturedAt)
      fail(400, 'PHOTO_TIMESTAMP_REQUIRED', 'Pilih tanggal dan waktu pada foto.');
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
        { ...staged, ...body, checkInPhotoCapturedAt: capturedAt, checkInPhotoOffset: capture?.offset ?? undefined, key },
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
  @Post('me/check-out') @Roles('EMPLOYEE') checkOut(@Req() r: ApiRequest) {
    return this.rpc.call('attendance', P.checkOut, {}, r.token, r.requestId);
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

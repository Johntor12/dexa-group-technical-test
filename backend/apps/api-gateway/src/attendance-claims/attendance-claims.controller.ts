import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { RpcClients } from '../../../../libs/common/src/rpc.js';
import { fail } from '../../../../libs/common/src/errors.js';
import {
  ListDto,
  MissedCheckInClaimDecisionDto,
  MissedCheckInClaimDto,
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
  constructor(private readonly rpc: RpcClients) {}

  @Post()
  @Roles('EMPLOYEE')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  async create(
    @Body() body: Omit<MissedCheckInClaimDto, 'key'>,
    @Req() request: ApiRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const key = request.headers['idempotency-key'];
    if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(key))
      fail(400, 'INVALID_IDEMPOTENCY_KEY', 'Provide a valid Idempotency-Key header.');
    const claim = await this.rpc.call(
      'attendance',
      P.missedCheckInCreate,
      { ...body, key },
      request.token,
      request.requestId,
    );
    response.status(201);
    return claim;
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

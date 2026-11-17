import { AuthService } from './auth.service.js';
import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  ActivateAccountDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  ResetPasswordDto,
} from '../../../../libs/contracts/src/dto.js';
import { RpcClients } from '../../../../libs/common/src/rpc.js';
import { fail } from '../../../../libs/common/src/errors.js';
import { AuthGuard } from '../common/security.js';
import type { ApiRequest } from '../common/security.js';
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly attempts = new Map<
    string,
    { count: number; until: number }
  >();
  private readonly passwordAttempts = new Map<string, { count: number; until: number }>();
  constructor(
    private readonly rpc: RpcClients,
    private readonly auth: AuthService,
  ) {}
  @Post('login') @HttpCode(200) login(
    @Body() dto: LoginDto,
    @Req() req: ApiRequest,
  ) {
    const now = Date.now();
    for (const [key, item] of this.attempts)
      if (item.until <= now) this.attempts.delete(key);
    const ip = req.ip ?? 'unknown';
    const attempt = this.attempts.get(ip) ?? { count: 0, until: now + 60000 };
    attempt.count++;
    this.attempts.set(ip, attempt);
    if (attempt.count > 20)
      fail(
        429,
        'RATE_LIMITED',
        'Too many login attempts. Try again in one minute.',
      );
    return this.auth.login(dto, req.requestId);
  }
  @Post('activate') @HttpCode(200) activate(
    @Body() dto: ActivateAccountDto,
    @Req() req: ApiRequest,
  ) {
    return this.rpc.call(
      'employee',
      'auth.activate',
      dto,
      undefined,
      req.requestId,
    );
  }
  private limitPasswordRequests(req: ApiRequest) {
    const now = Date.now();
    for (const [key, item] of this.passwordAttempts)
      if (item.until <= now) this.passwordAttempts.delete(key);
    const ip = req.ip ?? 'unknown';
    const attempt = this.passwordAttempts.get(ip) ?? { count: 0, until: now + 15 * 60_000 };
    attempt.count++;
    this.passwordAttempts.set(ip, attempt);
    if (attempt.count > 10)
      fail(429, 'RATE_LIMITED', 'Terlalu banyak permintaan. Coba kembali dalam 15 menit.');
  }
  @Post('forgot-password') @HttpCode(200) forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Req() req: ApiRequest,
  ) {
    this.limitPasswordRequests(req);
    return this.rpc.call(
      'employee',
      'auth.forgotPassword',
      dto,
      undefined,
      req.requestId,
    );
  }
  @Post('reset-password') @HttpCode(200) resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() req: ApiRequest,
  ) {
    this.limitPasswordRequests(req);
    return this.rpc.call(
      'employee',
      'auth.resetPassword',
      dto,
      undefined,
      req.requestId,
    );
  }
  @Post('change-password') @HttpCode(200) @ApiBearerAuth() @UseGuards(AuthGuard) changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: ApiRequest,
  ) {
    return this.rpc.call(
      'employee',
      'auth.changePassword',
      dto,
      req.token,
      req.requestId,
    );
  }
  @Get('me') @ApiBearerAuth() @UseGuards(AuthGuard) me(@Req() req: ApiRequest) {
    return req.principal;
  }
  @Post('logout') @HttpCode(200) @ApiBearerAuth() @UseGuards(AuthGuard) logout(
    @Req() req: ApiRequest,
  ) {
    return this.rpc.call(
      'employee',
      'auth.logout',
      {},
      req.token,
      req.requestId,
    );
  }
}

import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { timingSafeEqual } from 'node:crypto';
import { config, secret } from './config.js';
import { fail, DomainError } from './errors.js';
import type { Envelope } from '../../contracts/src/contracts.js';
export function verifyEnvelope(e: Envelope) {
  const expected = Buffer.from(secret('RPC_SECRET'));
  const actual = Buffer.from(typeof e?.secret === 'string' ? e.secret : '');
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
    fail(403, 'FORBIDDEN', 'Untrusted service caller.');
}
@Injectable()
export class RpcClients implements OnModuleDestroy {
  private employee = ClientProxyFactory.create({
    transport: Transport.TCP,
    options: { host: config.employeeHost, port: config.employeePort },
  });
  private attendance = ClientProxyFactory.create({
    transport: Transport.TCP,
    options: { host: config.attendanceHost, port: config.attendancePort },
  });
  async call<T = any>(
    service: 'employee' | 'attendance',
    pattern: string,
    data: unknown,
    token?: string,
    requestId: string = crypto.randomUUID(),
  ): Promise<T> {
    const started = Date.now();
    try {
      return await firstValueFrom(
        this[service]
          .send<T>(pattern, {
            secret: secret('RPC_SECRET'),
            requestId,
            token,
            data,
          })
          .pipe(timeout(8000)),
      );
    } catch (error) {
      const e = error as {
        statusCode?: number;
        code?: string;
        message?: string;
      };
      if (e.statusCode && e.statusCode >= 400 && e.statusCode < 500)
        throw new DomainError(
          e.statusCode,
          e.code ?? 'REQUEST_FAILED',
          e.message ?? 'Request failed.',
        );
      throw new DomainError(
        503,
        'SERVICE_UNAVAILABLE',
        'Service temporarily unavailable. Retry with the same idempotency key.',
      );
    } finally {
      Logger.log(
        JSON.stringify({
          event: 'rpc',
          service,
          pattern,
          requestId,
          durationMs: Date.now() - started,
        }),
      );
    }
  }
  onModuleDestroy() {
    this.employee.close();
    this.attendance.close();
  }
}

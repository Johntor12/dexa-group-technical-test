import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import type { Response } from 'express';
import type { ApiRequest } from './security.js';
import { DomainError } from '../../../../libs/common/src/errors.js';
@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const res = http.getResponse<Response>();
    const req = http.getRequest<ApiRequest>();
    let statusCode = 500,
      code = 'INTERNAL_ERROR',
      message: string | string[] = 'An unexpected error occurred.';
    if (error instanceof DomainError) {
      statusCode = error.statusCode;
      code = error.code;
      message = error.message;
    } else if (error instanceof HttpException) {
      statusCode = error.getStatus();
      code = statusCode === 400 ? 'VALIDATION_ERROR' : `HTTP_${statusCode}`;
      const body = error.getResponse();
      message =
        typeof body === 'string'
          ? body
          : (body as { message: string | string[] }).message;
    }
    res
      .status(statusCode)
      .json({ statusCode, code, message, requestId: req.requestId });
  }
}

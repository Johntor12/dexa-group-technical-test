import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import type { Response, NextFunction } from 'express';
import { secret } from '../../../libs/common/src/config.js';
import { AppModule } from './app.module.js';
import { HttpErrorFilter } from './common/http-exception.filter.js';
import type { ApiRequest } from './common/security.js';
secret('RPC_SECRET');
const app = await NestFactory.create(AppModule);
app.setGlobalPrefix('api/v1', { exclude: ['health', 'health/ready'] });
app.enableCors({
  origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  exposedHeaders: ['X-Request-Id'],
});
app.use((req: ApiRequest, res: Response, next: NextFunction) => {
  req.requestId = randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const start = Date.now();
  res.on('finish', () =>
    Logger.log(
      JSON.stringify({
        event: 'http',
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Date.now() - start,
      }),
    ),
  );
  next();
});
app.useGlobalPipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
);
app.useGlobalFilters(new HttpErrorFilter());
const document = SwaggerModule.createDocument(
  app,
  new DocumentBuilder()
    .setTitle('PharmaWork API')
    .setDescription(
      'WFH attendance: HRD manages employees and reads attendance; employees submit and view their own evidence. Bearer session tokens expire after one hour.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build(),
);
for (const path of Object.values(document.paths)) {
  for (const method of ['get', 'post', 'patch', 'delete'] as const) {
    const operation = path?.[method];
    if (!operation) continue;
    for (const status of [400, 401, 403, 409, 413, 422, 503]) {
      operation.responses ??= {};
      operation.responses[String(status)] ??= {
        description: 'Standard error response',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['statusCode', 'code', 'message', 'requestId'],
              properties: {
                statusCode: { type: 'integer' },
                code: { type: 'string' },
                message: {
                  oneOf: [
                    { type: 'string' },
                    { type: 'array', items: { type: 'string' } },
                  ],
                },
                requestId: { type: 'string', format: 'uuid' },
              },
            },
          },
        },
      };
    }
  }
}
SwaggerModule.setup('api/docs', app, document);
app.enableShutdownHooks();
await app.listen(Number(process.env.API_PORT ?? 3000), '127.0.0.1');

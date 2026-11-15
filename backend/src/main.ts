import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  app.setGlobalPrefix('api');
  app.enableCors({ origin: config.get<string>('FRONTEND_URL', 'http://localhost:5173') });
  app.enableShutdownHooks();
  await app.listen(Number(config.get('PORT', 3000)));
}
await bootstrap();

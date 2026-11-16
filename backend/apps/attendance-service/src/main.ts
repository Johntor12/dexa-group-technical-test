import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { config, secret } from '../../../libs/common/src/config.js';
import { AppModule } from './app.module.js';
secret('RPC_SECRET');
const app = await NestFactory.createMicroservice(AppModule, {
  transport: Transport.TCP,
  // The RPC services run beside the API gateway in the same Render process
  // group. Keep this listener private to the instance; only the HTTP gateway
  // should bind to 0.0.0.0 and receive public traffic.
  options: { host: '127.0.0.1', port: config.attendancePort },
});
app.enableShutdownHooks();
await app.listen();

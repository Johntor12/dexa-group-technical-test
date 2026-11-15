import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { config, secret } from '../../../libs/common/src/config.js';
import { AppModule } from './app.module.js';
secret('RPC_SECRET');
const app = await NestFactory.createMicroservice(AppModule, {
  transport: Transport.TCP,
  options: { host: config.employeeHost, port: config.employeePort },
});
app.enableShutdownHooks();
await app.listen();

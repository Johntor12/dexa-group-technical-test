import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../../../generated/prisma/client.js';
import { required } from './config.js';
export function createDatabase() {
  const url = new URL(required('DATABASE_URL'));
  return new PrismaClient({
    adapter: new PrismaMariaDb({
      host: url.hostname,
      port: Number(url.port || 3306),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.slice(1),
      connectionLimit: 5,
      timezone: 'Z',
      connectTimeout: 5000,
      acquireTimeout: 5000,
    }),
  });
}
@Injectable()
export class Database implements OnModuleInit, OnModuleDestroy {
  readonly client = createDatabase();
  async onModuleInit() {
    await this.client.$connect();
  }
  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}

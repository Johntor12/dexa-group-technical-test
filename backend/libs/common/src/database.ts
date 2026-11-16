import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../../../generated/prisma/client.js';
import { required } from './config.js';
import { readFileSync } from 'node:fs';
export function createDatabase() {
  const url = new URL(required('DATABASE_URL'));
  const isProduction = process.env.NODE_ENV === 'production';
  const caPath = process.env.TIDB_CA_PATH;
  if (isProduction && !caPath) {
    throw new Error('TIDB_CA_PATH is required in production to verify the TiDB TLS certificate');
  }
  const ssl = isProduction
    ? {
        ca: readFileSync(caPath!),
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2' as const,
      }
    : undefined;
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
      ...(ssl ? { ssl } : {}),
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

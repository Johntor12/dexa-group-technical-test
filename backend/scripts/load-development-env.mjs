import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';

const envPath = resolve(process.cwd(), '.env.development');
if (!existsSync(envPath)) {
  throw new Error(
    'Missing backend/.env.development. Copy .env.development.example and configure the local MySQL connection first.',
  );
}

config({ path: envPath, override: true });
process.env.NODE_ENV = 'development';

const databaseUrl = new URL(process.env.DATABASE_URL ?? '');
if (!['127.0.0.1', 'localhost', '::1'].includes(databaseUrl.hostname)) {
  throw new Error(
    `Development commands are restricted to local databases; got host ${databaseUrl.hostname}.`,
  );
}

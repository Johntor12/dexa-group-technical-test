import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';
const databaseUrl = new URL(env('DATABASE_URL'));
const caPath = process.env.TIDB_CA_PATH;
if (caPath) {
  databaseUrl.searchParams.set('sslaccept', 'strict');
  databaseUrl.searchParams.set('sslcert', caPath);
}
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  datasource: { url: databaseUrl.toString() },
});

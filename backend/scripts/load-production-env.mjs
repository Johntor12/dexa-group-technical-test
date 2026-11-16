import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';

// Local/VM deployments may use the ignored .env.production file. Hosting
// platforms can instead inject these values directly as environment vars.
const envPath = resolve(process.cwd(), '.env.production');
if (existsSync(envPath)) config({ path: envPath, override: false });

if (process.env.NODE_ENV !== 'production') {
  throw new Error('Production commands require NODE_ENV=production.');
}

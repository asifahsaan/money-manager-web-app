import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export type MirrorProvider = 'mysql' | 'sqlserver';

// Plain ts-node scripts don't load backend/.env, so read the one value we need.
export function mirrorUrl(): string {
  if (process.env.MIRROR_DATABASE_URL) return process.env.MIRROR_DATABASE_URL;
  const envFile = join(__dirname, '..', '..', '.env');
  if (existsSync(envFile)) {
    const match = readFileSync(envFile, 'utf-8').match(/^MIRROR_DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m);
    if (match) return match[1];
  }
  throw new Error('MIRROR_DATABASE_URL is not set in backend/.env');
}

export function mirrorProvider(): MirrorProvider {
  const url = mirrorUrl();
  if (url.startsWith('mysql://')) return 'mysql';
  if (url.startsWith('sqlserver://')) return 'sqlserver';
  throw new Error('MIRROR_DATABASE_URL must start with mysql:// or sqlserver://');
}

import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const EXAMPLE_SECRET = 'change-this-to-a-strong-random-secret-in-production';

// Refuse to boot without a real secret: a guessable fallback would let anyone
// forge tokens for any user, including admins.
export function requireJwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET');
  if (!secret || secret === EXAMPLE_SECRET) {
    throw new Error('JWT_SECRET is not set — refusing to start with a guessable token secret');
  }
  if (secret.length < 32) {
    new Logger('Auth').warn('JWT_SECRET is shorter than 32 characters — use a longer random value');
  }
  return secret;
}

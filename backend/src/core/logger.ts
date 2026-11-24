import { pino, type Logger } from 'pino';
import type { Env } from '../config/env';
import { PINO_REDACT_PATHS, REDACTED } from '../common/redact';

export type { Logger };

export function createLogger(env: Env): Logger {
  return pino({
    level: env.NODE_ENV === 'test' ? 'silent' : env.LOG_LEVEL,
    redact: { paths: PINO_REDACT_PATHS, censor: REDACTED },
    transport:
      env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { singleLine: true, translateTime: 'SYS:HH:MM:ss' } }
        : undefined,
  });
}

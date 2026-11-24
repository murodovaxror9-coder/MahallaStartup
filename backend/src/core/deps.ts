import type { Env } from '../config/env';
import type { Clock } from './clock';
import type { Db } from './db';
import type { Kv } from './kv';
import type { Logger } from './logger';
import type { Storage } from './storage';

/** Socket.IO ustidagi yupqa qatlam: servislar faqat shuni biladi. */
export interface Realtime {
  emitToMahalla(mahallaId: string, event: string, payload: unknown): void;
  close(): Promise<void>;
}

export type JobName =
  | 'announcement-fanout'
  | 'close-rounds'
  | 'ensure-rounds'
  | 'event-reminders'
  | 'media-cleanup'
  | 'push';

export interface Jobs {
  /** Ishni (HTTP so'rovni kutdirmasdan) imkon qadar tezroq ishga tushirishga undaydi. */
  kick(name: JobName): void;
  stop(): Promise<void>;
}

export interface Deps {
  env: Env;
  db: Db;
  kv: Kv;
  storage: Storage;
  clock: Clock;
  log: Logger;
  realtime: Realtime;
  jobs: Jobs;
}

export const noopRealtime: Realtime = {
  emitToMahalla: () => undefined,
  close: async () => undefined,
};

export const noopJobs: Jobs = {
  kick: () => undefined,
  stop: async () => undefined,
};

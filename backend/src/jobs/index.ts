import type { Deps, JobName, Jobs } from '../core/deps';
import { fanoutPendingAnnouncements } from '../modules/announcements/routes';
import { sendEventReminders } from '../modules/events/routes';
import { cleanupOrphanMedia } from '../modules/media/service';
import { checkPushReceipts, runPushWorker } from '../modules/notifications/push';
import { closeDueRounds, ensureCurrentRounds } from '../modules/rounds/service';

/** Har bir ishning o'zi (testlar va CLI to'g'ridan-to'g'ri chaqira oladi). */
export function jobTasks(deps: Deps): Record<JobName, () => Promise<unknown>> {
  return {
    'announcement-fanout': () => fanoutPendingAnnouncements(deps),
    'close-rounds': () => closeDueRounds(deps, deps.clock.now()),
    'ensure-rounds': () => ensureCurrentRounds(deps, deps.clock.now()),
    'event-reminders': () => sendEventReminders(deps, deps.clock.now()),
    'media-cleanup': () => cleanupOrphanMedia(deps, deps.clock.now()),
    push: async () => {
      await runPushWorker(deps);
      await checkPushReceipts(deps);
    },
  };
}

/**
 * Davriy vazifalar jarayon ichida (BullMQ/Redis shart emas). Ko'p nusxada ishlasa ham xavfsiz:
 * davr yopish qatorni `FOR UPDATE` bilan bloklaydi, eslatma/fan-out unikal `dedupeKey` bilan,
 * push esa `FOR UPDATE SKIP LOCKED` bilan.
 */
export function startJobs(deps: Deps): Jobs {
  const tasks = jobTasks(deps);
  const timers: NodeJS.Timeout[] = [];
  const running = new Map<JobName, Promise<void>>();

  const run = (name: JobName): Promise<void> => {
    const active = running.get(name);
    if (active) return active;
    const p = (async () => {
      try {
        await tasks[name]();
      } catch (err) {
        deps.log.error({ err, job: name }, 'fon vazifasi xatosi');
      } finally {
        running.delete(name);
      }
    })();
    running.set(name, p);
    return p;
  };

  const every = (name: JobName, ms: number) => {
    const t = setInterval(() => void run(name), ms);
    t.unref();
    timers.push(t);
  };
  every('close-rounds', 5 * 60_000);
  every('event-reminders', 10 * 60_000);
  every('media-cleanup', 60 * 60_000);
  every('ensure-rounds', 60 * 60_000);
  every('announcement-fanout', 30_000);
  every('push', 10_000);

  // Ishga tushganda: joriy davr tayyor bo'lsin, kechikkan davrlar yopilsin, qolib ketgan e'lonlar tarqatilsin
  void run('ensure-rounds').then(() => run('close-rounds'));
  void run('announcement-fanout');

  return {
    kick: (name) => {
      setImmediate(() => void run(name));
    },
    stop: async () => {
      for (const t of timers) clearInterval(t);
      await Promise.all([...running.values()]);
    },
  };
}

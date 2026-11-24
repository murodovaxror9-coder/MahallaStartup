import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { fanoutPendingAnnouncements } from '../src/modules/announcements/routes';
import { sendEventReminders } from '../src/modules/events/routes';
import { runPushWorker } from '../src/modules/notifications/push';
import { world, type World } from './fixtures';
import { createTestApp, type TestApp } from './helpers';

describe('tadbir, e’lon va bildirishnoma', () => {
  let t: TestApp;
  let w: World;

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.close();
  });
  beforeEach(async () => {
    await t.reset();
    w = await world(t, 'mahalla-a', 3);
  });

  const admin = () => w.admin.token;
  const notes = async (userId: string, type?: string) =>
    (
      await t.db.query<{ type: string; dedupe_key: string }>(
        `SELECT type, dedupe_key FROM notifications WHERE user_id = $1 ${type ? 'AND type = $2' : ''}`,
        type ? [userId, type] : [userId],
      )
    ).rows;

  async function publishedEvent(startsAt = '2026-12-10T18:00:00+05:00') {
    const created = await t.req('POST', '/api/v1/admin/events', {
      token: admin(),
      json: { title: 'Hashar: hovli tozalash', description: "Mahalla hovlisini birgalikda tozalaymiz", startsAt, location: 'Markaziy hovli', organizer: 'Mahalla qo‘mitasi' },
    });
    expect(created.status).toBe(201);
    expect(created.body.status).toBe('DRAFT');
    const id = created.body.id as string;
    expect((await t.req('POST', `/api/v1/admin/events/${id}/publish`, { token: admin() })).body.status).toBe('PUBLISHED');
    return id;
  }

  it("qoralama aholiga ko'rinmaydi; nashrdan keyin ko'rinadi; publish idempotent", async () => {
    const created = await t.req('POST', '/api/v1/admin/events', {
      token: admin(),
      json: { title: 'Qoralama tadbir', description: 'Hali nashr qilinmagan tadbir', startsAt: '2026-12-10T18:00:00+05:00', location: 'Joy 1', organizer: 'Admin' },
    });
    const id = created.body.id as string;
    expect((await t.req('GET', `/api/v1/events/${id}`, { token: w.residents[0]!.token })).status).toBe(404);
    expect((await t.req('GET', '/api/v1/events', { token: w.residents[0]!.token })).body.items).toHaveLength(0);
    expect((await t.req('GET', '/api/v1/admin/events', { token: admin() })).body.items).toHaveLength(1);

    await t.req('POST', `/api/v1/admin/events/${id}/publish`, { token: admin() });
    expect((await t.req('POST', `/api/v1/admin/events/${id}/publish`, { token: admin() })).status).toBe(200);
    expect((await t.req('GET', `/api/v1/events/${id}`, { token: w.residents[0]!.token })).status).toBe(200);
    expect((await t.req('GET', '/api/v1/events?scope=upcoming', { token: w.residents[0]!.token })).body.items).toHaveLength(1);
    expect((await t.req('GET', '/api/v1/events?scope=past', { token: w.residents[0]!.token })).body.items).toHaveLength(0);
  });

  it('RSVP idempotent: ikki marta yozilsa ham rsvpCount 1; bekor qilish ham idempotent', async () => {
    const id = await publishedEvent();
    const me = w.residents[0]!.token;
    expect((await t.req('PUT', `/api/v1/events/${id}/rsvp`, { token: me })).body).toEqual({ going: true, rsvpCount: 1 });
    expect((await t.req('PUT', `/api/v1/events/${id}/rsvp`, { token: me })).body).toEqual({ going: true, rsvpCount: 1 });
    await t.req('PUT', `/api/v1/events/${id}/rsvp`, { token: w.residents[1]!.token });
    expect((await t.req('GET', `/api/v1/events/${id}`, { token: me })).body).toMatchObject({ rsvpCount: 2, myRsvp: true });

    const attendees = await t.req('GET', `/api/v1/admin/events/${id}/attendees`, { token: admin() });
    expect(attendees.body.total).toBe(2);

    expect((await t.req('DELETE', `/api/v1/events/${id}/rsvp`, { token: me })).status).toBe(204);
    expect((await t.req('DELETE', `/api/v1/events/${id}/rsvp`, { token: me })).status).toBe(204);
    expect((await t.req('GET', `/api/v1/events/${id}`, { token: me })).body).toMatchObject({ rsvpCount: 1, myRsvp: false });
    // admin yoza olmaydi
    expect((await t.req('PUT', `/api/v1/events/${id}/rsvp`, { token: admin() })).status).toBe(403);
  });

  it("o'tib ketgan tadbirga yozilib bo'lmaydi; bekor qilingan/yakunlanganga ham", async () => {
    const id = await publishedEvent();
    t.clock.set(new Date('2026-12-11T10:00:00+05:00'));
    expect((await t.req('PUT', `/api/v1/events/${id}/rsvp`, { token: w.residents[0]!.token })).status).toBe(409);
    expect((await t.req('GET', '/api/v1/events?scope=past', { token: w.residents[0]!.token })).body.items).toHaveLength(1);

    t.clock.set(new Date('2026-11-24T10:00:00+05:00'));
    await t.req('POST', `/api/v1/admin/events/${id}/cancel`, { token: admin(), json: {} });
    expect((await t.req('PUT', `/api/v1/events/${id}/rsvp`, { token: w.residents[0]!.token })).status).toBe(409);
  });

  it("bekor qilish yozilganlarga xabar beradi (bir marta, idempotent)", async () => {
    const id = await publishedEvent();
    await t.req('PUT', `/api/v1/events/${id}/rsvp`, { token: w.residents[0]!.token });
    await t.req('PUT', `/api/v1/events/${id}/rsvp`, { token: w.residents[1]!.token });

    const cancel = await t.req('POST', `/api/v1/admin/events/${id}/cancel`, { token: admin(), json: { reason: "Ob-havo yomon" } });
    expect(cancel.body.status).toBe('CANCELLED');
    await t.req('POST', `/api/v1/admin/events/${id}/cancel`, { token: admin(), json: {} });

    expect((await notes(w.residents[0]!.id, 'EVENT_CANCELLED')).map((n) => n.dedupe_key)).toEqual([`event:${id}:cancel`]);
    expect(await notes(w.residents[1]!.id, 'EVENT_CANCELLED')).toHaveLength(1);
    expect(await notes(w.residents[2]!.id, 'EVENT_CANCELLED')).toHaveLength(0); // yozilmagan
  });

  it("vaqt/joy o'zgarishi yozilganlarga EVENT_UPDATED (version bo'yicha dedupe); sarlavha o'zgarishi bildirishnoma bermaydi", async () => {
    const id = await publishedEvent();
    await t.req('PUT', `/api/v1/events/${id}/rsvp`, { token: w.residents[0]!.token });

    const same = await t.req('PATCH', `/api/v1/admin/events/${id}`, { token: admin(), json: { title: 'Yangi nom beramiz' } });
    expect(same.body.version).toBe(1);
    expect(await notes(w.residents[0]!.id, 'EVENT_UPDATED')).toHaveLength(0);

    const moved = await t.req('PATCH', `/api/v1/admin/events/${id}`, { token: admin(), json: { startsAt: '2026-12-11T18:00:00+05:00' } });
    expect(moved.body.version).toBe(2);
    expect((await notes(w.residents[0]!.id, 'EVENT_UPDATED')).map((n) => n.dedupe_key)).toEqual([`event:${id}:update:2`]);

    const place = await t.req('PATCH', `/api/v1/admin/events/${id}`, { token: admin(), json: { location: 'Bog‘ yonidagi maydon' } });
    expect(place.body.version).toBe(3);
    expect(await notes(w.residents[0]!.id, 'EVENT_UPDATED')).toHaveLength(2);

    const bad = await t.req('PATCH', `/api/v1/admin/events/${id}`, { token: admin(), json: { endsAt: '2026-12-01T10:00:00+05:00' } });
    expect(bad.status).toBe(400);
  });

  it('eslatma job’i 2 marta ishlasa ham bitta bildirishnoma; vaqt o‘zgarsa yangi eslatma', async () => {
    const id = await publishedEvent('2026-12-10T18:00:00+05:00');
    await t.req('PUT', `/api/v1/events/${id}/rsvp`, { token: w.residents[0]!.token });

    // 24 soatdan ko'p qolgan: eslatma yo'q
    t.clock.set(new Date('2026-12-09T10:00:00+05:00'));
    expect(await sendEventReminders(t.deps, t.clock.now())).toBe(0);

    t.clock.set(new Date('2026-12-09T19:00:00+05:00')); // 23 soat qoldi
    expect(await sendEventReminders(t.deps, t.clock.now())).toBe(1);
    expect(await sendEventReminders(t.deps, t.clock.now())).toBe(0);
    expect(await notes(w.residents[0]!.id, 'EVENT_REMINDER')).toHaveLength(1);
    expect(await notes(w.residents[1]!.id, 'EVENT_REMINDER')).toHaveLength(0);

    // Vaqt o'zgardi -> yangi dedupeKey -> yangi eslatma
    await t.req('PATCH', `/api/v1/admin/events/${id}`, { token: admin(), json: { startsAt: '2026-12-10T18:30:00+05:00' } });
    expect(await sendEventReminders(t.deps, t.clock.now())).toBe(1);
    expect(await notes(w.residents[0]!.id, 'EVENT_REMINDER')).toHaveLength(2);

    // Boshlangandan keyin eslatma yo'q
    t.clock.set(new Date('2026-12-10T21:00:00+05:00'));
    expect(await sendEventReminders(t.deps, t.clock.now())).toBe(0);
  });

  it('yakunlash: natija matni va foto; yakunlangan tadbirni tahrirlab/bekor qilib bo‘lmaydi', async () => {
    const id = await publishedEvent();
    const done = await t.req('POST', `/api/v1/admin/events/${id}/complete`, { token: admin(), json: { resultText: '25 kishi qatnashdi, hovli tozalandi' } });
    expect(done.body).toMatchObject({ status: 'COMPLETED', resultText: '25 kishi qatnashdi, hovli tozalandi' });
    expect((await t.req('PATCH', `/api/v1/admin/events/${id}`, { token: admin(), json: { title: 'Boshqa nom' } })).status).toBe(409);
    expect((await t.req('POST', `/api/v1/admin/events/${id}/cancel`, { token: admin(), json: {} })).status).toBe(409);
    const draft = await t.req('POST', '/api/v1/admin/events', {
      token: admin(),
      json: { title: 'Hali nashr emas', description: 'Nashr qilinmagan tadbir', startsAt: '2026-12-10T18:00:00+05:00', location: 'Joy 1', organizer: 'Admin' },
    });
    expect((await t.req('POST', `/api/v1/admin/events/${draft.body.id}/complete`, { token: admin(), json: {} })).status).toBe(409);
  });

  it("muhim e'lon: a'zolarga bildirishnoma (EXPO_ACCESS_TOKEN siz ham), idempotent; oddiy e'lon bildirishnoma bermaydi", async () => {
    const draft = await t.req('POST', '/api/v1/admin/announcements', {
      token: admin(),
      json: { title: "Suv o'chadi", body: "Ertaga soat 9 dan 14 gacha suv o'chiriladi", isImportant: true },
    });
    expect(draft.body.status).toBe('DRAFT');
    const id = draft.body.id as string;
    expect((await t.req('GET', `/api/v1/announcements/${id}`, { token: w.residents[0]!.token })).status).toBe(404);
    expect((await t.req('GET', '/api/v1/announcements', { token: w.residents[0]!.token })).body.items).toHaveLength(0);
    expect((await t.req('GET', '/api/v1/announcements', { token: admin() })).body.items).toHaveLength(1);

    await t.req('POST', `/api/v1/admin/announcements/${id}/publish`, { token: admin() });
    await t.req('POST', `/api/v1/admin/announcements/${id}/publish`, { token: admin() }); // idempotent
    expect(await fanoutPendingAnnouncements(t.deps)).toBe(4); // admin + 3 aholi
    expect(await fanoutPendingAnnouncements(t.deps)).toBe(0); // fan-out belgilangan
    for (const u of [...w.residents, w.admin]) {
      expect(await notes(u.id, 'IMPORTANT_ANNOUNCEMENT')).toHaveLength(1);
    }
    expect(t.deps.env.EXPO_ACCESS_TOKEN).toBeUndefined();
    expect(await runPushWorker(t.deps)).toBe(0); // push o'chirilgan, lekin ichki bildirishnomalar bor

    const plain = await t.req('POST', '/api/v1/admin/announcements', { token: admin(), json: { title: 'Oddiy xabar', body: 'Oddiy e’lon matni' } });
    await t.req('POST', `/api/v1/admin/announcements/${plain.body.id}/publish`, { token: admin() });
    expect(await fanoutPendingAnnouncements(t.deps)).toBe(0);
    expect((await t.req('GET', '/api/v1/announcements', { token: w.residents[0]!.token })).body.items).toHaveLength(2);

    // faqat qoralamani o'chirish mumkin
    expect((await t.req('DELETE', `/api/v1/admin/announcements/${id}`, { token: admin() })).status).toBe(409);
    const another = await t.req('POST', '/api/v1/admin/announcements', { token: admin(), json: { title: 'Vaqtincha qoralama', body: 'Bu o‘chiriladi' } });
    expect((await t.req('DELETE', `/api/v1/admin/announcements/${another.body.id}`, { token: admin() })).status).toBe(204);
  });

  it("push: yangi qatorlar uchun ketadi (Expo'ga), DeviceNotRegistered token o'chiriladi, dublikat yaratilmaydi", async () => {
    const calls: Array<{ url: string; body: Array<{ to: string; data: Record<string, string> }> }> = [];
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
      const url = String(input);
      if (!url.startsWith('https://exp.host')) return realFetch(input, init);
      const body = JSON.parse(String(init?.body)) as Array<{ to: string; data: Record<string, string> }>;
      calls.push({ url, body });
      return new Response(
        JSON.stringify({ data: body.map((m) => (m.to.includes('dead') ? { status: 'error', details: { error: 'DeviceNotRegistered' } } : { status: 'ok', id: `t-${m.to}` })) }),
        { status: 200 },
      );
    }) as typeof fetch;

    try {
      const pushDeps = { ...t.deps, env: { ...t.deps.env, EXPO_ACCESS_TOKEN: 'test-token' } };
      const r0 = w.residents[0]!;
      await t.req('PUT', '/api/v1/devices', { token: r0.token, json: { expoPushToken: 'ExponentPushToken[alive-token-1]', platform: 'android' } });
      await t.req('PUT', '/api/v1/devices', { token: r0.token, json: { expoPushToken: 'ExponentPushToken[dead-token-1]', platform: 'ios' } });
      expect((await t.req('PUT', '/api/v1/devices', { token: r0.token, json: { expoPushToken: 'ExponentPushToken[alive-token-1]', platform: 'android' } })).status).toBe(204);

      const id = await publishedEvent();
      await t.req('PUT', `/api/v1/events/${id}/rsvp`, { token: r0.token });
      await t.req('POST', `/api/v1/admin/events/${id}/cancel`, { token: admin(), json: {} });
      await t.req('POST', `/api/v1/admin/events/${id}/cancel`, { token: admin(), json: {} }); // takror: yangi qator yo'q

      expect(await runPushWorker(pushDeps)).toBe(1);
      expect(await runPushWorker(pushDeps)).toBe(0); // allaqachon yuborilgan
      expect(calls).toHaveLength(1);
      expect(calls[0]!.body.map((m) => m.to).sort()).toEqual(['ExponentPushToken[alive-token-1]', 'ExponentPushToken[dead-token-1]']);
      expect(calls[0]!.body[0]!.data).toMatchObject({ type: 'EVENT_CANCELLED', entityType: 'EVENT', entityId: id });
      expect(calls[0]!.body[0]!.data['notificationId']).toBeTruthy();

      const tokens = await t.db.query<{ expo_push_token: string }>('SELECT expo_push_token FROM device_tokens');
      expect(tokens.rows.map((x) => x.expo_push_token)).toEqual(['ExponentPushToken[alive-token-1]']);
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});

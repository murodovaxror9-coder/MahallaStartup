import sharp from 'sharp';
import type { Actor, TestApp } from './helpers';
import { actor, createMahalla } from './helpers';

let counter = 0;
const uniq = () => `${Date.now().toString(36)}${(counter += 1).toString(36)}`;

export interface World {
  mahallaId: string;
  admin: Actor;
  residents: Actor[];
}

/** Bitta mahalla: admin + `n` ta aholi (haqiqiy /auth/login orqali kirgan). */
export async function world(t: TestApp, slug = 'mahalla-a', n = 4): Promise<World> {
  const mahallaId = await createMahalla(t, slug, `Mahalla ${slug}`);
  const s = slug.replace(/[^a-z0-9]/g, '_');
  const admin = await actor(t, mahallaId, `admin.${s}`.slice(0, 32), 'MAHALLA_ADMIN');
  const residents: Actor[] = [];
  for (let i = 0; i < n; i += 1) residents.push(await actor(t, mahallaId, `r${i}.${s}`.slice(0, 32)));
  return { mahallaId, admin, residents };
}

export const key = () => `idem-${uniq()}-${uniq()}`;

export async function createIssue(
  t: TestApp,
  who: Actor,
  over: Partial<{ title: string; description: string; category: string; locationText: string; mediaIds: string[]; key: string }> = {},
) {
  const res = await t.req('POST', '/api/v1/issues', {
    token: who.token,
    headers: { 'Idempotency-Key': over.key ?? key() },
    json: {
      title: over.title ?? `Muammo ${uniq()}`,
      description: over.description ?? "Ko'cha chirog'i ishlamayapti, kechasi qorong'i",
      category: over.category ?? 'LIGHTING',
      locationText: over.locationText ?? "Navoiy ko'chasi 12",
      mediaIds: over.mediaIds ?? [],
    },
  });
  return res;
}

/** Aholi yuboradi, admin tasdiqlaydi -> OPEN (joriy davrda). */
export async function openIssue(t: TestApp, w: World, who: Actor, title?: string): Promise<string> {
  const created = await createIssue(t, who, title ? { title } : {});
  if (created.status !== 201) throw new Error(`createIssue: ${created.status} ${JSON.stringify(created.body)}`);
  const id = created.body.id as string;
  const approved = await t.req('POST', `/api/v1/admin/issues/${id}/approve`, { token: w.admin.token });
  if (approved.status !== 200) throw new Error(`approve: ${approved.status} ${JSON.stringify(approved.body)}`);
  return id;
}

/** Haqiqiy JPEG (ixtiyoriy: GPS EXIF bilan). */
export async function jpeg(opts: { width?: number; height?: number; gps?: boolean } = {}): Promise<Buffer> {
  let img = sharp({
    create: { width: opts.width ?? 640, height: opts.height ?? 480, channels: 3, background: { r: 40, g: 120, b: 200 } },
  });
  if (opts.gps) {
    img = img.withExif({
      IFD0: { Make: 'TestCam', Copyright: 'maxfiy' },
      IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '41/1 18/1 0/1', GPSLongitudeRef: 'E', GPSLongitude: '69/1 16/1 0/1' },
    });
  }
  return img.jpeg().toBuffer();
}

export async function upload(
  t: TestApp,
  who: Actor,
  file: Buffer,
  opts: { name?: string; type?: string; clientUploadId?: string } = {},
) {
  const form = new FormData();
  form.append('clientUploadId', opts.clientUploadId ?? crypto.randomUUID());
  form.append('file', new Blob([new Uint8Array(file)], { type: opts.type ?? 'image/jpeg' }), opts.name ?? 'foto.jpg');
  return t.req('POST', '/api/v1/media', { token: who.token, form });
}

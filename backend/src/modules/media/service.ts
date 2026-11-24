import type { Request } from 'express';
import Busboy from 'busboy';
import sharp from 'sharp';
import { AppError } from '../../common/app-error';
import type { Deps } from '../../core/deps';
import { uuidv7 } from '../../core/ids';
import { isUniqueViolation } from '../../core/sql';
import type { AuthUser } from '../../core/types';
import { detectMedia, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, type Detected } from './detect';

interface Upload {
  file: Buffer;
  detected: Detected;
  fields: Record<string, string>;
}

/**
 * Multipart'ni OQIM davomida o'qiydi: hajm chegarasi oshsa darhol uziladi (rasm 5 MB, video 25 MB -> 413),
 * tur magic bytes bilan aniqlanadi (soxta kengaytma -> 415).
 */
function readUpload(req: Request): Promise<Upload> {
  return new Promise((resolve, reject) => {
    let bb: ReturnType<typeof Busboy>;
    try {
      bb = Busboy({
        headers: req.headers,
        limits: { files: 1, fields: 6, fieldSize: 1024, fileSize: MAX_VIDEO_BYTES + 1 },
      });
    } catch {
      reject(new AppError('VALIDATION_ERROR', "Content-Type multipart/form-data bo'lishi kerak"));
      return;
    }

    const fields: Record<string, string> = {};
    const chunks: Buffer[] = [];
    let total = 0;
    let detected: Detected | null = null;
    let gotFile = false;
    let failed = false;

    const fail = (err: AppError) => {
      if (failed) return;
      failed = true;
      // busboy'ni to'satdan yopmaymiz (ulanish uzilib 413 o'rniga ECONNRESET bo'ladi):
      // qolgan tanani tashlab yuboramiz va xatoni darhol qaytaramiz.
      req.unpipe(bb);
      req.resume();
      reject(err);
    };

    bb.on('field', (name, value) => {
      fields[name] = value;
    });

    bb.on('file', (_name, stream) => {
      gotFile = true;
      stream.on('data', (chunk: Buffer) => {
        if (failed) return;
        chunks.push(chunk);
        total += chunk.length;
        if (!detected && total >= 16) {
          detected = detectMedia(Buffer.concat(chunks));
          if (!detected) return fail(new AppError('UNSUPPORTED_MEDIA_TYPE'));
        }
        const max = detected?.kind === 'IMAGE' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
        if (total > max) fail(new AppError('FILE_TOO_LARGE'));
      });
      stream.on('limit', () => fail(new AppError('FILE_TOO_LARGE')));
    });

    bb.on('error', () => fail(new AppError('VALIDATION_ERROR', "Yuklash so'rovi noto'g'ri")));
    bb.on('close', () => {
      if (failed) return;
      if (!gotFile || total === 0) return reject(new AppError('VALIDATION_ERROR', undefined, { fields: { file: 'Fayl majburiy' } }));
      const file = Buffer.concat(chunks);
      detected ??= detectMedia(file);
      if (!detected) return reject(new AppError('UNSUPPORTED_MEDIA_TYPE'));
      const max = detected.kind === 'IMAGE' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
      if (file.length > max) return reject(new AppError('FILE_TOO_LARGE'));
      resolve({ file, detected, fields });
    });

    req.pipe(bb);
  });
}

export interface MediaResult {
  mediaId: string;
  kind: 'IMAGE' | 'VIDEO';
  width: number | null;
  height: number | null;
  sizeBytes: number;
}

interface MediaRowLite {
  id: string;
  kind: 'IMAGE' | 'VIDEO';
  width: number | null;
  height: number | null;
  size_bytes: number;
}

const toResult = (m: MediaRowLite): MediaResult => ({
  mediaId: m.id,
  kind: m.kind,
  width: m.width,
  height: m.height,
  sizeBytes: m.size_bytes,
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Yuklash. Rasm: auto-rotate, BARCHA metadata (EXIF/GPS) o'chiriladi, eng uzun tomon 2048 px,
 * JPEG q80 + 480 px thumbnail. Video: o'zgartirilmay saqlanadi (metadata tozalash keyingi bosqich).
 * `UNIQUE(owner, clientUploadId)`: qayta urinish dublikat yaratmaydi.
 */
export async function uploadMedia(
  deps: Deps,
  user: AuthUser,
  req: Request,
): Promise<{ result: MediaResult; created: boolean }> {
  const { file, detected, fields } = await readUpload(req);
  const clientUploadId = fields['clientUploadId'] ?? '';
  if (!UUID_RE.test(clientUploadId)) {
    throw new AppError('VALIDATION_ERROR', undefined, { fields: { clientUploadId: 'UUID majburiy' } });
  }

  const find = () =>
    deps.db.query<MediaRowLite>(
      'SELECT id, kind, width, height, size_bytes FROM media WHERE owner_id = $1 AND client_upload_id = $2',
      [user.userId, clientUploadId],
    );
  const existing = await find();
  if (existing.rows[0]) return { result: toResult(existing.rows[0]), created: false };

  const id = uuidv7();
  let storageKey: string;
  let thumbKey: string | null = null;
  let mime: string;
  let width: number | null = null;
  let height: number | null = null;
  let size: number;

  if (detected.kind === 'IMAGE') {
    try {
      const base = sharp(file, { failOn: 'error', limitInputPixels: 50_000_000 }).rotate();
      const main = await base
        .clone()
        .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer({ resolveWithObject: true });
      const thumb = await base
        .clone()
        .resize({ width: 480, height: 480, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 75 })
        .toBuffer();
      storageKey = `${id}.jpg`;
      thumbKey = `${id}_t.jpg`;
      mime = 'image/jpeg';
      width = main.info.width;
      height = main.info.height;
      size = main.data.length;
      await deps.storage.put(storageKey, main.data, mime);
      await deps.storage.put(thumbKey, thumb, mime);
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError('UNSUPPORTED_MEDIA_TYPE', "Rasm buzilgan yoki o'qib bo'lmaydi");
    }
  } else {
    const ext = detected.format === 'mov' ? 'mov' : 'mp4';
    storageKey = `${id}.${ext}`;
    mime = detected.format === 'mov' ? 'video/quicktime' : 'video/mp4';
    size = file.length;
    await deps.storage.put(storageKey, file, mime);
  }

  try {
    await deps.db.query(
      `INSERT INTO media (id, owner_id, mahalla_id, kind, storage_key, thumb_key, mime, size_bytes, width, height, client_upload_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [id, user.userId, user.mahallaId, detected.kind, storageKey, thumbKey, mime, size, width, height, clientUploadId, deps.clock.now()],
    );
  } catch (err) {
    // Parallel qayta urinish allaqachon yozgan: o'sha media qaytadi, ortiqcha fayllar o'chiriladi
    await deps.storage.delete(storageKey).catch(() => undefined);
    if (thumbKey) await deps.storage.delete(thumbKey).catch(() => undefined);
    if (isUniqueViolation(err)) {
      const again = await find();
      if (again.rows[0]) return { result: toResult(again.rows[0]), created: false };
    }
    throw err;
  }

  return { result: { mediaId: id, kind: detected.kind, width, height, sizeBytes: size }, created: true };
}

/** Bog'lanmagan media 24 soatdan keyin o'chiriladi (job). */
export async function cleanupOrphanMedia(deps: Deps, now: Date): Promise<number> {
  const cutoff = new Date(now.getTime() - 24 * 3600_000);
  const r = await deps.db.query<{ id: string; storage_key: string; thumb_key: string | null }>(
    `SELECT id, storage_key, thumb_key FROM media
      WHERE issue_id IS NULL AND issue_update_id IS NULL AND event_id IS NULL AND created_at < $1
      ORDER BY created_at LIMIT 200`,
    [cutoff],
  );
  for (const m of r.rows) {
    await deps.storage.delete(m.storage_key).catch(() => undefined);
    if (m.thumb_key) await deps.storage.delete(m.thumb_key).catch(() => undefined);
    await deps.db.query('DELETE FROM media WHERE id = $1', [m.id]);
  }
  return r.rows.length;
}

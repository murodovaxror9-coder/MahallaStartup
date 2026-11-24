'use client';
import { ImagePlus } from 'lucide-react';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { Media, UploadedMedia } from '@/lib/types';
import { Button, Notice } from './ui';

export function MediaGrid({ media }: { media: Media[] }) {
  if (!media.length) return null;
  return (
    <div className="media-grid">
      {media.map((m) =>
        m.kind === 'VIDEO' ? (
          <video key={m.id} src={m.url} controls preload="metadata" />
        ) : (
          // Imzoli havola 5 daqiqa amal qiladi, next/image optimizatsiyasi kerak emas
          <a key={m.id} href={m.url} target="_blank" rel="noreferrer">
            <img src={m.thumbUrl ?? m.url} alt="Biriktirilgan rasm" loading="lazy" />
          </a>
        ),
      )}
    </div>
  );
}

/**
 * Rasm yuklash: har fayl alohida, xato bo'lsa qayta urinish.
 * `clientUploadId` bir xil qoladi, shuning uchun qayta urinish dublikat yaratmaydi.
 */
export function PhotoUpload({ onChange, max = 3 }: { onChange: (ids: string[]) => void; max?: number }) {
  const [items, setItems] = useState<{ file: File; key: string; mediaId?: string; error?: string; busy?: boolean }[]>([]);

  async function upload(idx: number, file: File, key: string) {
    setItems((s) => s.map((x, i) => (i === idx ? { ...x, busy: true, error: undefined } : x)));
    const form = new FormData();
    form.append('file', file);
    form.append('clientUploadId', key);
    try {
      const m = await api<UploadedMedia>('/media', { form });
      setItems((s) => {
        const next = s.map((x, i) => (i === idx ? { file, key, mediaId: m.mediaId } : x));
        onChange(next.flatMap((x) => (x.mediaId ? [x.mediaId] : [])));
        return next;
      });
    } catch (e) {
      setItems((s) => s.map((x, i) => (i === idx ? { file, key, error: (e as ApiError).message } : x)));
    }
  }

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, max - items.length);
    e.target.value = '';
    const start = items.length;
    const added = files.map((file) => ({ file, key: crypto.randomUUID(), busy: true }));
    setItems((s) => [...s, ...added]);
    added.forEach((x, k) => upload(start + k, x.file, x.key));
  }

  return (
    <div className="stack">
      <span style={{ fontWeight: 600, fontSize: 14 }}>Foto (ixtiyoriy, {max} tagacha, JPG/PNG/WebP, har biri 5 MB gacha)</span>
      {items.map((x, i) => (
        <div key={x.key} className="spread small">
          <span>{x.file.name}</span>
          {x.busy ? <span className="muted">Yuklanmoqda…</span> : x.mediaId ? <span style={{ color: 'var(--s-resolved)' }}>Yuklandi</span> : null}
          {x.error && (
            <>
              <Notice kind="error">{x.error}</Notice>
              <Button size="sm" onClick={() => upload(i, x.file, x.key)}>Qayta urinish</Button>
            </>
          )}
        </div>
      ))}
      {items.length < max && (
        <label className="btn btn-secondary btn-sm" style={{ width: 'fit-content' }}>
          <ImagePlus size={18} aria-hidden /> Foto qo‘shish
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={pick} />
        </label>
      )}
    </div>
  );
}

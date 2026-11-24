'use client';
import { ImagePlus } from 'lucide-react';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { Media } from '@/lib/types';
import { Button, Notice } from './ui';

export function MediaGrid({ media }: { media: Media[] }) {
  if (!media.length) return null;
  return (
    <div className="media-grid">
      {media.map((m) =>
        m.kind === 'VIDEO' ? (
          <video key={m.id} src={m.url} controls preload="metadata" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- qisqa muddatli private havola, next/image optimizatsiyasi kerak emas
          <img key={m.id} src={m.url} alt="Biriktirilgan rasm" loading="lazy" />
        ),
      )}
    </div>
  );
}

/** Rasm yuklash: har fayl alohida, xato bo'lsa qayta urinish. Yuklangan ID'lar onChange orqali. */
export function PhotoUpload({ onChange, max = 3 }: { onChange: (ids: string[]) => void; max?: number }) {
  const [items, setItems] = useState<{ file: File; media?: Media; error?: string; busy?: boolean }[]>([]);

  async function upload(file: File, idx: number) {
    setItems((s) => s.map((x, i) => (i === idx ? { ...x, busy: true, error: undefined } : x)));
    const form = new FormData();
    form.append('file', file);
    try {
      const media = await api<Media>('/media', { form });
      setItems((s) => {
        const next = s.map((x, i) => (i === idx ? { file, media } : x));
        onChange(next.flatMap((x) => (x.media ? [x.media.id] : [])));
        return next;
      });
    } catch (e) {
      setItems((s) => s.map((x, i) => (i === idx ? { file, error: (e as ApiError).message } : x)));
    }
  }

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, max - items.length);
    e.target.value = '';
    const start = items.length;
    setItems((s) => [...s, ...files.map((file) => ({ file, busy: true }))]);
    files.forEach((f, k) => upload(f, start + k));
  }

  return (
    <div className="stack">
      <span style={{ fontWeight: 600, fontSize: 14 }}>Foto (ixtiyoriy, {max} tagacha, har biri 5 MB gacha)</span>
      {items.map((x, i) => (
        <div key={i} className="spread small">
          <span>{x.file.name}</span>
          {x.busy ? <span className="muted">Yuklanmoqda…</span> : x.media ? <span style={{ color: 'var(--s-resolved)' }}>Yuklandi</span> : null}
          {x.error && (
            <>
              <Notice kind="error">{x.error}</Notice>
              <Button size="sm" onClick={() => upload(x.file, i)}>Qayta urinish</Button>
            </>
          )}
        </div>
      ))}
      {items.length < max && (
        <label className="btn btn-secondary btn-sm" style={{ width: 'fit-content' }}>
          <ImagePlus size={18} aria-hidden /> Foto qo‘shish
          <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple hidden onChange={pick} />
        </label>
      )}
    </div>
  );
}

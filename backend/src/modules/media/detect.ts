export type Detected =
  | { kind: 'IMAGE'; format: 'jpeg' | 'png' | 'webp' }
  | { kind: 'VIDEO'; format: 'mp4' | 'mov' };

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
// HEIC/HEIF (`heic`, `mif1`, ...) ham `ftyp` bilan boshlanadi, lekin ruxsat etilmaydi
const MP4_BRANDS = new Set(['isom', 'iso2', 'iso4', 'iso5', 'iso6', 'mp41', 'mp42', 'avc1', 'M4V ', 'dash']);

/** Fayl turini kengaytma/Content-Type bo'yicha emas, MAGIC BYTES bo'yicha aniqlaydi. */
export function detectMedia(buf: Buffer): Detected | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { kind: 'IMAGE', format: 'jpeg' };
  }
  if (buf.length >= 8 && buf.subarray(0, 8).equals(PNG)) return { kind: 'IMAGE', format: 'png' };
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    return { kind: 'IMAGE', format: 'webp' };
  }
  if (buf.length >= 12 && buf.toString('ascii', 4, 8) === 'ftyp') {
    const brand = buf.toString('ascii', 8, 12);
    if (brand === 'qt  ') return { kind: 'VIDEO', format: 'mov' };
    if (MP4_BRANDS.has(brand)) return { kind: 'VIDEO', format: 'mp4' };
  }
  return null;
}

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

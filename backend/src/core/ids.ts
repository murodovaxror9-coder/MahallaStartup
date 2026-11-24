import { randomBytes } from 'node:crypto';

let lastMs = 0;
let seq = 0;

/**
 * UUIDv7 (RFC 9562): vaqt bo'yicha tartiblanadi, jarayon ichida monoton (12-bit hisoblagich).
 * Cursor pagination va chatdagi `after=<id>` shunga tayanadi.
 */
export function uuidv7(nowMs: number = Date.now()): string {
  let ms = nowMs;
  if (ms > lastMs) {
    lastMs = ms;
    seq = randomBytes(2).readUInt16BE(0) & 0x7ff; // yuqori bitni bo'sh qoldiramiz: o'sishga joy
  } else {
    seq += 1;
    if (seq > 0xfff) {
      lastMs += 1;
      seq = 0;
    }
    ms = lastMs;
  }

  const b = randomBytes(16);
  const t = BigInt(ms);
  b[0] = Number((t >> 40n) & 0xffn);
  b[1] = Number((t >> 32n) & 0xffn);
  b[2] = Number((t >> 24n) & 0xffn);
  b[3] = Number((t >> 16n) & 0xffn);
  b[4] = Number((t >> 8n) & 0xffn);
  b[5] = Number(t & 0xffn);
  b[6] = 0x70 | ((seq >> 8) & 0x0f);
  b[7] = seq & 0xff;
  b[8] = ((b[8] ?? 0) & 0x3f) | 0x80;

  const h = b.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

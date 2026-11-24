import { randomInt } from 'node:crypto';
import argon2 from 'argon2';

const OPTIONS = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export const hashPassword = (plain: string): Promise<string> => argon2.hash(plain, OPTIONS);

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

// Chalkash belgilarsiz: 0 O 1 l I yo'q
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

/** Vaqtinchalik parol: 10 belgi, kriptografik tasodifiy. */
export function generateTempPassword(length = 10): string {
  let out = '';
  for (let i = 0; i < length; i += 1) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

let dummyHash: Promise<string> | undefined;

/** Login'da foydalanuvchi topilmasa ham xuddi shuncha vaqt sarflash uchun (user enumeration'ga qarshi). */
export function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword('mahalladosh-dummy-password');
  return dummyHash;
}

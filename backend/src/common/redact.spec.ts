import { describe, expect, it } from 'vitest';
import { REDACTED, redactSecrets } from './redact';

describe('redactSecrets', () => {
  it('parol, token va push token maydonlarini yashiradi (rekursiv)', () => {
    const input = {
      login: 'ali',
      password: 'p1',
      newPassword: 'p2',
      temporaryPassword: 'p3',
      session: { token: 'abc', tokenHash: 'h' },
      devices: [{ expoPushToken: 'ExponentPushToken[x]', platform: 'ios' }],
      headers: { authorization: 'Bearer x', cookie: 'mhd_session=1' },
    };
    const out = redactSecrets(input);
    expect(out).toEqual({
      login: 'ali',
      password: REDACTED,
      newPassword: REDACTED,
      temporaryPassword: REDACTED,
      session: { token: REDACTED, tokenHash: REDACTED },
      devices: [{ expoPushToken: REDACTED, platform: 'ios' }],
      headers: { authorization: REDACTED, cookie: REDACTED },
    });
  });

  it('asl obyektni o\'zgartirmaydi', () => {
    const input = { password: 'secret' };
    redactSecrets(input);
    expect(input.password).toBe('secret');
  });

  it('primitiv va Date qiymatlarni o\'zgartirmaydi', () => {
    const d = new Date();
    expect(redactSecrets(5)).toBe(5);
    expect(redactSecrets(null)).toBeNull();
    expect(redactSecrets({ at: d }).at).toBe(d);
  });
});

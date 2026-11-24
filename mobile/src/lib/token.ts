import * as SecureStore from 'expo-secure-store';

const KEY = 'mhd_token';
let cached: string | null = null;

export async function loadToken(): Promise<string | null> {
  try {
    cached = await SecureStore.getItemAsync(KEY);
  } catch {
    cached = null;
  }
  return cached;
}

export function getToken(): string | null {
  return cached;
}

export async function saveToken(token: string): Promise<void> {
  cached = token;
  await SecureStore.setItemAsync(KEY, token);
}

export async function clearToken(): Promise<void> {
  cached = null;
  await SecureStore.deleteItemAsync(KEY).catch(() => undefined);
}

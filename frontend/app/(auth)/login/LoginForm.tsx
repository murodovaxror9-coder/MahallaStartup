'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Field } from '@/components/Field';
import { ApiError, api } from '@/lib/api';

// API: POST /auth/login { login, password, client: "web" } -> Set-Cookie mhd_session
export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    try {
      const res = await api<{ mustChangePassword: boolean }>('/auth/login', {
        method: 'POST',
        json: {
          login: String(form.get('login') ?? '').trim().toLowerCase(),
          password: String(form.get('password') ?? ''),
          client: 'web',
        },
      });
      router.replace(res.mustChangePassword ? '/change-password' : '/');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Serverga ulanib bo'lmadi");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <Field label="Login">
        <input className="input" name="login" autoComplete="username" required />
      </Field>
      <Field label="Parol">
        <input
          className="input"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>
      {error ? <p className="error-text">{error}</p> : null}
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? 'Kirilmoqda...' : 'Kirish'}
      </button>
    </form>
  );
}

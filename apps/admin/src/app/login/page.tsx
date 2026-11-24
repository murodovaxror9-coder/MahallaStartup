'use client';
import { LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api, formValues, useAction } from '@/lib/api';
import type { Me } from '@/lib/types';
import { Button, Field, Notice } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const { pending, error, run } = useAction();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = formValues(e.currentTarget);
    const r = await run(() => api<{ me: Me }>('/auth/login', { body: { login: v.login.trim(), password: v.password, client: 'web' } }));
    if (r) router.replace(r.me.mustChangePassword ? '/parol' : '/');
  }

  return (
    <main className="login-wrap">
      <form className="card login-card stack" onSubmit={submit} noValidate>
        <div className="brand" style={{ padding: 0 }}>
          <div className="brand-mark" aria-hidden>M</div>
          <div>
            <b>Mahalladosh</b>
            <span>Mahalla admini uchun panel</span>
          </div>
        </div>
        <h1>Kirish</h1>
        {error && <Notice kind="error">{error.message}</Notice>}
        <Field label="Login" name="login" autoComplete="username" required autoFocus />
        <Field label="Parol" name="password" type="password" autoComplete="current-password" required />
        <Button type="submit" variant="primary" icon={LogIn} loading={pending}>
          Kirish
        </Button>
        <p className="muted small">Akkaunt platforma operatori tomonidan ochiladi. Parolni unutsangiz, operatorga murojaat qiling.</p>
      </form>
    </main>
  );
}

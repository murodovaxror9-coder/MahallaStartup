'use client';
import { LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api, ApiError, formValues, useAction } from '@/lib/api';
import type { Me } from '@/lib/types';
import { Button, Field, Notice } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const { pending, error, run } = useAction();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = formValues(e.currentTarget);
    const r = await run(() => api<Pick<Me, 'user' | 'mustChangePassword'>>('/auth/login', { json: { login: (v.login ?? '').trim().toLowerCase(), password: v.password, client: 'web' } }));
    if (!r) return;
    if (r.user.role !== 'MAHALLA_ADMIN') {
      await api('/auth/logout', { method: 'POST' }).catch(() => {});
      run(() => Promise.reject(new ApiError(403, 'FORBIDDEN', 'Veb-panel faqat mahalla admini uchun. Aholi mobil ilovadan foydalanadi.')));
      return;
    }
    router.replace(r.mustChangePassword ? '/change-password' : '/');
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
        <Field label="Login" name="login" autoComplete="username" autoCapitalize="none" required autoFocus />
        <Field label="Parol" name="password" type="password" autoComplete="current-password" required />
        <Button type="submit" variant="primary" icon={LogIn} loading={pending}>
          Kirish
        </Button>
        <p className="muted small">Admin akkaunti platforma operatori tomonidan ochiladi. Parolni unutsangiz, operatorga murojaat qiling.</p>
      </form>
    </main>
  );
}

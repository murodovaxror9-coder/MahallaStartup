'use client';
import { KeyRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, formValues, useAction } from '@/lib/api';
import { Button, Field, Notice } from '@/components/ui';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { pending, error, run } = useAction();
  const [mismatch, setMismatch] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = formValues(e.currentTarget);
    setMismatch(v.newPassword !== v.repeat);
    if (v.newPassword !== v.repeat) return;
    const ok = await run(async () => {
      await api('/auth/change-password', { json: { currentPassword: v.currentPassword, newPassword: v.newPassword } });
      return true;
    });
    if (ok) router.replace('/');
  }

  const fe = error?.fields ?? {};
  return (
    <main className="login-wrap">
      <form className="card login-card stack" onSubmit={submit} noValidate>
        <h1>Yangi parol o‘rnating</h1>
        <p className="muted">Davom etish uchun vaqtinchalik parolni o‘zingizning parolingizga almashtiring. Boshqa qurilmalardagi sessiyalar yopiladi.</p>
        {error && !fe.currentPassword && !fe.newPassword && <Notice kind="error">{error.message}</Notice>}
        <Field label="Joriy (vaqtinchalik) parol" name="currentPassword" type="password" autoComplete="current-password" error={fe.currentPassword} required />
        <Field label="Yangi parol" name="newPassword" type="password" autoComplete="new-password" hint="Kamida 8 belgi" minLength={8} error={fe.newPassword} required />
        <Field label="Yangi parolni takrorlang" name="repeat" type="password" autoComplete="new-password" error={mismatch ? 'Parollar mos emas' : undefined} required />
        <Button type="submit" variant="primary" icon={KeyRound} loading={pending}>
          Saqlash va davom etish
        </Button>
      </form>
    </main>
  );
}

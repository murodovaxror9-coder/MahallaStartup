'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export function Topbar() {
  const router = useRouter();

  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' });
    } finally {
      router.replace('/login');
      router.refresh();
    }
  }

  return (
    <div className="topbar">
      {/* TODO(api): GET /me -> mahalla nomi va foydalanuvchi ismi */}
      <span className="muted">Mahalla admini</span>
      <Link href="/change-password" className="btn btn-ghost">
        Parolni almashtirish
      </Link>
      <button type="button" className="btn" onClick={logout}>
        Chiqish
      </button>
    </div>
  );
}

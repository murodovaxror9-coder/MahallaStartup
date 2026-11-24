'use client';
import {
  CalendarDays,
  ClipboardList,
  Flag,
  History,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  ShieldCheck,
  Users,
  Vote,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, useApi } from '@/lib/api';
import type { Me } from '@/lib/types';
import { Button, ErrorState, Loading } from '@/components/ui';

const NAV = [
  ['/', 'Umumiy ko‘rsatkichlar', LayoutDashboard],
  ['/moderatsiya', 'Moderatsiya navbati', ShieldCheck],
  ['/muammolar', 'Muammolar', ClipboardList],
  ['/ovoz', 'Ovoz natijalari', Vote],
  ['/aholi', 'Aholi', Users],
  ['/tadbirlar', 'Tadbirlar', CalendarDays],
  ['/elonlar', 'E’lonlar', Megaphone],
  ['/shikoyatlar', 'Shikoyatlar', Flag],
  ['/jurnal', 'Amallar jurnali', History],
] as const;

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const me = useApi<Me>('/me');
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (me.data?.mustChangePassword) router.replace('/parol');
  }, [me.data, router]);

  if (me.error && !me.data) return <main className="main"><ErrorState error={me.error} onRetry={me.reload} /></main>;
  if (!me.data || me.data.mustChangePassword) return <main className="main"><Loading /></main>;

  const active = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));
  async function logout() {
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    router.replace('/login');
  }

  return (
    <div className="shell">
      <a href="#content" className="skip">Asosiy qismga o‘tish</a>
      <header className="topbar">
        <b>{me.data.mahalla.name}</b>
        <Button variant="ghost" size="sm" icon={Menu} onClick={() => setOpen(true)} aria-label="Menyuni ochish" aria-expanded={open} aria-controls="side" />
      </header>
      <aside className="side" id="side" data-open={open}>
        <div className="brand spread">
          <div className="row">
            <div className="brand-mark" aria-hidden>M</div>
            <div>
              <b>{me.data.mahalla.name}</b>
              <span>Mahalladosh admin</span>
            </div>
          </div>
          {open && <Button variant="ghost" size="sm" icon={X} onClick={() => setOpen(false)} aria-label="Menyuni yopish" />}
        </div>
        <nav className="nav" aria-label="Asosiy bo‘limlar">
          {NAV.map(([href, label, Icon]) => (
            <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={active(href) ? 'page' : undefined}>
              <Icon size={20} aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
        <div className="side-foot">
          <div className="small">
            <b>{me.data.displayName}</b>
            <div className="muted">Mahalla admini</div>
          </div>
          <Button variant="ghost" size="sm" icon={LogOut} onClick={logout}>
            Chiqish
          </Button>
        </div>
      </aside>
      <main className="main" id="content" tabIndex={-1}>{children}</main>
    </div>
  );
}

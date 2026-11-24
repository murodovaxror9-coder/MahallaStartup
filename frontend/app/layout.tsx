import type { Metadata } from 'next';
import { Golos_Text } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

const golos = Golos_Text({ subsets: ['latin', 'cyrillic'], variable: '--font-golos', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Mahalladosh Admin', template: '%s · Mahalladosh' },
  description: 'Mahalla adminlari uchun boshqaruv paneli',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="uz" className={golos.variable}>
      <body>{children}</body>
    </html>
  );
}

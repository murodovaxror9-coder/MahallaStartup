import type { Metadata } from 'next';
import { Golos_Text } from 'next/font/google';
import './globals.css';

const golos = Golos_Text({ subsets: ['latin', 'cyrillic'], variable: '--font-golos', display: 'swap' });

export const metadata: Metadata = { title: 'Mahalladosh — admin', description: 'Mahalla xodimlari uchun boshqaruv paneli' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" className={golos.variable}>
      <body>{children}</body>
    </html>
  );
}

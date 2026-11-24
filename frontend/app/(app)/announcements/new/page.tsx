import type { Metadata } from 'next';
import Link from 'next/link';
import { AnnouncementFields } from '@/components/AnnouncementFields';
import { PageHeader } from '@/components/PageHeader';
import { Section } from '@/components/Section';

export const metadata: Metadata = { title: "Yangi e'lon" };

// API: POST /admin/announcements  (DRAFT, keyin /publish)
export default function NewAnnouncementPage() {
  return (
    <>
      <PageHeader
        title="Yangi e'lon"
        actions={
          <Link href="/announcements" className="btn">
            Ro&apos;yxatga qaytish
          </Link>
        }
      />
      <Section>
        <AnnouncementFields />
        <button type="button" className="btn btn-primary" data-endpoint="POST /admin/announcements">
          Qoralama sifatida saqlash
        </button>
      </Section>
    </>
  );
}

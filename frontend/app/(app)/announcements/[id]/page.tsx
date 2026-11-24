import type { Metadata } from 'next';
import Link from 'next/link';
import { AnnouncementFields } from '@/components/AnnouncementFields';
import { PageHeader } from '@/components/PageHeader';
import { Section } from '@/components/Section';

export const metadata: Metadata = { title: "E'lon" };

// API: GET    /announcements/:id
//      PATCH  /admin/announcements/:id
//      POST   /admin/announcements/:id/publish   (idempotent)
//      DELETE /admin/announcements/:id           (faqat qoralama)
export default async function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      <PageHeader
        title="E'lon"
        description={`#${id}`}
        actions={
          <Link href="/announcements" className="btn">
            Ro&apos;yxatga qaytish
          </Link>
        }
      />
      <Section>
        <AnnouncementFields />
        <div className="actions">
          <button type="button" className="btn" data-endpoint="PATCH /admin/announcements/:id">
            Saqlash
          </button>
          <button
            type="button"
            className="btn btn-primary"
            data-endpoint="POST /admin/announcements/:id/publish"
          >
            Nashr qilish
          </button>
          <button
            type="button"
            className="btn btn-danger"
            data-endpoint="DELETE /admin/announcements/:id"
          >
            {"O'chirish (qoralama)"}
          </button>
        </div>
      </Section>
    </>
  );
}

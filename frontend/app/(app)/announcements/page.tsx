import type { Metadata } from 'next';
import Link from 'next/link';
import { DataTable } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';

export const metadata: Metadata = { title: "E'lonlar" };

// API: GET /announcements?cursor  (admin qoralamalarni ham ko'radi)
export default function AnnouncementsPage() {
  return (
    <>
      <PageHeader
        title="E'lonlar"
        description="Mahalla a'zolariga e'lonlar"
        actions={
          <Link href="/announcements/new" className="btn btn-primary">
            {"Yangi e'lon"}
          </Link>
        }
      />
      <DataTable
        columns={[
          { key: 'title', label: 'Sarlavha' },
          { key: 'important', label: 'Muhim' },
          { key: 'status', label: 'Holat' },
          { key: 'publishedAt', label: 'Nashr sanasi' },
          { key: 'open', label: '' },
        ]}
        rows={[]}
        emptyTitle="E'lonlar yo'q"
      />
    </>
  );
}

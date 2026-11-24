import type { Metadata } from 'next';
import Link from 'next/link';
import { DataTable } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';

export const metadata: Metadata = { title: 'Tadbirlar' };

// API: GET /admin/events  (+ GET /events?scope=upcoming|past)
export default function EventsPage() {
  return (
    <>
      <PageHeader
        title="Tadbirlar"
        description="Mahalla tadbirlari va ro'yxatdan o'tganlar"
        actions={
          <Link href="/events/new" className="btn btn-primary">
            Yangi tadbir
          </Link>
        }
      />
      <DataTable
        columns={[
          { key: 'title', label: 'Nomi' },
          { key: 'startsAt', label: 'Boshlanish' },
          { key: 'location', label: 'Joy' },
          { key: 'status', label: 'Holat' },
          { key: 'rsvp', label: 'Yozilganlar' },
          { key: 'open', label: '' },
        ]}
        rows={[]}
        emptyTitle="Tadbirlar yo'q"
      />
    </>
  );
}

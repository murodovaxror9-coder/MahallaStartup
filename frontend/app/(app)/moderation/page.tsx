import type { Metadata } from 'next';
import { DataTable } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';

export const metadata: Metadata = { title: 'Moderatsiya navbati' };

// API: GET /admin/moderation/queue?cursor
export default function ModerationQueuePage() {
  return (
    <>
      <PageHeader
        title="Moderatsiya navbati"
        description="Aholi yuborgan va hali tasdiqlanmagan muammolar"
      />
      <DataTable
        columns={[
          { key: 'title', label: 'Sarlavha' },
          { key: 'author', label: 'Muallif' },
          { key: 'category', label: 'Toifa' },
          { key: 'createdAt', label: 'Yuborilgan' },
          { key: 'open', label: '' },
        ]}
        rows={[]}
        emptyTitle="Navbat bo'sh"
        emptyHint="Yangi muammolar kelganda shu yerda ko'rinadi."
      />
    </>
  );
}

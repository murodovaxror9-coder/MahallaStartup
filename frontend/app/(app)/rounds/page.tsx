import type { Metadata } from 'next';
import { DataTable } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';

export const metadata: Metadata = { title: 'Ovoz davrlari' };

// API: GET /admin/rounds?cursor
export default function RoundsPage() {
  return (
    <>
      <PageHeader
        title="Ovoz davrlari"
        description="Oylik ovoz berish davrlari va ularning natijalari"
      />
      <DataTable
        columns={[
          { key: 'period', label: 'Davr' },
          { key: 'status', label: 'Holat' },
          { key: 'voters', label: 'Ovoz berganlar' },
          { key: 'votes', label: 'Jami ovoz' },
          { key: 'winner', label: "G'olib" },
          { key: 'open', label: '' },
        ]}
        rows={[]}
        emptyTitle="Davrlar yo'q"
      />
    </>
  );
}

import type { Metadata } from 'next';
import { DataTable } from '@/components/DataTable';
import { Field, StatusSelect } from '@/components/Field';
import { PageHeader } from '@/components/PageHeader';
import { REPORT_STATUS_LABELS } from '@/lib/labels';

export const metadata: Metadata = { title: 'Shikoyatlar' };

// API: GET  /admin/reports?status&cursor
//      POST /admin/reports/:id/hide { reason } | /dismiss { reason? }
export default function ReportsPage() {
  return (
    <>
      <PageHeader
        title="Shikoyatlar"
        description="Aholi yuborgan shikoyatlar: muammo, izoh va chat xabarlari"
      />

      <form className="filters" method="get">
        <Field label="Holat">
          <StatusSelect name="status" options={REPORT_STATUS_LABELS} />
        </Field>
        <button type="submit" className="btn">
          {"Qo'llash"}
        </button>
      </form>

      <DataTable
        columns={[
          { key: 'type', label: 'Turi' },
          { key: 'content', label: 'Kontent' },
          { key: 'reporter', label: 'Shikoyatchi' },
          { key: 'reason', label: 'Sabab' },
          { key: 'status', label: 'Holat' },
          { key: 'createdAt', label: 'Sana' },
          { key: 'actions', label: 'Amallar' },
        ]}
        rows={[]}
        emptyTitle="Shikoyatlar yo'q"
      />
    </>
  );
}

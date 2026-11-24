import type { Metadata } from 'next';
import { DataTable } from '@/components/DataTable';
import { Field, StatusSelect } from '@/components/Field';
import { PageHeader } from '@/components/PageHeader';
import { ISSUE_STATUS_LABELS } from '@/lib/labels';

export const metadata: Metadata = { title: 'Muammolar' };

// API: GET /admin/issues?status&overdue&cursor
export default function AdminIssuesPage() {
  return (
    <>
      <PageHeader title="Muammolar" description="Mahalladagi barcha muammolar va ularning holati" />

      <form className="filters" method="get">
        <Field label="Holat">
          <StatusSelect name="status" options={ISSUE_STATUS_LABELS} />
        </Field>
        <label className="check">
          <input type="checkbox" name="overdue" value="true" />
          {"Faqat muddati o'tganlar"}
        </label>
        <button type="submit" className="btn">
          {"Qo'llash"}
        </button>
      </form>

      <DataTable
        columns={[
          { key: 'title', label: 'Sarlavha' },
          { key: 'category', label: 'Toifa' },
          { key: 'status', label: 'Holat' },
          { key: 'votes', label: 'Ovozlar' },
          { key: 'responsible', label: "Mas'ul" },
          { key: 'dueDate', label: 'Muddat' },
          { key: 'open', label: '' },
        ]}
        rows={[]}
        emptyTitle="Muammolar yo'q"
      />
    </>
  );
}

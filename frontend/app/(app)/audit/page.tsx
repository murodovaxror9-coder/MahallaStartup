import type { Metadata } from 'next';
import { DataTable } from '@/components/DataTable';
import { Field } from '@/components/Field';
import { PageHeader } from '@/components/PageHeader';

export const metadata: Metadata = { title: 'Audit jurnali' };

// API: GET /admin/audit?action&actorId&cursor
export default function AuditPage() {
  return (
    <>
      <PageHeader
        title="Audit jurnali"
        description="Adminlar va tizim amallari tarixi (parol va tokenlar yozilmaydi)"
      />

      <form className="filters" method="get">
        <Field label="Harakat">
          <input className="input" name="action" placeholder="masalan, issue.approve" />
        </Field>
        <Field label="Bajaruvchi ID">
          <input className="input" name="actorId" />
        </Field>
        <button type="submit" className="btn">
          {"Qo'llash"}
        </button>
      </form>

      <DataTable
        columns={[
          { key: 'createdAt', label: 'Vaqt' },
          { key: 'action', label: 'Harakat' },
          { key: 'actor', label: 'Bajaruvchi' },
          { key: 'target', label: 'Obyekt' },
          { key: 'reason', label: 'Sabab' },
          { key: 'ip', label: 'IP' },
        ]}
        rows={[]}
        emptyTitle="Yozuvlar yo'q"
      />
    </>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { DataTable } from '@/components/DataTable';
import { Field } from '@/components/Field';
import { PageHeader } from '@/components/PageHeader';

export const metadata: Metadata = { title: 'Aholi' };

// API: GET /admin/residents?query&status&cursor
export default function ResidentsPage() {
  return (
    <>
      <PageHeader
        title="Aholi"
        description="Mahalla a'zolari. Akkauntlarni faqat admin yaratadi."
        actions={
          <Link href="/residents/new" className="btn btn-primary">
            Yangi aholi
          </Link>
        }
      />

      <form className="filters" method="get">
        <Field label="Qidirish">
          <input className="input" name="query" placeholder="Ism, login yoki telefon" />
        </Field>
        <Field label="Holat">
          <select className="input" name="status" defaultValue="">
            <option value="">Hammasi</option>
            <option value="ACTIVE">Faol</option>
            <option value="BLOCKED">Bloklangan</option>
          </select>
        </Field>
        <button type="submit" className="btn">
          {"Qo'llash"}
        </button>
      </form>

      <DataTable
        columns={[
          { key: 'name', label: 'Ism' },
          { key: 'login', label: 'Login' },
          { key: 'phone', label: 'Telefon' },
          { key: 'status', label: 'Holat' },
          { key: 'createdAt', label: "Qo'shilgan" },
          { key: 'open', label: '' },
        ]}
        rows={[]}
        emptyTitle="Aholi yo'q"
        emptyHint="Birinchi aholini «Yangi aholi» tugmasi orqali qo'shing."
      />
    </>
  );
}

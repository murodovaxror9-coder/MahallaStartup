import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/Badge';
import { Field } from '@/components/Field';
import { PageHeader } from '@/components/PageHeader';
import { DefinitionList, Section } from '@/components/Section';

export const metadata: Metadata = { title: 'Aholi a\'zosi' };

// API: POST /admin/residents/:id/reset-password
//      POST /admin/residents/:id/block { reason } | /unblock
export default async function ResidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      <PageHeader
        title="Aholi a'zosi"
        description={`#${id}`}
        actions={
          <Link href="/residents" className="btn">
            Ro&apos;yxatga qaytish
          </Link>
        }
      />

      <Section title="Ma'lumotlar">
        <DefinitionList
          items={[
            ['Ism', '—'],
            ['Login', '—'],
            ['Telefon', '—'],
            ['Holat', <Badge key="s">—</Badge>],
            ["Parol almashtirilishi kerak", '—'],
            ["Qo'shilgan", '—'],
          ]}
        />
      </Section>

      <div className="grid-2">
        <Section title="Parolni tiklash">
          <p className="muted">
            Yangi vaqtinchalik parol yaratiladi; foydalanuvchining barcha sessiyalari bekor qilinadi.
          </p>
          <button type="button" className="btn" data-endpoint="POST /admin/residents/:id/reset-password">
            Parolni tiklash
          </button>
        </Section>

        <Section title="Bloklash">
          <div className="form-grid">
            <Field label="Sabab" wide>
              <input className="input" name="reason" />
            </Field>
          </div>
          <div className="actions">
            <button type="button" className="btn btn-danger" data-endpoint="POST /admin/residents/:id/block">
              Bloklash
            </button>
            <button type="button" className="btn" data-endpoint="POST /admin/residents/:id/unblock">
              Blokdan chiqarish
            </button>
          </div>
        </Section>
      </div>
    </>
  );
}

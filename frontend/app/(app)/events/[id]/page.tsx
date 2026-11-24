import type { Metadata } from 'next';
import Link from 'next/link';
import { DataTable } from '@/components/DataTable';
import { EventFields } from '@/components/EventFields';
import { Field } from '@/components/Field';
import { PageHeader } from '@/components/PageHeader';
import { Section } from '@/components/Section';

export const metadata: Metadata = { title: 'Tadbir' };

// API: GET   /events/:id
//      PATCH /admin/events/:id
//      POST  /admin/events/:id/publish | /cancel | /complete
//      GET   /admin/events/:id/attendees
export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <>
      <PageHeader
        title="Tadbir"
        description={`#${id}`}
        actions={
          <Link href="/events" className="btn">
            Ro&apos;yxatga qaytish
          </Link>
        }
      />

      <Section title="Ma'lumotlar">
        <EventFields />
        <button type="button" className="btn btn-primary" data-endpoint="PATCH /admin/events/:id">
          Saqlash
        </button>
      </Section>

      <Section title="Holat">
        <p className="muted">
          Vaqt/joy o&apos;zgarishi yoki bekor qilish yozilganlarga bildirishnoma yuboradi.
        </p>
        <div className="actions">
          <button type="button" className="btn btn-primary" data-endpoint="POST /admin/events/:id/publish">
            Nashr qilish
          </button>
          <button type="button" className="btn btn-danger" data-endpoint="POST /admin/events/:id/cancel">
            Bekor qilish
          </button>
          <button type="button" className="btn" data-endpoint="POST /admin/events/:id/complete">
            Yakunlash
          </button>
        </div>
      </Section>

      <Section title="Yakuniy natija">
        <div className="form-grid">
          <Field label="Natija matni" hint="Tadbir yakunlangach ko'rinadi" wide>
            <textarea className="input" name="resultText" rows={3} />
          </Field>
        </div>
      </Section>

      <h2>Ro&apos;yxatdan o&apos;tganlar</h2>
      <DataTable
        columns={[
          { key: 'name', label: 'Ism' },
          { key: 'login', label: 'Login' },
          { key: 'at', label: "Yozilgan vaqt" },
        ]}
        rows={[]}
        emptyTitle="Hali hech kim yozilmagan"
      />
    </>
  );
}

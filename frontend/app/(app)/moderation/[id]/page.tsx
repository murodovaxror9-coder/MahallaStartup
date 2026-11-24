import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/Badge';
import { Field } from '@/components/Field';
import { PageHeader } from '@/components/PageHeader';
import { DefinitionList, Section } from '@/components/Section';

export const metadata: Metadata = { title: "Muammoni ko'rib chiqish" };

// API: GET /admin/issues/:id
//      POST /admin/issues/:id/approve | /reject { reason } | /merge { targetIssueId }
export default async function ModerationReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      <PageHeader
        title="Muammoni ko'rib chiqish"
        description={`#${id}`}
        actions={
          <Link href="/moderation" className="btn">
            Navbatga qaytish
          </Link>
        }
      />

      <Section title="Muammo">
        <DefinitionList
          items={[
            ['Sarlavha', '—'],
            ['Tavsif', '—'],
            ['Toifa', '—'],
            ['Joy', '—'],
            ['Muallif', '—'],
            ['Holat', <Badge key="s">Ko&apos;rib chiqilmoqda</Badge>],
          ]}
        />
      </Section>

      <Section title="Foto va video">
        <p className="muted">{"Biriktirilgan media yo'q."}</p>
      </Section>

      <div className="grid-2">
        <Section title="Tasdiqlash">
          <p className="muted">Muammo joriy ovoz berish davriga qo&apos;shiladi.</p>
          <button type="button" className="btn btn-primary" data-endpoint="POST /admin/issues/:id/approve">
            Tasdiqlash
          </button>
        </Section>

        <Section title="Rad etish">
          <div className="form-grid">
            <Field label="Sabab" hint="Muallifga ko'rinadi" wide>
              <textarea className="input" name="reason" rows={3} />
            </Field>
          </div>
          <button type="button" className="btn btn-danger" data-endpoint="POST /admin/issues/:id/reject">
            Rad etish
          </button>
        </Section>
      </div>

      <Section title="Dublikat sifatida birlashtirish">
        <div className="form-grid">
          <Field label="Asosiy muammo ID" hint="Shu mahalladagi, ochiq yoki undan keyingi holatdagi muammo">
            <input className="input" name="targetIssueId" />
          </Field>
        </div>
        <button type="button" className="btn" data-endpoint="POST /admin/issues/:id/merge">
          Birlashtirish
        </button>
      </Section>
    </>
  );
}

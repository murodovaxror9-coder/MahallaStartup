import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/Badge';
import { Field } from '@/components/Field';
import { PageHeader } from '@/components/PageHeader';
import { DefinitionList, Section } from '@/components/Section';
import { ISSUE_STATUS_LABELS } from '@/lib/labels';

export const metadata: Metadata = { title: 'Muammo' };

// API: GET   /admin/issues/:id
//      POST  /admin/issues/:id/transition { toStatus, reason?, responsible?, nextStep?, dueDate?,
//                                           referredOrg?, referredAt?, followUpAt?, resolutionText?, mediaIds? }
//      PATCH /admin/issues/:id/work { responsible?, nextStep?, dueDate?, reason }
//      POST  /admin/issues/:id/carry-over
//      POST  /admin/content/POST/:id/hide { reason } | /unhide
export default async function AdminIssueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      <PageHeader
        title="Muammo"
        description={`#${id}`}
        actions={
          <Link href="/issues" className="btn">
            Ro&apos;yxatga qaytish
          </Link>
        }
      />

      <div className="grid-2">
        <Section title="Asosiy ma'lumot">
          <DefinitionList
            items={[
              ['Sarlavha', '—'],
              ['Tavsif', '—'],
              ['Toifa', '—'],
              ['Joy', '—'],
              ['Muallif', '—'],
              ['Holat', <Badge key="s">—</Badge>],
              ['Ovozlar', '—'],
              ['Kuzatuvchilar', '—'],
            ]}
          />
        </Section>
        <Section title="Ish holati">
          <DefinitionList
            items={[
              ["Mas'ul", '—'],
              ['Keyingi qadam', '—'],
              ['Muddat', '—'],
              ['Yuborilgan tashkilot', '—'],
              ['Yuborilgan sana', '—'],
              ['Keyingi tekshiruv', '—'],
              ['Yakun', '—'],
            ]}
          />
        </Section>
      </div>

      <Section title="Foto va video">
        <p className="muted">{"Biriktirilgan media yo'q."}</p>
      </Section>

      <Section title="Holat tarixi">
        <ul className="timeline">
          <li className="muted">{"Hozircha yozuv yo'q."}</li>
        </ul>
      </Section>

      <Section title="Holatni o'zgartirish">
        <div className="form-grid">
          <Field label="Yangi holat">
            <select className="input" name="toStatus" defaultValue="">
              <option value="" disabled>
                Tanlang
              </option>
              {Object.entries(ISSUE_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Sabab" hint="Ba'zi o'tishlarda majburiy">
            <input className="input" name="reason" />
          </Field>
          <Field label="Mas'ul" hint="Jarayonda: majburiy">
            <input className="input" name="responsible" />
          </Field>
          <Field label="Keyingi qadam" hint="Jarayonda: majburiy">
            <input className="input" name="nextStep" />
          </Field>
          <Field label="Kutilayotgan muddat" hint="Jarayonda: majburiy">
            <input className="input" name="dueDate" type="date" />
          </Field>
          <Field label="Tashkilot nomi" hint="Yuborilganda: majburiy">
            <input className="input" name="referredOrg" />
          </Field>
          <Field label="Yuborilgan sana" hint="Yuborilganda: majburiy">
            <input className="input" name="referredAt" type="date" />
          </Field>
          <Field label="Keyingi tekshiruv sanasi" hint="Yuborilganda: majburiy">
            <input className="input" name="followUpAt" type="date" />
          </Field>
          <Field label="Yakun matni" hint="Hal qilindi: majburiy" wide>
            <textarea className="input" name="resolutionText" rows={3} />
          </Field>
        </div>
        <button type="button" className="btn btn-primary" data-endpoint="POST /admin/issues/:id/transition">
          {"O'tkazish"}
        </button>
      </Section>

      <div className="grid-2">
        <Section title="Ish ma'lumotlarini yangilash">
          <p className="muted">{"Holat o'zgarmaydi; sabab majburiy va tarixga yoziladi."}</p>
          <div className="form-grid">
            <Field label="Sabab" wide>
              <input className="input" name="workReason" />
            </Field>
          </div>
          <button type="button" className="btn" data-endpoint="PATCH /admin/issues/:id/work">
            Saqlash
          </button>
        </Section>
        <Section title="Keyingi davrga o'tkazish">
          <p className="muted">{"G'olib bo'lmagan ochiq muammo yangi davrga 0 ovoz bilan qo'shiladi."}</p>
          <button type="button" className="btn" data-endpoint="POST /admin/issues/:id/carry-over">
            {"Keyingi davrga o'tkazish"}
          </button>
        </Section>
      </div>
    </>
  );
}

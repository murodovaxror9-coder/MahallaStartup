import type { Metadata } from 'next';
import Link from 'next/link';
import { Field } from '@/components/Field';
import { PageHeader } from '@/components/PageHeader';
import { Section } from '@/components/Section';

export const metadata: Metadata = { title: 'Yangi aholi' };

// API: POST /admin/residents { displayName, login, phone? } -> { user, temporaryPassword, expiresAt }
export default function NewResidentPage() {
  return (
    <>
      <PageHeader
        title="Yangi aholi"
        description="Akkaunt yaratiladi va vaqtinchalik parol (72 soat) bir marta ko'rsatiladi"
        actions={
          <Link href="/residents" className="btn">
            Ro&apos;yxatga qaytish
          </Link>
        }
      />

      <Section>
        <div className="form-grid">
          <Field label="Ism va familiya">
            <input className="input" name="displayName" />
          </Field>
          <Field label="Login" hint="3–32 belgi: kichik lotin harflari, raqam, nuqta, pastki chiziq">
            <input className="input" name="login" autoCapitalize="none" />
          </Field>
          <Field label="Telefon (ixtiyoriy)" hint="Faqat aloqa uchun, kirish uchun emas">
            <input className="input" name="phone" type="tel" />
          </Field>
        </div>
        <button type="button" className="btn btn-primary" data-endpoint="POST /admin/residents">
          Akkaunt yaratish
        </button>
      </Section>

      <Section title="Vaqtinchalik parol">
        <p className="muted">
          Akkaunt yaratilgach parol shu yerda <strong>faqat bir marta</strong> ko&apos;rsatiladi.
          Uni aholiga xavfsiz yo&apos;l bilan yetkazing; birinchi kirishda parol almashtirilishi shart.
        </p>
      </Section>
    </>
  );
}

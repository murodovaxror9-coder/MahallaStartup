import type { Metadata } from 'next';
import Link from 'next/link';
import { EventFields } from '@/components/EventFields';
import { PageHeader } from '@/components/PageHeader';
import { Section } from '@/components/Section';

export const metadata: Metadata = { title: 'Yangi tadbir' };

// API: POST /admin/events  (DRAFT sifatida yaratiladi, keyin /publish)
export default function NewEventPage() {
  return (
    <>
      <PageHeader
        title="Yangi tadbir"
        actions={
          <Link href="/events" className="btn">
            Ro&apos;yxatga qaytish
          </Link>
        }
      />
      <Section>
        <EventFields />
        <button type="button" className="btn btn-primary" data-endpoint="POST /admin/events">
          Qoralama sifatida saqlash
        </button>
      </Section>
    </>
  );
}

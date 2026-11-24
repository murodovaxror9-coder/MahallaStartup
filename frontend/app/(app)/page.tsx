import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { DefinitionList, Section } from '@/components/Section';
import { StatCard } from '@/components/StatCard';

export const metadata: Metadata = { title: 'Bosh sahifa' };

// API: GET /admin/dashboard
export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Bosh sahifa" description="Mahalla holatining qisqacha ko'rinishi" />

      <div className="grid-stats">
        <StatCard
          label="Faol ovoz beruvchilar"
          value="—"
          hint="Joriy davrda ovoz bergan aholi"
          href="/rounds"
        />
        <StatCard
          label="Moderatsiya kutmoqda"
          value="—"
          hint="Tasdiqlanmagan muammolar"
          href="/moderation"
        />
        <StatCard
          label="Muddati o'tgan ishlar"
          value="—"
          hint="Muddat yoki keyingi tekshiruv sanasi o'tgan"
          href="/issues?overdue=true"
        />
        <StatCard
          label="Ochiq shikoyatlar"
          value="—"
          hint="Ko'rib chiqilmagan shikoyatlar"
          href="/reports"
        />
      </div>

      <div className="grid-2">
        <Section title="Joriy ovoz berish davri">
          <DefinitionList
            items={[
              ['Davr', '—'],
              ['Tugash vaqti', '—'],
              ['Ishtirokchi muammolar', '—'],
              ['Jami ovozlar', '—'],
            ]}
          />
        </Section>
        <Section title="Navbatdagi tadbir">
          <p className="muted">{"Rejalashtirilgan tadbir yo'q."}</p>
          <Link href="/events/new" className="btn">
            {"Tadbir qo'shish"}
          </Link>
        </Section>
      </div>
    </>
  );
}

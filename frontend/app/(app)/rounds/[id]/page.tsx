import type { Metadata } from 'next';
import Link from 'next/link';
import { DataTable } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { DefinitionList, Section } from '@/components/Section';

export const metadata: Metadata = { title: 'Davr natijasi' };

// API: GET /admin/rounds/:id/result  (g'olibni almashtirish endpointi YO'Q — ataylab)
export default async function RoundResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <>
      <PageHeader
        title="Davr natijasi"
        description={`#${id}`}
        actions={
          <Link href="/rounds" className="btn">
            Davrlarga qaytish
          </Link>
        }
      />

      <div className="grid-2">
        <Section title="G'olib">
          <p className="muted">{"G'olib hali aniqlanmagan yoki davr yopilmagan."}</p>
        </Section>
        <Section title="Statistika">
          <DefinitionList
            items={[
              ['Davr', '—'],
              ['Yopilgan vaqt', '—'],
              ['Ovoz berganlar', '—'],
              ['Jami ovoz', '—'],
            ]}
          />
        </Section>
      </div>

      <h2>Reyting</h2>
      <DataTable
        columns={[
          { key: 'rank', label: "O'rin" },
          { key: 'title', label: 'Sarlavha' },
          { key: 'votes', label: 'Ovozlar' },
        ]}
        rows={[]}
        emptyTitle="Reyting yo'q"
      />
    </>
  );
}

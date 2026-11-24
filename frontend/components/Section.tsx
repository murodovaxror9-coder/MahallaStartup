import type { ReactNode } from 'react';

export function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="card">
      {title ? <h2>{title}</h2> : null}
      {children}
    </section>
  );
}

/** Nomi-qiymat juftliklari (detal sahifalar uchun). */
export function DefinitionList({ items }: { items: Array<[string, ReactNode]> }) {
  return (
    <dl className="dl">
      {items.map(([label, value]) => (
        <div key={label} style={{ display: 'contents' }}>
          <dt>{label}</dt>
          <dd>{value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

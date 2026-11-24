import type { ReactNode } from 'react';

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  const className = tone === 'neutral' ? 'badge' : `badge badge-${tone}`;
  return <span className={className}>{children}</span>;
}

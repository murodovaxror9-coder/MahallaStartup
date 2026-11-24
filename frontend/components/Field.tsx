import type { ReactNode } from 'react';

interface FieldProps {
  label: string;
  hint?: string;
  wide?: boolean;
  children: ReactNode;
}

export function Field({ label, hint, wide, children }: FieldProps) {
  return (
    <label className={wide ? 'field wide' : 'field'}>
      <span className="field-label">{label}</span>
      {children}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

export function StatusSelect({
  options,
  name,
  allLabel = 'Hammasi',
}: {
  options: Record<string, string>;
  name: string;
  allLabel?: string;
}) {
  return (
    <select className="input" name={name} defaultValue="">
      <option value="">{allLabel}</option>
      {Object.entries(options).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}

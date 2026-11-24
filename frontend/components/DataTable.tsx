import type { ReactNode } from 'react';

export interface Column {
  key: string;
  label: string;
}

interface DataTableProps {
  columns: Column[];
  rows: Array<Record<string, ReactNode>>;
  emptyTitle?: string;
  emptyHint?: string;
}

export function DataTable({
  columns,
  rows,
  emptyTitle = "Ma'lumot yo'q",
  emptyHint = "API ulangach yozuvlar shu yerda ko'rinadi.",
}: DataTableProps) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="empty" colSpan={columns.length}>
                <strong>{emptyTitle}</strong>
                {emptyHint}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td key={c.key}>{row[c.key]}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

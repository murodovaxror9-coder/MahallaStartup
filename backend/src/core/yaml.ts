/** JSON o'xshash ma'lumotni YAML'ga aylantiradi (OpenAPI hujjati uchun; qo'shimcha kutubxona kerak emas). */
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function scalar(v: unknown): string {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'string') return JSON.stringify(v); // JSON qator — YAML'ning to'g'ri qo'sh tirnoqli qiymati
  if (Array.isArray(v)) return '[]';
  if (isObj(v)) return '{}';
  return String(v);
}

const key = (k: string): string => (/^[A-Za-z_][A-Za-z0-9_]*$/.test(k) ? k : JSON.stringify(k));
const nonEmpty = (v: unknown): boolean => (Array.isArray(v) ? v.length > 0 : isObj(v) && Object.keys(v).length > 0);

export function toYaml(value: unknown, indent = 0): string {
  const pad = ' '.repeat(indent);
  if (Array.isArray(value)) {
    if (value.length === 0) return `${pad}[]`;
    return value
      .map((item) => (nonEmpty(item) ? `${pad}- ${toYaml(item, indent + 2).trimStart()}` : `${pad}- ${scalar(item)}`))
      .join('\n');
  }
  if (isObj(value)) {
    const entries = Object.entries(value).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return `${pad}{}`;
    return entries
      .map(([k, v]) => (nonEmpty(v) ? `${pad}${key(k)}:\n${toYaml(v, indent + 2)}` : `${pad}${key(k)}: ${scalar(v)}`))
      .join('\n');
  }
  return `${pad}${scalar(value)}`;
}

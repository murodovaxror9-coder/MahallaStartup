// Backend UTC ISO qatorlarni Toshkent vaqti (UTC+5, DST yo'q) sifatida ko'rsatish.

const MONTHS = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'];

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function tashkent(iso: string): Date {
  return new Date(new Date(iso).getTime() + 5 * 3600_000);
}

export function formatDate(iso: string): string {
  const d = tashkent(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function formatDateTime(iso: string): string {
  const d = tashkent(iso);
  return `${formatDate(iso)}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export function countdown(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'Yopilgan';
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  if (days > 0) return `${days} kun ${hours} soat qoldi`;
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  if (hours > 0) return `${hours} soat ${minutes} daqiqa qoldi`;
  return `${minutes} daqiqa qoldi`;
}

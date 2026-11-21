export function formatUptime(value: number | null): string {
  if (value === null) return '—';
  return `${Math.round(value * 10) / 10}%`;
}

export function formatLatency(ms: number | null): string {
  if (ms === null) return '—';
  return `${Math.round(ms)} ms`;
}

export function formatRelativeTime(value: string | null, now: Date): string {
  if (value === null) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 60_000) return 'vừa xong';

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes} phút trước`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;

  return `${Math.floor(hours / 24)} ngày trước`;
}

export function formatDateTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}`;
}

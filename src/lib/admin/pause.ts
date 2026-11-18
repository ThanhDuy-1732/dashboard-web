export function pauseUntil(minutes: 30 | 60, now: Date): string {
  return new Date(now.getTime() + minutes * 60 * 1000).toISOString();
}

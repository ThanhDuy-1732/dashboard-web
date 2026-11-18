const DAY_MS = 24 * 60 * 60 * 1000;

export function isCleanupDue(
  lastCleanupAt: Date | null,
  now: Date,
  intervalMs = DAY_MS,
): boolean {
  if (!lastCleanupAt) return true;
  return now.getTime() - new Date(lastCleanupAt).getTime() >= intervalMs;
}

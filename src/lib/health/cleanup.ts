import { cleanupOldData, getSettings } from '@/lib/db/settings';
import { isCleanupDue } from '@/lib/health/cleanup-policy';

export async function maybeCleanup(now: Date): Promise<boolean> {
  const settings = await getSettings();

  if (!isCleanupDue(settings.last_cleanup_at, now)) return false;

  await cleanupOldData(now);
  return true;
}

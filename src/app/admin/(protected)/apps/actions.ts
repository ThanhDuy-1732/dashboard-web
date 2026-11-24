'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { pauseUntil } from '@/lib/admin/pause';
import { requireAdmin } from '@/lib/auth/admin';
import {
  createApp,
  deleteApp,
  listAllApps,
  pauseAppMonitoring,
  reorderApps,
  setAppMonitor,
  setAppVisibility,
  updateApp,
  getAppById,
} from '@/lib/db/apps';
import type { AppRow, AppWriteInput } from '@/lib/db/types';
import { parseAppForm, type AppInput } from '@/lib/validation/app';

export type AppFormState = {
  errors?: Record<string, string[] | undefined>;
};

function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string }).code === '23505';
}

function toWriteInput(
  input: AppInput,
  existing: AppRow | null,
  sortOrder: number,
): AppWriteInput {
  return {
    name: input.name,
    slug: input.slug,
    description: input.description ?? null,
    url: input.url,
    icon_url: input.iconUrl ?? null,
    preview_url: input.previewUrl ?? null,
    supabase_ref: input.supabaseRef ?? null,
    supabase_health_url: input.supabaseHealthUrl ?? null,
    sort_order: existing?.sort_order ?? sortOrder,
    is_visible: existing?.is_visible ?? true,
    monitor_app: input.monitorApp,
    monitor_supabase: input.monitorSupabase,
    expected_status: input.expectedStatus,
    timeout_ms: input.timeoutMs,
  };
}

function revalidateAll() {
  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/admin/apps');
}

export async function createAppAction(
  _state: AppFormState,
  formData: FormData,
): Promise<AppFormState> {
  await requireAdmin();

  const parsed = parseAppForm(formData);
  if (!parsed.success) {
    return { errors: parsed.errors };
  }

  const apps = await listAllApps();
  const nextSort = apps.reduce((max, app) => Math.max(max, app.sort_order), -1) + 1;

  try {
    await createApp(toWriteInput(parsed.input, null, nextSort));
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { errors: { slug: ['Slug đã được dùng'] } };
    }
    throw error;
  }

  revalidateAll();
  redirect('/admin/apps');
}

export async function updateAppAction(
  id: string,
  _state: AppFormState,
  formData: FormData,
): Promise<AppFormState> {
  await requireAdmin();

  const parsed = parseAppForm(formData);
  if (!parsed.success) {
    return { errors: parsed.errors };
  }

  const existing = await getAppById(id);
  if (!existing) {
    return { errors: { name: ['Không tìm thấy ứng dụng'] } };
  }

  try {
    await updateApp(id, toWriteInput(parsed.input, existing, existing.sort_order));
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { errors: { slug: ['Slug đã được dùng'] } };
    }
    throw error;
  }

  revalidateAll();
  redirect('/admin/apps');
}

export async function deleteAppAction(id: string): Promise<void> {
  await requireAdmin();
  await deleteApp(id);
  revalidateAll();
}

export async function toggleVisibilityAction(id: string, visible: boolean): Promise<void> {
  await requireAdmin();
  await setAppVisibility(id, visible);
  revalidateAll();
}

export async function toggleMonitorAction(
  id: string,
  target: 'app' | 'supabase',
  enabled: boolean,
): Promise<void> {
  await requireAdmin();
  await setAppMonitor(id, target, enabled);
  revalidateAll();
}

export async function pauseMonitoringAction(id: string, minutes: 30 | 60): Promise<void> {
  await requireAdmin();
  await pauseAppMonitoring(id, new Date(pauseUntil(minutes, new Date())));
  revalidateAll();
}

export async function resumeMonitoringAction(id: string): Promise<void> {
  await requireAdmin();
  await pauseAppMonitoring(id, null);
  revalidateAll();
}

export async function reorderAppsAction(ids: string[]): Promise<void> {
  await requireAdmin();
  await reorderApps(ids);
  revalidateAll();
}

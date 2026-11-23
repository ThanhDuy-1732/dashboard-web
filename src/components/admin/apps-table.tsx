'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  deleteAppAction,
  pauseMonitoringAction,
  reorderAppsAction,
  resumeMonitoringAction,
  toggleMonitorAction,
  toggleVisibilityAction,
} from '@/app/admin/(protected)/apps/actions';
import { StatusBadge } from '@/components/admin/status-badge';
import type { AppRow, AppStatusRow, Target } from '@/lib/db/types';
import { isMonitoringPaused } from '@/lib/health/targets';

type Props = {
  apps: AppRow[];
  statuses: AppStatusRow[];
};

function statusFor(
  map: Map<string, AppStatusRow>,
  appId: string,
  target: Target,
) {
  return map.get(`${appId}:${target}`)?.state;
}

function Row({
  app,
  statusMap,
  dragHandle,
  style,
  isDragging,
}: {
  app: AppRow;
  statusMap: Map<string, AppStatusRow>;
  dragHandle?: React.ReactNode;
  style?: React.CSSProperties;
  isDragging?: boolean;
}) {
  const paused = isMonitoringPaused(app, new Date());

  return (
    <div
      style={style}
      className={`rounded-xl border border-line bg-card px-4 py-4 ${isDragging ? 'opacity-70' : ''}`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {dragHandle}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/admin/apps/${app.id}/edit`}
                className="truncate font-display text-base font-semibold hover:text-moss"
              >
                {app.name}
              </Link>
              <span className="text-xs text-muted">/{app.slug}</span>
              {!app.is_visible ? (
                <span className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">
                  Đang ẩn
                </span>
              ) : null}
              {paused ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
                  Tạm dừng giám sát
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 truncate text-xs text-muted">{app.url}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5 text-xs text-muted">
                App <StatusBadge state={statusFor(statusMap, app.id, 'app')} />
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted">
                Supabase <StatusBadge state={statusFor(statusMap, app.id, 'supabase')} />
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => void toggleVisibilityAction(app.id, !app.is_visible)}
            className="rounded-md border border-line px-2.5 py-1.5 text-ink/70 hover:border-moss hover:text-ink"
          >
            {app.is_visible ? 'Ẩn khỏi hub' : 'Hiện trên hub'}
          </button>
          <button
            type="button"
            onClick={() => void toggleMonitorAction(app.id, 'app', !app.monitor_app)}
            className="rounded-md border border-line px-2.5 py-1.5 text-ink/70 hover:border-moss hover:text-ink"
          >
            App: {app.monitor_app ? 'đang bật' : 'đang tắt'}
          </button>
          <button
            type="button"
            onClick={() => void toggleMonitorAction(app.id, 'supabase', !app.monitor_supabase)}
            className="rounded-md border border-line px-2.5 py-1.5 text-ink/70 hover:border-moss hover:text-ink"
          >
            Supabase: {app.monitor_supabase ? 'đang bật' : 'đang tắt'}
          </button>

          {paused ? (
            <button
              type="button"
              onClick={() => void resumeMonitoringAction(app.id)}
              className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-amber-800 hover:border-amber-500"
            >
              Tiếp tục giám sát
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void pauseMonitoringAction(app.id, 30)}
                className="rounded-md border border-line px-2.5 py-1.5 text-ink/70 hover:border-moss hover:text-ink"
              >
                Tạm dừng 30 phút
              </button>
              <button
                type="button"
                onClick={() => void pauseMonitoringAction(app.id, 60)}
                className="rounded-md border border-line px-2.5 py-1.5 text-ink/70 hover:border-moss hover:text-ink"
              >
                Tạm dừng 60 phút
              </button>
            </>
          )}

          <Link
            href={`/admin/apps/${app.id}/edit`}
            className="rounded-md border border-line px-2.5 py-1.5 text-ink/70 hover:border-moss hover:text-ink"
          >
            Sửa
          </Link>
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Xóa ${app.name}? Toàn bộ click và lịch sử sẽ bị xóa.`)) {
                void deleteAppAction(app.id);
              }
            }}
            className="rounded-md border border-red-200 px-2.5 py-1.5 text-red-700 hover:border-red-400"
          >
            Xóa
          </button>
        </div>
      </div>
    </div>
  );
}

function SortableRow({
  app,
  statusMap,
}: {
  app: AppRow;
  statusMap: Map<string, AppStatusRow>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: app.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef}>
      <Row
        app={app}
        statusMap={statusMap}
        isDragging={isDragging}
        style={style}
        dragHandle={
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Kéo để sắp xếp ${app.name}`}
            className="mt-1 cursor-grab rounded-md border border-line px-2 py-1 text-xs text-muted hover:text-ink active:cursor-grabbing"
          >
            ⠿
          </button>
        }
      />
    </div>
  );
}

export function AppsTable({ apps, statuses }: Props) {
  const [orderIds, setOrderIds] = useState(() => apps.map((app) => app.id));

  const byId = new Map(apps.map((app) => [app.id, app]));
  const items = orderIds
    .map((id) => byId.get(id))
    .filter((app): app is AppRow => Boolean(app));
  for (const app of apps) {
    if (!orderIds.includes(app.id)) items.push(app);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const statusMap = new Map<string, AppStatusRow>(
    statuses.map((status) => [`${status.app_id}:${status.target}`, status]),
  );

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((app) => app.id === active.id);
    const newIndex = items.findIndex((app) => app.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(items, oldIndex, newIndex);
    setOrderIds(next.map((app) => app.id));

    try {
      await reorderAppsAction(next.map((app) => app.id));
    } catch {
      setOrderIds(apps.map((app) => app.id));
    }
  }

  if (items.length === 0) {
    return (
      <div className="mt-8 rounded-xl border border-dashed border-line px-6 py-14 text-center">
        <p className="font-display text-lg font-semibold">Chưa có ứng dụng nào</p>
        <p className="mt-1 text-sm text-muted">Thêm ứng dụng đầu tiên để bắt đầu.</p>
        <Link
          href="/admin/apps/new"
          className="mt-5 inline-block rounded-lg bg-moss px-4 py-2 text-sm font-semibold text-paper hover:bg-ink"
        >
          Thêm ứng dụng
        </Link>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext
        items={items.map((app) => app.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="mt-6 space-y-3">
          {items.map((app) => (
            <SortableRow key={app.id} app={app} statusMap={statusMap} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import type { AppInput } from '@/lib/validation/app';

type FormState = {
  errors?: Record<string, string[] | undefined>;
};

type AppFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  initial?: AppInput;
  submitLabel: string;
};

const inputClass =
  'mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-moss focus:ring-2 focus:ring-moss/20';
const errorClass = 'mt-1 text-xs text-red-700';

export function AppForm({ action, initial, submitLabel }: AppFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

  const error = (field: string) => state.errors?.[field]?.[0];

  return (
    <form action={formAction} className="mt-6 space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="text-sm font-medium text-ink">
            Tên ứng dụng
          </label>
          <input
            id="name"
            name="name"
            required
            maxLength={60}
            defaultValue={initial?.name}
            className={inputClass}
          />
          {error('name') ? <p className={errorClass}>{error('name')}</p> : null}
        </div>

        <div>
          <label htmlFor="slug" className="text-sm font-medium text-ink">
            Slug
          </label>
          <input
            id="slug"
            name="slug"
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            defaultValue={initial?.slug}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-muted">Chữ thường, số và dấu gạch ngang.</p>
          {error('slug') ? <p className={errorClass}>{error('slug')}</p> : null}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="description" className="text-sm font-medium text-ink">
            Mô tả ngắn
          </label>
          <input
            id="description"
            name="description"
            maxLength={160}
            defaultValue={initial?.description}
            className={inputClass}
          />
          {error('description') ? <p className={errorClass}>{error('description')}</p> : null}
        </div>

        <div>
          <label htmlFor="url" className="text-sm font-medium text-ink">
            URL ứng dụng
          </label>
          <input
            id="url"
            name="url"
            type="url"
            required
            placeholder="https://app.example.com"
            defaultValue={initial?.url}
            className={inputClass}
          />
          {error('url') ? <p className={errorClass}>{error('url')}</p> : null}
        </div>

        <div>
          <label htmlFor="iconUrl" className="text-sm font-medium text-ink">
            URL icon
          </label>
          <input
            id="iconUrl"
            name="iconUrl"
            type="url"
            placeholder="https://..."
            defaultValue={initial?.iconUrl}
            className={inputClass}
          />
          {error('iconUrl') ? <p className={errorClass}>{error('iconUrl')}</p> : null}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="previewUrl" className="text-sm font-medium text-ink">
            URL ảnh xem trước
          </label>
          <input
            id="previewUrl"
            name="previewUrl"
            type="url"
            placeholder="/previews/ten-app.webp hoặc https://..."
            defaultValue={initial?.previewUrl}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-muted">
            Ảnh chụp màn hình hiện trên trang chủ. Chạy <code>npm run previews</code> để chụp
            tự động vào <code>public/previews/</code>.
          </p>
          {error('previewUrl') ? <p className={errorClass}>{error('previewUrl')}</p> : null}
        </div>

        <div>
          <label htmlFor="supabaseRef" className="text-sm font-medium text-ink">
            Supabase ref
          </label>
          <input
            id="supabaseRef"
            name="supabaseRef"
            placeholder="abcdefghijklmnopqrst"
            defaultValue={initial?.supabaseRef}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-muted">
            Phần đầu của https://&lt;ref&gt;.supabase.co
          </p>
          {error('supabaseRef') ? <p className={errorClass}>{error('supabaseRef')}</p> : null}
        </div>

        <div>
          <label htmlFor="supabaseHealthUrl" className="text-sm font-medium text-ink">
            URL health Supabase (tùy chọn)
          </label>
          <input
            id="supabaseHealthUrl"
            name="supabaseHealthUrl"
            type="url"
            placeholder="Mặc định: /auth/v1/health"
            defaultValue={initial?.supabaseHealthUrl}
            className={inputClass}
          />
          {error('supabaseHealthUrl') ? (
            <p className={errorClass}>{error('supabaseHealthUrl')}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="expectedStatus" className="text-sm font-medium text-ink">
            HTTP mong đợi
          </label>
          <input
            id="expectedStatus"
            name="expectedStatus"
            type="number"
            min={100}
            max={599}
            defaultValue={initial?.expectedStatus ?? 200}
            className={inputClass}
          />
          {error('expectedStatus') ? <p className={errorClass}>{error('expectedStatus')}</p> : null}
        </div>

        <div>
          <label htmlFor="timeoutMs" className="text-sm font-medium text-ink">
            Timeout (ms)
          </label>
          <input
            id="timeoutMs"
            name="timeoutMs"
            type="number"
            min={1000}
            max={30000}
            defaultValue={initial?.timeoutMs ?? 5000}
            className={inputClass}
          />
          {error('timeoutMs') ? <p className={errorClass}>{error('timeoutMs')}</p> : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-6 rounded-lg border border-line bg-card px-4 py-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="monitorApp"
            defaultChecked={initial?.monitorApp ?? true}
            className="h-4 w-4 accent-moss"
          />
          Giám sát URL ứng dụng
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="monitorSupabase"
            defaultChecked={initial?.monitorSupabase ?? true}
            className="h-4 w-4 accent-moss"
          />
          Giám sát Supabase
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-lg bg-moss px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-ink disabled:opacity-50"
        >
          {pending ? 'Đang lưu...' : submitLabel}
        </button>
        <Link href="/admin/apps" className="text-sm text-muted hover:text-ink">
          Hủy
        </Link>
      </div>
    </form>
  );
}

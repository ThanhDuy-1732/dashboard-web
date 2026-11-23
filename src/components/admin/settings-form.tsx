'use client';

import { useActionState } from 'react';
import {
  saveSettingsAction,
  sendTestAlertAction,
  type SettingsState,
} from '@/app/admin/(protected)/settings/actions';
import type { SettingsRow } from '@/lib/db/types';

const inputClass =
  'mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-moss focus:ring-2 focus:ring-moss/20';
const errorClass = 'mt-1 text-xs text-red-700';

export function SettingsForm({ initial }: { initial: SettingsRow }) {
  const [saveState, saveAction, savePending] = useActionState<SettingsState, FormData>(
    saveSettingsAction,
    {},
  );
  const [testState, testAction, testPending] = useActionState<SettingsState, FormData>(
    sendTestAlertAction,
    {},
  );

  const error = (field: string) => saveState.errors?.[field]?.[0];

  return (
    <form action={saveAction} className="mt-6 space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="telegramChatId" className="text-sm font-medium text-ink">
            Telegram chat id
          </label>
          <input
            id="telegramChatId"
            name="telegramChatId"
            defaultValue={initial.telegram_chat_id ?? ''}
            placeholder="123456789"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-muted">
            Để trống nếu chưa dùng Telegram.
          </p>
        </div>

        <div>
          <label htmlFor="repeatReminderMinutes" className="text-sm font-medium text-ink">
            Nhắc lại khi vẫn chết (phút)
          </label>
          <input
            id="repeatReminderMinutes"
            name="repeatReminderMinutes"
            type="number"
            min={0}
            max={1440}
            defaultValue={initial.repeat_reminder_minutes}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-muted">0 = không nhắc lại.</p>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="emailRecipients" className="text-sm font-medium text-ink">
            Email nhận cảnh báo
          </label>
          <textarea
            id="emailRecipients"
            name="emailRecipients"
            rows={3}
            defaultValue={initial.email_recipients.join('\n')}
            placeholder={'owner@example.com\nops@example.com'}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-muted">Mỗi dòng một email, hoặc cách nhau bằng dấu phẩy.</p>
          {error('emailRecipients') ? (
            <p className={errorClass}>{error('emailRecipients')}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="failureThreshold" className="text-sm font-medium text-ink">
            Số lần lỗi liên tiếp để báo chết
          </label>
          <input
            id="failureThreshold"
            name="failureThreshold"
            type="number"
            min={1}
            max={10}
            defaultValue={initial.failure_threshold}
            className={inputClass}
          />
          {error('failureThreshold') ? (
            <p className={errorClass}>{error('failureThreshold')}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="slowThresholdMs" className="text-sm font-medium text-ink">
            Ngưỡng chậm (ms)
          </label>
          <input
            id="slowThresholdMs"
            name="slowThresholdMs"
            type="number"
            min={100}
            max={60000}
            defaultValue={initial.slow_threshold_ms}
            className={inputClass}
          />
          {error('slowThresholdMs') ? (
            <p className={errorClass}>{error('slowThresholdMs')}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-6 rounded-lg border border-line bg-card px-4 py-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="alertsEnabled"
            defaultChecked={initial.alerts_enabled}
            className="h-4 w-4 accent-moss"
          />
          Bật cảnh báo
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="notifyRecovery"
            defaultChecked={initial.notify_recovery}
            className="h-4 w-4 accent-moss"
          />
          Báo khi hồi phục
        </label>
      </div>

      {saveState.saved ? (
        <p className="rounded-lg border border-moss/25 bg-moss/10 px-3 py-2 text-sm text-moss">
          Đã lưu cài đặt.
        </p>
      ) : null}
      {saveState.errors ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Kiểm tra lại các trường được đánh dấu.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={savePending}
          className="min-h-11 rounded-lg bg-moss px-4 py-2 text-sm font-semibold text-paper hover:bg-ink disabled:opacity-50"
        >
          {savePending ? 'Đang lưu...' : 'Lưu cài đặt'}
        </button>

        <button
          type="submit"
          formAction={testAction}
          disabled={testPending}
          className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink/70 hover:border-moss hover:text-ink disabled:opacity-50"
        >
          {testPending ? 'Đang gửi...' : 'Gửi thử'}
        </button>

        {testState.message ? (
          <span className="text-sm text-muted">{testState.message}</span>
        ) : null}
      </div>
    </form>
  );
}

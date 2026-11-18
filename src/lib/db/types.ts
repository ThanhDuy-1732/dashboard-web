export type Target = 'app' | 'supabase';
export type HealthState = 'up' | 'down' | 'unknown';

export type AppRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  url: string;
  icon_url: string | null;
  supabase_ref: string | null;
  supabase_health_url: string | null;
  sort_order: number;
  is_visible: boolean;
  monitor_app: boolean;
  monitor_supabase: boolean;
  monitoring_paused_until: Date | null;
  expected_status: number;
  timeout_ms: number;
  created_at: Date;
  updated_at: Date;
};

export type PublicApp = Pick<
  AppRow,
  'id' | 'slug' | 'name' | 'description' | 'url' | 'icon_url'
>;

export type AppWriteInput = {
  name: string;
  slug: string;
  description: string | null;
  url: string;
  icon_url: string | null;
  supabase_ref: string | null;
  supabase_health_url: string | null;
  sort_order: number;
  is_visible: boolean;
  monitor_app: boolean;
  monitor_supabase: boolean;
  expected_status: number;
  timeout_ms: number;
};

export type ClickEventRow = {
  id: number;
  app_id: string;
  clicked_at: Date;
  referrer: string | null;
  user_agent: string | null;
  ip_hash: string;
  country: string | null;
};

export type NewClickEvent = Omit<ClickEventRow, 'id'>;

export type CheckRow = {
  id: number;
  app_id: string;
  target: Target;
  checked_at: Date;
  ok: boolean;
  status_code: number | null;
  latency_ms: number;
  error: string | null;
};

export type NewCheck = Omit<CheckRow, 'id'>;

export type AppStatusRow = {
  app_id: string;
  target: Target;
  state: HealthState;
  consecutive_failures: number;
  consecutive_slow: number;
  last_check_at: Date | null;
  last_ok_at: Date | null;
  last_down_at: Date | null;
  last_down_alert_at: Date | null;
  last_slow_alert_at: Date | null;
};

export type IncidentRow = {
  id: number;
  app_id: string;
  target: Target;
  started_at: Date;
  resolved_at: Date | null;
  first_error: string | null;
};

export type NewIncident = Omit<IncidentRow, 'id' | 'resolved_at'>;

export type SettingsRow = {
  id: number;
  telegram_chat_id: string | null;
  email_recipients: string[];
  failure_threshold: number;
  slow_threshold_ms: number;
  alerts_enabled: boolean;
  notify_recovery: boolean;
  repeat_reminder_minutes: number;
  health_run_locked_at: Date | null;
  health_run_token: string | null;
  last_cleanup_at: Date | null;
  updated_at: Date;
};

export type SettingsInput = {
  telegramChatId: string | null;
  emailRecipients: string[];
  failureThreshold: number;
  slowThresholdMs: number;
  alertsEnabled: boolean;
  notifyRecovery: boolean;
  repeatReminderMinutes: number;
};

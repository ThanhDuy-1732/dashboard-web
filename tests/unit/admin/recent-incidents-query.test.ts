// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const captured = vi.hoisted(() => ({
  query: '',
  values: [] as unknown[],
  rows: [] as unknown[],
}));

vi.mock('@/lib/db/client', () => ({
  getSql: () =>
    (strings: TemplateStringsArray, ...values: unknown[]) => {
      captured.query = strings.join(' ');
      captured.values = values;
      return Promise.resolve(captured.rows);
    },
}));

import { listRecentIncidents } from '@/lib/db/checks';

describe('listRecentIncidents', () => {
  beforeEach(() => {
    captured.query = '';
    captured.values = [];
    captured.rows = [];
  });

  it('joins app details, calculates pause state, sorts newest first, and applies the limit', async () => {
    await listRecentIncidents(7);

    expect(captured.query).toMatch(/from incidents i join apps a on a\.id = i\.app_id/i);
    expect(captured.query).toMatch(/a\.name as app_name/i);
    expect(captured.query).toMatch(/a\.slug as app_slug/i);
    expect(captured.query).toMatch(/a\.monitoring_paused_until > now\(\).*as app_paused/i);
    expect(captured.query).toMatch(/order by i\.started_at desc/i);
    expect(captured.query).toMatch(/limit/i);
    expect(captured.values).toContain(7);
  });
});

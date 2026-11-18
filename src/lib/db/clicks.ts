import { getSql } from '@/lib/db/client';
import type { ClickEventRow, NewClickEvent } from '@/lib/db/types';

export async function insertClickEvent(event: NewClickEvent): Promise<void> {
  const sql = getSql();
  await sql`
    insert into click_events (app_id, clicked_at, referrer, user_agent, ip_hash, country)
    values (
      ${event.app_id}, ${event.clicked_at}, ${event.referrer}, ${event.user_agent},
      ${event.ip_hash}, ${event.country}
    )
  `;
}

export async function listClicksSince(since: Date): Promise<ClickEventRow[]> {
  const sql = getSql();
  return sql<ClickEventRow[]>`
    select * from click_events
    where clicked_at >= ${since}
    order by clicked_at asc
  `;
}

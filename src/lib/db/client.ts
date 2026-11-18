import 'server-only';
import postgres from 'postgres';
import { getServerEnv } from '@/lib/env';

type Sql = ReturnType<typeof postgres>;

const globalForSql = globalThis as typeof globalThis & { __hubSql?: Sql };

export function getSql(): Sql {
  if (!globalForSql.__hubSql) {
    globalForSql.__hubSql = postgres(getServerEnv().DATABASE_URL, {
      prepare: false,
      max: 1,
      idle_timeout: 20,
    });
  }

  return globalForSql.__hubSql;
}

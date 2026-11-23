const RETRYABLE_CODES = new Set([
  'CONNECTION_CLOSED',
  'CONNECTION_DESTROYED',
  'CONNECTION_ENDED',
  'CONNECT_TIMEOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'ECONNABORTED',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EPIPE',
  'ETIMEDOUT',
  '53300',
  '57P01',
  '57P02',
  '57P03',
]);

export type DbRetryOptions = {
  attempts?: number;
  sleep?: (ms: number) => Promise<void>;
};

export function isRetryableDbError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const { code, errno } = error as { code?: unknown; errno?: unknown };

  return (
    (typeof code === 'string' && RETRYABLE_CODES.has(code)) ||
    (typeof errno === 'string' && RETRYABLE_CODES.has(errno))
  );
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function withDbRetry<T>(
  operation: () => Promise<T>,
  options: DbRetryOptions = {},
): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 3);
  const sleep = options.sleep ?? defaultSleep;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= attempts || !isRetryableDbError(error)) throw error;
      await sleep(attempt * 150);
    }
  }

  throw new Error('withDbRetry exhausted');
}

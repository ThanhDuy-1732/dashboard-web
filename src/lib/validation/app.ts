import { z } from 'zod';

const blankToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const trimmedOptionalText = (max: number) =>
  z.preprocess(blankToUndefined, z.string().trim().max(max).optional());

const trimmedOptionalUrl = () =>
  z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() : value),
    z.preprocess(blankToUndefined, z.url().optional()),
  );

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const appInputSchema = z.object({
  name: z.string().trim().min(1).max(60),
  slug: z.string().trim().regex(slugPattern),
  description: trimmedOptionalText(160),
  url: z
    .string()
    .trim()
    .pipe(z.url()),
  iconUrl: trimmedOptionalUrl(),
  healthUrl: trimmedOptionalUrl(),
  expectedStatus: z.coerce.number().int().min(100).max(599).default(200),
  timeoutMs: z.coerce.number().int().min(1000).max(30000).default(5000),
});

export type AppInput = z.infer<typeof appInputSchema>;

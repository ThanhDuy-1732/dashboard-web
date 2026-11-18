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
  supabaseRef: trimmedOptionalText(64),
  supabaseHealthUrl: trimmedOptionalUrl(),
  expectedStatus: z.coerce.number().int().min(100).max(599).default(200),
  timeoutMs: z.coerce.number().int().min(1000).max(30000).default(5000),
  monitorApp: z.boolean().default(true),
  monitorSupabase: z.boolean().default(true),
});

export type AppInput = z.infer<typeof appInputSchema>;

export function parseAppForm(formData: FormData) {
  const result = appInputSchema.safeParse({
    name: formData.get('name') ?? '',
    slug: formData.get('slug') ?? '',
    description: formData.get('description') ?? '',
    url: formData.get('url') ?? '',
    iconUrl: formData.get('iconUrl') ?? '',
    healthUrl: formData.get('healthUrl') ?? '',
    supabaseRef: formData.get('supabaseRef') ?? '',
    supabaseHealthUrl: formData.get('supabaseHealthUrl') ?? '',
    expectedStatus: formData.get('expectedStatus') || 200,
    timeoutMs: formData.get('timeoutMs') || 5000,
    monitorApp: formData.get('monitorApp') === 'on',
    monitorSupabase: formData.get('monitorSupabase') === 'on',
  });

  if (!result.success) {
    return { success: false as const, errors: result.error.flatten().fieldErrors };
  }

  return { success: true as const, input: result.data };
}

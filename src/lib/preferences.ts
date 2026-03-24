import { z } from "zod";

export const PreferencesSchema = z.object({
  last_opened_folder: z.string().nullable(),
  aws_profile: z.string().nullable(),
  recently_used_skill_types: z.array(z.string()).default([]),
  preview_width: z.string().default('400px'),
  preview_height: z.string().default('480px'),
});

export type Preferences = z.infer<typeof PreferencesSchema>;

export const DEFAULT_PREFERENCES: Preferences = {
  last_opened_folder: null,
  aws_profile: null,
  recently_used_skill_types: [],
  preview_width: '400px',
  preview_height: '480px',
};

export function parsePreferences(data: unknown): Preferences {
  const result = PreferencesSchema.safeParse(data);
  return result.success ? result.data : DEFAULT_PREFERENCES;
}

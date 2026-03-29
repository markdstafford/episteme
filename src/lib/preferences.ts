import { z } from "zod";

export const PreferencesSchema = z.object({
  last_opened_folder: z.string().nullable(),
  aws_profile: z.string().nullable(),
  recently_used_skill_types: z.array(z.string()).default([]),
  preview_width: z.string().regex(/^\d+(\.\d+)?%$/).default('50%').catch('50%'),
  preview_height: z.string().regex(/^\d+(\.\d+)?%$/).default('75%').catch('75%'),
  github_login: z.string().nullable().default(null),
  show_resolved_decorations: z.boolean().default(true),
  ai_enhancement_enabled: z.boolean().default(true),
  ai_enhancement_timeout_seconds: z.number().int().min(5).max(120).default(30),
});

export type Preferences = z.infer<typeof PreferencesSchema>;

export const DEFAULT_PREFERENCES: Preferences = {
  last_opened_folder: null,
  aws_profile: null,
  recently_used_skill_types: [],
  preview_width: '50%',
  preview_height: '75%',
  github_login: null,
  show_resolved_decorations: true,
  ai_enhancement_enabled: true,
  ai_enhancement_timeout_seconds: 30,
};

export function parsePreferences(data: unknown): Preferences {
  const result = PreferencesSchema.safeParse(data);
  return result.success ? result.data : DEFAULT_PREFERENCES;
}

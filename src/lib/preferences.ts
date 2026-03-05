import { z } from "zod";

export const PreferencesSchema = z.object({
  last_opened_folder: z.string().nullable(),
  aws_profile: z.string().nullable(),
});

export type Preferences = z.infer<typeof PreferencesSchema>;

export const DEFAULT_PREFERENCES: Preferences = {
  last_opened_folder: null,
  aws_profile: null,
};

export function parsePreferences(data: unknown): Preferences {
  const result = PreferencesSchema.safeParse(data);
  return result.success ? result.data : DEFAULT_PREFERENCES;
}

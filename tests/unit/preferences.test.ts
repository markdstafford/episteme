import { describe, it, expect } from "vitest";
import {
  PreferencesSchema,
  parsePreferences,
  DEFAULT_PREFERENCES,
} from "@/lib/preferences";

describe("PreferencesSchema", () => {
  it("validates a valid preferences object", () => {
    const data = { last_opened_folder: "/some/path", aws_profile: null };
    const result = PreferencesSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.last_opened_folder).toBe("/some/path");
    }
  });

  it("validates null last_opened_folder", () => {
    const data = { last_opened_folder: null, aws_profile: null };
    const result = PreferencesSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.last_opened_folder).toBeNull();
    }
  });

  it("validates aws_profile as string", () => {
    const data = { last_opened_folder: null, aws_profile: "my-profile" };
    const result = PreferencesSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.aws_profile).toBe("my-profile");
    }
  });

  it("validates aws_profile as null", () => {
    const data = { last_opened_folder: null, aws_profile: null };
    const result = PreferencesSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.aws_profile).toBeNull();
    }
  });

  it("rejects invalid data", () => {
    const result = PreferencesSchema.safeParse({ last_opened_folder: 123, aws_profile: null });
    expect(result.success).toBe(false);
  });

  it("rejects missing fields", () => {
    const result = PreferencesSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("parsePreferences", () => {
  it("returns parsed data for valid input", () => {
    const result = parsePreferences({ last_opened_folder: "/path", aws_profile: null });
    expect(result.last_opened_folder).toBe("/path");
    expect(result.aws_profile).toBeNull();
  });

  it("returns parsed data with aws_profile set", () => {
    const result = parsePreferences({ last_opened_folder: null, aws_profile: "dev" });
    expect(result.aws_profile).toBe("dev");
  });

  it("returns defaults for invalid input", () => {
    const result = parsePreferences({ bad: "data" });
    expect(result).toEqual(DEFAULT_PREFERENCES);
    expect(result.aws_profile).toBeNull();
  });

  it("returns defaults for null input", () => {
    const result = parsePreferences(null);
    expect(result).toEqual(DEFAULT_PREFERENCES);
  });

  it("returns defaults for undefined input", () => {
    const result = parsePreferences(undefined);
    expect(result).toEqual(DEFAULT_PREFERENCES);
  });
});

describe("recently_used_skill_types", () => {
  it("defaults to empty array when field is missing", () => {
    const result = parsePreferences({ last_opened_folder: null, aws_profile: null });
    expect(result.recently_used_skill_types).toEqual([]);
  });

  it("parses a valid array of skill type strings", () => {
    const result = parsePreferences({
      last_opened_folder: null,
      aws_profile: null,
      recently_used_skill_types: ["product-description", "tech-design"],
    });
    expect(result.recently_used_skill_types).toEqual(["product-description", "tech-design"]);
  });

  it("round-trips through schema correctly", () => {
    const data = {
      last_opened_folder: null,
      aws_profile: null,
      recently_used_skill_types: ["tech-design"],
    };
    const parsed = PreferencesSchema.safeParse(data);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.recently_used_skill_types).toEqual(["tech-design"]);
    }
  });

  it("defaults to empty array when field is explicitly missing from old preferences file", () => {
    const result = PreferencesSchema.safeParse({ last_opened_folder: "/path", aws_profile: null });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.recently_used_skill_types).toEqual([]);
    }
  });
});

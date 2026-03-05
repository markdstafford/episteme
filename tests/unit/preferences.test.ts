import { describe, it, expect } from "vitest";
import {
  PreferencesSchema,
  parsePreferences,
  DEFAULT_PREFERENCES,
} from "@/lib/preferences";

describe("PreferencesSchema", () => {
  it("validates a valid preferences object", () => {
    const data = { last_opened_folder: "/some/path" };
    const result = PreferencesSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.last_opened_folder).toBe("/some/path");
    }
  });

  it("validates null last_opened_folder", () => {
    const data = { last_opened_folder: null };
    const result = PreferencesSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.last_opened_folder).toBeNull();
    }
  });

  it("rejects invalid data", () => {
    const result = PreferencesSchema.safeParse({ last_opened_folder: 123 });
    expect(result.success).toBe(false);
  });

  it("rejects missing fields", () => {
    const result = PreferencesSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("parsePreferences", () => {
  it("returns parsed data for valid input", () => {
    const result = parsePreferences({ last_opened_folder: "/path" });
    expect(result.last_opened_folder).toBe("/path");
  });

  it("returns defaults for invalid input", () => {
    const result = parsePreferences({ bad: "data" });
    expect(result).toEqual(DEFAULT_PREFERENCES);
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

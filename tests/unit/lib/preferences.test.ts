import { describe, it, expect } from "vitest";
import { PreferencesSchema } from "@/lib/preferences";

describe("PreferencesSchema keyboard_shortcuts", () => {
  it("defaults to empty object when field is absent", () => {
    const result = PreferencesSchema.parse({
      last_opened_folder: null,
      aws_profile: null,
      recently_used_skill_types: [],
    });
    expect(result.keyboard_shortcuts).toEqual({});
  });

  it("accepts a populated shortcuts map", () => {
    const result = PreferencesSchema.parse({
      last_opened_folder: null,
      aws_profile: null,
      recently_used_skill_types: [],
      keyboard_shortcuts: { "app.openSettings": "Meta+Comma" },
    });
    expect(result.keyboard_shortcuts).toEqual({ "app.openSettings": "Meta+Comma" });
  });
});

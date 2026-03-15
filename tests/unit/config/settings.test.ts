import { describe, it, expect } from "vitest";
import { settingsConfig, firstCategoryId } from "@/config/settings";

describe("settingsConfig", () => {
  it("has at least one category", () => {
    expect(settingsConfig.length).toBeGreaterThan(0);
  });

  it("all categories have unique ids", () => {
    const ids = settingsConfig.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("firstCategoryId returns the category with the lowest order", () => {
    const sorted = [...settingsConfig].sort((a, b) => a.order - b.order);
    expect(firstCategoryId()).toBe(sorted[0].id);
  });

  it("all settings have id, label, type, and order", () => {
    settingsConfig.forEach((cat) => {
      cat.sections.forEach((section) => {
        section.settings.forEach((setting) => {
          expect(setting.id).toBeTruthy();
          expect(setting.label).toBeTruthy();
          expect(["text", "select", "toggle"]).toContain(setting.type);
          expect(typeof setting.order).toBe("number");
        });
      });
    });
  });

  it("includes the ai category with aws_profile setting", () => {
    const ai = settingsConfig.find((c) => c.id === "ai");
    expect(ai).toBeDefined();
    const allSettings = ai!.sections.flatMap((s) => s.settings);
    expect(allSettings.some((s) => s.id === "aws_profile")).toBe(true);
  });
});


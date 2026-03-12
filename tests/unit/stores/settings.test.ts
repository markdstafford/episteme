import { describe, it, expect, beforeEach } from "vitest";
import { useSettingsStore } from "@/stores/settings";
import { firstCategoryId } from "@/config/settings";

describe("useSettingsStore", () => {
  beforeEach(() => {
    useSettingsStore.setState({
      settingsOpen: false,
      activeCategory: firstCategoryId(),
    });
  });

  it("defaults to closed", () => {
    expect(useSettingsStore.getState().settingsOpen).toBe(false);
  });

  it("defaults activeCategory to first category by order", () => {
    expect(useSettingsStore.getState().activeCategory).toBe(firstCategoryId());
  });

  it("openSettings sets settingsOpen to true", () => {
    useSettingsStore.getState().openSettings();
    expect(useSettingsStore.getState().settingsOpen).toBe(true);
  });

  it("closeSettings sets settingsOpen to false", () => {
    useSettingsStore.setState({ settingsOpen: true });
    useSettingsStore.getState().closeSettings();
    expect(useSettingsStore.getState().settingsOpen).toBe(false);
  });

  it("setActiveCategory updates activeCategory", () => {
    useSettingsStore.getState().setActiveCategory("general");
    expect(useSettingsStore.getState().activeCategory).toBe("general");
  });
});

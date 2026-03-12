import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SettingsNav } from "@/components/SettingsNav";
import { useSettingsStore } from "@/stores/settings";
import { settingsConfig, firstCategoryId } from "@/config/settings";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

describe("SettingsNav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSettingsStore.setState({
      settingsOpen: true,
      activeCategory: firstCategoryId(),
      closeSettings: vi.fn(),
      setActiveCategory: vi.fn(),
    });
  });

  it("renders a Back to app button", () => {
    render(<SettingsNav />);
    expect(screen.getByRole("button", { name: /back to app/i })).toBeInTheDocument();
  });

  it("clicking Back to app calls closeSettings", () => {
    const closeSettings = vi.fn();
    useSettingsStore.setState({ closeSettings });
    render(<SettingsNav />);
    fireEvent.click(screen.getByRole("button", { name: /back to app/i }));
    expect(closeSettings).toHaveBeenCalledOnce();
  });

  it("renders all settings categories from config", () => {
    render(<SettingsNav />);
    settingsConfig.forEach((cat) => {
      expect(screen.getByText(cat.label)).toBeInTheDocument();
    });
  });

  it("clicking a category calls setActiveCategory with its id", () => {
    const setActiveCategory = vi.fn();
    useSettingsStore.setState({ setActiveCategory });
    render(<SettingsNav />);
    const firstCat = settingsConfig.find((c) => c.id === firstCategoryId())!;
    fireEvent.click(screen.getByText(firstCat.label));
    expect(setActiveCategory).toHaveBeenCalledWith(firstCat.id);
  });

  it("active category button has selected background class", () => {
    const firstId = firstCategoryId();
    useSettingsStore.setState({ activeCategory: firstId });
    render(<SettingsNav />);
    const firstCat = settingsConfig.find((c) => c.id === firstId)!;
    const btn = screen.getByText(firstCat.label).closest("button")!;
    expect(btn.className).toMatch(/color-bg-hover/);
  });

  it("inactive category button does not have selected background class", () => {
    useSettingsStore.setState({ activeCategory: "nonexistent" });
    render(<SettingsNav />);
    const firstCat = settingsConfig[0];
    const btn = screen.getByText(firstCat.label).closest("button")!;
    expect(btn.className).not.toMatch(/color-bg-hover/);
  });
});

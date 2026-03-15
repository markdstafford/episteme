import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { KeyboardShortcutsSettings } from "@/components/KeyboardShortcutsSettings";
import { useShortcutsStore } from "@/stores/shortcuts";
import { invoke } from "@tauri-apps/api/core";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
const mockInvoke = vi.mocked(invoke);

beforeEach(() => {
  vi.clearAllMocks();
  useShortcutsStore.setState({ actions: {}, customBindings: {} });
  mockInvoke.mockResolvedValue(undefined);
  useShortcutsStore.getState().registerAction({
    id: "app.openSettings",
    label: "Open settings",
    defaultBinding: "Meta+Comma",
    category: "Global",
    firesThroughInputs: false,
    rebindable: true,
  });
});

describe("KeyboardShortcutsSettings", () => {
  it("renders all registered action labels", () => {
    render(
      <KeyboardShortcutsSettings
        preferences={{
          last_opened_folder: null,
          aws_profile: null,
          recently_used_skill_types: [],
          keyboard_shortcuts: {},
        }}
        onPreferencesChange={vi.fn()}
      />
    );
    expect(screen.getByText("Open settings")).toBeTruthy();
  });

  it("renders the category header", () => {
    render(
      <KeyboardShortcutsSettings
        preferences={{
          last_opened_folder: null,
          aws_profile: null,
          recently_used_skill_types: [],
          keyboard_shortcuts: {},
        }}
        onPreferencesChange={vi.fn()}
      />
    );
    expect(screen.getByText("Global")).toBeTruthy();
  });
});

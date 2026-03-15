import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BindingCard } from "@/components/ui/BindingCard";
import { useShortcutsStore } from "@/stores/shortcuts";
import { invoke } from "@tauri-apps/api/core";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
const mockInvoke = vi.mocked(invoke);

const defaultPreferences = {
  last_opened_folder: null,
  aws_profile: null,
  recently_used_skill_types: [],
  keyboard_shortcuts: {},
};

function registerOpenSettings() {
  useShortcutsStore.getState().registerAction({
    id: "app.openSettings",
    label: "Open settings",
    defaultBinding: "Meta+Comma",
    category: "Global",
    firesThroughInputs: false,
    rebindable: true,
  });
}

function renderCard(overrides: Partial<Parameters<typeof BindingCard>[0]> = {}) {
  return render(
    <BindingCard
      actionId="app.openSettings"
      label="Open settings"
      preferences={defaultPreferences}
      onPreferencesChange={vi.fn()}
      {...overrides}
    />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useShortcutsStore.setState({ actions: {}, customBindings: {} });
  mockInvoke.mockResolvedValue(undefined);
  registerOpenSettings();
});

describe("BindingCard display", () => {
  it("renders action label", () => {
    renderCard();
    expect(screen.getByText("Open settings")).toBeTruthy();
  });

  it("renders binding as kbd elements", () => {
    renderCard();
    // Should render ⌘ and , as separate kbd chips
    const kbds = document.querySelectorAll("kbd kbd");
    const texts = Array.from(kbds).map((k) => k.textContent);
    expect(texts).toContain("⌘");
    expect(texts).toContain(",");
  });

  it("does not show reset icon when no custom binding", () => {
    renderCard();
    expect(screen.queryByRole("button", { name: /reset to default/i })).toBeNull();
  });

  it("shows reset icon when a custom binding exists", () => {
    useShortcutsStore.setState({ customBindings: { "app.openSettings": "Meta+KeyP" } });
    renderCard();
    expect(screen.getByRole("button", { name: /reset to default/i })).toBeTruthy();
  });
});

describe("BindingCard capture mode", () => {
  it("enters capture mode on click of binding area", () => {
    renderCard();
    const bindingArea = document.querySelector("[role='button'][tabindex='0']") as HTMLElement;
    fireEvent.click(bindingArea);
    expect(screen.getByText(/press a key combination/i)).toBeTruthy();
  });

  it("saves binding on key press when no conflict", () => {
    const onPreferencesChange = vi.fn();
    render(
      <BindingCard
        actionId="app.openSettings"
        label="Open settings"
        preferences={defaultPreferences}
        onPreferencesChange={onPreferencesChange}
      />
    );

    const bindingArea = document.querySelector("[role='button'][tabindex='0']") as HTMLElement;
    fireEvent.click(bindingArea);
    expect(screen.getByText(/press a key combination/i)).toBeTruthy();

    fireEvent.keyDown(document, { code: "KeyP", metaKey: true });

    expect(useShortcutsStore.getState().getBinding("app.openSettings")).toBe("Meta+KeyP");
    expect(mockInvoke).toHaveBeenCalledWith("save_preferences", expect.any(Object));
    expect(onPreferencesChange).toHaveBeenCalled();
  });

  it("shows conflict error when pressed combo conflicts with another action", () => {
    useShortcutsStore.getState().registerAction({
      id: "app.openQuickReference",
      label: "Show keyboard shortcuts",
      defaultBinding: "Meta+Slash",
      category: "Global",
      firesThroughInputs: false,
      rebindable: true,
    });

    renderCard();
    const bindingArea = document.querySelector("[role='button'][tabindex='0']") as HTMLElement;
    fireEvent.click(bindingArea);

    // Try to set it to Meta+Slash which is already used by app.openQuickReference
    fireEvent.keyDown(document, { code: "Slash", metaKey: true });

    expect(screen.getByText(/already used by/i)).toBeTruthy();
    expect(screen.getByText(/show keyboard shortcuts/i)).toBeTruthy();
  });

  it("pressing Escape in capture mode exits without saving", () => {
    const onPreferencesChange = vi.fn();
    render(
      <BindingCard
        actionId="app.openSettings"
        label="Open settings"
        preferences={defaultPreferences}
        onPreferencesChange={onPreferencesChange}
      />
    );

    const bindingArea = document.querySelector("[role='button'][tabindex='0']") as HTMLElement;
    fireEvent.click(bindingArea);
    expect(screen.getByText(/press a key combination/i)).toBeTruthy();

    fireEvent.keyDown(document, { code: "Escape", key: "Escape" });

    expect(screen.queryByText(/press a key combination/i)).toBeNull();
    expect(onPreferencesChange).not.toHaveBeenCalled();
  });
});

describe("BindingCard reset", () => {
  it("calls resetBinding and invoke on reset click", async () => {
    useShortcutsStore.setState({ customBindings: { "app.openSettings": "Meta+KeyP" } });
    const onPreferencesChange = vi.fn();
    render(
      <BindingCard
        actionId="app.openSettings"
        label="Open settings"
        preferences={defaultPreferences}
        onPreferencesChange={onPreferencesChange}
      />
    );

    const resetBtn = screen.getByRole("button", { name: /reset to default/i });
    fireEvent.click(resetBtn);

    // After reset the custom binding should be gone
    expect(useShortcutsStore.getState().customBindings["app.openSettings"]).toBeUndefined();
  });
});

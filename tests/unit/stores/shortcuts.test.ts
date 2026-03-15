import { describe, it, expect, beforeEach } from "vitest";
import { normalizeCombo, useShortcutsStore } from "@/stores/shortcuts";

// Helper to construct a synthetic KeyboardEvent-like object
function key(code: string, opts: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return { code, altKey: false, metaKey: false, shiftKey: false, ctrlKey: false, ...opts } as KeyboardEvent;
}

describe("normalizeCombo", () => {
  it("produces a plain code for unmodified keys", () => {
    expect(normalizeCombo(key("Escape"))).toBe("Escape");
  });

  it("prefixes Meta modifier", () => {
    expect(normalizeCombo(key("Comma", { metaKey: true }))).toBe("Meta+Comma");
  });

  it("prefixes Alt modifier", () => {
    expect(normalizeCombo(key("KeyK", { altKey: true }))).toBe("Alt+KeyK");
  });

  it("prefixes Shift modifier", () => {
    expect(normalizeCombo(key("Slash", { shiftKey: true }))).toBe("Shift+Slash");
  });

  it("sorts multiple modifiers alphabetically", () => {
    expect(normalizeCombo(key("KeyK", { metaKey: true, shiftKey: true }))).toBe("Meta+Shift+KeyK");
  });
});

describe("useShortcutsStore", () => {
  beforeEach(() => {
    useShortcutsStore.setState({ actions: {}, actionsRestricted: false });
  });

  describe("registerAction", () => {
    it("registers an action with binding and stores it", () => {
      useShortcutsStore.getState().registerAction({
        id: "test.action",
        label: "Test Action",
        binding: "Meta+Comma",
        category: "Global",
        ignoresActionRestrictions: false,
      });
      const actions = useShortcutsStore.getState().actions;
      expect(actions["test.action"]).toBeDefined();
      expect(actions["test.action"].binding).toBe("Meta+Comma");
    });
  });

  describe("resolveAction", () => {
    it("returns action for matching combo on non-input", () => {
      useShortcutsStore.getState().registerAction({
        id: "test.action",
        label: "Test Action",
        binding: "Meta+Comma",
        category: "Global",
        ignoresActionRestrictions: false,
        callback: () => {},
      });
      const div = document.createElement("div");
      const result = useShortcutsStore.getState().resolveAction("Meta+Comma", div);
      expect(result?.id).toBe("test.action");
    });

    it("returns null on textarea when ignoresActionRestrictions is false", () => {
      useShortcutsStore.getState().registerAction({
        id: "test.action",
        label: "Test Action",
        binding: "Meta+Comma",
        category: "Global",
        ignoresActionRestrictions: false,
        callback: () => {},
      });
      const textarea = document.createElement("textarea");
      const result = useShortcutsStore.getState().resolveAction("Meta+Comma", textarea);
      expect(result).toBeNull();
    });

    it("allows through on textarea when ignoresActionRestrictions is true", () => {
      useShortcutsStore.getState().registerAction({
        id: "test.action",
        label: "Test Action",
        binding: "Escape",
        category: "Global",
        ignoresActionRestrictions: true,
        callback: () => {},
      });
      const textarea = document.createElement("textarea");
      const result = useShortcutsStore.getState().resolveAction("Escape", textarea);
      expect(result?.id).toBe("test.action");
    });

    it("returns null on input when ignoresActionRestrictions is false", () => {
      useShortcutsStore.getState().registerAction({
        id: "test.action",
        label: "Test Action",
        binding: "Meta+Comma",
        category: "Global",
        ignoresActionRestrictions: false,
        callback: () => {},
      });
      const input = document.createElement("input");
      const result = useShortcutsStore.getState().resolveAction("Meta+Comma", input);
      expect(result).toBeNull();
    });

    it("returns null on contenteditable when ignoresActionRestrictions is false", () => {
      useShortcutsStore.getState().registerAction({
        id: "test.action",
        label: "Test Action",
        binding: "Meta+Comma",
        category: "Global",
        ignoresActionRestrictions: false,
        callback: () => {},
      });
      const div = document.createElement("div");
      Object.defineProperty(div, "isContentEditable", { get: () => true, configurable: true });
      const result = useShortcutsStore.getState().resolveAction("Meta+Comma", div);
      expect(result).toBeNull();
    });

    it("returns null when actionsRestricted is true and ignoresActionRestrictions is false", () => {
      useShortcutsStore.getState().registerAction({
        id: "test.action",
        label: "Test Action",
        binding: "Meta+Comma",
        category: "Global",
        ignoresActionRestrictions: false,
        callback: () => {},
      });
      useShortcutsStore.getState().setActionsRestricted(true);
      const div = document.createElement("div");
      const result = useShortcutsStore.getState().resolveAction("Meta+Comma", div);
      expect(result).toBeNull();
    });

    it("returns action when actionsRestricted is true and ignoresActionRestrictions is true", () => {
      useShortcutsStore.getState().registerAction({
        id: "test.action",
        label: "Test Action",
        binding: "Escape",
        category: "Global",
        ignoresActionRestrictions: true,
        callback: () => {},
      });
      useShortcutsStore.getState().setActionsRestricted(true);
      const div = document.createElement("div");
      const result = useShortcutsStore.getState().resolveAction("Escape", div);
      expect(result?.id).toBe("test.action");
    });

    it("returns null for unknown combo", () => {
      const div = document.createElement("div");
      expect(useShortcutsStore.getState().resolveAction("Meta+KeyX", div)).toBeNull();
    });
  });

  describe("setActionsRestricted", () => {
    it("toggles actionsRestricted state", () => {
      expect(useShortcutsStore.getState().actionsRestricted).toBe(false);
      useShortcutsStore.getState().setActionsRestricted(true);
      expect(useShortcutsStore.getState().actionsRestricted).toBe(true);
      useShortcutsStore.getState().setActionsRestricted(false);
      expect(useShortcutsStore.getState().actionsRestricted).toBe(false);
    });
  });
});

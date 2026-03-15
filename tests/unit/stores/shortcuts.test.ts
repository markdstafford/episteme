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
    useShortcutsStore.setState({ actions: {}, customBindings: {} });
  });

  it("registers an action with its default binding", () => {
    useShortcutsStore.getState().registerAction({
      id: "test.action",
      label: "Test Action",
      defaultBinding: "Meta+Comma",
      category: "Global",
      firesThroughInputs: false,
    });
    const actions = useShortcutsStore.getState().actions;
    expect(actions["test.action"]).toBeDefined();
    expect(actions["test.action"].defaultBinding).toBe("Meta+Comma");
  });

  it("getBinding returns defaultBinding when no custom binding", () => {
    useShortcutsStore.getState().registerAction({
      id: "test.action",
      label: "Test Action",
      defaultBinding: "Meta+Comma",
      category: "Global",
      firesThroughInputs: false,
    });
    expect(useShortcutsStore.getState().getBinding("test.action")).toBe("Meta+Comma");
  });

  it("getBinding returns customBinding when set", () => {
    useShortcutsStore.getState().registerAction({
      id: "test.action",
      label: "Test Action",
      defaultBinding: "Meta+Comma",
      category: "Global",
      firesThroughInputs: false,
    });
    useShortcutsStore.setState({ customBindings: { "test.action": "Meta+KeyP" } });
    expect(useShortcutsStore.getState().getBinding("test.action")).toBe("Meta+KeyP");
  });

  it("comboToAction finds the action for a combo", () => {
    useShortcutsStore.getState().registerAction({
      id: "test.action",
      label: "Test Action",
      defaultBinding: "Meta+Comma",
      category: "Global",
      firesThroughInputs: false,
    });
    expect(useShortcutsStore.getState().comboToAction("Meta+Comma")).toBe("test.action");
  });

  it("comboToAction returns null for unknown combo", () => {
    expect(useShortcutsStore.getState().comboToAction("Meta+KeyX")).toBeNull();
  });

  it("resolveAction returns action when target is not an input", () => {
    useShortcutsStore.getState().registerAction({
      id: "test.action",
      label: "Test Action",
      defaultBinding: "Meta+Comma",
      category: "Global",
      firesThroughInputs: false,
      callback: () => {},
    });
    const div = document.createElement("div");
    const result = useShortcutsStore.getState().resolveAction("Meta+Comma", div);
    expect(result?.id).toBe("test.action");
  });

  it("resolveAction suppresses non-firesThroughInputs action when target is textarea", () => {
    useShortcutsStore.getState().registerAction({
      id: "test.action",
      label: "Test Action",
      defaultBinding: "Meta+Comma",
      category: "Global",
      firesThroughInputs: false,
      callback: () => {},
    });
    const textarea = document.createElement("textarea");
    const result = useShortcutsStore.getState().resolveAction("Meta+Comma", textarea);
    expect(result).toBeNull();
  });

  it("resolveAction allows firesThroughInputs action when target is textarea", () => {
    useShortcutsStore.getState().registerAction({
      id: "test.action",
      label: "Test Action",
      defaultBinding: "Escape",
      category: "Global",
      firesThroughInputs: true,
      callback: () => {},
    });
    const textarea = document.createElement("textarea");
    const result = useShortcutsStore.getState().resolveAction("Escape", textarea);
    expect(result?.id).toBe("test.action");
  });

  it("resolveAction suppresses non-firesThroughInputs action when target is input", () => {
    useShortcutsStore.getState().registerAction({
      id: "test.action",
      label: "Test Action",
      defaultBinding: "Meta+Comma",
      category: "Global",
      firesThroughInputs: false,
      callback: () => {},
    });
    const input = document.createElement("input");
    const result = useShortcutsStore.getState().resolveAction("Meta+Comma", input);
    expect(result).toBeNull();
  });

  it("resolveAction suppresses non-firesThroughInputs action when target is contenteditable", () => {
    useShortcutsStore.getState().registerAction({
      id: "test.action",
      label: "Test Action",
      defaultBinding: "Meta+Comma",
      category: "Global",
      firesThroughInputs: false,
      callback: () => {},
    });
    const div = document.createElement("div");
    // jsdom does not implement isContentEditable, so stub it directly
    Object.defineProperty(div, "isContentEditable", { get: () => true, configurable: true });
    const result = useShortcutsStore.getState().resolveAction("Meta+Comma", div);
    expect(result).toBeNull();
  });

  it("setBinding persists the custom binding", () => {
    useShortcutsStore.getState().registerAction({
      id: "test.action",
      label: "Test Action",
      defaultBinding: "Meta+Comma",
      category: "Global",
      firesThroughInputs: false,
    });
    useShortcutsStore.getState().setBinding("test.action", "Meta+KeyP");
    expect(useShortcutsStore.getState().getBinding("test.action")).toBe("Meta+KeyP");
  });

  it("resetBinding reverts to defaultBinding after a custom binding was set", () => {
    useShortcutsStore.getState().registerAction({
      id: "test.action",
      label: "Test Action",
      defaultBinding: "Meta+Comma",
      category: "Global",
      firesThroughInputs: false,
    });
    useShortcutsStore.getState().setBinding("test.action", "Meta+KeyP");
    useShortcutsStore.getState().resetBinding("test.action");
    expect(useShortcutsStore.getState().getBinding("test.action")).toBe("Meta+Comma");
  });

  it("applyCustomBindings replaces customBindings wholesale", () => {
    useShortcutsStore.getState().registerAction({
      id: "test.action",
      label: "Test Action",
      defaultBinding: "Meta+Comma",
      category: "Global",
      firesThroughInputs: false,
    });
    useShortcutsStore.getState().applyCustomBindings({ "test.action": "Meta+KeyZ" });
    expect(useShortcutsStore.getState().getBinding("test.action")).toBe("Meta+KeyZ");
  });
});

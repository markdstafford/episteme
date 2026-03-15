import { describe, it, expect, afterEach, vi } from "vitest";

describe("displayKey", () => {
  const originalPlatform = navigator.platform;

  afterEach(() => {
    Object.defineProperty(navigator, "platform", { value: originalPlatform, configurable: true });
    vi.resetModules();
  });

  it("maps Meta to ⌘ on Mac", async () => {
    Object.defineProperty(navigator, "platform", { value: "MacIntel", configurable: true });
    const { displayKey } = await import("@/lib/shortcutDisplay");
    expect(displayKey("Meta")).toBe("⌘");
  });

  it("maps Meta to Ctrl on non-Mac", async () => {
    Object.defineProperty(navigator, "platform", { value: "Win32", configurable: true });
    const { displayKey } = await import("@/lib/shortcutDisplay");
    expect(displayKey("Meta")).toBe("Ctrl");
  });

  it("maps Shift to ⇧ regardless of platform", async () => {
    const { displayKey } = await import("@/lib/shortcutDisplay");
    expect(displayKey("Shift")).toBe("⇧");
  });

  it("maps Alt to ⌥", async () => {
    const { displayKey } = await import("@/lib/shortcutDisplay");
    expect(displayKey("Alt")).toBe("⌥");
  });

  it("maps key codes to symbols", async () => {
    const { displayKey } = await import("@/lib/shortcutDisplay");
    expect(displayKey("Comma")).toBe(",");
    expect(displayKey("Slash")).toBe("/");
    expect(displayKey("Escape")).toBe("Esc");
    expect(displayKey("Enter")).toBe("↵");
  });

  it("strips Key prefix", async () => {
    const { displayKey } = await import("@/lib/shortcutDisplay");
    expect(displayKey("KeyA")).toBe("A");
  });

  it("strips Digit prefix", async () => {
    const { displayKey } = await import("@/lib/shortcutDisplay");
    expect(displayKey("Digit1")).toBe("1");
  });

  it("passes through unknown segments unchanged", async () => {
    const { displayKey } = await import("@/lib/shortcutDisplay");
    expect(displayKey("Unknown")).toBe("Unknown");
  });
});

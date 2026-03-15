import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { BindingCard } from "@/components/ui/BindingCard";

describe("BindingCard display", () => {
  it("renders action label", () => {
    render(
      <BindingCard
        label="Open settings"
        binding="Meta+Comma"
        onSave={vi.fn()}
        onReset={vi.fn()}
      />
    );
    expect(screen.getByText("Open settings")).toBeTruthy();
  });

  it("renders binding as kbd elements", () => {
    render(
      <BindingCard
        label="Open settings"
        binding="Meta+Comma"
        onSave={vi.fn()}
        onReset={vi.fn()}
      />
    );
    // Should render ⌘ and , as separate kbd chips
    const kbds = document.querySelectorAll("kbd kbd");
    const texts = Array.from(kbds).map((k) => k.textContent);
    expect(texts).toContain("⌘");
    expect(texts).toContain(",");
  });
});

describe("BindingCard edit mode", () => {
  it("enters edit mode on Customize click", () => {
    render(
      <BindingCard
        label="Open settings"
        binding="Meta+Comma"
        onSave={vi.fn()}
        onReset={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText("Customize"));
    expect(screen.getByText(/press a key combination/i)).toBeTruthy();
  });

  it("calls onSave with normalized combo on keydown in edit mode", () => {
    const onSave = vi.fn();
    render(
      <BindingCard
        label="Open settings"
        binding="Meta+Comma"
        onSave={onSave}
        onReset={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText("Customize"));
    fireEvent.keyDown(document, { code: "KeyP", metaKey: true });
    expect(onSave).toHaveBeenCalledWith("Meta+KeyP");
  });

  it("exits edit mode on Cancel click without saving", () => {
    const onSave = vi.fn();
    render(
      <BindingCard
        label="Open settings"
        binding="Meta+Comma"
        onSave={onSave}
        onReset={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText("Customize"));
    fireEvent.click(screen.getByText("Cancel"));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.queryByText(/press a key combination/i)).toBeNull();
  });
});

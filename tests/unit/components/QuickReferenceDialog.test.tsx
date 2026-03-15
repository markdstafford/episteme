import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QuickReferenceDialog } from "@/components/QuickReferenceDialog";
import { useShortcutsStore } from "@/stores/shortcuts";

beforeEach(() => {
  useShortcutsStore.setState({ actions: {}, customBindings: {} });
  useShortcutsStore.getState().registerAction({
    id: "app.openSettings",
    label: "Open settings",
    defaultBinding: "Meta+Comma",
    category: "Global",
    firesThroughInputs: false,
    rebindable: true,
  });
});

describe("QuickReferenceDialog", () => {
  it("renders all action labels", () => {
    render(<QuickReferenceDialog onClose={vi.fn()} />);
    expect(screen.getByText("Open settings")).toBeTruthy();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(<QuickReferenceDialog onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

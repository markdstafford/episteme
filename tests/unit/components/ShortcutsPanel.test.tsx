import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ShortcutsPanel } from "@/components/ShortcutsPanel";
import { useShortcutsStore } from "@/stores/shortcuts";

describe("ShortcutsPanel", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    onClose.mockReset();
    useShortcutsStore.setState({ actions: {}, actionsRestricted: false });

    const { registerAction } = useShortcutsStore.getState();
    registerAction({ id: "app.openSettings", label: "Open settings", binding: "Meta+Comma", category: "Global", ignoresActionRestrictions: false });
    registerAction({ id: "app.openShortcutsPanel", label: "Show keyboard shortcuts", binding: "Meta+Slash", category: "Global", ignoresActionRestrictions: true });
    registerAction({ id: "filetree.navigateUp", label: "Navigate up", binding: "ArrowUp", category: "File tree", ignoresActionRestrictions: false });
    registerAction({ id: "filetree.open", label: "Open file", binding: "Enter", category: "File tree", ignoresActionRestrictions: false });
  });

  it("renders all registered actions grouped by category", () => {
    render(<ShortcutsPanel onClose={onClose} />);
    expect(screen.getByText("Global")).toBeInTheDocument();
    expect(screen.getByText("File tree")).toBeInTheDocument();
    expect(screen.getByText("Open settings")).toBeInTheDocument();
    expect(screen.getByText("Navigate up")).toBeInTheDocument();
    expect(screen.getByText("Open file")).toBeInTheDocument();
    expect(screen.getByText("Show keyboard shortcuts")).toBeInTheDocument();
  });

  it("filters by action label", () => {
    render(<ShortcutsPanel onClose={onClose} />);
    const search = screen.getByPlaceholderText("Search shortcuts…");
    fireEvent.change(search, { target: { value: "navigate" } });
    expect(screen.getByText("Navigate up")).toBeInTheDocument();
    expect(screen.queryByText("Open settings")).not.toBeInTheDocument();
  });

  it("filters by category name and shows full category", () => {
    render(<ShortcutsPanel onClose={onClose} />);
    const search = screen.getByPlaceholderText("Search shortcuts…");
    fireEvent.change(search, { target: { value: "file tree" } });
    expect(screen.getByText("Navigate up")).toBeInTheDocument();
    expect(screen.getByText("Open file")).toBeInTheDocument();
    expect(screen.queryByText("Open settings")).not.toBeInTheDocument();
  });

  it("shows empty state when no results match", () => {
    render(<ShortcutsPanel onClose={onClose} />);
    const search = screen.getByPlaceholderText("Search shortcuts…");
    fireEvent.change(search, { target: { value: "xyznonexistent" } });
    expect(screen.getByText("No results")).toBeInTheDocument();
  });

  it("Escape in search with text clears text, panel stays open", () => {
    render(<ShortcutsPanel onClose={onClose} />);
    const search = screen.getByPlaceholderText("Search shortcuts…") as HTMLInputElement;
    fireEvent.change(search, { target: { value: "settings" } });
    expect(search.value).toBe("settings");
    fireEvent.keyDown(search, { key: "Escape" });
    expect(search.value).toBe("");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("close button triggers onClose", () => {
    vi.useFakeTimers();
    render(<ShortcutsPanel onClose={onClose} />);
    const closeBtn = screen.getByLabelText("Close shortcuts panel");
    fireEvent.click(closeBtn);
    vi.advanceTimersByTime(100);
    expect(onClose).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
});

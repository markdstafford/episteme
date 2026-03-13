import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useUpdateStore } from "@/stores/update";
import { UpdateIndicator } from "@/components/UpdateIndicator";

// Seed store helper
function seedStore(available: boolean, version: string | null = null) {
  useUpdateStore.setState({ available, version, notes: null, status: "idle", error: null });
}

describe("UpdateIndicator", () => {
  it("renders nothing when no update available", () => {
    seedStore(false);
    const { container } = render(<UpdateIndicator />);
    expect(container.firstChild).toBeNull();
  });

  it("renders icon when update is available", () => {
    seedStore(true, "0.2.0");
    render(<UpdateIndicator />);
    expect(screen.getByRole("button", { name: /update available/i })).toBeInTheDocument();
  });

  it("shows version in tooltip trigger", () => {
    seedStore(true, "0.2.0");
    render(<UpdateIndicator />);
    expect(screen.getByTitle("Version 0.2.0 available")).toBeInTheDocument();
  });

  it("opens dialog when icon clicked", async () => {
    seedStore(true, "0.2.0");
    render(<UpdateIndicator />);
    const button = screen.getByRole("button", { name: /update available/i });
    await userEvent.click(button);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

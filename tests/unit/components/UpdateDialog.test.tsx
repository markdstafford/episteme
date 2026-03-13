import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useUpdateStore } from "@/stores/update";
import { UpdateDialog } from "@/components/UpdateDialog";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

beforeEach(() => {
  useUpdateStore.setState({
    available: true,
    version: "0.2.0",
    notes: "## Features\n- Something new",
    status: "idle",
    error: null,
    checkForUpdate: vi.fn(),
    installUpdate: vi.fn(),
  });
});

describe("UpdateDialog", () => {
  it("renders version in title when open", () => {
    render(<UpdateDialog open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText(/version 0\.2\.0 available/i)).toBeInTheDocument();
  });

  it("renders release notes", () => {
    render(<UpdateDialog open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText(/something new/i)).toBeInTheDocument();
  });

  it("calls onOpenChange(false) when Dismiss clicked", async () => {
    const onOpenChange = vi.fn();
    render(<UpdateDialog open={true} onOpenChange={onOpenChange} />);
    await userEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("calls installUpdate when Update and restart clicked", async () => {
    const installUpdate = vi.fn();
    useUpdateStore.setState({ installUpdate });
    render(<UpdateDialog open={true} onOpenChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /update and restart/i }));
    expect(installUpdate).toHaveBeenCalled();
  });

  it("does not change available state when dismissed", async () => {
    render(<UpdateDialog open={true} onOpenChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(useUpdateStore.getState().available).toBe(true);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModeButton } from "@/components/ui/ModeButton";
import { useManifestStore } from "@/stores/manifests";

vi.mock("@/stores/manifests", () => ({
  useManifestStore: vi.fn(),
}));

const mockUseManifestStore = vi.mocked(useManifestStore);

describe("ModeButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders active mode name when mode is set", () => {
    mockUseManifestStore.mockReturnValue({
      activeMode: "draft",
      modes: [{ id: "draft", name: "Draft", scope: "document" as const, tools: [], system_prompt: "" }],
    } as any);
    render(<ModeButton onClick={() => {}} />);
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("renders placeholder 'Mode' when no active mode", () => {
    mockUseManifestStore.mockReturnValue({
      activeMode: null,
      modes: [],
    } as any);
    render(<ModeButton onClick={() => {}} />);
    expect(screen.getByText("Mode")).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    mockUseManifestStore.mockReturnValue({
      activeMode: "draft",
      modes: [{ id: "draft", name: "Draft", scope: "document" as const, tools: [], system_prompt: "" }],
    } as any);
    render(<ModeButton onClick={onClick} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("has aria-label with active mode name", () => {
    mockUseManifestStore.mockReturnValue({
      activeMode: "review",
      modes: [{ id: "review", name: "Review", scope: "document" as const, tools: [], system_prompt: "" }],
    } as any);
    render(<ModeButton onClick={() => {}} />);
    expect(screen.getByRole("button", { name: /Active mode: Review/ })).toBeInTheDocument();
  });
});

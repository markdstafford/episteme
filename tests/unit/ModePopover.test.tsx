import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModePopover } from "@/components/ModePopover";
import { useManifestStore } from "@/stores/manifests";
import type { ModeManifest } from "@/stores/manifests";

vi.mock("@/stores/manifests", () => ({ useManifestStore: vi.fn() }));

const mockModes: ModeManifest[] = [
  { id: "ask", name: "Ask", scope: "workspace", tools: [], system_prompt: "" },
  { id: "draft", name: "Draft", description: "Help draft docs", scope: "document", tools: [], system_prompt: "" },
  { id: "review", name: "Review", scope: "document", tools: [], system_prompt: "" },
];

const setActiveMode = vi.fn();

beforeEach(() => {
  vi.mocked(useManifestStore).mockReturnValue({
    activeMode: "draft",
    setActiveMode,
    applicableModes: (docType: string | null) =>
      docType ? mockModes.filter(m => m.scope === "document") : mockModes.filter(m => m.scope === "workspace"),
  } as any);
  setActiveMode.mockClear();
});

describe("ModePopover", () => {
  it("renders applicable modes alphabetically", () => {
    render(<ModePopover open onOpenChange={() => {}} docType="product-description" />);
    const options = screen.getAllByRole("option");
    // Draft and Review are document-scoped (applicable when docType present)
    expect(options[0]).toHaveTextContent("Draft");
    expect(options[1]).toHaveTextContent("Review");
  });

  it("shows checkmark on active mode", () => {
    render(<ModePopover open onOpenChange={() => {}} docType="product-description" />);
    expect(screen.getByTestId("active-check")).toBeInTheDocument();
  });

  it("filter input narrows list", async () => {
    render(<ModePopover open onOpenChange={() => {}} docType="product-description" />);
    const filter = screen.getByPlaceholderText("Search modes\u2026");
    await userEvent.type(filter, "rev");
    expect(screen.queryByRole("option", { name: /Draft/ })).toBeNull();
    expect(screen.getByRole("option", { name: /Review/ })).toBeInTheDocument();
  });

  it("calls setActiveMode and onOpenChange(false) on selection", async () => {
    const onOpenChange = vi.fn();
    render(<ModePopover open onOpenChange={onOpenChange} docType="product-description" />);
    await userEvent.click(screen.getAllByRole("option")[1]); // Review (alphabetically second)
    expect(setActiveMode).toHaveBeenCalledWith("review");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("Escape key closes popover without selecting", async () => {
    const onOpenChange = vi.fn();
    render(<ModePopover open onOpenChange={onOpenChange} docType="product-description" />);
    const filter = screen.getByPlaceholderText("Search modes\u2026");
    await userEvent.type(filter, "{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(setActiveMode).not.toHaveBeenCalled();
  });
});

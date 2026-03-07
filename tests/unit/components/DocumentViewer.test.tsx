import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DocumentViewer } from "@/components/DocumentViewer";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(""),
}));

vi.mock("@tauri-apps/plugin-shell", () => ({
  open: vi.fn(),
}));

vi.mock("@/stores/fileTree", () => ({
  useFileTreeStore: vi.fn((selector: any) =>
    selector({ selectedFilePath: null, selectFile: vi.fn() })
  ),
}));

vi.mock("@/stores/workspace", () => ({
  useWorkspaceStore: vi.fn((selector: any) =>
    selector({ folderPath: "/test/workspace" })
  ),
}));

describe("DocumentViewer empty state", () => {
  it("renders with flex-1 class when no file is selected", () => {
    const { container } = render(<DocumentViewer />);
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv).toHaveClass("flex-1");
  });
});

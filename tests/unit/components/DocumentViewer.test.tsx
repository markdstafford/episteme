import { render } from "@testing-library/react";
import { describe, it, expect, vi, afterEach, type MockedFunction } from "vitest";
import { DocumentViewer } from "@/components/DocumentViewer";
import { useFileTreeStore } from "@/stores/fileTree";
import { invoke } from "@tauri-apps/api/core";

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

afterEach(() => {
  vi.mocked(invoke).mockResolvedValue("");
  vi.mocked(useFileTreeStore).mockImplementation((selector: any) =>
    selector({ selectedFilePath: null, selectFile: vi.fn() })
  );
});

describe("DocumentViewer empty state", () => {
  it("renders with flex-1 class when no file is selected", () => {
    const { container } = render(<DocumentViewer />);
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv).toHaveClass("flex-1");
  });
});

describe("DocumentViewer loading state", () => {
  it("renders with flex-1 class while loading", () => {
    (useFileTreeStore as MockedFunction<typeof useFileTreeStore>).mockImplementation(
      (selector: any) =>
        selector({ selectedFilePath: "/test/doc.md", selectFile: vi.fn() })
    );
    // invoke never resolves → component stays in loading state
    (invoke as MockedFunction<typeof invoke>).mockReturnValue(
      new Promise(() => {})
    );

    const { container } = render(<DocumentViewer />);
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv).toHaveClass("flex-1");
  });
});

describe("DocumentViewer error state", () => {
  it("renders with flex-1 class on load failure", async () => {
    (useFileTreeStore as MockedFunction<typeof useFileTreeStore>).mockImplementation(
      (selector: any) =>
        selector({ selectedFilePath: "/test/doc.md", selectFile: vi.fn() })
    );
    (invoke as MockedFunction<typeof invoke>).mockRejectedValue(
      new Error("File not found")
    );

    const { container, findByText } = render(<DocumentViewer />);
    await findByText(/Failed to load document/);
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv).toHaveClass("flex-1");
  });
});

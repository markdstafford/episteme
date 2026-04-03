import { describe, it, expect, vi, beforeEach } from "vitest";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-shell", () => ({ open: vi.fn() }));

const mockInvoke = vi.mocked(invoke);
const mockListen = vi.mocked(listen);

import { useFileTreeStore } from "@/stores/fileTree";
import type { FileNode } from "@/lib/fileTree";

const initialTree: FileNode[] = [
  { name: "README.md", path: "/workspace/README.md", is_dir: false },
];

const updatedTree: FileNode[] = [
  { name: "README.md", path: "/workspace/README.md", is_dir: false },
  { name: "new-doc.md", path: "/workspace/new-doc.md", is_dir: false },
];

describe("Integration: workspace file watcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFileTreeStore.setState({
      nodes: initialTree,
      expandedPaths: new Set(["/workspace"]),
      selectedFilePath: "/workspace/README.md",
      isLoading: false,
      error: null,
    });
  });

  it("refreshTree adds new file to nodes while preserving selection and expanded paths", async () => {
    mockInvoke.mockResolvedValueOnce(updatedTree);

    await useFileTreeStore.getState().refreshTree("/workspace");

    const state = useFileTreeStore.getState();
    expect(state.nodes).toEqual(updatedTree);
    expect(state.selectedFilePath).toBe("/workspace/README.md");
    expect(state.expandedPaths).toEqual(new Set(["/workspace"]));
  });

  it("refreshTree clears selection when selected file is deleted", async () => {
    const treeWithoutReadme: FileNode[] = [
      { name: "new-doc.md", path: "/workspace/new-doc.md", is_dir: false },
    ];
    mockInvoke.mockResolvedValueOnce(treeWithoutReadme);

    await useFileTreeStore.getState().refreshTree("/workspace");

    expect(useFileTreeStore.getState().selectedFilePath).toBeNull();
  });
});

describe("Integration: document hot-reload on external change", () => {
  let capturedHandler: ((event: { payload: string[] }) => void) | null;

  beforeEach(async () => {
    vi.clearAllMocks();
    capturedHandler = null;

    mockListen.mockImplementation((eventName, handler) => {
      if (eventName === "workspace-files-changed") {
        capturedHandler = handler as any;
      }
      return Promise.resolve(vi.fn());
    });

    useFileTreeStore.setState({
      nodes: initialTree,
      selectedFilePath: "/workspace/README.md",
      expandedPaths: new Set(),
      isLoading: false,
      error: null,
    });
  });

  it("DocumentViewer re-reads file when workspace-files-changed includes selected path", async () => {
    const { render, waitFor } = await import("@testing-library/react");
    const { DocumentViewer } = await import("@/components/DocumentViewer");
    const { useWorkspaceStore } = await import("@/stores/workspace");

    useWorkspaceStore.setState({
      folderPath: "/workspace",
      isLoading: false,
      error: null,
    } as any);

    mockInvoke.mockResolvedValue("# Original");

    render(<DocumentViewer />);

    // Wait for initial read_file
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("read_file", expect.any(Object));
    });

    const initialReadCount = mockInvoke.mock.calls.filter(
      (c) => c[0] === "read_file",
    ).length;

    // Simulate external modification
    mockInvoke.mockResolvedValue("# Updated by Claude");
    expect(capturedHandler).not.toBeNull();
    capturedHandler!({ payload: ["/workspace/README.md"] });

    // Should trigger another read_file call
    await waitFor(() => {
      const readCount = mockInvoke.mock.calls.filter(
        (c) => c[0] === "read_file",
      ).length;
      expect(readCount).toBeGreaterThan(initialReadCount);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor, act } from "@testing-library/react";
import { DocumentViewer } from "@/components/DocumentViewer";
import { useFileTreeStore } from "@/stores/fileTree";
import { useWorkspaceStore } from "@/stores/workspace";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-shell", () => ({ open: vi.fn() }));

import { invoke } from "@tauri-apps/api/core";
const mockInvoke = vi.mocked(invoke);

describe("DocumentViewer reload on selectedFilePath change", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue("# Content");
    useFileTreeStore.setState({
      selectedFilePath: "/workspace/doc.md",
      selectFile: vi.fn(),
    } as any);
    useWorkspaceStore.setState({ folderPath: "/workspace" } as any);
  });

  it("reloads file when selectedFilePath changes (simulates DocumentUpdated)", async () => {
    render(<DocumentViewer />);

    // Wait for initial load
    await waitFor(() => expect(mockInvoke).toHaveBeenCalledTimes(1));
    expect(mockInvoke).toHaveBeenCalledWith("read_file", expect.any(Object));

    // Simulate DocumentUpdated: selectFile changes selectedFilePath
    act(() => {
      useFileTreeStore.setState({ selectedFilePath: "/workspace/new-doc.md" } as any);
    });

    // Should reload with the new path
    await waitFor(() => expect(mockInvoke).toHaveBeenCalledTimes(2));
    expect(mockInvoke).toHaveBeenLastCalledWith("read_file", {
      filePath: "/workspace/new-doc.md",
      workspacePath: "/workspace",
    });
  });

  it("does not reload when selectedFilePath is unchanged", async () => {
    render(<DocumentViewer />);
    await waitFor(() => expect(mockInvoke).toHaveBeenCalledTimes(1));

    // Same path — no change
    act(() => {
      useFileTreeStore.setState({ selectedFilePath: "/workspace/doc.md" } as any);
    });

    // Should NOT reload (give time for any spurious effects)
    await new Promise((r) => setTimeout(r, 100));
    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });
});

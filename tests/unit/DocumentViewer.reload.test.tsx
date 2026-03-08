import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { DocumentViewer } from "@/components/DocumentViewer";
import { useAiChatStore } from "@/stores/aiChat";
import { useFileTreeStore } from "@/stores/fileTree";
import { useWorkspaceStore } from "@/stores/workspace";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-shell", () => ({ open: vi.fn() }));

import { invoke } from "@tauri-apps/api/core";
const mockInvoke = vi.mocked(invoke);

describe("DocumentViewer reload on documentReloadCounter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue("# Content");
    useFileTreeStore.setState({
      selectedFilePath: "/workspace/doc.md",
      selectFile: vi.fn(),
    } as any);
    useWorkspaceStore.setState({ folderPath: "/workspace" } as any);
    useAiChatStore.setState({ documentReloadCounter: 0 } as any);
  });

  it("reloads file when documentReloadCounter increments with same path", async () => {
    render(<DocumentViewer />);

    // Wait for initial load
    await waitFor(() => expect(mockInvoke).toHaveBeenCalledTimes(1));
    expect(mockInvoke).toHaveBeenCalledWith("read_file", expect.any(Object));

    // Simulate DocumentUpdated (same path, content changed)
    useAiChatStore.setState({ documentReloadCounter: 1 } as any);

    // Should reload
    await waitFor(() => expect(mockInvoke).toHaveBeenCalledTimes(2));
  });

  it("does not reload when documentReloadCounter is unchanged", async () => {
    render(<DocumentViewer />);
    await waitFor(() => expect(mockInvoke).toHaveBeenCalledTimes(1));

    // No counter change
    useAiChatStore.setState({ documentReloadCounter: 0 } as any);

    // Should NOT reload (give time for any spurious effects)
    await new Promise((r) => setTimeout(r, 100));
    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });
});

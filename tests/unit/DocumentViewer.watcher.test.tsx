import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-shell", () => ({ open: vi.fn() }));

const mockInvoke = vi.mocked(invoke);
const mockListen = vi.mocked(listen);

import { DocumentViewer } from "@/components/DocumentViewer";
import { useFileTreeStore } from "@/stores/fileTree";
import { useWorkspaceStore } from "@/stores/workspace";

describe("DocumentViewer workspace-files-changed hot-reload", () => {
  let capturedHandler: ((event: { payload: string[] }) => void) | null;
  const mockUnlisten = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    capturedHandler = null;

    mockListen.mockImplementation((eventName, handler) => {
      if (eventName === "workspace-files-changed") {
        capturedHandler = handler as any;
      }
      return Promise.resolve(mockUnlisten);
    });

    mockInvoke.mockResolvedValue("# Original content");

    useFileTreeStore.setState({
      nodes: [],
      expandedPaths: new Set(),
      selectedFilePath: "/workspace/doc.md",
      isLoading: false,
      error: null,
    } as any);
    useWorkspaceStore.setState({
      folderPath: "/workspace",
      isLoading: false,
      error: null,
    } as any);
  });

  it("subscribes to workspace-files-changed on mount", async () => {
    render(<DocumentViewer />);

    await waitFor(() => {
      expect(mockListen).toHaveBeenCalledWith(
        "workspace-files-changed",
        expect.any(Function),
      );
    });
  });

  it("re-reads file when event payload includes selected file", async () => {
    render(<DocumentViewer />);

    // Wait for initial load
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("read_file", expect.any(Object));
    });

    const initialCallCount = mockInvoke.mock.calls.filter(
      (c) => c[0] === "read_file",
    ).length;

    // Simulate external change to the open file
    mockInvoke.mockResolvedValue("# Updated content");
    capturedHandler!({ payload: ["/workspace/doc.md"] });

    await waitFor(() => {
      const readFileCalls = mockInvoke.mock.calls.filter(
        (c) => c[0] === "read_file",
      );
      expect(readFileCalls.length).toBeGreaterThan(initialCallCount);
    });
  });

  it("does NOT re-read when event payload does not include selected file", async () => {
    render(<DocumentViewer />);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("read_file", expect.any(Object));
    });

    const callCountAfterLoad = mockInvoke.mock.calls.filter(
      (c) => c[0] === "read_file",
    ).length;

    // Simulate change to a DIFFERENT file
    capturedHandler!({ payload: ["/workspace/other.md"] });

    // Wait a tick to ensure no re-read was triggered
    await new Promise((r) => setTimeout(r, 100));

    const callCountAfterEvent = mockInvoke.mock.calls.filter(
      (c) => c[0] === "read_file",
    ).length;
    expect(callCountAfterEvent).toBe(callCountAfterLoad);
  });

  it("cleans up listener on unmount", async () => {
    const { unmount } = render(<DocumentViewer />);

    await waitFor(() => {
      expect(mockListen).toHaveBeenCalledWith(
        "workspace-files-changed",
        expect.any(Function),
      );
    });

    unmount();
    // Cleanup awaits the listen promise before calling unlisten
    await waitFor(() => {
      expect(mockUnlisten).toHaveBeenCalled();
    });
  });
});

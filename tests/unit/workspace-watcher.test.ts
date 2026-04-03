import { describe, it, expect, vi, beforeEach } from "vitest";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockInvoke = vi.mocked(invoke);
const mockListen = vi.mocked(listen);

// Must import stores AFTER mocks are set up
import { useWorkspaceStore } from "@/stores/workspace";
import { useFileTreeStore } from "@/stores/fileTree";

describe("workspace-files-changed subscription", () => {
  let capturedFilesHandler: ((event: { payload: string[] }) => void) | null;

  beforeEach(() => {
    vi.clearAllMocks();
    capturedFilesHandler = null;

    // Mock listen to capture the handler for workspace-files-changed
    mockListen.mockImplementation((eventName, handler) => {
      if (eventName === "workspace-files-changed") {
        capturedFilesHandler = handler as any;
      }
      return Promise.resolve(vi.fn()); // unlisten function
    });

    // Mock invoke for load_manifests and load_preferences
    mockInvoke.mockResolvedValue(null as any);

    useWorkspaceStore.setState({
      folderPath: null,
      isLoading: false,
      error: null,
      unlistenManifests: null,
      unlistenFilesChanged: null,
    });

    useFileTreeStore.setState({
      nodes: [],
      expandedPaths: new Set(),
      selectedFilePath: null,
      isLoading: false,
      error: null,
    });
  });

  it("registers workspace-files-changed listener when workspace is opened", async () => {
    mockInvoke.mockImplementation((cmd) => {
      if (cmd === "open_folder") return Promise.resolve("/workspace");
      if (cmd === "load_preferences") return Promise.resolve({});
      if (cmd === "load_manifests") return Promise.resolve({ modes: [], doc_types: [], processes: [] });
      return Promise.resolve(null);
    });

    await useWorkspaceStore.getState().openFolder();

    expect(mockListen).toHaveBeenCalledWith(
      "workspace-files-changed",
      expect.any(Function),
    );
  });

  it("calls refreshTree when workspace-files-changed fires", async () => {
    const refreshSpy = vi.fn();
    useFileTreeStore.setState({ refreshTree: refreshSpy } as any);
    useWorkspaceStore.setState({ folderPath: "/workspace" } as any);

    mockInvoke.mockImplementation((cmd) => {
      if (cmd === "open_folder") return Promise.resolve("/workspace");
      if (cmd === "load_preferences") return Promise.resolve({});
      if (cmd === "load_manifests") return Promise.resolve({ modes: [], doc_types: [], processes: [] });
      return Promise.resolve(null);
    });

    await useWorkspaceStore.getState().openFolder();

    // Simulate backend event
    expect(capturedFilesHandler).not.toBeNull();
    capturedFilesHandler!({ payload: ["/workspace/new.md"] });

    expect(refreshSpy).toHaveBeenCalledWith("/workspace");
  });

  it("cleans up previous listener on workspace change", async () => {
    const mockUnlisten = vi.fn();
    useWorkspaceStore.setState({ unlistenFilesChanged: mockUnlisten } as any);

    mockInvoke.mockImplementation((cmd) => {
      if (cmd === "open_folder") return Promise.resolve("/new-workspace");
      if (cmd === "load_preferences") return Promise.resolve({});
      if (cmd === "load_manifests") return Promise.resolve({ modes: [], doc_types: [], processes: [] });
      return Promise.resolve(null);
    });

    await useWorkspaceStore.getState().openFolder();

    expect(mockUnlisten).toHaveBeenCalled();
  });
});

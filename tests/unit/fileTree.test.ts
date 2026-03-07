import { describe, it, expect, vi, beforeEach } from "vitest";
import { useFileTreeStore } from "@/stores/fileTree";
import type { FileNode } from "@/lib/fileTree";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
const mockInvoke = vi.mocked(invoke);

const mockTree: FileNode[] = [
  {
    name: "specs",
    path: "/docs/specs",
    is_dir: true,
    children: [
      { name: "app.md", path: "/docs/specs/app.md", is_dir: false },
      { name: "feature.md", path: "/docs/specs/feature.md", is_dir: false },
    ],
  },
  { name: "README.md", path: "/docs/README.md", is_dir: false },
];

describe("useFileTreeStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFileTreeStore.setState({
      nodes: [],
      expandedPaths: new Set(),
      selectedFilePath: null,
      isLoading: false,
      error: null,
    });
  });

  describe("loadTree", () => {
    it("loads file tree from Tauri command", async () => {
      mockInvoke.mockResolvedValueOnce(mockTree);

      await useFileTreeStore.getState().loadTree("/docs");

      expect(useFileTreeStore.getState().nodes).toEqual(mockTree);
      expect(useFileTreeStore.getState().isLoading).toBe(false);
      expect(mockInvoke).toHaveBeenCalledWith("list_files", {
        folderPath: "/docs",
      });
    });

    it("clears selectedFilePath when loading a new tree", async () => {
      useFileTreeStore.setState({ selectedFilePath: "/docs/old.md" });
      mockInvoke.mockResolvedValueOnce(mockTree);

      await useFileTreeStore.getState().loadTree("/new-docs");

      expect(useFileTreeStore.getState().selectedFilePath).toBeNull();
    });

    it("sets error on failure", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("Permission denied"));

      await useFileTreeStore.getState().loadTree("/docs");

      expect(useFileTreeStore.getState().nodes).toEqual([]);
      expect(useFileTreeStore.getState().error).toBe("Permission denied");
      expect(useFileTreeStore.getState().isLoading).toBe(false);
    });
  });

  describe("toggleExpanded", () => {
    it("expands a collapsed folder", () => {
      useFileTreeStore.getState().toggleExpanded("/docs/specs");

      expect(useFileTreeStore.getState().expandedPaths.has("/docs/specs")).toBe(
        true
      );
    });

    it("collapses an expanded folder", () => {
      useFileTreeStore.setState({
        expandedPaths: new Set(["/docs/specs"]),
      });

      useFileTreeStore.getState().toggleExpanded("/docs/specs");

      expect(useFileTreeStore.getState().expandedPaths.has("/docs/specs")).toBe(
        false
      );
    });

    it("preserves other expanded paths", () => {
      useFileTreeStore.setState({
        expandedPaths: new Set(["/docs/specs", "/docs/adrs"]),
      });

      useFileTreeStore.getState().toggleExpanded("/docs/specs");

      expect(useFileTreeStore.getState().expandedPaths.has("/docs/adrs")).toBe(
        true
      );
      expect(useFileTreeStore.getState().expandedPaths.has("/docs/specs")).toBe(
        false
      );
    });
  });

  describe("selectFile", () => {
    it("sets selected file path", () => {
      useFileTreeStore.getState().selectFile("/docs/README.md");

      expect(useFileTreeStore.getState().selectedFilePath).toBe(
        "/docs/README.md"
      );
    });

    it("replaces previously selected file", () => {
      useFileTreeStore.setState({ selectedFilePath: "/docs/old.md" });

      useFileTreeStore.getState().selectFile("/docs/new.md");

      expect(useFileTreeStore.getState().selectedFilePath).toBe(
        "/docs/new.md"
      );
    });
  });
});

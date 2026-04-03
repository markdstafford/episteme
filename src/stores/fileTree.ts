import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { FileNode } from "@/lib/fileTree";

function flattenPaths(nodes: FileNode[], paths = new Set<string>()): Set<string> {
  for (const node of nodes) {
    paths.add(node.path);
    if (node.children) {
      flattenPaths(node.children, paths);
    }
  }
  return paths;
}

interface FileTreeStore {
  nodes: FileNode[];
  expandedPaths: Set<string>;
  selectedFilePath: string | null;
  isLoading: boolean;
  error: string | null;
  loadTree: (folderPath: string) => Promise<void>;
  refreshTree: (folderPath: string) => Promise<void>;
  toggleExpanded: (path: string) => void;
  selectFile: (path: string) => void;
}

export const useFileTreeStore = create<FileTreeStore>((set, get) => ({
  nodes: [],
  expandedPaths: new Set(),
  selectedFilePath: null,
  isLoading: false,
  error: null,

  loadTree: async (folderPath: string) => {
    set({ isLoading: true, error: null, selectedFilePath: null });
    try {
      const nodes = await invoke<FileNode[]>("list_files", {
        folderPath,
      });
      set({ nodes, isLoading: false });
    } catch (e) {
      set({
        nodes: [],
        isLoading: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  },

  refreshTree: async (folderPath: string) => {
    try {
      const nodes = await invoke<FileNode[]>("list_files", { folderPath });
      const { selectedFilePath } = get();
      const allPaths = flattenPaths(nodes);
      set({
        nodes,
        selectedFilePath:
          selectedFilePath && allPaths.has(selectedFilePath)
            ? selectedFilePath
            : null,
      });
    } catch {
      // Silent fail — stale tree is better than no tree
    }
  },

  toggleExpanded: (path: string) => {
    const expanded = new Set(get().expandedPaths);
    if (expanded.has(path)) {
      expanded.delete(path);
    } else {
      expanded.add(path);
    }
    set({ expandedPaths: expanded });
  },

  selectFile: (path: string) => {
    set({ selectedFilePath: path });
  },
}));

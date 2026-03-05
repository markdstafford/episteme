import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { parsePreferences } from "@/lib/preferences";
import { useFileTreeStore } from "@/stores/fileTree";

interface WorkspaceStore {
  folderPath: string | null;
  isLoading: boolean;
  error: string | null;
  openFolder: () => Promise<void>;
  loadSavedFolder: () => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  folderPath: null,
  isLoading: false,
  error: null,

  openFolder: async () => {
    set({ isLoading: true, error: null });
    try {
      const path = await invoke<string | null>("open_folder");
      if (path) {
        set({ folderPath: path, isLoading: false });
        const existingRaw = await invoke("load_preferences");
        const existingPrefs = parsePreferences(existingRaw);
        await invoke("save_preferences", {
          preferences: { ...existingPrefs, last_opened_folder: path },
        });
        useFileTreeStore.getState().loadTree(path);
      } else {
        set({ isLoading: false });
      }
    } catch (e) {
      set({
        isLoading: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  },

  loadSavedFolder: async () => {
    set({ isLoading: true, error: null });
    try {
      const raw = await invoke("load_preferences");
      const prefs = parsePreferences(raw);
      set({ folderPath: prefs.last_opened_folder, isLoading: false });
      if (prefs.last_opened_folder) {
        useFileTreeStore.getState().loadTree(prefs.last_opened_folder);
      }
    } catch (e) {
      set({
        isLoading: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  },
}));

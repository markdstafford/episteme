import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { parsePreferences } from "@/lib/preferences";
import { useFileTreeStore } from "@/stores/fileTree";
import { useManifestStore, type LoadedManifests } from "@/stores/manifests";

interface WorkspaceStore {
  folderPath: string | null;
  isLoading: boolean;
  error: string | null;
  unlistenManifests: UnlistenFn | null;
  unlistenFilesChanged: UnlistenFn | null;
  openFolder: () => Promise<void>;
  loadSavedFolder: () => Promise<void>;
}

async function setupWorkspaceWatchers(
  path: string,
  set: (partial: Partial<WorkspaceStore>) => void,
  get: () => WorkspaceStore,
) {
  // Clean up previous listeners
  const prev = get().unlistenManifests;
  if (prev) prev();
  const prevFiles = get().unlistenFilesChanged;
  if (prevFiles) prevFiles();

  // Load manifests (this also sets default activeMode internally)
  await useManifestStore.getState().loadManifests(path);

  // Subscribe to hot-reload events from backend
  const unlistenManifests = await listen<LoadedManifests>("manifests-reloaded", (event) => {
    useManifestStore.getState().setManifests(event.payload);
  });

  // Subscribe to workspace file changes
  const unlistenFilesChanged = await listen<string[]>("workspace-files-changed", () => {
    const folderPath = get().folderPath;
    if (folderPath) {
      useFileTreeStore.getState().refreshTree(folderPath);
    }
  });

  set({ unlistenManifests, unlistenFilesChanged });
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  folderPath: null,
  isLoading: false,
  error: null,
  unlistenManifests: null,
  unlistenFilesChanged: null,

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
        await setupWorkspaceWatchers(path, set, get);
        await invoke("init_workspace_db", { workspacePath: path }).catch((e) =>
          console.error("Failed to init workspace DB:", e),
        );
        invoke("ensure_all_doc_ids", { workspacePath: path }).catch((e) =>
          console.error("Failed to ensure doc IDs:", e),
        );
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
        await setupWorkspaceWatchers(prefs.last_opened_folder, set, get);
        await invoke("init_workspace_db", {
          workspacePath: prefs.last_opened_folder,
        }).catch((e) => console.error("Failed to init workspace DB:", e));
        invoke("ensure_all_doc_ids", {
          workspacePath: prefs.last_opened_folder,
        }).catch((e) => console.error("Failed to ensure doc IDs:", e));
      }
    } catch (e) {
      set({
        isLoading: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  },
}));

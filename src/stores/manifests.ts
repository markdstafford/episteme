import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { useFileTreeStore } from "@/stores/fileTree";

export interface ModeManifest {
  id: string;
  name: string;
  description?: string;
  scope: "document" | "workspace" | "any";
  tools: string[];
  system_prompt: string;
}

export interface DocTypeManifest {
  id: string;
  name: string;
  description?: string;
  template: string;
}

export interface ProcessManifest {
  id: string;
  modes: string[];
  doc_types: string[];
  stages: string[];
  instructions: string;
}

export interface LoadedManifests {
  modes: ModeManifest[];
  doc_types: DocTypeManifest[];
  processes: ProcessManifest[];
}

interface ManifestStore {
  modes: ModeManifest[];
  docTypes: DocTypeManifest[];
  processes: ProcessManifest[];
  activeMode: string | null;

  loadManifests: (workspacePath: string) => Promise<void>;
  setManifests: (manifests: LoadedManifests) => void;
  setActiveMode: (id: string) => void;
  applicableModes: (docType: string | null) => ModeManifest[];
  resolveDefaultMode: (docType: string | null, status: string | null) => string | null;
}

export const useManifestStore = create<ManifestStore>((set, get) => ({
  modes: [],
  docTypes: [],
  processes: [],
  activeMode: null,

  loadManifests: async (workspacePath: string) => {
    const manifests = await invoke<LoadedManifests>("load_manifests", { workspacePath });
    const { resolveDefaultMode, setActiveMode } = get();
    set({
      modes: manifests.modes,
      docTypes: manifests.doc_types,
      processes: manifests.processes,
    });
    // Set default mode after loading
    const defaultMode = resolveDefaultMode(null, null);
    if (defaultMode) setActiveMode(defaultMode);
  },

  setManifests: (manifests: LoadedManifests) => {
    set({
      modes: manifests.modes,
      docTypes: manifests.doc_types,
      processes: manifests.processes,
    });
    // Validate active mode is still present after reload; re-resolve if not
    const { activeMode, resolveDefaultMode, setActiveMode } = get();
    if (activeMode && !get().modes.find(m => m.id === activeMode)) {
      const docType = useFileTreeStore.getState().selectedFilePath ? "document" : null;
      const newMode = resolveDefaultMode(docType, null);
      if (newMode) setActiveMode(newMode);
    }
  },

  setActiveMode: (id: string) => {
    set({ activeMode: id });
  },

  applicableModes: (docType: string | null) => {
    const { modes } = get();
    return modes.filter(m => {
      if (m.scope === "any") return true;
      if (docType === null) return m.scope === "workspace";
      return m.scope === "document";
    });
  },

  resolveDefaultMode: (docType: string | null, _status: string | null) => {
    const { applicableModes } = get();
    const applicable = applicableModes(docType);
    if (applicable.length === 0) return null;

    // Stub logic per issue #113
    if (docType === null) {
      const ask = applicable.find(m => m.id === "ask");
      if (ask) return ask.id;
    } else {
      const draft = applicable.find(m => m.id === "draft");
      if (draft) return draft.id;
    }
    // Fallback: first alphabetically
    return [...applicable].sort((a, b) => a.id.localeCompare(b.id))[0]?.id ?? null;
  },
}));

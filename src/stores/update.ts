import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

interface UpdateCheckResult {
  available: boolean;
  version: string | null;
  notes: string | null;
}

interface UpdateState {
  available: boolean;
  version: string | null;
  notes: string | null;
  status: "idle" | "checking" | "downloading" | "error";
  error: string | null;
  checkForUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
}

export const useUpdateStore = create<UpdateState>((set) => ({
  available: false,
  version: null,
  notes: null,
  status: "idle",
  error: null,

  checkForUpdate: async () => {
    set({ status: "checking", error: null });
    try {
      const result = await invoke<UpdateCheckResult>("check_for_update");
      set({
        available: result.available,
        version: result.version,
        notes: result.notes,
        status: "idle",
      });
    } catch (e) {
      set({
        status: "error",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  },

  installUpdate: async () => {
    set({ status: "downloading" });
    try {
      await invoke("install_update");
    } catch (e) {
      set({
        status: "error",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  },
}));

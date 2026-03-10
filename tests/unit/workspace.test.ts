import { describe, it, expect, vi, beforeEach } from "vitest";
import { useWorkspaceStore } from "@/stores/workspace";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
const mockInvoke = vi.mocked(invoke);

describe("useWorkspaceStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWorkspaceStore.setState({
      folderPath: null,
      isLoading: false,
      error: null,
    });
  });

  describe("initial state", () => {
    it("has null folderPath", () => {
      expect(useWorkspaceStore.getState().folderPath).toBeNull();
    });

    it("is not loading", () => {
      expect(useWorkspaceStore.getState().isLoading).toBe(false);
    });

    it("has no error", () => {
      expect(useWorkspaceStore.getState().error).toBeNull();
    });
  });

  describe("openFolder", () => {
    it("sets folderPath when folder is selected", async () => {
      mockInvoke.mockResolvedValueOnce("/selected/path"); // open_folder
      mockInvoke.mockResolvedValueOnce({ last_opened_folder: null, aws_profile: "my-profile" }); // load_preferences
      mockInvoke.mockResolvedValueOnce(undefined); // save_preferences

      await useWorkspaceStore.getState().openFolder();

      expect(useWorkspaceStore.getState().folderPath).toBe("/selected/path");
      expect(useWorkspaceStore.getState().isLoading).toBe(false);
      expect(mockInvoke).toHaveBeenCalledWith("open_folder");
      expect(mockInvoke).toHaveBeenCalledWith("load_preferences");
      expect(mockInvoke).toHaveBeenCalledWith("save_preferences", {
        preferences: { last_opened_folder: "/selected/path", aws_profile: "my-profile", recently_used_skill_types: [] },
      });
    });

    it("does not update folderPath when dialog is cancelled", async () => {
      mockInvoke.mockResolvedValueOnce(null);

      await useWorkspaceStore.getState().openFolder();

      expect(useWorkspaceStore.getState().folderPath).toBeNull();
      expect(useWorkspaceStore.getState().isLoading).toBe(false);
    });

    it("sets error on failure", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("Dialog failed"));

      await useWorkspaceStore.getState().openFolder();

      expect(useWorkspaceStore.getState().error).toBe("Dialog failed");
      expect(useWorkspaceStore.getState().isLoading).toBe(false);
    });

    it("handles string errors", async () => {
      mockInvoke.mockRejectedValueOnce("Some error string");

      await useWorkspaceStore.getState().openFolder();

      expect(useWorkspaceStore.getState().error).toBe("Some error string");
    });
  });

  describe("loadSavedFolder", () => {
    it("loads saved folder from preferences", async () => {
      mockInvoke.mockResolvedValueOnce({
        last_opened_folder: "/saved/path",
        aws_profile: null,
      });

      await useWorkspaceStore.getState().loadSavedFolder();

      expect(useWorkspaceStore.getState().folderPath).toBe("/saved/path");
      expect(useWorkspaceStore.getState().isLoading).toBe(false);
      expect(mockInvoke).toHaveBeenCalledWith("load_preferences");
    });

    it("sets null folderPath when no saved folder", async () => {
      mockInvoke.mockResolvedValueOnce({ last_opened_folder: null, aws_profile: null });

      await useWorkspaceStore.getState().loadSavedFolder();

      expect(useWorkspaceStore.getState().folderPath).toBeNull();
    });

    it("handles malformed preferences gracefully", async () => {
      mockInvoke.mockResolvedValueOnce({ bad: "data" });

      await useWorkspaceStore.getState().loadSavedFolder();

      expect(useWorkspaceStore.getState().folderPath).toBeNull();
      expect(useWorkspaceStore.getState().error).toBeNull();
    });

    it("sets error on failure", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("Read failed"));

      await useWorkspaceStore.getState().loadSavedFolder();

      expect(useWorkspaceStore.getState().error).toBe("Read failed");
      expect(useWorkspaceStore.getState().isLoading).toBe(false);
    });
  });
});

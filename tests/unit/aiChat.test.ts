import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  Channel: vi.fn().mockImplementation(function (this: any) {
    this.onmessage = null;
  }),
}));

import { invoke, Channel } from "@tauri-apps/api/core";
import { useAiChatStore } from "@/stores/aiChat";
import { useFileTreeStore } from "@/stores/fileTree";
import { useWorkspaceStore } from "@/stores/workspace";

const mockInvoke = vi.mocked(invoke);

describe("useAiChatStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAiChatStore.setState({
      messages: [],
      isStreaming: false,
      streamingContent: "",
      isAuthenticated: false,
      authChecked: false,
      awsProfile: null,
      error: null,
    });
    useFileTreeStore.setState({ selectedFilePath: null });
    useWorkspaceStore.setState({ folderPath: null });
  });

  describe("initial state", () => {
    it("has empty messages array", () => {
      expect(useAiChatStore.getState().messages).toEqual([]);
    });

    it("is not streaming", () => {
      expect(useAiChatStore.getState().isStreaming).toBe(false);
    });

    it("has empty streamingContent", () => {
      expect(useAiChatStore.getState().streamingContent).toBe("");
    });

    it("is not authenticated", () => {
      expect(useAiChatStore.getState().isAuthenticated).toBe(false);
    });

    it("has not checked auth", () => {
      expect(useAiChatStore.getState().authChecked).toBe(false);
    });

    it("has null awsProfile", () => {
      expect(useAiChatStore.getState().awsProfile).toBeNull();
    });

    it("has no error", () => {
      expect(useAiChatStore.getState().error).toBeNull();
    });
  });

  describe("checkAuth", () => {
    it("sets authChecked=true and isAuthenticated=false when awsProfile is null", async () => {
      await useAiChatStore.getState().checkAuth();

      expect(useAiChatStore.getState().authChecked).toBe(true);
      expect(useAiChatStore.getState().isAuthenticated).toBe(false);
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it("sets isAuthenticated=true when invoke returns true", async () => {
      useAiChatStore.setState({ awsProfile: "my-profile" });
      mockInvoke.mockResolvedValueOnce(true);

      await useAiChatStore.getState().checkAuth();

      expect(useAiChatStore.getState().isAuthenticated).toBe(true);
      expect(useAiChatStore.getState().authChecked).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith("ai_check_auth", {
        awsProfile: "my-profile",
      });
    });

    it("sets isAuthenticated=false when invoke returns false", async () => {
      useAiChatStore.setState({ awsProfile: "my-profile" });
      mockInvoke.mockResolvedValueOnce(false);

      await useAiChatStore.getState().checkAuth();

      expect(useAiChatStore.getState().isAuthenticated).toBe(false);
      expect(useAiChatStore.getState().authChecked).toBe(true);
    });

    it("sets error and isAuthenticated=false when invoke throws", async () => {
      useAiChatStore.setState({ awsProfile: "my-profile" });
      mockInvoke.mockRejectedValueOnce(new Error("Auth failed"));

      await useAiChatStore.getState().checkAuth();

      expect(useAiChatStore.getState().isAuthenticated).toBe(false);
      expect(useAiChatStore.getState().authChecked).toBe(true);
      expect(useAiChatStore.getState().error).toBe("Auth failed");
    });

    it("handles string errors", async () => {
      useAiChatStore.setState({ awsProfile: "my-profile" });
      mockInvoke.mockRejectedValueOnce("Some error");

      await useAiChatStore.getState().checkAuth();

      expect(useAiChatStore.getState().error).toBe("Some error");
    });
  });

  describe("login", () => {
    it("sets error when awsProfile is null", async () => {
      await useAiChatStore.getState().login();

      expect(useAiChatStore.getState().error).toBe(
        "No AWS profile configured",
      );
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it("calls ai_sso_login then checkAuth when awsProfile is set", async () => {
      useAiChatStore.setState({ awsProfile: "my-profile" });
      mockInvoke.mockResolvedValueOnce(undefined); // ai_sso_login
      mockInvoke.mockResolvedValueOnce(true); // ai_check_auth from checkAuth

      await useAiChatStore.getState().login();

      expect(mockInvoke).toHaveBeenCalledWith("ai_sso_login", {
        awsProfile: "my-profile",
      });
      expect(mockInvoke).toHaveBeenCalledWith("ai_check_auth", {
        awsProfile: "my-profile",
      });
      expect(useAiChatStore.getState().isAuthenticated).toBe(true);
    });

    it("sets error when invoke throws", async () => {
      useAiChatStore.setState({ awsProfile: "my-profile" });
      mockInvoke.mockRejectedValueOnce(new Error("Login failed"));

      await useAiChatStore.getState().login();

      expect(useAiChatStore.getState().error).toBe("Login failed");
    });
  });

  describe("sendMessage", () => {
    it("appends user message to messages array", async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      await useAiChatStore.getState().sendMessage("Hello");

      const messages = useAiChatStore.getState().messages;
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({ role: "user", content: "Hello" });
    });

    it("sets isStreaming=true and clears streamingContent", async () => {
      useAiChatStore.setState({ streamingContent: "old content" });
      // Don't resolve invoke so streaming stays true
      mockInvoke.mockReturnValueOnce(new Promise(() => {}));

      // Fire and forget - don't await since invoke never resolves
      useAiChatStore.getState().sendMessage("Hello");

      // Allow microtasks to flush
      await new Promise((r) => setTimeout(r, 0));

      expect(useAiChatStore.getState().isStreaming).toBe(true);
      expect(useAiChatStore.getState().streamingContent).toBe("");
    });

    it("calls invoke with ai_chat and correct parameters", async () => {
      useAiChatStore.setState({ awsProfile: "my-profile" });
      useFileTreeStore.setState({ selectedFilePath: "/workspace/doc.md" });
      useWorkspaceStore.setState({ folderPath: "/workspace" });
      mockInvoke.mockResolvedValueOnce(undefined);

      await useAiChatStore.getState().sendMessage("Hello");

      expect(mockInvoke).toHaveBeenCalledWith("ai_chat", {
        messages: [{ role: "user", content: "Hello" }],
        activeFilePath: "/workspace/doc.md",
        workspacePath: "/workspace",
        awsProfile: "my-profile",
        authoringMode: false,
        activeSkill: null,
        onEvent: expect.any(Object),
      });
    });

    it("creates a Channel for streaming events", async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      await useAiChatStore.getState().sendMessage("Hello");

      expect(Channel).toHaveBeenCalled();
    });

    it("clears error when sending a message", async () => {
      useAiChatStore.setState({ error: "previous error" });
      mockInvoke.mockResolvedValueOnce(undefined);

      await useAiChatStore.getState().sendMessage("Hello");

      expect(useAiChatStore.getState().error).toBeNull();
    });

    it("sets error when invoke throws", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("Chat failed"));

      await useAiChatStore.getState().sendMessage("Hello");

      expect(useAiChatStore.getState().isStreaming).toBe(false);
      expect(useAiChatStore.getState().streamingContent).toBe("");
      expect(useAiChatStore.getState().error).toBe("Chat failed");
    });
  });

  describe("clearConversation", () => {
    it("resets messages to empty array", () => {
      useAiChatStore.setState({
        messages: [{ role: "user", content: "Hello" }],
      });

      useAiChatStore.getState().clearConversation();

      expect(useAiChatStore.getState().messages).toEqual([]);
    });

    it("resets streamingContent to empty string", () => {
      useAiChatStore.setState({ streamingContent: "partial response" });

      useAiChatStore.getState().clearConversation();

      expect(useAiChatStore.getState().streamingContent).toBe("");
    });

    it("resets error to null", () => {
      useAiChatStore.setState({ error: "some error" });

      useAiChatStore.getState().clearConversation();

      expect(useAiChatStore.getState().error).toBeNull();
    });

    it("resets isStreaming to false", () => {
      useAiChatStore.setState({ isStreaming: true });

      useAiChatStore.getState().clearConversation();

      expect(useAiChatStore.getState().isStreaming).toBe(false);
    });
  });

  describe("setAwsProfile", () => {
    it("sets awsProfile in state", async () => {
      mockInvoke.mockResolvedValueOnce({ last_opened_folder: null, aws_profile: null }); // load_preferences
      mockInvoke.mockResolvedValueOnce(undefined); // save_preferences
      mockInvoke.mockResolvedValueOnce(true); // ai_check_auth

      await useAiChatStore.getState().setAwsProfile("new-profile");

      expect(useAiChatStore.getState().awsProfile).toBe("new-profile");
    });

    it("calls save_preferences with merged preferences", async () => {
      useWorkspaceStore.setState({ folderPath: "/workspace" });
      mockInvoke.mockResolvedValueOnce({ last_opened_folder: "/workspace", aws_profile: null }); // load_preferences
      mockInvoke.mockResolvedValueOnce(undefined); // save_preferences
      mockInvoke.mockResolvedValueOnce(true); // ai_check_auth

      await useAiChatStore.getState().setAwsProfile("new-profile");

      expect(mockInvoke).toHaveBeenCalledWith("load_preferences");
      expect(mockInvoke).toHaveBeenCalledWith("save_preferences", {
        preferences: {
          last_opened_folder: "/workspace",
          aws_profile: "new-profile",
        },
      });
    });

    it("calls checkAuth after saving", async () => {
      mockInvoke.mockResolvedValueOnce({ last_opened_folder: null, aws_profile: null }); // load_preferences
      mockInvoke.mockResolvedValueOnce(undefined); // save_preferences
      mockInvoke.mockResolvedValueOnce(true); // ai_check_auth

      await useAiChatStore.getState().setAwsProfile("new-profile");

      expect(mockInvoke).toHaveBeenCalledWith("ai_check_auth", {
        awsProfile: "new-profile",
      });
      expect(useAiChatStore.getState().isAuthenticated).toBe(true);
    });

    it("sets error when invoke throws", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("Save failed"));

      await useAiChatStore.getState().setAwsProfile("new-profile");

      expect(useAiChatStore.getState().error).toBe("Save failed");
    });
  });
});

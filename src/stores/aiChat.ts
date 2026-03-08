import { create } from "zustand";
import { invoke, Channel } from "@tauri-apps/api/core";
import { parsePreferences } from "@/lib/preferences";
import { useFileTreeStore } from "@/stores/fileTree";
import { useWorkspaceStore } from "@/stores/workspace";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AiChatStore {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
  isAuthenticated: boolean;
  authChecked: boolean;
  awsProfile: string | null;
  error: string | null;
  authoringMode: boolean;
  authoringFilePath: string | null;
  activeSkill: string | null;
  documentReloadCounter: number;

  checkAuth: () => Promise<void>;
  login: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  setAwsProfile: (profile: string) => Promise<void>;
  clearConversation: () => void;
  startAuthoring: () => void;
}

export const useAiChatStore = create<AiChatStore>((set, get) => ({
  messages: [],
  isStreaming: false,
  streamingContent: "",
  isAuthenticated: false,
  authChecked: false,
  awsProfile: null,
  error: null,
  authoringMode: false,
  authoringFilePath: null,
  activeSkill: null,
  documentReloadCounter: 0,

  checkAuth: async () => {
    const { awsProfile } = get();
    if (awsProfile === null) {
      set({ authChecked: true, isAuthenticated: false });
      return;
    }
    try {
      const result = await invoke<boolean>("ai_check_auth", { awsProfile });
      set({ isAuthenticated: result, authChecked: true });
    } catch (e) {
      set({
        isAuthenticated: false,
        authChecked: true,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  },

  login: async () => {
    const { awsProfile } = get();
    if (awsProfile === null) {
      set({ error: "No AWS profile configured" });
      return;
    }
    try {
      await invoke("ai_sso_login", { awsProfile });
      await get().checkAuth();
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : String(e),
      });
    }
  },

  sendMessage: async (content: string) => {
    const userMessage: ChatMessage = { role: "user", content };
    set((s) => ({
      messages: [...s.messages, userMessage],
      isStreaming: true,
      streamingContent: "",
      error: null,
    }));

    const { authoringMode, authoringFilePath, activeSkill, awsProfile } = get();
    const activeFilePath = authoringMode
      ? authoringFilePath
      : useFileTreeStore.getState().selectedFilePath;
    const workspacePath = useWorkspaceStore.getState().folderPath;
    const currentMessages = get().messages;

    const onEvent = new Channel<{ type: string; data: string }>();
    onEvent.onmessage = (event) => {
      if (event.type === "Token") {
        set((s) => ({ streamingContent: s.streamingContent + event.data }));
      } else if (event.type === "Done") {
        set((s) => ({
          messages: [
            ...s.messages,
            { role: "assistant" as const, content: event.data },
          ],
          isStreaming: false,
          streamingContent: "",
        }));
      } else if (event.type === "Error") {
        const isAuthError = event.data.startsWith("auth:");
        set({
          isStreaming: false,
          streamingContent: "",
          error: event.data,
          ...(isAuthError ? { isAuthenticated: false } : {}),
        });
      } else if (event.type === "DocumentUpdated") {
        const filePath = event.data;
        set((s) => ({
          authoringFilePath: filePath,
          documentReloadCounter: s.documentReloadCounter + 1,
        }));
        useFileTreeStore.getState().selectFile(filePath);
      }
    };

    try {
      await invoke("ai_chat", {
        messages: currentMessages,
        activeFilePath,
        workspacePath,
        awsProfile,
        authoringMode,
        activeSkill,
        onEvent,
      });
    } catch (e) {
      set({
        isStreaming: false,
        streamingContent: "",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  },

  setAwsProfile: async (profile: string) => {
    set({ awsProfile: profile });
    try {
      const existingRaw = await invoke("load_preferences");
      const existingPrefs = parsePreferences(existingRaw);
      await invoke("save_preferences", {
        preferences: { ...existingPrefs, aws_profile: profile },
      });
      await get().checkAuth();
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : String(e),
      });
    }
  },

  clearConversation: () => {
    set({
      messages: [],
      isStreaming: false,
      streamingContent: "",
      error: null,
      authoringMode: false,
      authoringFilePath: null,
      activeSkill: null,
      documentReloadCounter: 0,
    });
  },

  startAuthoring: () => {
    set({
      authoringMode: true,
      authoringFilePath: null,
      activeSkill: null,
      messages: [],
      isStreaming: false,
      streamingContent: "",
      error: null,
    });
  },
}));

import { create } from "zustand";
import { invoke, Channel } from "@tauri-apps/api/core";
import { parsePreferences } from "@/lib/preferences";
import { useFileTreeStore } from "@/stores/fileTree";
import { useWorkspaceStore } from "@/stores/workspace";
import { type Session, type SessionMessage, type CanonicalMessage, type SessionScope, makeTextBlock, newSession } from "@/lib/session";

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
  currentSession: Session | null;
  sessions: Session[];

  checkAuth: () => Promise<void>;
  login: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  setAwsProfile: (profile: string) => Promise<void>;
  startAuthoring: (skillName?: string | null) => void;
  loadSessions: () => Promise<void>;
  saveCurrentSession: () => Promise<void>;
  newSession: () => void;
  resumeSession: (id: string) => void;
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
  currentSession: null,
  sessions: [],

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
    const userSessionMsg: SessionMessage = {
      role: "user",
      content: [makeTextBlock(content)],
      mode: null,
      model: null,
    };
    const userCanonical: CanonicalMessage = {
      role: "user",
      content: [makeTextBlock(content)],
    };

    set((s) => ({
      messages: [...s.messages, userMessage],
      isStreaming: true,
      streamingContent: "",
      error: null,
      currentSession: s.currentSession
        ? {
            ...s.currentSession,
            messages_all: [...s.currentSession.messages_all, userSessionMsg],
            messages_compacted: [...s.currentSession.messages_compacted, userCanonical],
            last_active_at: new Date().toISOString(),
          }
        : s.currentSession,
    }));

    await get().saveCurrentSession();

    const { authoringMode, authoringFilePath, activeSkill, awsProfile } = get();
    const activeFilePath = authoringMode
      ? authoringFilePath
      : useFileTreeStore.getState().selectedFilePath;
    const workspacePath = useWorkspaceStore.getState().folderPath;
    const currentMessages = get().currentSession?.messages_compacted ?? [];

    const onEvent = new Channel<{ type: string; data: unknown }>();
    onEvent.onmessage = (event) => {
      if (event.type === "Token") {
        set((s) => ({ streamingContent: s.streamingContent + (event.data as string) }));
      } else if (event.type === "Done") {
        const { content: doneContent, model } = event.data as { content: string; model: string };
        const assistantSessionMsg: SessionMessage = {
          role: "assistant",
          content: [makeTextBlock(doneContent)],
          mode: null,
          model,
        };
        const assistantCanonical: CanonicalMessage = {
          role: "assistant",
          content: [makeTextBlock(doneContent)],
        };
        set((s) => ({
          messages: [
            ...s.messages,
            { role: "assistant" as const, content: doneContent },
          ],
          isStreaming: false,
          streamingContent: "",
          currentSession: s.currentSession
            ? {
                ...s.currentSession,
                messages_all: [...s.currentSession.messages_all, assistantSessionMsg],
                messages_compacted: [...s.currentSession.messages_compacted, assistantCanonical],
                last_active_at: new Date().toISOString(),
              }
            : s.currentSession,
        }));
        void get().saveCurrentSession();
      } else if (event.type === "Error") {
        const errData = event.data as string;
        const isAuthError = errData.startsWith("auth:");
        set({
          isStreaming: false,
          streamingContent: "",
          error: errData,
          ...(isAuthError ? { isAuthenticated: false } : {}),
        });
      } else if (event.type === "DocumentUpdated") {
        const filePath = event.data as string;
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

  startAuthoring: (skillName?: string | null) => {
    set({
      authoringMode: true,
      authoringFilePath: null,
      activeSkill: skillName ?? null,
      messages: [],
      isStreaming: false,
      streamingContent: "",
      error: null,
    });
  },

  loadSessions: async () => {
    const sessions = await invoke<Session[]>("load_sessions");
    const selectedFilePath = useFileTreeStore.getState().selectedFilePath;
    const scope: SessionScope = selectedFilePath
      ? { type: "document", path: selectedFilePath }
      : { type: "workspace" };
    const current = newSession("view", scope);
    set({ sessions, currentSession: current });
  },

  saveCurrentSession: async () => {
    const { currentSession } = get();
    if (!currentSession) return;
    try {
      await invoke("save_session", { session: currentSession });
    } catch (e) {
      // Non-fatal — log but don't surface to user
      console.warn("saveCurrentSession failed:", e);
    }
  },

  newSession: () => {
    const selectedFilePath = useFileTreeStore.getState().selectedFilePath;
    const scope: SessionScope = selectedFilePath
      ? { type: "document", path: selectedFilePath }
      : { type: "workspace" };
    set({
      currentSession: newSession("view", scope),
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

  resumeSession: (id: string) => {
    const { sessions } = get();
    const session = sessions.find((s) => s.id === id);
    if (!session) return;
    const messages: ChatMessage[] = session.messages_all.map((m) => {
      const textBlock = m.content.find((b) => b.type === "text");
      return {
        role: m.role,
        content: textBlock && textBlock.type === "text" ? textBlock.text : "",
      };
    });
    set({
      currentSession: session,
      messages,
      isStreaming: false,
      streamingContent: "",
      error: null,
      authoringMode: false,
      authoringFilePath: null,
    });
  },
}));

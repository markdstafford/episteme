import { useState, useEffect } from "react";
import { useAiChatStore } from "@/stores/aiChat";
import { useFileTreeStore } from "@/stores/fileTree";
import { ConfigurationView } from "@/components/ConfigurationView";
import { ChatView } from "@/components/ChatView";
import { SessionHistoryView } from "@/components/SessionHistoryView";
import type { SessionScope } from "@/lib/session";

export function AiChatPanel() {
  const [view, setView] = useState<"chat" | "history">("chat");

  const {
    authChecked,
    isAuthenticated,
    currentSession,
    sessions,
    resumeSession,
    newSession,
    checkAuth,
  } = useAiChatStore();

  const selectedFilePath = useFileTreeStore((s) => s.selectedFilePath);
  const currentScope: SessionScope = selectedFilePath
    ? { type: "document", path: selectedFilePath }
    : { type: "workspace" };

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const isConfigurationView = !authChecked || !isAuthenticated;

  if (isConfigurationView) {
    return <ConfigurationView />;
  }

  if (view === "history") {
    return (
      <SessionHistoryView
        sessions={sessions}
        currentSessionId={currentSession?.id ?? null}
        currentScope={currentScope}
        onResume={(id) => {
          resumeSession(id);
          setView("chat");
        }}
        onNewSession={() => {
          newSession();
          setView("chat");
        }}
        onBack={() => setView("chat")}
      />
    );
  }

  return (
    <ChatView
      onShowHistory={() => setView("history")}
      onNewSession={() => {
        newSession();
        setView("chat");
      }}
    />
  );
}

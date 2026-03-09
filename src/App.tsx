import { useState, useEffect } from "react";
import { useWorkspaceStore } from "@/stores/workspace";
import { useAiChatStore } from "@/stores/aiChat";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { Sidebar } from "@/components/Sidebar";
import { FileTree } from "@/components/FileTree";
import { DocumentViewer } from "@/components/DocumentViewer";
import { AiChatPanel } from "@/components/AiChatPanel";
import { SettingsDialog } from "@/components/SettingsDialog";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { parsePreferences } from "@/lib/preferences";
import { Loader2, MessageSquare } from "lucide-react";

function App() {
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const folderPath = useWorkspaceStore((s) => s.folderPath);
  const isLoading = useWorkspaceStore((s) => s.isLoading);
  const loadSavedFolder = useWorkspaceStore((s) => s.loadSavedFolder);
  const openFolder = useWorkspaceStore((s) => s.openFolder);
  const startAuthoring = useAiChatStore((s) => s.startAuthoring);

  useEffect(() => {
    const unlisten = listen("menu:open-folder", () => openFolder());
    return () => { unlisten.then((f) => f()); };
  }, [openFolder]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === ",") {
        e.preventDefault();
        setSettingsOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const unlisten = listen("menu:open-settings", () => setSettingsOpen(true));
    return () => { unlisten.then((f) => f()); };
  }, []);

  useEffect(() => {
    const init = async () => {
      await loadSavedFolder();
      // Load AWS profile from preferences
      try {
        const raw = await invoke("load_preferences");
        const prefs = parsePreferences(raw);
        if (prefs.aws_profile) {
          useAiChatStore.setState({ awsProfile: prefs.aws_profile });
        }
      } catch {
        // ignore - preferences may not exist yet
      }
    };
    init();
  }, [loadSavedFolder]);

  if (isLoading && !folderPath) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Loading folder...
          </p>
        </div>
      </div>
    );
  }

  if (!folderPath) {
    return <WelcomeScreen />;
  }

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900">
      <Sidebar
        onStartAuthoring={() => {
          setChatPanelOpen(true);
          startAuthoring();
        }}
      >
        <FileTree />
      </Sidebar>
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-end px-4 py-1 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setChatPanelOpen(!chatPanelOpen)}
            className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${
              chatPanelOpen ? "bg-gray-100 dark:bg-gray-800 text-blue-600" : "text-gray-500"
            }`}
            title="Toggle AI Assistant"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
        {/* Document viewer fills remaining space */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <DocumentViewer />
        </div>
      </div>
      {chatPanelOpen && (
        <AiChatPanel onClose={() => setChatPanelOpen(false)} />
      )}
      {settingsOpen && (
        <SettingsDialog onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
}

export default App;

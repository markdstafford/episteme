import { useState, useEffect } from "react";
import { useWorkspaceStore } from "@/stores/workspace";
import { useAiChatStore } from "@/stores/aiChat";
import { useSettingsStore } from "@/stores/settings";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { TitleBar } from "@/components/TitleBar";
import { Sidebar } from "@/components/Sidebar";
import { FileTree } from "@/components/FileTree";
import { DocumentViewer } from "@/components/DocumentViewer";
import { AiChatPanel } from "@/components/AiChatPanel";
import { SettingsPanel } from "@/components/SettingsPanel";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { parsePreferences } from "@/lib/preferences";
import { Loader2, MessageSquare } from "lucide-react";
import { DesignKitchen } from "@/components/DesignKitchen";

function App() {
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [showKitchenSink, setShowKitchenSink] = useState(false);
  const folderPath = useWorkspaceStore((s) => s.folderPath);
  const isLoading = useWorkspaceStore((s) => s.isLoading);
  const loadSavedFolder = useWorkspaceStore((s) => s.loadSavedFolder);
  const openFolder = useWorkspaceStore((s) => s.openFolder);
  const startAuthoring = useAiChatStore((s) => s.startAuthoring);
  const settingsOpen = useSettingsStore((s) => s.settingsOpen);

  useEffect(() => {
    const unlisten = listen("menu:open-folder", () => openFolder());
    return () => { unlisten.then((f) => f()); };
  }, [openFolder]);

  useEffect(() => {
    const unlisten = listen("menu:open-settings", () =>
      useSettingsStore.getState().openSettings()
    );
    return () => { unlisten.then((f) => f()); };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && useSettingsStore.getState().settingsOpen) {
        useSettingsStore.getState().closeSettings();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === "KeyK") {
        e.preventDefault();
        setShowKitchenSink((v) => !v);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const init = async () => {
      await loadSavedFolder();
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

  if (import.meta.env.DEV && showKitchenSink) {
    return <DesignKitchen onClose={() => setShowKitchenSink(false)} />;
  }

  if (isLoading && !folderPath) {
    return (
      <div className="flex flex-col h-screen">
        <TitleBar folderPath={null} onStartAuthoring={() => {}} />
        <div className="flex flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Loading folder...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!folderPath) {
    return (
      <div className="flex flex-col h-screen">
        <TitleBar folderPath={null} onStartAuthoring={() => {}} />
        <WelcomeScreen />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <TitleBar
        folderPath={folderPath}
        onStartAuthoring={(skillName) => {
          setChatPanelOpen(true);
          startAuthoring(skillName);
        }}
      />
      <div className="flex flex-1 min-h-0">
        <Sidebar>
          <FileTree />
        </Sidebar>
        {settingsOpen ? (
          <div className="flex-1 flex flex-col animate-fade-in">
            <SettingsPanel />
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-w-0 animate-fade-in">
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
            <div className="flex-1 flex flex-col overflow-hidden">
              <DocumentViewer />
            </div>
          </div>
        )}
        {!settingsOpen && chatPanelOpen && (
          <AiChatPanel onClose={() => setChatPanelOpen(false)} />
        )}
      </div>
    </div>
  );
}

export default App;

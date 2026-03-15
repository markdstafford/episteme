import { useState, useEffect } from "react";
import { useWorkspaceStore } from "@/stores/workspace";
import { useAiChatStore } from "@/stores/aiChat";
import { useSettingsStore } from "@/stores/settings";
import { useUpdateStore } from "@/stores/update";
import { useShortcutsStore, normalizeCombo } from "@/stores/shortcuts";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { TitleBar } from "@/components/TitleBar";
import { Sidebar } from "@/components/Sidebar";
import { FileTree } from "@/components/FileTree";
import { DocumentViewer } from "@/components/DocumentViewer";
import { SettingsPanel } from "@/components/SettingsPanel";
import { QuickReferenceDialog } from "@/components/QuickReferenceDialog";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { parsePreferences } from "@/lib/preferences";
import { Loader2 } from "lucide-react";
import { DesignKitchen } from "@/components/DesignKitchen";

function App() {
  const [showKitchenSink, setShowKitchenSink] = useState(false);
  const [quickReferenceOpen, setQuickReferenceOpen] = useState(false);
  const folderPath = useWorkspaceStore((s) => s.folderPath);
  const isLoading = useWorkspaceStore((s) => s.isLoading);
  const loadSavedFolder = useWorkspaceStore((s) => s.loadSavedFolder);
  const openFolder = useWorkspaceStore((s) => s.openFolder);
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
    const { registerAction } = useShortcutsStore.getState();

    registerAction({
      id: "app.closeOverlay",
      label: "Close",
      defaultBinding: "Escape",
      category: "Global",
      firesThroughInputs: true,
      callback: () => {
        useSettingsStore.getState().closeSettings();
        setQuickReferenceOpen(false);
      },
    });
    registerAction({
      id: "app.openSettings",
      label: "Open settings",
      defaultBinding: "Meta+Comma",
      category: "Global",
      firesThroughInputs: false,
      callback: () => useSettingsStore.getState().openSettings(),
    });
    registerAction({
      id: "app.openQuickReference",
      label: "Show keyboard shortcuts",
      defaultBinding: "Meta+Slash",
      category: "Global",
      firesThroughInputs: false,
      callback: () => setQuickReferenceOpen(true),
    });
    registerAction({
      id: "app.toggleDesignKitchen",
      label: "Toggle design kitchen",
      defaultBinding: "Meta+Shift+KeyK",
      category: "Global",
      firesThroughInputs: false,
      callback: () => setShowKitchenSink((v) => !v),
    });
    registerAction({ id: "filetree.navigateUp", label: "Navigate up", defaultBinding: "ArrowUp", category: "File tree", firesThroughInputs: false });
    registerAction({ id: "filetree.navigateDown", label: "Navigate down", defaultBinding: "ArrowDown", category: "File tree", firesThroughInputs: false });
    registerAction({ id: "filetree.collapse", label: "Collapse", defaultBinding: "ArrowLeft", category: "File tree", firesThroughInputs: false });
    registerAction({ id: "filetree.expand", label: "Expand", defaultBinding: "ArrowRight", category: "File tree", firesThroughInputs: false });
    registerAction({ id: "filetree.open", label: "Open file", defaultBinding: "Enter", category: "File tree", firesThroughInputs: false });
    registerAction({ id: "chat.send", label: "Send message", defaultBinding: "Enter", category: "Chat", firesThroughInputs: false });

    function handleKeyDown(e: KeyboardEvent) {
      const combo = normalizeCombo(e);
      const target = e.target instanceof Element ? e.target : document.body;
      const action = useShortcutsStore.getState().resolveAction(combo, target);
      if (action?.callback) {
        e.preventDefault();
        action.callback();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
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
        useShortcutsStore.getState().applyCustomBindings(prefs.keyboard_shortcuts ?? {});
      } catch {
        // ignore - preferences may not exist yet
      }
    };
    init();
  }, [loadSavedFolder]);

  const checkForUpdate = useUpdateStore((s) => s.checkForUpdate);

  useEffect(() => {
    checkForUpdate();
    const interval = setInterval(checkForUpdate, 14_400_000); // 4 hours
    return () => clearInterval(interval);
  }, [checkForUpdate]);

  if (import.meta.env.DEV && showKitchenSink) {
    return <DesignKitchen onClose={() => setShowKitchenSink(false)} />;
  }

  if (isLoading && !folderPath) {
    return (
      <div className="flex flex-col h-screen">
        {/* TODO: re-wire to keyboard shortcut when AI chat panel toggle is implemented */}
        <TitleBar folderPath={null} onStartAuthoring={() => {}} />
        <div className="flex flex-1 items-center justify-center bg-(--color-bg-app)">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-(--color-accent) mx-auto" />
            <p className="mt-4 text-(--color-text-secondary)">
              Loading folder...
            </p>
          </div>
        </div>
        {quickReferenceOpen && (
          <QuickReferenceDialog onClose={() => setQuickReferenceOpen(false)} />
        )}
      </div>
    );
  }

  if (!folderPath) {
    return (
      <div className="flex flex-col h-screen">
        {/* TODO: re-wire to keyboard shortcut when AI chat panel toggle is implemented */}
        <TitleBar folderPath={null} onStartAuthoring={() => {}} />
        <WelcomeScreen />
        {quickReferenceOpen && (
          <QuickReferenceDialog onClose={() => setQuickReferenceOpen(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* TODO: re-wire to keyboard shortcut when AI chat panel toggle is implemented */}
      <TitleBar
        folderPath={folderPath}
        onStartAuthoring={() => {}}
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
            <div className="flex-1 flex flex-col overflow-hidden">
              <DocumentViewer />
            </div>
          </div>
        )}
      </div>
      {quickReferenceOpen && (
        <QuickReferenceDialog onClose={() => setQuickReferenceOpen(false)} />
      )}
    </div>
  );
}

export default App;

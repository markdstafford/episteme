import { useState, useEffect, useRef } from "react";
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
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { parsePreferences } from "@/lib/preferences";
import { Loader2 } from "lucide-react";
import { DesignKitchen } from "@/components/DesignKitchen";
import { ShortcutsPanel } from "@/components/ShortcutsPanel";
import { AiChatPanel } from "@/components/AiChatPanel";
import { FooterBar } from "@/components/FooterBar";

function App() {
  const [showKitchenSink, setShowKitchenSink] = useState(false);
  const [shortcutsPanelOpen, setShortcutsPanelOpen] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [readingTime, setReadingTime] = useState<number | null>(null);
  const folderPath = useWorkspaceStore((s) => s.folderPath);
  const isLoading = useWorkspaceStore((s) => s.isLoading);
  const loadSavedFolder = useWorkspaceStore((s) => s.loadSavedFolder);
  const openFolder = useWorkspaceStore((s) => s.openFolder);
  const settingsOpen = useSettingsStore((s) => s.settingsOpen);

  const [overlayStack, setOverlayStack] = useState<string[]>([]);
  const overlayStackRef = useRef<string[]>([]);
  useEffect(() => { overlayStackRef.current = overlayStack; }, [overlayStack]);

  function pushOverlay(id: string) {
    setOverlayStack((prev) => prev.includes(id) ? prev : [...prev, id]);
  }
  function removeOverlay(id: string) {
    setOverlayStack((prev) => prev.filter((x) => x !== id));
  }

  useEffect(() => {
    const unlisten = listen("menu:open-folder", () => openFolder());
    return () => { unlisten.then((f) => f()); };
  }, [openFolder]);

  useEffect(() => {
    const unlisten = listen("menu:open-settings", () => {
      useSettingsStore.getState().openSettings();
      pushOverlay("settings");
    });
    return () => { unlisten.then((f) => f()); };
  }, []);

  useEffect(() => {
    const { registerAction } = useShortcutsStore.getState();

    // ignoresActionRestrictions: true so Escape dismisses overlays even when an input is focused
    registerAction({
      id: "app.closeOverlay",
      label: "Close",
      binding: "Escape",
      category: "Global",
      ignoresActionRestrictions: true,
      callback: () => {
        const stack = overlayStackRef.current;
        if (stack.length === 0) return;
        const top = stack[stack.length - 1];
        if (top === "shortcutsPanel") {
          setShortcutsPanelOpen(false);
          removeOverlay("shortcutsPanel");
        } else if (top === "settings") {
          useSettingsStore.getState().closeSettings();
          removeOverlay("settings");
        }
      },
    });
    registerAction({
      id: "app.openSettings",
      label: "Open settings",
      binding: "Meta+Comma",
      category: "Global",
      ignoresActionRestrictions: false,
      callback: () => {
        useSettingsStore.getState().openSettings();
        pushOverlay("settings");
      },
    });
    registerAction({
      id: "app.openShortcutsPanel",
      label: "Show keyboard shortcuts",
      binding: "Meta+Slash",
      category: "Global",
      ignoresActionRestrictions: true,
      callback: () => {
        setShortcutsPanelOpen(true);
        pushOverlay("shortcutsPanel");
      },
    });
    // Meta+Shift+K: intentionally Mac-only (⌘⇧K). Cross-platform Ctrl support not included
    // since normalizeCombo does not normalize Ctrl — see src/stores/shortcuts.ts.
    registerAction({
      id: "app.toggleDesignKitchen",
      label: "Toggle design kitchen",
      binding: "Meta+Shift+KeyK",
      category: "Global",
      ignoresActionRestrictions: false,
      callback: () => setShowKitchenSink((v) => !v),
    });
    registerAction({ id: "filetree.navigateUp", label: "Navigate up", binding: "ArrowUp", category: "File tree", ignoresActionRestrictions: false });
    registerAction({ id: "filetree.navigateDown", label: "Navigate down", binding: "ArrowDown", category: "File tree", ignoresActionRestrictions: false });
    registerAction({ id: "filetree.collapse", label: "Collapse", binding: "ArrowLeft", category: "File tree", ignoresActionRestrictions: false });
    registerAction({ id: "filetree.expand", label: "Expand", binding: "ArrowRight", category: "File tree", ignoresActionRestrictions: false });
    registerAction({ id: "filetree.open", label: "Open file", binding: "Enter", category: "File tree", ignoresActionRestrictions: false });

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
      } catch {
        // ignore - preferences may not exist yet
      }
      await useAiChatStore.getState().loadSessions();
    };
    init();
  }, [loadSavedFolder]);

  const checkForUpdate = useUpdateStore((s) => s.checkForUpdate);

  useEffect(() => {
    checkForUpdate();
    const interval = setInterval(checkForUpdate, 14_400_000); // 4 hours
    return () => clearInterval(interval);
  }, [checkForUpdate]);

  // Sync overlay stack when settings closes externally
  useEffect(() => {
    if (!settingsOpen) {
      removeOverlay("settings");
    }
  }, [settingsOpen]);

  function closeShortcutsPanel() {
    setShortcutsPanelOpen(false);
    removeOverlay("shortcutsPanel");
  }

  const shortcutsPanelOverlay = shortcutsPanelOpen && (
    <>
      <div
        style={{ position: "fixed", inset: 0, zIndex: 1099 }}
        onClick={closeShortcutsPanel}
      />
      <ShortcutsPanel onClose={closeShortcutsPanel} />
    </>
  );

  if (import.meta.env.DEV && showKitchenSink) {
    return <DesignKitchen onClose={() => setShowKitchenSink(false)} />;
  }

  if (isLoading && !folderPath) {
    return (
      <div className="flex flex-col h-screen">
        <TitleBar
          folderPath={null}
          onStartAuthoring={() => {}}
          aiPanelOpen={aiPanelOpen}
          onToggleAiPanel={() => setAiPanelOpen((v) => !v)}
        />
        <div className="flex flex-1 items-center justify-center bg-(--color-bg-app)">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-(--color-accent) mx-auto" />
            <p className="mt-4 text-(--color-text-secondary)">
              Loading folder...
            </p>
          </div>
        </div>
        <FooterBar
          sidebarVisible={sidebarVisible}
          onToggleSidebar={() => setSidebarVisible((v) => !v)}
          aiPanelOpen={aiPanelOpen}
          onToggleAiPanel={() => setAiPanelOpen((v) => !v)}
          readingTime={null}
        />
        {shortcutsPanelOverlay}
      </div>
    );
  }

  if (!folderPath) {
    return (
      <div className="flex flex-col h-screen">
        <TitleBar
          folderPath={null}
          onStartAuthoring={() => {}}
          aiPanelOpen={aiPanelOpen}
          onToggleAiPanel={() => setAiPanelOpen((v) => !v)}
        />
        <WelcomeScreen />
        <FooterBar
          sidebarVisible={sidebarVisible}
          onToggleSidebar={() => setSidebarVisible((v) => !v)}
          aiPanelOpen={aiPanelOpen}
          onToggleAiPanel={() => setAiPanelOpen((v) => !v)}
          readingTime={null}
        />
        {shortcutsPanelOverlay}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <TitleBar
        folderPath={folderPath}
        onStartAuthoring={() => {}}
        aiPanelOpen={aiPanelOpen}
        onToggleAiPanel={() => setAiPanelOpen((v) => !v)}
      />
      <div className="flex flex-1 min-h-0">
        {sidebarVisible && (
          <Sidebar>
            <FileTree />
          </Sidebar>
        )}
        {settingsOpen ? (
          <div className="flex-1 flex flex-col animate-fade-in">
            <SettingsPanel />
          </div>
        ) : (
          <div className="flex flex-1 min-w-0 overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden">
              <DocumentViewer onReadingTimeChange={setReadingTime} />
            </div>
            {aiPanelOpen && <AiChatPanel />}
          </div>
        )}
      </div>
      <FooterBar
        sidebarVisible={sidebarVisible}
        onToggleSidebar={() => setSidebarVisible((v) => !v)}
        aiPanelOpen={aiPanelOpen}
        onToggleAiPanel={() => setAiPanelOpen((v) => !v)}
        readingTime={readingTime}
      />
      {shortcutsPanelOverlay}
    </div>
  );
}

export default App;

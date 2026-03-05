import { useEffect } from "react";
import { useWorkspaceStore } from "@/stores/workspace";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { Sidebar } from "@/components/Sidebar";
import { FileTree } from "@/components/FileTree";
import { DocumentViewer } from "@/components/DocumentViewer";
import { Loader2 } from "lucide-react";

function App() {
  const folderPath = useWorkspaceStore((s) => s.folderPath);
  const isLoading = useWorkspaceStore((s) => s.isLoading);
  const loadSavedFolder = useWorkspaceStore((s) => s.loadSavedFolder);

  useEffect(() => {
    loadSavedFolder();
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
      <Sidebar>
        <FileTree />
      </Sidebar>
      <DocumentViewer />
    </div>
  );
}

export default App;

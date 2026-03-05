import { FolderOpen } from "lucide-react";
import { useWorkspaceStore } from "@/stores/workspace";

export function WelcomeScreen() {
  const openFolder = useWorkspaceStore((s) => s.openFolder);
  const error = useWorkspaceStore((s) => s.error);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
          Episteme
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Open a folder to get started
        </p>
        <button
          onClick={openFolder}
          className="mt-6 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-lg cursor-pointer"
        >
          <FolderOpen className="w-5 h-5" />
          Open Folder
        </button>
        {error && (
          <p className="mt-4 text-red-600 text-sm">
            Could not open folder. Please check permissions and try again.
          </p>
        )}
      </div>
    </div>
  );
}

import { useState, ReactNode } from "react";
import { Plus } from "lucide-react";
import { useWorkspaceStore } from "@/stores/workspace";
import { CreateNewDialog } from "@/components/CreateNewDialog";
import { TitleBar } from "@/components/TitleBar";

interface SidebarProps {
  children: ReactNode;
  onStartAuthoring?: (skillName: string | null) => void;
}

export function Sidebar({ children, onStartAuthoring }: SidebarProps) {
  const folderPath = useWorkspaceStore((s) => s.folderPath);
  const [dialogOpen, setDialogOpen] = useState(false);

  const folderName = folderPath
    ? folderPath.replace(/[/\\]+$/, "").split(/[/\\]/).pop() ?? folderPath
    : null;

  return (
    <aside className="w-64 h-screen border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0 flex flex-col">
      <TitleBar folderName={folderName} />
      <div className="flex-1 overflow-y-auto py-2">
        {onStartAuthoring && (
          <div className="px-3 pb-1 flex justify-end">
            <button
              onClick={() => setDialogOpen(true)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0"
              title="New document"
              aria-label="New document"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
        {children}
      </div>
      {dialogOpen && folderPath && (
        <CreateNewDialog
          workspacePath={folderPath}
          onSelect={(skillName) => {
            onStartAuthoring?.(skillName);
            setDialogOpen(false);
          }}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </aside>
  );
}

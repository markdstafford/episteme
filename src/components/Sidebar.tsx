import { ReactNode } from "react";
import { useWorkspaceStore } from "@/stores/workspace";

interface SidebarProps {
  children: ReactNode;
}

export function Sidebar({ children }: SidebarProps) {
  const folderPath = useWorkspaceStore((s) => s.folderPath);
  const openFolder = useWorkspaceStore((s) => s.openFolder);

  const folderName = folderPath
    ? folderPath.replace(/[/\\]+$/, "").split(/[/\\]/).pop() ?? folderPath
    : null;

  return (
    <aside className="w-[var(--width-sidebar)] h-full bg-(--color-bg-app) shrink-0 flex flex-col">
      <div className="flex-1 overflow-y-auto py-2">
        {folderName && (
          <div
            data-testid="folder-header"
            className="px-3 py-2 flex items-center justify-between border-b border-(--color-border-subtle) shrink-0"
          >
            <span
              className="text-[length:var(--font-size-ui-xs)] font-medium text-(--color-text-quaternary) truncate min-w-0 cursor-pointer hover:bg-(--color-bg-subtle) rounded"
              onClick={() => openFolder()}
            >
              {folderName}
            </span>
          </div>
        )}
        {children}
      </div>
    </aside>
  );
}

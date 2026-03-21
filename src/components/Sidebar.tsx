import { ReactNode } from "react";
import { useWorkspaceStore } from "@/stores/workspace";
import { useSettingsStore } from "@/stores/settings";
import { SettingsNav } from "@/components/SettingsNav";
import { UpdateIndicator } from "@/components/UpdateIndicator";

interface SidebarProps {
  children: ReactNode;
}

export function Sidebar({ children }: SidebarProps) {
  const folderPath = useWorkspaceStore((s) => s.folderPath);
  const openFolder = useWorkspaceStore((s) => s.openFolder);
  const settingsOpen = useSettingsStore((s) => s.settingsOpen);

  const folderName = folderPath
    ? folderPath.replace(/[/\\]+$/, "").split(/[/\\]/).pop() ?? folderPath
    : null;

  return (
    <aside className="w-[var(--width-sidebar)] h-full bg-(--color-bg-app) shrink-0 flex flex-col">
      <div className="flex-1 overflow-y-auto py-[var(--space-2)]">
        {settingsOpen ? (
          <SettingsNav />
        ) : (
          <>
            {folderName && (
              <div
                data-testid="folder-header"
                className="px-[var(--space-3)] h-(--height-titlebar) flex items-center justify-between border-b border-(--color-border-subtle) shrink-0 cursor-pointer hover:bg-(--color-bg-subtle) rounded"
                onClick={() => openFolder()}
              >
                <button
                  className="text-[length:var(--font-size-ui-xs)] font-medium text-(--color-text-quaternary) truncate min-w-0 bg-transparent border-none p-0 text-left focus-ring"
                  tabIndex={-1}
                >
                  {folderName}
                </button>
                <UpdateIndicator />
              </div>
            )}
            {children}
          </>
        )}
      </div>
    </aside>
  );
}

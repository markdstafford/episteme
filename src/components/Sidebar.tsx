import { ReactNode } from "react";

interface SidebarProps {
  children: ReactNode;
}

export function Sidebar({ children }: SidebarProps) {
  return (
    <aside className="w-64 h-screen border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-y-auto py-2 shrink-0">
      {children}
    </aside>
  );
}

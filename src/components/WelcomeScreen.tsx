import { FolderOpen } from "lucide-react";
import { useWorkspaceStore } from "@/stores/workspace";
import { Button } from "@/components/ui/Button";

export function WelcomeScreen() {
  const openFolder = useWorkspaceStore((s) => s.openFolder);
  const error = useWorkspaceStore((s) => s.error);

  return (
    <div
      className="flex items-center justify-center flex-1"
      style={{ backgroundColor: "var(--color-bg-app)" }}
    >
      <div className="text-center">
        <h1
          style={{ color: "var(--color-text-primary)", fontSize: "var(--font-size-doc-h1)", fontWeight: 700 }}
        >
          Episteme
        </h1>
        <p
          className="mt-[var(--space-2)]"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Open a folder to get started
        </p>
        <Button variant="primary" onClick={openFolder} className="mt-[var(--space-6)]">
          <FolderOpen size={16} />
          Open Folder
        </Button>
        {error && (
          <p
            className="mt-[var(--space-4)] text-[length:var(--font-size-ui-sm)]"
            style={{ color: "var(--color-state-danger)" }}
          >
            Could not open folder. Please check permissions and try again.
          </p>
        )}
      </div>
    </div>
  );
}

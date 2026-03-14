import { useState } from "react";
import { ChevronLeft, ChevronRight, Share2, Plus, Aperture } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CreateNewDialog } from "@/components/CreateNewDialog";

interface TitleBarProps {
  folderPath: string | null;
  onStartAuthoring: (skillName: string | null) => void;
}

export function TitleBar({ folderPath, onStartAuthoring }: TitleBarProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <div
        style={{
          height: "var(--height-titlebar)",
          background: "var(--color-bg-app)",
          borderBottom: "1px solid var(--color-border-subtle)",
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
          userSelect: "none",
        }}
      >
        {/* Section 1: sidebar — width tracks --width-sidebar via CSS variable */}
        <div
          data-tauri-drag-region
          style={{
            width: "var(--width-sidebar)",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "var(--space-1)",
            flexShrink: 0,
          }}
        >
          {/* Traffic lights no-drag zone (~70px, per design-system.md) */}
          <div
            className="titlebar-no-drag"
            style={{ width: 70, height: "100%", flexShrink: 0 }}
          />
          <Button variant="ghost" size="sm" iconOnly aria-label="Navigate back" disabled style={{ color: "var(--color-text-tertiary)" }}>
            <ChevronLeft size={16} />
          </Button>
          <Button variant="ghost" size="sm" iconOnly aria-label="Navigate forward" disabled style={{ color: "var(--color-text-tertiary)" }}>
            <ChevronRight size={16} />
          </Button>
        </div>

        {/* Section 2: title — flex:1, centered icon + text, entire section is drag region.
            data-tauri-drag-region is on this div (not the root) so that drag.js sees it as
            e.target when the section itself is clicked. Children use pointerEvents:none so
            clicks on the icon/label fall through to this div rather than targeting them. */}
        <div
          data-tauri-drag-region
          style={{
            flex: 1,
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--space-2)",
          }}
        >
          <Aperture size={14} style={{ color: "var(--color-text-tertiary)", flexShrink: 0, pointerEvents: "none" }} />
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "var(--font-size-ui-base)",
              fontWeight: 500,
              color: "var(--color-text-secondary)",
              pointerEvents: "none",
            }}
          >
            Episteme
          </span>
        </div>

        {/* Section 3: actions — right-aligned, no-drag */}
        <div
          className="titlebar-no-drag"
          style={{
            width: 80,
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            paddingRight: "var(--space-2)",
            flexShrink: 0,
          }}
        >
          <Button variant="ghost" size="sm" iconOnly aria-label="Share" disabled style={{ color: "var(--color-text-tertiary)" }}>
            <Share2 size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="New document"
            disabled={folderPath === null}
            onClick={() => setDialogOpen(true)}
            style={{ color: "var(--color-text-tertiary)" }}
          >
            <Plus size={16} />
          </Button>
        </div>
      </div>
      {dialogOpen && folderPath && (
        <CreateNewDialog
          workspacePath={folderPath}
          onSelect={(skillName) => {
            onStartAuthoring(skillName);
            setDialogOpen(false);
          }}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </>
  );
}

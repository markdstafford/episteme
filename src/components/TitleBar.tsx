import { CSSProperties, useState } from "react";
import { ChevronLeft, ChevronRight, Share2, Plus, Aperture } from "lucide-react";
import { CreateNewDialog } from "@/components/CreateNewDialog";

type TauriStyle = CSSProperties & { WebkitAppRegion?: "drag" | "no-drag" };

interface TitleBarProps {
  folderPath: string | null;
  onStartAuthoring: (skillName: string | null) => void;
}

const iconBtnBase: TauriStyle = {
  width: 28,
  height: 28,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "transparent",
  border: "none",
  borderRadius: "var(--radius-base)",
  color: "var(--color-text-tertiary)",
  cursor: "pointer",
  padding: 0,
  flexShrink: 0,
  WebkitAppRegion: "no-drag",
};

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
          WebkitAppRegion: "drag",
        } as TauriStyle}
      >
        {/* Section 1: sidebar — width tracks --width-sidebar via CSS variable */}
        <div
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
            style={{
              width: 70,
              height: "100%",
              flexShrink: 0,
              WebkitAppRegion: "no-drag",
            } as TauriStyle}
          />
          <button
            className="titlebar-btn"
            style={iconBtnBase}
            aria-label="Navigate back"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            className="titlebar-btn"
            style={iconBtnBase}
            aria-label="Navigate forward"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Section 2: title — flex:1, centered icon + text, entire section is drag region */}
        <div
          style={{
            flex: 1,
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--space-2)",
          }}
        >
          <Aperture size={14} style={{ color: "var(--color-text-tertiary)", flexShrink: 0 }} />
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "var(--font-size-ui-base)",
              fontWeight: 500,
              color: "var(--color-text-secondary)",
            }}
          >
            Episteme
          </span>
        </div>

        {/* Section 3: actions — right-aligned, no-drag */}
        <div
          style={{
            height: "100%",
            display: "flex",
            alignItems: "center",
            paddingRight: "var(--space-2)",
            flexShrink: 0,
            WebkitAppRegion: "no-drag",
          } as TauriStyle}
        >
          <button
            className="titlebar-btn"
            style={iconBtnBase}
            aria-label="Share"
          >
            <Share2 size={16} />
          </button>
          <button
            className="titlebar-btn"
            style={{
              ...iconBtnBase,
              ...(folderPath === null ? { opacity: 0.4, cursor: "not-allowed" } : {}),
            }}
            disabled={folderPath === null}
            aria-label="New document"
            onClick={() => setDialogOpen(true)}
          >
            <Plus size={16} />
          </button>
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

import { CSSProperties } from "react";

type TauriStyle = CSSProperties & { WebkitAppRegion?: "drag" | "no-drag" };

interface TitleBarProps {
  folderName: string | null;
}

export function TitleBar({ folderName }: TitleBarProps) {
  return (
    <div
      style={{
        height: "var(--height-titlebar)",
        background: "var(--color-bg-app)",
        WebkitAppRegion: "drag",
        display: "flex",
        alignItems: "center",
        flexShrink: 0,
      } as TauriStyle}
    >
      {/* No-drag zone for macOS traffic lights (~70px, per design-system.md) */}
      <div
        style={{
          width: 70,
          height: "100%",
          flexShrink: 0,
          WebkitAppRegion: "no-drag",
        } as TauriStyle}
      />
      <span
        style={{
          fontSize: "var(--font-size-ui-base)",
          fontWeight: 500,
          fontFamily: "var(--font-ui)",
          color: "var(--color-text-secondary)",
        }}
      >
        {folderName ?? "Episteme"}
      </span>
    </div>
  );
}

interface TitleBarProps {
  folderName: string | null;
}

export function TitleBar({ folderName }: TitleBarProps) {
  return (
    <div
      style={{
        height: "var(--height-titlebar)",
        background: "var(--color-bg-app)",
        WebkitAppRegion: "drag" as any,
        display: "flex",
        alignItems: "center",
        flexShrink: 0,
      }}
    >
      {/* No-drag zone protecting macOS traffic lights (~70px from left edge) */}
      <div
        style={{
          width: 70,
          height: "100%",
          flexShrink: 0,
          WebkitAppRegion: "no-drag" as any,
        }}
      />
      <span
        style={{
          fontSize: "var(--font-size-ui-base)",
          fontWeight: 500,
          color: "var(--color-text-secondary)",
        }}
      >
        {folderName ?? "Episteme"}
      </span>
    </div>
  );
}

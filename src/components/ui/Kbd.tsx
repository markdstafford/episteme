interface KbdProps {
  children: React.ReactNode;
}

function Kbd({ children }: KbdProps) {
  return (
    <kbd
      style={{
        background: "var(--color-bg-hover)",
        border: "1px solid var(--color-border-default)",
        borderRadius: "var(--radius-sm)",
        fontSize: "var(--font-size-ui-xs)",
        fontWeight: 500,
        padding: "2px 5px",
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      {children}
    </kbd>
  );
}

interface KbdShortcutProps {
  keys: string[];
  separator?: string;
}

export function KbdShortcut({ keys, separator = "" }: KbdShortcutProps) {
  return (
    <kbd style={{ display: "inline-flex", alignItems: "center" }}>
      {keys.map((key, i) => (
        <span key={i} style={{ display: "inline-flex", alignItems: "center" }}>
          {i > 0 && separator}
          <Kbd>{key}</Kbd>
        </span>
      ))}
    </kbd>
  );
}

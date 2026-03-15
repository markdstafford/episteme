import { useState, useEffect } from "react";
import { KbdShortcut } from "@/components/ui/Kbd";
import { normalizeCombo } from "@/stores/shortcuts";

function displayKey(segment: string): string {
  const map: Record<string, string> = {
    Meta: "⌘",
    Shift: "⇧",
    Alt: "⌥",
    Ctrl: "^",
    Comma: ",",
    Period: ".",
    Slash: "/",
    Escape: "Esc",
    ArrowUp: "↑",
    ArrowDown: "↓",
    ArrowLeft: "←",
    ArrowRight: "→",
    Enter: "↵",
    Backspace: "⌫",
    Space: "Space",
  };
  if (map[segment]) return map[segment];
  // KeyA → A, Digit1 → 1
  if (segment.startsWith("Key")) return segment.slice(3);
  if (segment.startsWith("Digit")) return segment.slice(5);
  return segment;
}

function comboToDisplay(combo: string): string[] {
  return combo.split("+").map(displayKey);
}

interface BindingCardProps {
  label: string;
  binding: string;
  onSave: (combo: string) => void;
  onReset: () => void;
}

export function BindingCard({ label, binding, onSave, onReset }: BindingCardProps) {
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) return;

    function handleKeyDown(e: KeyboardEvent) {
      // Ignore bare modifier presses
      if (["Meta", "Shift", "Alt", "Control"].includes(e.key)) return;
      e.preventDefault();
      const combo = normalizeCombo(e);
      setEditing(false);
      onSave(combo);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editing, onSave]);

  if (editing) {
    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--font-size-ui-sm)" }}>{label}</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--font-size-ui-xs)", color: "var(--color-text-secondary)" }}>
            Press a key combination...
          </span>
          <button onClick={() => setEditing(false)} style={{ fontFamily: "var(--font-ui)", fontSize: "var(--font-size-ui-xs)" }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
      <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--font-size-ui-sm)" }}>{label}</span>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <KbdShortcut keys={comboToDisplay(binding)} />
        <button onClick={() => setEditing(true)} style={{ fontFamily: "var(--font-ui)", fontSize: "var(--font-size-ui-xs)" }}>
          Customize
        </button>
        <button onClick={onReset} style={{ fontFamily: "var(--font-ui)", fontSize: "var(--font-size-ui-xs)" }}>
          Reset
        </button>
      </div>
    </div>
  );
}

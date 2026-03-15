import { useShortcutsStore } from "@/stores/shortcuts";
import { KbdShortcut } from "@/components/ui/Kbd";
import { displayKey } from "@/lib/shortcutDisplay";

interface Props {
  onClose: () => void;
}

export function QuickReferenceDialog({ onClose }: Props) {
  const { actions, getBinding } = useShortcutsStore();
  const categories = Array.from(new Set(Object.values(actions).map((a) => a.category)));

  return (
    <div
      role="dialog"
      aria-label="Keyboard shortcuts"
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.4)",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "var(--color-bg-default)",
          borderRadius: "var(--radius-md)",
          padding: 24,
          minWidth: 400,
          maxWidth: 560,
          maxHeight: "70vh",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontFamily: "var(--font-ui)", fontWeight: 600 }}>Keyboard shortcuts</span>
          <button aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>
        {categories.map((category) => (
          <div key={category}>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: "var(--font-size-ui-xs)",
                color: "var(--color-text-quaternary)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 8,
                marginTop: 16,
              }}
            >
              {category}
            </div>
            {Object.values(actions)
              .filter((a) => a.category === category)
              .map((action) => {
                const binding = getBinding(action.id) ?? action.defaultBinding;
                const keys = binding.split("+").map(displayKey);
                return (
                  <div
                    key={action.id}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0" }}
                  >
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--font-size-ui-sm)" }}>
                      {action.label}
                    </span>
                    <KbdShortcut keys={keys} />
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}

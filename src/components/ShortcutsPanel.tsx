import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useShortcutsStore } from "@/stores/shortcuts";
import { KbdShortcut } from "@/components/ui/Kbd";
import { displayKey } from "@/lib/shortcutDisplay";

interface Props {
  onClose: () => void;
}

export function ShortcutsPanel({ onClose }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [visible, setVisible] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const actions = useShortcutsStore((s) => s.actions);

  // Trigger enter animation on mount
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Auto-focus search on mount
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const allActions = Object.values(actions);
  const categories = Array.from(new Set(allActions.map((a) => a.category)));

  const query = searchQuery.toLowerCase();

  const filteredCategories = categories
    .map((category) => {
      const categoryMatches = query && category.toLowerCase().includes(query);
      const categoryActions = allActions.filter((a) => a.category === category);

      if (categoryMatches) {
        return { category, actions: categoryActions };
      }

      const matchingActions = query
        ? categoryActions.filter((a) => a.label.toLowerCase().includes(query))
        : categoryActions;

      return matchingActions.length > 0
        ? { category, actions: matchingActions }
        : null;
    })
    .filter(Boolean) as Array<{ category: string; actions: typeof allActions }>;

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      if (searchQuery) {
        setSearchQuery("");
        e.stopPropagation();
      }
      // If empty, let it bubble to global listener
    }
  }

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 80); // match exit duration
  }

  return (
    <div
      role="complementary"
      aria-label="Keyboard shortcuts"
      style={{
        position: "fixed",
        top: "var(--height-titlebar)",
        right: 0,
        bottom: 0,
        width: 320,
        background: "var(--color-bg-overlay)",
        borderLeft: "1px solid var(--color-border-subtle)",
        borderRadius: "var(--radius-md) 0 0 var(--radius-md)",
        padding: 20,
        zIndex: 1100,
        display: "flex",
        flexDirection: "column",
        transform: visible ? "translateX(0)" : "translateX(100%)",
        transition: visible
          ? "transform var(--duration-normal) var(--ease-default)"
          : "transform var(--duration-fast) var(--ease-default)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontWeight: 600,
            color: "var(--color-text-primary)",
          }}
        >
          Keyboard shortcuts
        </span>
        <button
          aria-label="Close shortcuts panel"
          onClick={handleClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-text-secondary)",
            padding: 4,
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Search */}
      <input
        ref={searchRef}
        type="text"
        placeholder="Search shortcuts…"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={handleSearchKeyDown}
        style={{
          width: "100%",
          padding: "8px 12px",
          background: "var(--color-bg-subtle)",
          border: "1px solid var(--color-border-subtle)",
          borderRadius: 4,
          color: "var(--color-text-primary)",
          fontFamily: "var(--font-ui)",
          fontSize: "var(--font-size-ui-sm)",
          outline: "none",
          marginBottom: 16,
          boxSizing: "border-box",
        }}
      />

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {filteredCategories.length === 0 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "var(--color-text-secondary)",
              fontFamily: "var(--font-ui)",
            }}
          >
            No results
          </div>
        ) : (
          filteredCategories.map(({ category, actions: catActions }, i) => (
            <div key={category} style={{ marginTop: i > 0 ? 12 : 0 }}>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: "var(--font-size-ui-xs)",
                  color: "var(--color-text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  fontVariant: "small-caps",
                  marginBottom: 4,
                }}
              >
                {category}
              </div>
              {catActions.map((action) => {
                const keys = action.binding.split("+").map(displayKey);
                return (
                  <div
                    key={action.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      height: 32,
                      color: "var(--color-text-primary)",
                      fontFamily: "var(--font-ui)",
                      fontSize: "var(--font-size-ui-sm)",
                    }}
                  >
                    <span>{action.label}</span>
                    <KbdShortcut keys={keys} />
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

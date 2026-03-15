import { useState } from "react";
import { useShortcutsStore } from "@/stores/shortcuts";
import { BindingCard } from "@/components/ui/BindingCard";
import type { Preferences } from "@/lib/preferences";

interface Props {
  preferences: Preferences;
  onPreferencesChange: (prefs: Preferences) => void;
}

export function KeyboardShortcutsSettings({ preferences, onPreferencesChange }: Props) {
  const { actions } = useShortcutsStore();
  const [searchQuery, setSearchQuery] = useState("");

  const rebindableActions = Object.values(actions)
    .filter((a) => a.rebindable)
    .filter((a) =>
      searchQuery.trim() === "" ||
      a.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  const categories = Array.from(new Set(rebindableActions.map((a) => a.category)));

  return (
    <div style={{ background: "var(--color-bg-default)", padding: 16 }}>
      <input
        type="text"
        placeholder="Search shortcuts…"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{
          width: "100%",
          fontFamily: "var(--font-ui)",
          fontSize: "var(--font-size-ui-sm)",
          color: "var(--color-text-primary)",
          background: "var(--color-bg-input, var(--color-bg-hover))",
          border: "1px solid var(--color-border-default)",
          borderRadius: "var(--radius-sm)",
          padding: "6px 8px",
          outline: "none",
          boxSizing: "border-box",
          marginBottom: 16,
        }}
      />
      {rebindableActions.length === 0 && (
        <div style={{
          textAlign: "center",
          color: "var(--color-text-tertiary)",
          fontFamily: "var(--font-ui)",
          fontSize: "var(--font-size-ui-base)",
          padding: "32px 0",
        }}>
          No matching shortcuts
        </div>
      )}
      {searchQuery.trim() !== "" ? (
        rebindableActions.map((action) => (
          <BindingCard
            key={action.id}
            actionId={action.id}
            label={action.label}
            preferences={preferences}
            onPreferencesChange={onPreferencesChange}
          />
        ))
      ) : (
        categories.map((category) => (
          <div key={category}>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: "var(--font-size-ui-xs)",
                color: "var(--color-text-primary)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 8,
                marginTop: 16,
              }}
            >
              {category}
            </div>
            {rebindableActions
              .filter((a) => a.category === category)
              .map((action) => (
                <BindingCard
                  key={action.id}
                  actionId={action.id}
                  label={action.label}
                  preferences={preferences}
                  onPreferencesChange={onPreferencesChange}
                />
              ))}
          </div>
        ))
      )}
    </div>
  );
}

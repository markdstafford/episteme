import { useState, useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { KbdShortcut } from "@/components/ui/Kbd";
import { normalizeCombo, useShortcutsStore } from "@/stores/shortcuts";
import { displayKey } from "@/lib/shortcutDisplay";
import { invoke } from "@tauri-apps/api/core";
import type { Preferences } from "@/lib/preferences";

function comboToDisplay(combo: string): string[] {
  return combo.split("+").map(displayKey);
}

interface BindingCardProps {
  actionId: string;
  label: string;
  preferences: Preferences;
  onPreferencesChange: (prefs: Preferences) => void;
}

export function BindingCard({ actionId, label, preferences, onPreferencesChange }: BindingCardProps) {
  const { actions, customBindings, getBinding, setBinding, resetBinding, checkConflict } = useShortcutsStore();
  const [capturing, setCapturing] = useState(false);
  const [conflictActionId, setConflictActionId] = useState<string | null>(null);
  const [attemptedCombo, setAttemptedCombo] = useState<string | null>(null);

  const currentBinding = getBinding(actionId) ?? actions[actionId]?.defaultBinding ?? "";
  const isCustomized = customBindings[actionId] !== undefined;

  useEffect(() => {
    if (!capturing) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (["Meta", "Shift", "Alt", "Control"].includes(e.key)) return;
      e.preventDefault();

      const combo = normalizeCombo(e);

      if (e.key === "Escape") {
        setCapturing(false);
        setConflictActionId(null);
        setAttemptedCombo(null);
        return;
      }

      const conflict = checkConflict(combo, actionId);
      if (conflict) {
        setAttemptedCombo(combo);
        setConflictActionId(conflict);
        return;
      }

      // No conflict — save and exit
      setBinding(actionId, combo);
      const updatedShortcuts = { ...useShortcutsStore.getState().customBindings };
      const updatedPrefs = { ...preferences, keyboard_shortcuts: updatedShortcuts };
      invoke("save_preferences", { preferences: updatedPrefs }).catch(() => {});
      onPreferencesChange(updatedPrefs);
      setCapturing(false);
      setConflictActionId(null);
      setAttemptedCombo(null);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [capturing, actionId, checkConflict, setBinding, preferences, onPreferencesChange]);

  async function handleReset() {
    resetBinding(actionId);
    const updatedShortcuts = { ...useShortcutsStore.getState().customBindings };
    const updatedPrefs = { ...preferences, keyboard_shortcuts: updatedShortcuts };
    await invoke("save_preferences", { preferences: updatedPrefs });
    onPreferencesChange(updatedPrefs);
    setCapturing(false);
    setConflictActionId(null);
    setAttemptedCombo(null);
  }

  const conflictLabel = conflictActionId ? (actions[conflictActionId]?.label ?? conflictActionId) : null;

  return (
    <div style={{ padding: "8px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Column 1: label */}
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: "var(--font-size-ui-sm)",
            color: "var(--color-text-primary)",
            flex: 1,
          }}
        >
          {label}
        </span>

        {/* Column 2: binding display / capture hint */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setCapturing(true);
            setConflictActionId(null);
            setAttemptedCombo(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              setCapturing(true);
              setConflictActionId(null);
              setAttemptedCombo(null);
            }
          }}
          style={{
            cursor: "pointer",
            borderRadius: "var(--radius-sm)",
            outline: capturing ? "2px solid var(--color-accent)" : "none",
            outlineOffset: 2,
            padding: "2px 4px",
          }}
        >
          {capturing ? (
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: "var(--font-size-ui-xs)",
                color: conflictActionId ? "var(--color-error, #e53e3e)" : "var(--color-text-tertiary)",
              }}
            >
              {conflictActionId && attemptedCombo
                ? comboToDisplay(attemptedCombo).join(" ")
                : "Press a key combination…"}
            </span>
          ) : (
            <KbdShortcut keys={comboToDisplay(currentBinding)} />
          )}
        </div>

        {/* Column 3: reset icon (only when customized) */}
        {isCustomized && (
          <button
            aria-label="Reset to default"
            onClick={handleReset}
            style={{
              background: "none",
              border: "none",
              padding: 2,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              color: "var(--color-text-secondary)",
              borderRadius: "var(--radius-sm)",
            }}
          >
            <RotateCcw size={14} />
          </button>
        )}
      </div>

      {/* Inline conflict error */}
      {capturing && conflictActionId && conflictLabel && (
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: "var(--font-size-ui-xs)",
            color: "var(--color-error, #e53e3e)",
            marginTop: 4,
            paddingLeft: 0,
          }}
        >
          Already used by {conflictLabel}
        </div>
      )}
    </div>
  );
}

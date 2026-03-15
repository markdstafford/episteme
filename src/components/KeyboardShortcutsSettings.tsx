import { useShortcutsStore } from "@/stores/shortcuts";
import { BindingCard } from "@/components/ui/BindingCard";
import { invoke } from "@tauri-apps/api/core";
import type { Preferences } from "@/lib/preferences";

interface Props {
  preferences: Preferences;
  onPreferencesChange: (prefs: Preferences) => void;
}

export function KeyboardShortcutsSettings({ preferences, onPreferencesChange }: Props) {
  const { actions, customBindings, setBinding, resetBinding, getBinding } = useShortcutsStore();

  const categories = Array.from(new Set(Object.values(actions).map((a) => a.category)));

  async function handleSave(actionId: string, combo: string) {
    setBinding(actionId, combo);
    const updatedShortcuts = { ...customBindings, [actionId]: combo };
    const updatedPrefs = { ...preferences, keyboard_shortcuts: updatedShortcuts };
    await invoke("save_preferences", { preferences: updatedPrefs });
    onPreferencesChange(updatedPrefs);
  }

  async function handleReset(actionId: string) {
    resetBinding(actionId);
    const updatedShortcuts = { ...customBindings };
    delete updatedShortcuts[actionId];
    const updatedPrefs = { ...preferences, keyboard_shortcuts: updatedShortcuts };
    await invoke("save_preferences", { preferences: updatedPrefs });
    onPreferencesChange(updatedPrefs);
  }

  return (
    <div>
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
            .map((action) => (
              <BindingCard
                key={action.id}
                label={action.label}
                binding={getBinding(action.id) ?? action.defaultBinding}
                onSave={(combo) => handleSave(action.id, combo)}
                onReset={() => handleReset(action.id)}
              />
            ))}
        </div>
      ))}
    </div>
  );
}

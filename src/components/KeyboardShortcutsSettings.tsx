import { useShortcutsStore } from "@/stores/shortcuts";
import { BindingCard } from "@/components/ui/BindingCard";
import type { Preferences } from "@/lib/preferences";

interface Props {
  preferences: Preferences;
  onPreferencesChange: (prefs: Preferences) => void;
}

export function KeyboardShortcutsSettings({ preferences, onPreferencesChange }: Props) {
  const { actions } = useShortcutsStore();

  const rebindableActions = Object.values(actions).filter((a) => a.rebindable === true);
  const categories = Array.from(new Set(rebindableActions.map((a) => a.category)));

  return (
    <div style={{ background: "var(--color-bg-default)", padding: 16 }}>
      {categories.map((category) => (
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
      ))}
    </div>
  );
}

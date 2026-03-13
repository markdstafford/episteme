import { ChevronLeft } from "lucide-react";
import { useSettingsStore } from "@/stores/settings";
import { settingsConfig } from "@/config/settings";

export function SettingsNav() {
  const closeSettings = useSettingsStore((s) => s.closeSettings);
  const activeCategory = useSettingsStore((s) => s.activeCategory);
  const setActiveCategory = useSettingsStore((s) => s.setActiveCategory);

  const sorted = [...settingsConfig].sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col py-2">
      <button
        onClick={closeSettings}
        aria-label="Back to app"
        className="flex items-center gap-[var(--space-2)] px-[var(--space-2)] h-[var(--height-nav-item)] w-full text-[length:var(--font-size-ui-base)] text-(--color-text-tertiary) hover:bg-(--color-bg-subtle) hover:text-(--color-text-primary) transition-colors duration-(--duration-fast) focus-ring"
      >
        <ChevronLeft size={16} />
        Back to app
      </button>
      <div className="mt-[var(--space-4)] mb-[var(--space-2)] h-px bg-(--color-border-subtle)" />
      {sorted.map((cat) => {
        const Icon = cat.icon;
        const active = cat.id === activeCategory;
        return (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`group flex items-center gap-[var(--space-2)] px-[var(--space-2)] h-[var(--height-nav-item)] w-full rounded-[var(--radius-md)] text-[length:var(--font-size-ui-lg)] transition-colors duration-(--duration-fast) focus-ring cursor-pointer ${
              active
                ? "bg-(--color-bg-hover) text-(--color-text-primary)"
                : "text-(--color-text-secondary) hover:bg-(--color-bg-subtle) hover:text-(--color-text-primary)"
            }`}
          >
            <Icon
              size={16}
              className={active
                ? "text-(--color-text-secondary)"
                : "text-(--color-text-tertiary) group-hover:text-(--color-text-secondary)"
              }
            />
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}

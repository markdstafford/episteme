import { ChevronDown } from "lucide-react";
import { useManifestStore } from "@/stores/manifests";

interface ModeButtonProps {
  onClick: () => void;
}

export function ModeButton({ onClick }: ModeButtonProps) {
  const { activeMode, modes } = useManifestStore();
  const activeManifest = modes.find(m => m.id === activeMode);
  const label = activeManifest?.name ?? "Mode";

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2 rounded-(--radius-base)
                 h-(--height-control-sm) text-[length:var(--font-size-ui-sm)]
                 text-(--color-text-secondary) hover:bg-(--color-bg-subtle)
                 hover:text-(--color-text-primary) transition-colors duration-(--duration-fast)"
      aria-label={`Active mode: ${label}. Click to change.`}
    >
      <span>{label}</span>
      <ChevronDown className="w-3 h-3 flex-shrink-0" />
    </button>
  );
}

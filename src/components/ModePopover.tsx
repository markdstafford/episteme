import { useState, useEffect, useRef } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Check } from "lucide-react";
import { useManifestStore, type ModeManifest } from "@/stores/manifests";

interface ModePopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  docType: string | null;
}

export function ModePopover({ open, onOpenChange, docType }: ModePopoverProps) {
  const { activeMode, setActiveMode, applicableModes } = useManifestStore();
  const [filter, setFilter] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(0);
  const filterRef = useRef<HTMLInputElement>(null);

  // Reset and auto-focus filter when popover opens
  useEffect(() => {
    if (open) {
      setFilter("");
      setFocusedIndex(0);
      // Small delay to let Radix finish portal mounting
      const t = setTimeout(() => filterRef.current?.focus(), 10);
      return () => clearTimeout(t);
    }
  }, [open]);

  const applicable = applicableModes(docType)
    .sort((a, b) => a.name.localeCompare(b.name));

  const filtered = filter.trim()
    ? applicable.filter(m =>
        m.name.toLowerCase().includes(filter.toLowerCase()) ||
        m.description?.toLowerCase().includes(filter.toLowerCase())
      )
    : applicable;

  const handleSelect = (mode: ModeManifest) => {
    setActiveMode(mode.id);
    onOpenChange(false);
  };

  const handleFilterKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const focused = filtered[focusedIndex];
      if (focused) handleSelect(focused);
    } else if (e.key === "Escape") {
      onOpenChange(false);
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Anchor />
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="start"
          sideOffset={4}
          className="z-50 w-[280px] bg-(--color-bg-overlay) border border-(--color-border-subtle)
                     rounded-(--radius-lg) shadow-(--shadow-base) overflow-hidden
                     focus:outline-none"
          onEscapeKeyDown={() => onOpenChange(false)}
        >
          {/* Filter input */}
          <div className="p-2 border-b border-(--color-border-subtle)">
            <input
              ref={filterRef}
              value={filter}
              onChange={e => { setFilter(e.target.value); setFocusedIndex(0); }}
              onKeyDown={handleFilterKeyDown}
              placeholder={"Search modes\u2026"}
              className="w-full h-(--height-control-base) px-2
                         text-[length:var(--font-size-ui-base)] text-(--color-text-primary)
                         bg-(--color-bg-subtle) border border-(--color-border-default)
                         rounded-(--radius-base) outline-none
                         focus:border-(--color-accent)
                         placeholder:text-(--color-text-tertiary)"
            />
          </div>

          {/* Mode list */}
          <div
            role="listbox"
            aria-label="Available modes"
            className="max-h-64 overflow-y-auto p-1"
          >
            {filtered.length === 0 && (
              <p className="px-2 py-3 text-[length:var(--font-size-ui-sm)] text-(--color-text-tertiary) text-center">
                No modes match
              </p>
            )}
            {filtered.map((mode, idx) => (
              <div
                key={mode.id}
                role="option"
                aria-selected={mode.id === activeMode}
                tabIndex={-1}
                data-focused={idx === focusedIndex}
                onClick={() => handleSelect(mode)}
                className="flex items-start gap-2 px-2 py-1.5 rounded-(--radius-md)
                           cursor-pointer hover:bg-(--color-bg-hover)
                           text-(--color-text-secondary) hover:text-(--color-text-primary)
                           transition-colors duration-(--duration-fast)
                           data-[focused=true]:bg-(--color-bg-hover)"
              >
                <div className="w-4 flex-shrink-0 mt-0.5">
                  {mode.id === activeMode && (
                    <Check
                      data-testid="active-check"
                      className="w-3.5 h-3.5 text-(--color-accent)"
                    />
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[length:var(--font-size-ui-base)] leading-tight">
                    {mode.name}
                  </span>
                  {mode.description && (
                    <span className="text-[length:var(--font-size-ui-sm)] text-(--color-text-tertiary) truncate">
                      {mode.description}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

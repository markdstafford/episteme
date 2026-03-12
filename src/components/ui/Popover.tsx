import React from "react";
import * as RadixPopover from "@radix-ui/react-popover";

export const Popover = RadixPopover.Root;
export const PopoverTrigger = RadixPopover.Trigger;
export const PopoverClose = RadixPopover.Close;

export function PopoverContent({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <RadixPopover.Portal>
      <RadixPopover.Content
        className="overlay-surface"
        sideOffset={4}
        style={{
          backgroundColor: "var(--color-bg-overlay)",
          border: "1px solid var(--color-border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-2)",
          zIndex: 50,
          ...style,
        }}
      >
        {children}
      </RadixPopover.Content>
    </RadixPopover.Portal>
  );
}

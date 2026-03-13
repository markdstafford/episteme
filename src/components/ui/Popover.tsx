import React from "react";
import * as RadixPopover from "@radix-ui/react-popover";

export const Popover = RadixPopover.Root;
export const PopoverTrigger = RadixPopover.Trigger;
export const PopoverClose = RadixPopover.Close;

export function PopoverContent({
  children,
  style,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadixPopover.Content>) {
  return (
    <RadixPopover.Portal>
      <RadixPopover.Content
        className="overlay-surface"
        sideOffset={props.sideOffset ?? 4} // 4px = --space-1; Radix expects a number prop
        {...props}
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

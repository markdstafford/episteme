import React from "react";
import * as RadixContextMenu from "@radix-ui/react-context-menu";

export const ContextMenu = RadixContextMenu.Root;
export const ContextMenuTrigger = RadixContextMenu.Trigger;

export function ContextMenuContent({ children }: { children: React.ReactNode }) {
  return (
    <RadixContextMenu.Portal>
      <RadixContextMenu.Content
        className="overlay-surface"
        style={{
          minWidth: 180,
          maxWidth: 280,
          backgroundColor: "var(--color-bg-overlay)",
          border: "1px solid var(--color-border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-1) 0",
          zIndex: 50,
        }}
      >
        {children}
      </RadixContextMenu.Content>
    </RadixContextMenu.Portal>
  );
}

export function ContextMenuItem({
  children,
  destructive = false,
  disabled = false,
  onSelect,
}: {
  children: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}) {
  return (
    <RadixContextMenu.Item
      disabled={disabled}
      onSelect={onSelect}
      className="context-menu-item"
      data-destructive={destructive ? true : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        height: "var(--height-control-base)",
        padding: "0 8px",
        fontSize: "var(--font-size-ui-base)",
        color: destructive
          ? "var(--color-state-danger)"
          : "var(--color-text-secondary)",
        borderRadius: "var(--radius-md)",
        cursor: "default",
        userSelect: "none",
        outline: "none",
        opacity: disabled ? 0.4 : 1,
        pointerEvents: disabled ? "none" : undefined,
      }}
    >
      {children}
    </RadixContextMenu.Item>
  );
}

export function ContextMenuSeparator() {
  return (
    <RadixContextMenu.Separator
      style={{
        height: 1,
        backgroundColor: "var(--color-border-subtle)",
        margin: "var(--space-1) 0",
      }}
    />
  );
}

export function ContextMenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <RadixContextMenu.Label
      style={{
        fontSize: "var(--font-size-ui-xs)",
        fontWeight: 500,
        textTransform: "uppercase",
        color: "var(--color-text-quaternary)",
        padding: "var(--space-1) 8px",
      }}
    >
      {children}
    </RadixContextMenu.Label>
  );
}

export function ContextMenuShortcut({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        marginLeft: "auto",
        fontSize: "var(--font-size-ui-xs)",
        color: "var(--color-text-quaternary)",
      }}
    >
      {children}
    </span>
  );
}

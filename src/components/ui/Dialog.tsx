import React from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;

function DialogOverlay() {
  return (
    <RadixDialog.Overlay
      className="dialog-overlay"
      style={{
        position: "fixed",
        inset: 0,
        background: "oklch(0% 0 0 / 0.5)",
        backdropFilter: "blur(4px)",
        zIndex: 49,
      }}
    />
  );
}

export function DialogContent({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <RadixDialog.Portal>
      <DialogOverlay />
      <RadixDialog.Content
        className="dialog-content"
        aria-describedby={undefined}
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(480px, calc(100vw - var(--space-8)))",
          backgroundColor: "var(--color-bg-elevated)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-lg)",
          overflow: "visible",
          zIndex: 50,
          ...style,
        }}
      >
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

export function DialogHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "var(--padding-panel)",
        borderBottom: "1px solid var(--color-border-subtle)",
      }}
    >
      {children}
    </div>
  );
}

export function DialogTitle({ children }: { children: React.ReactNode }) {
  return (
    <RadixDialog.Title
      style={{
        fontSize: "var(--font-size-ui-md)",
        fontWeight: 600,
        color: "var(--color-text-primary)",
        margin: 0,
      }}
    >
      {children}
    </RadixDialog.Title>
  );
}

export function DialogDescription({ children }: { children: React.ReactNode }) {
  return (
    <RadixDialog.Description
      style={{
        fontSize: "var(--font-size-ui-base)",
        color: "var(--color-text-secondary)",
        margin: 0,
      }}
    >
      {children}
    </RadixDialog.Description>
  );
}

export function DialogBody({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        padding: "var(--padding-panel)",
        fontSize: "var(--font-size-ui-base)",
        color: "var(--color-text-secondary)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function DialogFooter({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        gap: "var(--space-2)",
        padding: "var(--padding-panel)",
        borderTop: "1px solid var(--color-border-subtle)",
      }}
    >
      {children}
    </div>
  );
}

export function DialogClose() {
  return (
    <RadixDialog.Close asChild>
      <Button variant="ghost" aria-label="Close dialog" iconOnly>
        <X size={16} />
      </Button>
    </RadixDialog.Close>
  );
}

import React from "react";

export type BadgeVariant = "neutral" | "accent" | "danger" | "warning" | "success";

export interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  neutral: {
    backgroundColor: "var(--color-bg-hover)",
    color: "var(--color-text-secondary)",
  },
  accent: {
    backgroundColor: "var(--color-accent-subtle)",
    color: "var(--color-badge-accent-text)",
  },
  danger: {
    backgroundColor: "var(--color-state-danger-subtle)",
    color: "var(--color-badge-danger-text)",
  },
  warning: {
    backgroundColor: "var(--color-state-warning-subtle)",
    color: "var(--color-badge-warning-text)",
  },
  success: {
    backgroundColor: "var(--color-state-success-subtle)",
    color: "var(--color-badge-success-text)",
  },
};

const baseStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  height: "var(--height-control-sm)",
  padding: "0 var(--space-2)",
  fontSize: "var(--font-size-ui-xs)",
  fontWeight: "500",
  borderRadius: "var(--radius-sm)",
  whiteSpace: "nowrap",
};

export function Badge({ variant = "neutral", children }: BadgeProps) {
  return (
    <span style={{ ...baseStyle, ...variantStyles[variant] }}>
      {children}
    </span>
  );
}

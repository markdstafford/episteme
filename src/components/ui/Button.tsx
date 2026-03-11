import React from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
export type ButtonSize = "base" | "sm";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    backgroundColor: "var(--color-accent)",
    color: "white",
    border: "none",
  },
  secondary: {
    backgroundColor: "var(--color-bg-elevated)",
    color: "var(--color-text-primary)",
    border: "1px solid var(--color-border-default)",
  },
  ghost: {
    backgroundColor: "transparent",
    color: "var(--color-text-secondary)",
    border: "none",
  },
  destructive: {
    backgroundColor: "var(--color-state-danger)",
    color: "white",
    border: "none",
  },
};

const variantHoverStyles: Record<ButtonVariant, string> = {
  primary: "var(--color-accent-hover)",
  secondary: "var(--color-bg-hover)",
  ghost: "var(--color-bg-subtle)",
  destructive: "oklch(62% 0.2 25)",
};

export function Button({
  variant = "secondary",
  size = "base",
  iconOnly,
  children,
  disabled,
  style,
  onMouseEnter,
  onMouseLeave,
  className,
  ...rest
}: ButtonProps) {
  const [hovered, setHovered] = React.useState(false);

  const isIconOnly =
    iconOnly === true ||
    (iconOnly !== false && rest["aria-label"] !== undefined && !children);

  const height = size === "sm"
    ? "var(--height-control-sm)"
    : "var(--height-control-base)";

  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    height,
    padding: isIconOnly ? "0" : "var(--padding-control)",
    width: isIconOnly ? height : undefined,
    borderRadius: "var(--radius-base)",
    fontSize: "var(--font-size-ui-base)",
    fontWeight: 400,
    lineHeight: 1,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
    transition: `background-color var(--duration-fast), color var(--duration-fast)`,
    outline: "none",
    whiteSpace: "nowrap",
    flexShrink: 0,
    boxSizing: "border-box",
    ...variantStyles[variant],
    ...(hovered && !disabled
      ? { backgroundColor: variantHoverStyles[variant] }
      : {}),
    ...style,
  };

  return (
    <button
      {...rest}
      disabled={disabled}
      style={baseStyle}
      className={className}
      onMouseEnter={(e) => {
        setHovered(true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        setHovered(false);
        onMouseLeave?.(e);
      }}
      onFocus={(e) => {
        e.currentTarget.style.outline = "2px solid var(--color-accent)";
        e.currentTarget.style.outlineOffset = "2px";
        rest.onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.outline = "none";
        e.currentTarget.style.outlineOffset = "";
        rest.onBlur?.(e);
      }}
    >
      {children}
    </button>
  );
}

import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input(
    {
      error,
      disabled,
      style,
      onMouseEnter,
      onMouseLeave,
      onFocus,
      onBlur,
      ...rest
    },
    ref,
  ) {
    const baseStyle: React.CSSProperties = {
      height: "var(--height-control-base)",
      padding: "0 10px",
      borderRadius: "var(--radius-base)",
      fontSize: "var(--font-size-ui-base)",
      color: "var(--color-text-primary)",
      backgroundColor: "var(--color-bg-subtle)",
      border: "1px solid var(--color-border-default)",
      outline: "none",
      boxSizing: "border-box",
      width: "100%",
      transition: `border-color var(--duration-fast), box-shadow var(--duration-fast)`,
      ...(disabled
        ? { borderColor: "var(--color-border-subtle)", opacity: 0.4 }
        : {}),
      ...(error && !disabled
        ? {
            borderColor: "var(--color-state-danger)",
            boxShadow: "0 0 0 2px var(--color-state-danger-subtle)",
          }
        : {}),
      ...style,
    };

    return (
      <input
        {...rest}
        ref={ref}
        disabled={disabled}
        data-ui-input=""
        style={baseStyle}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.borderColor = "var(--color-border-strong)";
          }
          onMouseEnter?.(e);
        }}
        onMouseLeave={(e) => {
          if (!disabled) {
            e.currentTarget.style.borderColor = "";
          }
          onMouseLeave?.(e);
        }}
        onFocus={(e) => {
          if (!error) {
            e.currentTarget.style.borderColor = "var(--color-accent)";
            e.currentTarget.style.boxShadow =
              "0 0 0 2px var(--color-accent-subtle)";
          }
          onFocus?.(e);
        }}
        onBlur={(e) => {
          if (!error) {
            e.currentTarget.style.borderColor = "";
            e.currentTarget.style.boxShadow = "";
          }
          onBlur?.(e);
        }}
      />
    );
  },
);

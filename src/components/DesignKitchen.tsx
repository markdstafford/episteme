import React from "react";

interface DesignKitchenProps {
  onClose: () => void;
}

export function DesignKitchen({ onClose }: DesignKitchenProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "var(--color-bg-base)",
        color: "var(--color-text-primary)",
        fontFamily: "var(--font-ui)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Sticky header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 24px",
          borderBottom: "1px solid var(--color-border-subtle)",
          background: "var(--color-bg-elevated)",
          zIndex: 1,
        }}
      >
        <span style={{ fontSize: "var(--font-size-ui-md)", fontWeight: 600 }}>
          Design Kitchen
        </span>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--color-text-tertiary)",
            fontSize: "var(--font-size-ui-base)",
            padding: "4px 8px",
          }}
        >
          Close ✕
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 48px" }}>
        <Section title="Colors">{/* Task 3 */}</Section>
        <Section title="Typography">{/* Task 4 */}</Section>
        <Section title="Spacing">{/* Task 5 */}</Section>
        <Section title="Border Radius">{/* Task 5 */}</Section>
        <Section title="Shadows">{/* Task 5 */}</Section>
        <Section title="Motion">{/* Task 5 */}</Section>
        <Section title="Components">{/* Tasks 6–8 */}</Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "48px" }}>
      <h2
        style={{
          fontSize: "var(--font-size-ui-md)",
          fontWeight: 600,
          color: "var(--color-text-secondary)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: "24px",
          paddingBottom: "8px",
          borderBottom: "1px solid var(--color-border-subtle)",
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

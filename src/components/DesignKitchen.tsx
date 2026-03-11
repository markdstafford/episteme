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
        <Section title="Colors">
          <ColorGroup label="Backgrounds" tokens={[
            { name: "--color-bg-app",      dark: "oklch(7% 0.01 264)",    light: "oklch(95% 0.004 264)" },
            { name: "--color-bg-base",     dark: "oklch(9.5% 0.012 264)", light: "oklch(99% 0.002 264)" },
            { name: "--color-bg-subtle",   dark: "oklch(12% 0.015 264)",  light: "oklch(97% 0.003 264)" },
            { name: "--color-bg-elevated", dark: "oklch(15% 0.018 264)",  light: "oklch(100% 0 0)" },
            { name: "--color-bg-overlay",  dark: "oklch(18.5% 0.02 264)", light: "oklch(98% 0.003 264)" },
            { name: "--color-bg-hover",    dark: "oklch(21% 0.022 264)",  light: "oklch(93% 0.005 264)" },
          ]} />
          <ColorGroup label="Text" tokens={[
            { name: "--color-text-primary",    dark: "oklch(100% 0 0)",       light: "oklch(18% 0.012 264)" },
            { name: "--color-text-secondary",  dark: "oklch(92% 0.008 264)",  light: "oklch(45% 0.01 264)" },
            { name: "--color-text-tertiary",   dark: "oklch(65% 0.008 264)",  light: "oklch(62% 0.008 264)" },
            { name: "--color-text-quaternary", dark: "oklch(42% 0.008 264)",  light: "oklch(72% 0.006 264)" },
          ]} />
          <ColorGroup label="Borders" tokens={[
            { name: "--color-border-subtle",  dark: "oklch(16% 0.02 264)",  light: "oklch(88% 0.006 264)" },
            { name: "--color-border-default", dark: "oklch(20% 0.022 264)", light: "oklch(84% 0.007 264)" },
            { name: "--color-border-strong",  dark: "oklch(23% 0.022 264)", light: "oklch(78% 0.008 264)" },
          ]} />
          <ColorGroup label="Accent" tokens={[
            { name: "--color-accent",        dark: "oklch(62% 0.175 230)", light: "oklch(62% 0.175 230)" },
            { name: "--color-accent-hover",  dark: "oklch(66% 0.175 230)", light: "oklch(66% 0.175 230)" },
            { name: "--color-accent-subtle", dark: "oklch(62% 0.04 230)",  light: "oklch(62% 0.04 230)" },
          ]} />
          <ColorGroup label="State" tokens={[
            { name: "--color-state-danger",         dark: "oklch(58% 0.2 25)",   light: "oklch(58% 0.2 25)" },
            { name: "--color-state-danger-subtle",  dark: "oklch(58% 0.06 25)",  light: "oklch(58% 0.06 25)" },
            { name: "--color-state-warning",        dark: "oklch(72% 0.16 65)",  light: "oklch(72% 0.16 65)" },
            { name: "--color-state-warning-subtle", dark: "oklch(72% 0.05 65)",  light: "oklch(72% 0.05 65)" },
            { name: "--color-state-success",        dark: "oklch(65% 0.15 155)", light: "oklch(65% 0.15 155)" },
            { name: "--color-state-success-subtle", dark: "oklch(65% 0.05 155)", light: "oklch(65% 0.05 155)" },
          ]} />
        </Section>
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

interface ColorToken { name: string; dark: string; light: string; }

function ColorGroup({ label, tokens }: { label: string; tokens: ColorToken[] }) {
  return (
    <div style={{ marginBottom: "24px" }}>
      <div style={{ fontSize: "var(--font-size-ui-xs)", color: "var(--color-text-quaternary)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {tokens.map(({ name, dark, light }) => (
          <div key={name} style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "160px" }}>
            <div style={{ display: "flex", gap: "2px", height: "32px", borderRadius: "var(--radius-base)", overflow: "hidden", border: "1px solid var(--color-border-subtle)" }}>
              <div style={{ flex: 1, background: dark }} title={`dark: ${dark}`} />
              <div style={{ flex: 1, background: light }} title={`light: ${light}`} />
            </div>
            <div style={{ fontSize: "var(--font-size-ui-xs)", color: "var(--color-text-tertiary)", fontFamily: "var(--font-mono)" }}>
              {name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

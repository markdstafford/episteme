---
created: 2026-03-11
last_updated: 2026-03-11
status: active
---

# App Layout

The canonical reference for Episteme's application shell structure. Defines the named layout zones, their relationships, and their behaviors. Component specs and feature specs reference this document when describing layout changes.

---

## Shell zones

```
┌─────────────────────────────────────────────────────────┐
│                       Title bar                         │
├──────────────┬──────────────────────────────────────────┤
│              │                                          │
│              │           Content area                   │
│   Sidebar    │  ┌──────────────────────┬─────────────┐  │
│              │  │                      │             │  │
│              │  │   Primary content    │ Right panel │  │
│              │  │                      │  (optional) │  │
│              │  └──────────────────────┴─────────────┘  │
│              │                                          │
├──────────────┴──────────────────────────────────────────┤
│                    Footer (future)                      │
└─────────────────────────────────────────────────────────┘
```

---

## Zones

### Title bar

Full-width strip rendered above all other zones. Always visible; cannot be hidden.

Divided into three sections:

| Section | Width | Content |
|---|---|---|
| Left | `--width-sidebar` | Traffic lights no-drag zone (left 70px) + icon buttons |
| Center | `flex: 1` | App name / current context label; drag region |
| Right | fixed | Global action buttons |

See `design-system.md` → Window chrome → macOS title bar for full styling spec.

---

### Sidebar

Left column. Fixed width (`--width-sidebar`, 244px). Contains navigation for the current app mode.

- **Default mode**: file tree navigation
- **Settings mode**: settings category navigation (see `feature-settings-panel.md`)
- **Collapsible/hideable**: planned; not yet implemented

The sidebar's *contents* change by mode — the sidebar shell (dimensions, background) does not.

---

### Content area

Everything to the right of the sidebar. Fills remaining horizontal space. Subdivided into:

**Primary content** — the main working surface. In normal mode: document viewer. In settings mode: settings panel. Always present.

**Right panel** — optional panel that slides in alongside primary content. Currently: AI chat panel. May be extended to other panel types in future. When open, primary content shrinks; the sidebar is unaffected.

---

### Footer

Not yet implemented. Will span full width below the sidebar and content area. Intended for status indicators, word count, mode controls, and other persistent global controls.

---

## Mode behavior

Some app modes replace the contents of multiple zones simultaneously. The sidebar shell and title bar remain structurally stable across modes; only their contents change.

| Mode | Sidebar contents | Primary content | Right panel |
|---|---|---|---|
| Normal | File tree | Document viewer | AI chat (optional) |
| Settings | Settings nav | Settings panel | Hidden |
| (future modes) | TBD | TBD | TBD |

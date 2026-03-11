---
created: 2026-03-10
last_updated: 2026-03-10
status: complete
issue: 30
specced_by: markdstafford
implemented_by: markdstafford
superseded_by: null
---

# Feature: Design system

## What

Episteme's visual design needs to operate as a first-class desktop product. This feature establishes a complete design system for Episteme — a consistent visual language covering color, typography, spacing, density, component patterns, and window chrome — that makes the application feel like a purpose-built desktop tool rather than a website rendered in a browser frame.

The design system delivers two things. First, a token vocabulary: a defined set of named values for every visual decision in the application, from background colors and text sizes to border radii and motion timing. These tokens become the single source of truth that every present and future component references, eliminating ad-hoc visual decisions. Second, a set of core component patterns that specify how the application's major UI surfaces should look and behave — sidebar, toolbar, document area, buttons, inputs, dialogs, and menus — including a custom window frame treatment for both macOS and Windows.

The result is a visual foundation that all future Episteme features build on, and a reference document precise enough that any engineer can implement a new component without guessing at visual decisions.

## Why

Episteme is a professional desktop tool. First impressions are formed in seconds, and an application that looks like a website in a browser frame signals low quality before a user has read a single document. The design system exists to close that gap — to make Episteme look and feel like software people want to spend hours in, alongside tools like Linear and Bear.

Beyond first impressions, the absence of a design system has a compounding cost. Every component built without one requires engineers to make visual decisions from scratch — what shade of gray, which border radius, how much padding — and those decisions accumulate into an inconsistent UI that becomes increasingly expensive to fix. Establishing the system now, before more features are built on top of the current ad-hoc styles, is dramatically cheaper than retrofitting later. It also creates a shared language: a token vocabulary that engineers, AI collaborators, and future contributors can all reference, so "primary button" or "border-subtle" mean the same thing to everyone.

The token foundation established here is also the prerequisite for two follow-on investments: markdown rendering improvements and theming. Both require a stable design language to build on.

## Personas

- **Eric: Engineer** — primary consumer of the design system spec; implements components using defined tokens and patterns
- **Patricia: Product Manager** — daily user of the application; directly experiences the quality of the resulting UI
- All other personas (Raquel, Aaron, Olivia) benefit as end users of the improved desktop feel

## Narratives

### Eric implements a new component

Eric picks up a task to build the comment thread sidebar for the review workflow — a panel he hasn't seen specced yet. Rather than opening the codebase and copying styles from whatever component is nearby, he opens `design-system.md` first. The token reference tells him exactly what he needs: `--color-bg-elevated` for the panel background, `--color-border-subtle` for the dividers between comments, `--font-size-sm` with `--color-text-secondary` for timestamps, and `--radius-md` for the avatar bubbles. He picks `ghost` button variant for the resolve action. Every decision is already made.

Eric builds the component in about an hour. The result looks identical to the rest of the app — same density, same type treatment, same hover states — without him having coordinated with anyone about the visual design. When he opens a PR, there are no comments about inconsistent padding or mismatched grays. The component simply fits.

Three months later, a second engineer joins the project and is asked to add a reactions feature to comment threads. She opens `design-system.md`, finds the badge token definitions and the icon sizing guidelines, and implements the feature with the same confidence Eric had. The design system has done its job.

### Patricia opens Episteme after the redesign

Patricia opens Episteme for the first time since the redesign shipped. The first thing she notices is the window — the title bar is gone, replaced by a seamless content area where the macOS traffic lights nestle in the top-left corner of the app frame, integrated into the chrome rather than hovering above it. It looks like software, not a browser tab.

She selects a document from the sidebar and reads through it. The sidebar is narrower and denser than she remembered — more like a file manager than a webpage nav — and the document area gives her a calm, focused reading surface. The type is crisp at exactly the right size. She doesn't consciously notice any of this; she just finds herself reading without friction.

Patricia presses Cmd+, to open settings. The main content doesn't disappear into a new OS window — instead, a settings panel fills the app in place, the document fading behind it. She updates her AWS profile and closes the panel. The document is right where she left it. Nothing felt like it left the application.

## User stories

**Eric implements a new component**

- Eric can look up any visual decision (color, spacing, type, radius, shadow) by name in `design-system.md` without consulting anyone
- Eric can implement a new component that visually matches the rest of the app without guessing at values
- Eric can ship UI PRs that don't require design review for basic visual consistency
- A new engineer can onboard to the design system and implement compliant components from the reference alone

**Patricia opens Episteme after the redesign**

- Patricia can open Episteme and perceive it as a native desktop application, not a website in a browser frame
- Patricia can read documents in a focused, low-noise environment with appropriate typographic density
- Patricia can open settings without leaving the application context
- All personas experience a window chrome that integrates with the OS rather than sitting on top of it

## Goals

- Every color, spacing, radius, shadow, and motion value in the app is defined as a named token in `design-system.md` with no undocumented one-offs
- Any engineer can implement a new UI component using only the design system reference, with zero ambiguity about visual values
- The application window uses native-integrated chrome on macOS (traffic lights embedded, no system title bar) and a custom frame on Windows
- All overlay experiences (settings, dialogs, panels) render within the application window — no separate OS windows
- The design system is encoded as Tailwind v4 CSS variables, ready to support theming in a future phase

## Non-goals

- Theme switching (light/dark toggle, custom themes) — deferred to a follow-on theming feature
- Markdown/Tiptap rendering improvements — separate follow-on feature
- Migrating every existing component to the new tokens — covered by follow-on enhancement specs per component area

## Design spec

This section is a **design brief** for the execution session that produces `design-system.md`. It does not contain the answers — it contains the questions to answer, the inputs to consider, and the tradeoffs to resolve. The execution session reads this brief, interviews the user to close any open questions, researches the inspiration sources, then works through each decision area to produce the final spec.

### Purpose and approach

The execution session's output is a fully-specified `design-system.md` that replaces the current stub. Every decision area below must result in concrete, named token values — no ranges, no "approximately," no "similar to." An engineer should be able to read the result and implement any component with zero follow-up questions.

Dark mode is the primary mode. Light mode is fully specified but secondary.

**Ignore all existing design decisions.** Any design-related content in `app.md`, `design-system.md`, component files, or anywhere else in the codebase should be treated as a placeholder. No prior design work was done intentionally — the entire visual layer is being established from scratch here. Do not use existing values as anchors or defaults.

**Favor cross-platform consistency.** Where there is a choice between a platform-native approach and a consistent cross-platform approach, prefer consistency within reason.

### Inspiration sources

The execution session should research these sources in depth before making recommendations. For each source, the goal is to extract specific, concrete values — CSS variable values, pixel measurements, hex/oklch colors — not just impressions. Use browser devtools to inspect CSS where the app is web-accessible. For native macOS apps, inspect screenshots and look for design teardowns. **If access requires a login (e.g., Linear's app requires an account), ask the user to open devtools on the relevant page and share the CSS output** — this is a reasonable ask and worth doing to get accurate values.

**Primary reference — Linear (CSS-inspected, values confirmed)**

Linear's CSS was inspected directly. The following values are confirmed and should be used as concrete inputs during execution, not re-researched:

*Font*
- UI font family: `"Inter Variable", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif`
- Monospace font family: `"Berkeley Mono", "SFMono Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace`

*Layout dimensions*
- Sidebar width: `244px`
- Header/toolbar height: `39px`
- Nav item height: `28px` @ `16px` font (body default)
- Button height: `28px` @ `13px` font
- Menu item height: `32px` @ `13px` font
- Control border radius: `4px`

*Dark mode color palette*
- Sidebar background: `#090909`
- Content background: `#101012`
- Content bg (component level): `#15161c`
- Header/card background: `#191a22`
- Elevated surface: `#222430`
- Hover/active surface: `#272937`
- Quaternary bg: `#1b1c27`
- Border primary: `#20222f` / secondary: `#292b38` / tertiary: `#313240`
- Text primary: `#ffffff` / secondary: `#e4e4ed` / tertiary: `#999aa1` / quaternary: `#5d5e65`
- Accent/focus: `#575ac6`

*Light mode color palette*
- Sidebar background: `#f5f5f5`
- Content background: `#fcfcfc`
- Border: `#e0e0e0`
- Text secondary: `#b0b5c0`
- Text primary: `#23252a`

*Motion durations*
- Instant: `0s` / Fast: `0.1s` / Normal: `0.15s` / Slow: `0.25s` / Deliberate: `0.35s`

*Elevation in dark mode*
- Context menus: **no box-shadow** — elevation communicated via background color contrast alone (`#222430` over `#101012`)

Design philosophy post for reference: https://linear.app/now/how-we-redesigned-the-linear-ui

**Secondary references — native macOS apps**

Raycast, Things 3, Bear, Arc, and Craft are all native macOS apps. Their design language cannot be extracted via CSS. During the execution session, use these approaches:
- **Digital Color Meter** (built into macOS at `/Applications/Utilities/`) — sample exact colors from any pixel on screen
- **Accessibility Inspector** (in Xcode at `/Applications/Xcode.app/Contents/Applications/`) — inspect element bounds, heights, and hierarchy of any running app
- **Screenshots + Figma** — import a screenshot into Figma (free) to measure pixel dimensions

These apps are validation and inspiration sources, not primary data sources. The goal is to confirm that Linear's choices are consistent with other high-quality desktop tools, and to draw on their strengths in areas Linear doesn't cover (Bear for document reading, Arc for window chrome integration, Things 3 for sidebar density).

### Decision areas

Each area below states: (1) the question(s) to resolve and (2) known inputs. Inputs marked **[confirmed]** come from primary sources (the Linear blog post or similar). Inputs marked **[research]** need verification during execution — treat them as starting hypotheses, not facts.

---

#### Typography

**Questions to answer**
- What is the complete UI type scale (sizes, line heights, weights) for UI text? Include: tiny labels, secondary text, primary UI text, dialog content/labels, section headers.
- What is the complete document content scale for rendered Markdown? This is a separate token category — document reading has different requirements than UI density.
- What specific Inter weights are used and where?

**Inputs**
- **[confirmed]** Font family: `"Inter Variable"` as primary UI font (with SF Pro Display and system font fallbacks). Inter Variable is the variable font version of Inter — use this specifically, not static Inter.
- **[confirmed]** Monospace: `"Berkeley Mono"` as primary (a premium monospace). Given this requires a paid license, decide during execution whether to license it, use a free alternative (JetBrains Mono, Fira Code), or fall back to system mono.
- **[confirmed]** Linear uses Inter Display for headings — source: blog post. This is a display-optimized variant; confirm whether Inter Variable covers this or whether a separate Inter Display import is needed.
- **[confirmed]** Controls, buttons, inputs, menus: `13px` font size
- **[confirmed]** Sidebar nav items: `16px` font size (inheriting body default — not a compact size)
- **[research]** Complete UI type scale beyond these two data points — use Digital Color Meter and Accessibility Inspector on reference apps, or derive from the confirmed values plus desktop convention
- **[research]** Document content type scale — derive from Bear and Craft inspection; prioritize readability over density

**Two token categories required**
- `--font-size-ui-*` tokens: governs all chrome — sidebar, toolbar, buttons, inputs, menus, dialogs, labels. Confirmed range: 13–16px.
- `--font-size-doc-*` tokens: governs rendered Markdown content — headings, body, code, captions. Prioritize readability over density. Implementation deferred to the markdown rendering feature, but tokens must be defined here.

---

#### Color tokens

**Questions to answer**
- What color space for token definition?
- What is the complete semantic token set for dark mode? (background levels, text levels, border levels, accent, state colors)
- What is the complete semantic token set for light mode?
- What accent color for Episteme?
- How many background elevation levels are needed?

**Inputs**
- **[confirmed]** Linear uses LCH color space for theme generation (blog post). Modern CSS supports `oklch()` natively — perceptually uniform like LCH and the current CSS standard. Recommended starting point; present to user for sign-off.
- **[confirmed]** Linear's palette uses near-pure gray neutrals with minimal chromatic bias — text and icons are not tinted (blog post).
- **[confirmed]** Linear uses **two color systems in parallel**: a simple layout-level system (`--bg-*`, `--content-*`) and a richer component-level system (`--color-bg-*`, `--color-text-*`, `--color-border-*`). Episteme should adopt a single unified semantic system.
- **[confirmed]** Linear dark mode — full palette from CSS inspection (see confirmed values in the Inspiration Sources section above)
- **[confirmed]** Linear light mode — full palette from CSS inspection (see confirmed values above)
- **[confirmed]** Linear uses **4 background levels** in dark mode: `#191a22` / `#222430` / `#272937` / `#1b1c27` — plus layout-level `#090909` (sidebar) and `#101012` (content). Episteme likely needs 3–4 levels.
- **[confirmed]** Accent/focus color: `#575ac6` (a blue-violet)
- Theming is explicitly deferred. All tokens must be named semantically so they can be remapped when theming is built.

**Tradeoffs to surface**
- **oklch vs raw hex for token definition**: Linear defines tokens in hex but uses LCH internally for theme generation. For Episteme, defining tokens in `oklch()` in the CSS makes the theming phase easier and values more meaningful. Raw hex is simpler now but opaque. Recommendation: `oklch()`. Get user sign-off.
- **Accent color**: `#575ac6` is Linear's exact color. Episteme can adopt it (well-tested, distinctive) or choose a differentiating color. Brand decision — present to user with a recommendation.
- **Number of bg levels**: Linear uses 6 distinct background values. Episteme should rationalize this to a smaller set (3–4 named semantic levels). Propose a mapping during execution.

---

#### Spacing and density

**Questions to answer**
- What is the named spacing scale and base unit?
- What are standard control heights (buttons, inputs, menu items, sidebar items)?
- What is the sidebar width?
- What are the standard padding values for panels, content areas, and toolbars?

**Inputs**
- **[confirmed]** Linear blog post references spacer values of 4px, 10px, 12px, 20px, 24px, 56px, 80px, 128px — layout-level spacers. Base unit: 4px.
- **[confirmed]** Sidebar width: `244px`
- **[confirmed]** Header/toolbar height: `39px`
- **[confirmed]** Nav item height: `28px`
- **[confirmed]** Button height: `28px`, padding: `6px 12px`
- **[confirmed]** Menu item height: `32px`, padding-left from inner element (not outer container)
- **[research]** Padding conventions for panels, content areas, and the document reading column — derive from reference app inspection

**Tradeoffs to surface**
- **Density level**: Desktop tools are meaningfully denser than web apps. Research should establish a specific target control height (e.g., 28px vs 32px) and the execution session should present the tradeoff to the user with visual reference.
- **Fixed vs fluid sidebar**: Fixed width is simpler to spec and implement. Resizable sidebar is a future enhancement — do not over-engineer for it now.

---

#### Border radius

**Questions to answer**
- What is the named radius scale and what pixel values?
- Which radius applies to which component category?

**Inputs**
- **[confirmed]** Linear's `--control-border-radius: 4px` — applies to buttons, inputs, and controls
- **[confirmed]** Linear blog post references 8px and 16px for image/asset containers (larger layout elements)
- **[research]** Radii for menus, dialogs, cards, and badges — not directly confirmed from CSS inspection; derive from reference app inspection and propose a scale

**Tradeoffs to surface**
- A differentiated scale (small for controls, larger for dialogs) creates visual hierarchy. A uniform scale is simpler but flatter. Research should inform the proposal; user signs off on the scale.

---

#### Shadow and elevation

**Questions to answer**
- What named elevation levels are needed?
- What are the CSS `box-shadow` values for each level in dark and light modes?
- How is elevation communicated in dark mode where shadows are less visible?

**Inputs**
- **[confirmed]** Linear context menus in dark mode: `box-shadow: none` — elevation is communicated entirely through background color contrast (`#222430` menu surface over `#101012` content background)
- **[confirmed]** Linear uses 4–6 distinct background color levels to create elevation hierarchy without shadows in dark mode
- **[research]** Linear's shadow values for light mode and for dialogs/modals — not confirmed; inspect via CSS or derive from reference apps
- **[research]** Whether any elevated elements (dialogs, tooltips) use shadows in dark mode — likely yes for modals, but not confirmed

**Tradeoffs to surface**
- In dark mode, `box-shadow` on dark backgrounds is often invisible. Linear's approach (background color steps only, no shadow) is clean but requires sufficient contrast between levels. An alternative complement is `inset 0 0 0 1px` border-via-shadow, which remains visible regardless of background. Present the approach to the user.

---

#### Motion

**Questions to answer**
- What duration tokens are needed and what values?
- What easing curves for entering, exiting, and transitioning elements?
- What interactions should have transitions vs be instant?

**Inputs**
- **[confirmed]** Linear's philosophy: transitions are intentional and subtle — "spatial context, not attention-drawing." Source: blog post.
- **[confirmed]** Linear's duration tokens from CSS: `0s` (instant), `0.1s` (fast), `0.15s` (normal), `0.25s` (slow), `0.35s` (deliberate)
- **[research]** Which elements use which durations, and what easing curves — not confirmed from CSS inspection; derive from reference app observation and desktop convention

**Tradeoffs to surface**
- Less motion is generally better for a focused desktop tool. The execution session should have a strong bias toward fewer, faster transitions. Present a minimal set of duration tokens to the user (e.g., instant, fast, normal) rather than a large scale.

---

#### Window chrome

**Questions to answer**
- Exact `tauri.conf.json` configuration for macOS title bar?
- How is the drag region implemented?
- What is the title bar height and content layout?
- What is the Windows frame strategy and what controls does it include?
- How does the custom title bar interact with the sidebar (does the sidebar extend behind the traffic lights area)?

**Inputs**
- Tauri v2 supports `titleBarStyle: "Overlay"` — removes the system title bar background; web content fills the full window including the title bar area; native traffic lights remain and are positioned at approximately (13px from left, 13px from top)
- The draggable region is defined in CSS with `-webkit-app-region: drag`; interactive elements within it must be explicitly marked `-webkit-app-region: no-drag`
- Standard title bar height: 52px is a common comfortable value; the 38px at the top is the "hidden" title bar area where traffic lights live
- Linear's title bar: the sidebar header (workspace name + nav controls) extends into the title bar area, with traffic lights floating over the leftmost portion of the sidebar
- For Windows (Phase 2): `decorations: false` removes the OS frame entirely; custom close/minimize/maximize buttons are rendered in React, positioned top-right, and call Tauri's window management API
- Platform detection is required to render the correct chrome per OS

**Pre-decided**
- Settings and all overlay experiences are **in-app panels, not separate OS windows**. This is resolved — not an open question.

---

#### Settings and navigation experience

**Questions to answer**
- What is the visual design of the settings "mode"?
- How does the sidebar transform when in settings mode?
- How does the main content area transform?
- How does the user return to the main experience?

**Pre-decided (do not re-open)**
The settings experience follows the Linear pattern precisely:
- Settings replaces the main content pane — it is not a dialog or overlay; it feels like the app navigated to a new place
- The sidebar transforms into a settings navigation menu showing settings categories
- A "Back to app" link with a left chevron appears at the top of the sidebar
- Closing/exiting settings returns both sidebar and content area to their previous state
- This same "full app takeover" navigation pattern applies to all overlay experiences — not just settings

The execution session should design the visual specifics of this pattern (typography, spacing, transition behavior) but not re-examine whether to use this pattern.

---

#### Core component patterns

For each component below, the execution session must define: visual appearance, all relevant states (default, hover, focus, active, disabled), dimensions (height, padding, radius), and token references for every visual property. No undocumented values.

Components to specify:

- **Sidebar** — width, item height, section header treatment, icon sizing, selected/hover/active states, folder expand/collapse behavior
- **Title bar** — height, content layout (traffic lights zone, workspace label, right-side controls), drag region boundaries
- **Toolbar** — height, button sizing, mode-awareness (formatting tools visible only in edit mode), separator treatment
- **Buttons** — primary, secondary, ghost, destructive variants; all states; dimensions; icon+label layout
- **Inputs** — text input, height, border treatment, focus ring, placeholder style, error state
- **Dialogs and modals** — all in-app (not OS windows); backdrop treatment, container dimensions, header/body/footer layout, close behavior
- **Context menus and popovers** — width constraints, item height, keyboard shortcut label alignment, separator treatment, nested menu indicator
- **Badges and tags** — height, radius, typography, color variants (status colors, neutral)
- **Frontmatter bar** — replaces current `FrontmatterBar.tsx` design; key/value display, layout, truncation behavior

**shadcn strategy (resolve during execution)**

Currently zero shadcn components exist in the codebase. The execution session should recommend and get sign-off on one of these approaches:

- **Option A: Radix UI primitives only** — use `@radix-ui/*` packages directly for accessible primitives (dialog, popover, dropdown-menu, etc.), apply all styling from scratch using design tokens. Maximum control, no visual defaults to fight.
- **Option B: shadcn/ui with full visual override** — generate shadcn components into `src/components/ui/`, replace all visual styling with design tokens. Keeps Radix under the hood, familiar pattern, but ships with default styles that must be stripped.
- **Option C: No component library** — build all primitives from scratch including accessibility. Maximum control, highest effort, accessibility risk.

Recommendation to present: Option A. The design system's density and visual style will require overriding essentially all of shadcn's defaults anyway, and going directly to Radix avoids the overhead of fighting generated code.

---

### Kitchen sink preview

The execution session should specify (and the implementation should build) a dev-only kitchen sink view accessible in the Tauri dev build. It must render:

- All color tokens as labeled swatches (background levels, text samples, border samples, accent, state colors) for both dark and light modes
- Complete type scale — every size with its name, pixel value, and a sample sentence
- Spacing scale — visual ruler showing each named spacing value
- All button variants and states
- Input states (default, focused, error, disabled)
- Badge and tag variants
- Sample sidebar (static, not functional)
- Sample dialog (triggered by a button)
- Sample context menu

The purpose is to allow the user to review and sign off on the design system as rendered in the actual app before any component migration begins. It is removed or hidden behind a dev flag before production.

## Tech spec

### Scope boundary

This feature produces the design system specification. It does not implement any code changes — those are covered by follow-on enhancements. The boundary: after this feature ships, `design-system.md` is complete and authoritative. Every downstream decision (token encoding, title bar, component migration, kitchen sink) has a clear spec to implement against.

### Output artifacts

**Primary output:**
- `.eng-docs/wiki/design-system.md` — complete rewrite of the current stub; the canonical design system reference

**Secondary output — documentation cleanup:**
- `.eng-docs/specs/app.md` — the "Design guidance" section contains placeholder content that predates this feature; simplify it to a single line pointing to `design-system.md` as the canonical source

### Follow-on enhancements (not in scope here)

The following are expected follow-on enhancements, in rough implementation order:

1. **Encode design tokens** — `src/app.css` `@theme {}` block implementing all tokens from `design-system.md`
2. **Kitchen sink** — dev-only preview view; depends on token encoding being complete before it renders meaningfully
3. **macOS title bar** — `tauri.conf.json` + `TitleBar.tsx`; retire the separate settings OS window
4. **Component migrations** — per-component-area enhancements (sidebar, toolbar, buttons, inputs, dialogs, etc.)

Each of these should be planned as its own enhancement spec referencing this feature.

### Enforcement

`design-system.md` is enforced as the canonical design reference via the planning skill's prerequisite check — every design spec stage verifies that the wiki document exists and is consulted before proceeding. No additional ADR is needed.

### Definition of done

- `design-system.md` is complete: all token categories defined with specific values, all core component patterns specified, no undocumented values
- `app.md` Design guidance section simplified to redirect to `design-system.md`

## Task list

This task list is the execution workflow for the session that produces `design-system.md`. It is structured as four phases. Each phase must complete before the next begins.

> **Sign-off principle**: The user does not need to approve every individual token value. If a system or rule is approved (e.g., "secondary text is always the tertiary text color"), that rule can be applied to all derived values without individual sign-off. Sign-off is required for systems, rules, and any value that involves a real judgment call or brand decision.

---

### Phase 1: Preparation

**Goal**: Ensure the execution session starts with no ambiguities and a deep understanding of what good looks like.

**1.1 — Review spec and close open questions**

- *Description*: Read `feature-design-system.md` in full. Identify any remaining ambiguities, missing context, or decisions that need user input before design work begins. Interview the user to resolve them. Do not proceed to Phase 2 until all blockers are resolved.
- *Acceptance criteria*: Every decision area in the design spec has either confirmed inputs or a clear plan for how to derive the answer during research. No ambiguities remain that would block a recommendation.
- *Dependencies*: None

**1.2 — Ground understanding of design system quality**

- *Description*: Before researching reference apps, build a strong internal model of what separates a good design system from a mediocre one. This includes: token naming conventions (semantic vs descriptive), documentation clarity, accessibility requirements (contrast ratios, focus states), how tokens should be structured to support future theming, and common failure modes (too many tokens, too few, wrong abstraction level). Also internalize the pre-decided patterns from this spec: the Linear-style settings/navigation experience, the in-app overlay principle, and the confirmed Linear values.
- *Acceptance criteria*: The session can articulate why specific token decisions are good or bad, not just what Linear does. Confirmed Linear values are internalized and will be referenced directly rather than re-researched.
- *Dependencies*: 1.1

---

### Phase 2: Research

**Goal**: Extract design principles from secondary reference apps to validate and supplement the confirmed Linear data.

**2.1 — Inspect secondary reference apps**

- *Description*: Run Raycast, Things 3, Bear, Arc, and Craft. Use Digital Color Meter to sample key colors (background levels, text colors, accent). Use Accessibility Inspector to measure key element dimensions (sidebar item height, control heights, sidebar width). Focus on areas where these apps cover ground Linear doesn't: Bear and Craft for document reading typography, Arc for window chrome integration, Things 3 and Raycast for sidebar density and compact UI. Ask the user for help if any additional CSS inspection or app access is needed.
- *Acceptance criteria*: For each reference app, at least the following is captured: primary background color, sidebar background, accent color, sidebar item height, and any notable design choices that differ from or complement Linear.
- *Dependencies*: 1.2

**2.2 — Identify cross-app patterns and divergences**

- *Description*: Synthesize the research. Note which of Linear's choices are consistent across all reference apps (strong signal), which are unique to Linear (weaker signal, may reflect Linear's specific brand), and which reference apps make choices that might be better suited to Episteme's use case. Document findings as inputs to Phase 3.
- *Acceptance criteria*: A clear synthesis exists: "these Linear choices are validated by other apps; these are Linear-specific; these alternatives from other apps are worth considering for Episteme."
- *Dependencies*: 2.1

---

### Phase 3: Design decisions — tokens

**Goal**: Produce approved decisions for every token category. Work through one category at a time. For each: present a recommendation with rationale and references, surface tradeoffs, get sign-off before moving on.

**3.1 — Typography**

- *Description*: Present recommendation for: font family (Inter Variable + fallback stack), UI type scale (sizes, weights, line heights for each context), and document content type scale. Reference confirmed Linear values and secondary research. Note the Berkeley Mono question (paid license) and present alternatives.
- *Acceptance criteria*: Font family approved. Complete UI type scale approved with named tokens. Document content type scale approved with named tokens. Berkeley Mono decision resolved.
- *Dependencies*: 2.2

**3.2 — Color tokens**

- *Description*: Present recommendation for: color space (oklch vs hex), semantic token structure (number of bg/text/border levels), complete dark mode palette with specific values, complete light mode palette, and accent color. Reference confirmed Linear hex values and propose oklch equivalents. For accent color: present Linear's `#575ac6` as the starting recommendation with a note that this is a brand decision.
- *Acceptance criteria*: Color space approved. Token structure approved (number of levels, naming convention). Dark mode palette approved. Light mode palette approved. Accent color approved.
- *Dependencies*: 3.1

**3.3 — Spacing and density**

- *Description*: Present recommendation for: named spacing scale (base unit + all named steps), standard control heights, sidebar width, and standard padding values for panels and content areas. Reference confirmed Linear measurements.
- *Acceptance criteria*: Spacing scale approved with named tokens and px values. All control heights approved. Sidebar width approved. Panel and content padding approved.
- *Dependencies*: 3.2

**3.4 — Border radius**

- *Description*: Present recommendation for a named radius scale: which values, which components use which level. Reference confirmed `4px` control radius from Linear and propose the full scale.
- *Acceptance criteria*: Complete radius scale approved with named tokens, px values, and component assignment.
- *Dependencies*: 3.3

**3.5 — Shadow and elevation**

- *Description*: Present recommendation for: elevation levels (how many, what they represent), shadow values for light mode, and the dark mode elevation approach (color contrast vs shadow vs border-via-shadow). Reference confirmed finding that Linear uses no shadow in dark mode menus.
- *Acceptance criteria*: Elevation levels and their names approved. Dark mode elevation approach approved. Light mode shadow values approved.
- *Dependencies*: 3.4

**3.6 — Motion**

- *Description*: Present recommendation for: duration tokens (mapped from confirmed Linear values: `0s`, `0.1s`, `0.15s`, `0.25s`, `0.35s`), easing curves, and a clear rule for which interactions animate vs are instant.
- *Acceptance criteria*: Duration tokens approved with names and values. Easing curves approved. Interaction/instant rule approved.
- *Dependencies*: 3.5

---

### Phase 4: Design decisions — components and shadcn

**Goal**: Produce approved component pattern specs for every component category.

**4.1 — shadcn/Radix strategy**

- *Description*: Present the three options (Radix UI primitives directly / shadcn with full visual override / build from scratch) with honest tradeoffs. Make a recommendation. Resolve this before speccing components, since the answer affects how component patterns are documented.
- *Acceptance criteria*: Strategy approved.
- *Dependencies*: 3.6

**4.2 — Window chrome**

- *Description*: Present the macOS title bar design: height, content layout (traffic lights zone, workspace label, right-side controls), drag region boundaries, and how the sidebar header relates to the title bar area. Reference confirmed Linear header height (`39px`) and the Tauri `titleBarStyle: "Overlay"` mechanism. Also document the Windows strategy at a high level for future reference.
- *Acceptance criteria*: Title bar height and layout approved. Drag region approach approved. Windows strategy noted.
- *Dependencies*: 4.1

**4.3 — Settings and navigation experience**

- *Description*: The pattern is pre-decided (see Design spec section). This task designs the visual specifics: typography and spacing for the settings navigation sidebar, transition behavior when entering/exiting settings mode, and the "Back to app" treatment. Present with references to the Linear implementation.
- *Acceptance criteria*: Settings mode visual design approved. Transition behavior approved. "Back to app" treatment approved.
- *Dependencies*: 4.2

**4.4 — Core components**

- *Description*: Work through each component in turn, presenting a complete spec (visual appearance, all states, dimensions, token references) and getting sign-off before moving to the next. Components: sidebar, toolbar, buttons (all variants), inputs, dialogs/modals, context menus/popovers, badges/tags, frontmatter bar. Use the sign-off principle — if a pattern generalizes (e.g., all hover states use the same token), establish the rule once rather than approving each instance.
- *Acceptance criteria*: Every component in the list has an approved spec with no undocumented values.
- *Dependencies*: 4.3

---

### Phase 5: Write design-system.md

**5.1 — Produce design-system.md**

- *Description*: Write the complete `design-system.md` wiki document incorporating all approved decisions from Phases 3 and 4. Structure: token reference (all categories with named tokens, values, and usage notes), component patterns (one section per component), Tailwind v4 encoding guide (how tokens map to the `@theme {}` block), and a brief section on what follow-on enhancements implement.
- *Acceptance criteria*: `design-system.md` contains every token with a specific value. Every component pattern is fully specified. An engineer can implement any component using only this document.
- *Dependencies*: 4.4

**5.2 — Update app.md**

- *Description*: Simplify the "Design guidance" section in `app.md` to a single redirect: "See `.eng-docs/wiki/design-system.md` for the canonical design system reference."
- *Acceptance criteria*: `app.md` Design guidance section no longer contains design values; it points to `design-system.md`.
- *Dependencies*: 5.1

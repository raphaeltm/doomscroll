# DoomScroll UI Design Review & Recommendations

> **Date:** 2026-03-21
> **Status:** Actionable design spec — ready for implementation
> **Audience:** Any developer/agent implementing these changes

---

## Table of Contents

1. [Current State Assessment](#1-current-state-assessment)
2. [Typography](#2-typography)
3. [Color System](#3-color-system)
4. [Layout & Spacing](#4-layout--spacing)
5. [Visual Effects](#5-visual-effects)
6. [Component Polish](#6-component-polish)
7. [Micro-interactions](#7-micro-interactions)
8. [Information Hierarchy](#8-information-hierarchy)
9. [Reference Examples](#9-reference-examples)
10. [Quick Wins](#10-quick-wins)

---

## 1. Current State Assessment

### What We Have

DoomScroll uses a three-panel layout: **Sidebar** (320px) | **World Map** (flex) | **Timeline** (420px). The aesthetic is "dark command center" built with Tailwind CSS v4 custom theme colors.

**Current tech:**
- Font: Inter (system fallback)
- Colors: 6 custom CSS variables (`doom-red`, `doom-glow`, `doom-dark`, `doom-panel`, `doom-border`, `doom-surface`)
- Map: React-Leaflet with CARTO `dark_nolabels` tiles, severity-colored markers
- Effects: `pulse-glow` animation, `marker-appear` scale animation, custom scrollbar, vignette overlay
- Layout: Flexbox, fixed-width side panels, no responsive breakpoints

### What Works

- **Dark palette foundation** — the near-black backgrounds (`#111119`, `#13131d`, `#0a0a0f`) layer well and avoid pure black harshness
- **Severity color coding** — blue/amber/red/critical ramp is intuitive and well-applied to both map markers and timeline badges
- **Uppercase tracking on labels** — gives tactical/military feel to section headers and metadata
- **Vignette overlay on map** — subtle depth that frames the map content
- **Custom scrollbar** — native scrollbar would break the aesthetic
- **Input focus glow** — red glow on focus is thematic and functional

### What Doesn't Work

- **Inter is too friendly** — it's a great UI font but reads as "SaaS dashboard", not "war room". Lacks the geometric/angular character needed.
- **Single accent color** — everything is doom-red. No color differentiation between data types, interactive states, or information categories. The UI is monochromatic red-on-dark.
- **No typographic hierarchy for data** — timestamps, coordinates, actor names, and narrative text all use the same font. Data elements should feel distinct from prose.
- **Flat panels** — sidebar and timeline panels are flat rectangles with single-pixel borders. No sense of depth, layering, or "hardware panel" feel.
- **No ambient atmosphere** — the map has a vignette but the overall app feels static. A command center should hum with subtle activity even at rest.
- **Timeline is dense but unstructured** — events within a day blur together. No visual rhythm or breathing room.
- **Day selector feels floating** — the bottom pill bar lacks anchoring to the UI. It's a floating element without clear relationship to the timeline.
- **No loading choreography** — simulation generation just shows a spinner. The data streaming phase should feel dramatic.
- **No status bar** — a command center needs persistent system status: simulation state, threat level, active day, event count.

---

## 2. Typography

### Recommended Font Stack

```html
<!-- Add to index.html <head> -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Space+Mono:wght@400;700&family=Orbitron:wght@700;900&display=swap" rel="stylesheet">
```

| Role | Font | Weight | Usage |
|------|------|--------|-------|
| **Display / App Title** | `Orbitron` | 900 (Black) | App name "DOOMSCROLL", section titles. Geometric, futuristic, all-caps. Use sparingly — max 1-2 instances per view. |
| **UI Text / Body** | `Rajdhani` | 400–700 | All body text, labels, buttons, descriptions. Angular and narrow with a tactical feel. 5 weights available. |
| **Data / Monospace** | `Space Mono` | 400, 700 | Timestamps, coordinates, event counts, lat/lng, severity codes, data readouts. Retro-futuristic monospace. |

### CSS Implementation

```css
/* In src/index.css or @theme block */
--font-display: 'Orbitron', sans-serif;
--font-body: 'Rajdhani', sans-serif;
--font-mono: 'Space Mono', monospace;
```

### Size Scale (Desktop)

| Token | Size | Line Height | Usage |
|-------|------|-------------|-------|
| `text-display` | `28px` | `1.1` | App title only |
| `text-heading` | `18px` | `1.3` | Section titles (TIMELINE, SCENARIO) |
| `text-subheading` | `14px` | `1.4` | Day headers, card titles |
| `text-body` | `13px` | `1.6` | Descriptions, summaries |
| `text-label` | `10px` | `1.2` | Metadata labels, timestamps |
| `text-micro` | `9px` | `1.2` | Footer, attribution, tertiary info |

### Letter-Spacing Strategy

| Context | Tracking | CSS |
|---------|----------|-----|
| Display titles | `0.25em` | `letter-spacing: 0.25em` |
| Section headers | `0.15em` | `letter-spacing: 0.15em` |
| Uppercase labels | `0.12em` | `letter-spacing: 0.12em` |
| Body text | `0.02em` | `letter-spacing: 0.02em` |
| Monospace data | `0.05em` | `letter-spacing: 0.05em` |

### Key Rules

- **Never use font-weight below 400** on dark backgrounds — light/thin weights disappear
- Use `font-variant-numeric: tabular-nums` on all data columns (keeps numbers aligned)
- Avoid italics — they're hard to read on dark backgrounds. Use color or weight for emphasis instead
- Rajdhani renders best at **13px+**; below that, fall back to system sans-serif

---

## 3. Color System

### Expanded Palette

#### Backgrounds (dark to light layering)

| Token | Hex | Current | Usage |
|-------|-----|---------|-------|
| `--color-void` | `#08080d` | — | Deepest background (map, behind panels) |
| `--color-doom-dark` | `#111119` | ✓ same | Primary app background |
| `--color-doom-panel` | `#13131d` | ✓ same | Panel backgrounds |
| `--color-doom-surface` | `#1a1a28` | ✓ same | Cards, raised elements |
| `--color-doom-surface-hover` | `#222235` | — | Hover state for surfaces |
| `--color-doom-border` | `#2a2a3d` | ✓ same | Borders, dividers |
| `--color-doom-border-bright` | `#3a3a55` | — | Active/hover borders |

#### Signal Colors (severity ramp)

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-severity-info` | `#3b82f6` | Low severity, informational events |
| `--color-severity-watch` | `#06b6d4` | Monitoring, watch status |
| `--color-severity-elevated` | `#f59e0b` | Medium severity, elevated tension |
| `--color-severity-high` | `#ef4444` | High severity, active conflict |
| `--color-severity-critical` | `#ff2d2d` | Critical, maximum alert |

#### Accent Colors (functional differentiation)

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-doom-red` | `#ff2d2d` | ✓ same — Primary brand, critical alerts, CTA buttons |
| `--color-accent-cyan` | `#00e5ff` | Data highlights, active selection, interactive elements |
| `--color-accent-amber` | `#ffb300` | Warnings, pending states, medium priority |
| `--color-accent-green` | `#00e676` | Success states, confirmed events, "live" indicators |
| `--color-accent-magenta` | `#ff2a6d` | Secondary accent, actor highlights, diplomatic events |

#### Text Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-text-primary` | `#ededed` | Primary text (never pure white) |
| `--color-text-secondary` | `#9ca3af` | Secondary text, descriptions |
| `--color-text-muted` | `#6b7280` | Tertiary text, timestamps |
| `--color-text-dim` | `#4b5563` | De-emphasized, disabled |

#### Data Type Color Coding

Assign consistent colors to different data categories across the entire UI:

| Data Type | Color | Hex |
|-----------|-------|-----|
| Military/Conflict | Red | `#ff2d2d` |
| Diplomatic/Political | Cyan | `#00e5ff` |
| Economic/Trade | Amber | `#ffb300` |
| Humanitarian | Green | `#00e676` |
| Intelligence/Cyber | Magenta | `#ff2a6d` |
| Infrastructure | Blue | `#3b82f6` |

### Usage Rules

- **60-30-10 distribution**: 60% dark backgrounds, 30% surfaces + muted text, 10% accent colors
- **Never pure white text** — use `#ededed` maximum. Pure white causes eye strain on dark backgrounds.
- **Glow colors** = accent color at 25-40% opacity (e.g., `#00e5ff40`)
- **Border colors** = accent color at 15-25% opacity for themed borders
- **Bright accents are reserved for meaning** — don't use cyan or magenta decoratively

---

## 4. Layout & Spacing

### Panel Proportions

```
Current:  [320px] [flex-1] [420px]
Proposed: [300px] [flex-1] [400px]
```

Slightly narrower panels give more map real estate. The 20px savings on each side adds up.

### Spacing System (8px base)

| Token | Value | Usage |
|-------|-------|-------|
| `space-xs` | `4px` | Inline gaps, badge padding |
| `space-sm` | `8px` | Tight component gaps |
| `space-md` | `12px` | Standard padding within cards |
| `space-lg` | `16px` | Section padding |
| `space-xl` | `20px` | Panel padding (current `p-5`) |
| `space-2xl` | `24px` | Major section separators |

### Information Density Strategy

- **Sidebar**: Medium density. Form inputs need breathing room for usability.
- **Timeline**: High density. Events should be compact but scannable. Reduce current `p-5` day padding to `p-4`.
- **Map**: Low density. The map is the hero — let it breathe. Overlays should be minimal.

### Responsive Considerations

For hackathon scope, don't build full responsive. Instead:

1. Set `min-width: 1200px` on the app container to prevent layout collapse
2. Add a single breakpoint at `1440px` where timeline expands to `440px`
3. On screens < 1200px, show a "Best viewed on desktop" message

### Panel Borders

Replace flat `border-r` / `border-l` with gradient borders that fade to transparent:

```css
/* Sidebar right border */
.panel-border-right {
  border-right: 1px solid transparent;
  border-image: linear-gradient(to bottom, transparent, #2a2a3d 15%, #2a2a3d 85%, transparent) 1;
}
```

---

## 5. Visual Effects

### Tier 1: Adds to the Vibe (Implement These)

#### Scanline Overlay (Subtle)

```css
.scanlines::after {
  content: "";
  position: fixed;
  inset: 0;
  background: repeating-linear-gradient(
    to bottom,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.08) 2px,
    rgba(0, 0, 0, 0.08) 4px
  );
  pointer-events: none;
  z-index: 9999;
}
```

**Key: opacity must be ≤ 0.08 per line or it hurts readability.** This is an ambient texture, not a visual feature.

#### Grid Overlay on Map

```css
.map-grid::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(0, 229, 255, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 229, 255, 0.02) 1px, transparent 1px);
  background-size: 60px 60px;
  pointer-events: none;
  z-index: 401;
}
```

#### Panel Header Accent Line

A thin glowing line at the top of each panel:

```css
.panel-header::before {
  content: "";
  position: absolute;
  top: 0;
  left: 10%;
  right: 10%;
  height: 1px;
  background: linear-gradient(90deg, transparent, #ff2d2d60, transparent);
}
```

#### Map Marker Pulse Rings

```css
@keyframes ping-ring {
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(3); opacity: 0; }
}

/* Apply to critical markers via an outer ring element */
.marker-ring {
  animation: ping-ring 2s cubic-bezier(0, 0, 0.2, 1) infinite;
}
```

### Tier 2: Use Sparingly

#### Text Glow (headings only)

```css
.text-glow-red {
  text-shadow: 0 0 10px rgba(255, 45, 45, 0.3), 0 0 40px rgba(255, 45, 45, 0.1);
}

.text-glow-cyan {
  text-shadow: 0 0 10px rgba(0, 229, 255, 0.3), 0 0 40px rgba(0, 229, 255, 0.1);
}
```

#### Gradient Noise Texture

Add a subtle noise texture to panel backgrounds for a "hardware screen" feel:

```css
.noise-bg {
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
}
```

### Tier 3: Gratuitous (Skip These)

- **Chromatic aberration / glitch effects** on text — cool for a landing page, unreadable for a data app
- **Animated gradient backgrounds** — distracting, eats GPU
- **Particle effects** — over-engineered for hackathon, no information value
- **Rotating 3D elements** — we're using Leaflet 2D, mixing 3D elements would feel disconnected
- **Heavy CRT curvature** — warps the UI and makes text hard to read

### Performance Notes

- All overlay effects use `pointer-events: none` and `position: fixed` — no layout impact
- Use `will-change: opacity` on animated elements, but only on elements currently animating
- Respect `@media (prefers-reduced-motion: reduce)` — disable scanlines, pulse rings, and glow animations

---

## 6. Component Polish

### Sidebar

**Current issues:** Flat panel, generic input styling, "Run Simulation" button doesn't feel urgent enough.

**Recommendations:**

```
┌─────────────────────────────┐
│ ▌ DOOMSCROLL               │ ← Orbitron 900, red glow, accent bar left
│   GEOPOLITICAL SIMULATOR    │ ← Rajdhani 400, muted, tracking-widest
├─────────────────────────────┤ ← gradient fade border
│ ◉ SCENARIO                 │ ← section label, cyan dot
│                             │
│ ┌─────────────────────────┐ │
│ │ API Key ●●●●●●          │ │ ← Space Mono for key field
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Scenario prompt...      │ │ ← Rajdhani, doom-surface bg
│ │                         │ │
│ └─────────────────────────┘ │
│                             │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ ← Full-width red button, pulsing glow
│     ▶ RUN SIMULATION       │     when form is valid
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
├─────────────────────────────┤
│ SYS: READY | v0.1          │ ← status footer, Space Mono
└─────────────────────────────┘
```

**Specific changes:**

1. App title: Switch to `font-family: Orbitron; font-weight: 900; font-size: 24px;`
2. Add a 2px left accent bar on the header: `border-left: 2px solid #ff2d2d`
3. Input fields: Use `font-family: 'Space Mono'` for API key field specifically
4. Textarea: Add a subtle inner shadow — `box-shadow: inset 0 2px 4px rgba(0,0,0,0.3)`
5. Run button: Add `animation: pulse-glow 3s ease-in-out infinite` when not disabled
6. Section labels: Add a colored dot before each label (cyan `#00e5ff`)
7. Bottom padding: Change `rounded-lg` to `rounded` (2px) on inputs for sharper military feel

### World Map

**Current issues:** Markers lack differentiation beyond color. Empty state is weak. No grid overlay.

**Recommendations:**

1. **Add grid overlay** (see CSS in Visual Effects section)
2. **Critical markers**: Add animated pulse ring (see `ping-ring` keyframes)
3. **Marker popups**: Add a top accent border matching severity color:
   ```css
   .leaflet-popup-content-wrapper {
     border-top: 2px solid var(--marker-color);
   }
   ```
4. **Empty state**: Replace emoji with a styled HUD crosshair element:
   ```html
   <div class="crosshair">
     <div class="crosshair-h"></div>
     <div class="crosshair-v"></div>
     <div class="crosshair-label">AWAITING SCENARIO INPUT</div>
   </div>
   ```
   Use cyan (`#00e5ff`) with low opacity for the crosshair lines.

5. **Day selector**: Add backdrop blur and a top accent line. Use `Space Mono` for day numbers.
6. **Map attribution**: Tuck it further into the corner, reduce to `8px`

### Timeline

**Current issues:** Dense but unstructured. Day entries blend together. No visual rhythm.

**Recommendations:**

1. **Day headers**: Make the day number larger and use `Orbitron`:
   ```
   DAY 03 ———————— MAR 23, 2026
   ```
   Day number in doom-red, `Orbitron 700`, `24px`. Date in muted gray, `Space Mono`, `10px`.

2. **Event cards**: Add left severity border instead of just a dot:
   ```css
   .event-card {
     border-left: 2px solid var(--severity-color);
     /* Remove top/right/bottom border, use bg-doom-dark only */
   }
   ```

3. **Actor badges**: Color-code by actor type using the data type palette:
   - State actors: cyan border
   - Military: red border
   - Diplomatic: amber border

4. **Video prompt section**: Style as a "classified document" — dashed border, monospace text:
   ```css
   .video-prompt {
     border: 1px dashed #2a2a3d;
     font-family: 'Space Mono';
     background: repeating-linear-gradient(
       0deg, #111119, #111119 2px, #13131d 2px, #13131d 4px
     );
   }
   ```

5. **Scroll indicator**: Add a gradient fade at the top/bottom of the scrollable area:
   ```css
   .timeline-scroll {
     mask-image: linear-gradient(
       to bottom,
       transparent,
       black 20px,
       black calc(100% - 20px),
       transparent
     );
   }
   ```

### Buttons

| State | Background | Border | Shadow | Text |
|-------|-----------|--------|--------|------|
| Default | `#ff2d2d` | `1px solid #ff2d2d50` | `0 0 20px #ff2d2d30` | White, Rajdhani 700 |
| Hover | `#ff4040` | `1px solid #ff2d2d80` | `0 0 40px #ff2d2d40` | White |
| Active | `#cc2424` | `1px solid #ff2d2d` | `0 0 10px #ff2d2d20` | White |
| Disabled | `#1a1a28` | `1px solid #2a2a3d` | none | `#4b5563` |
| Loading | `#ff2d2d` | animated | — | Spinner + "GENERATING..." |

Secondary buttons (video generate, etc.):

| State | Background | Border | Text |
|-------|-----------|--------|------|
| Default | transparent | `1px solid #2a2a3d` | `#9ca3af` |
| Hover | `#1a1a28` | `1px solid #3a3a55` | `#ededed` |
| Active | `#222235` | `1px solid #00e5ff50` | `#00e5ff` |

### Inputs

```css
input, textarea {
  background: #111119;
  border: 1px solid #2a2a3d;
  border-radius: 2px; /* Sharp, not rounded */
  color: #ededed;
  font-family: 'Rajdhani', sans-serif;
  font-size: 13px;
  padding: 10px 12px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

input:focus, textarea:focus {
  border-color: #ff2d2d60;
  box-shadow: 0 0 15px rgba(255, 45, 45, 0.1), inset 0 0 5px rgba(255, 45, 45, 0.05);
  outline: none;
}
```

### Severity Badges

```css
/* Redesign as pill badges with left color bar */
.badge-severity {
  font-family: 'Space Mono';
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 2px 8px 2px 10px;
  border-radius: 2px;
  position: relative;
}

.badge-severity::before {
  content: "";
  position: absolute;
  left: 0;
  top: 2px;
  bottom: 2px;
  width: 2px;
  border-radius: 1px;
  background: var(--severity-color);
}
```

---

## 7. Micro-interactions

### Hover States

| Element | Hover Effect | Duration |
|---------|-------------|----------|
| Event card | `background: #222235; border-color: #3a3a55; transform: translateX(2px)` | `150ms` |
| Day entry | `background: #1a1a2840` | `150ms` |
| Map marker | Scale to `1.3x`, increase glow radius | `200ms` |
| Button (primary) | Increase glow, lighten bg | `150ms` |
| Button (secondary) | Border brightens, text brightens | `150ms` |
| Actor badge | `background: #2a2a3d; color: #ededed` | `100ms` |

### Transitions

```css
/* Standard transition — use on all interactive elements */
.transition-ui {
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* For elements that move (cards sliding, panels opening) */
.transition-move {
  transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1),
              opacity 200ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Loading States

#### Simulation Generation (Most Important)

Replace the simple spinner with a multi-phase loading sequence:

**Phase 1: "INITIALIZING"**
```
[████░░░░░░░░░░░░░░] 12%
PARSING SCENARIO PARAMETERS...
```
- Progress bar with doom-red fill, subtle glow
- Phase text in `Space Mono`, cycling through messages

**Phase 2: "GENERATING TIMELINE"**
```
DAY 01 ✓  DAY 02 ✓  DAY 03 ◉  DAY 04 ○  ...
Generating events for Day 03...
```
- Days appear one by one as they're generated
- Current day pulses, completed days get checkmark

**Phase 3: "POPULATING MAP"**
- Events animate onto the map with the existing `marker-appear` animation
- Stagger each marker by 100ms for a "data streaming in" feel

**Implementation**: Track generation phases in Zustand store. The structured output from Claude can be parsed incrementally — as each day is parsed, update the UI.

#### Video Generation Loading

```css
/* Typing dots animation */
@keyframes typing {
  0%, 60%, 100% { opacity: 0.3; }
  30% { opacity: 1; }
}

.loading-dot:nth-child(1) { animation: typing 1.4s infinite 0s; }
.loading-dot:nth-child(2) { animation: typing 1.4s infinite 0.2s; }
.loading-dot:nth-child(3) { animation: typing 1.4s infinite 0.4s; }
```

### Data Streaming Animations

When events stream in from Claude's response:

```css
@keyframes slide-in-right {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.event-enter {
  animation: slide-in-right 300ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

Apply `animation-delay` in increments of `50ms` for staggered entry.

---

## 8. Information Hierarchy

### Visual Weight Distribution

```
HIGH PRIORITY (Eye-catching, bright, large)
├── Active day events on map (pulsing markers)
├── DOOMSCROLL title (red, glowing)
├── Critical severity badges (red, pulsing)
├── "Run Simulation" button (red, glowing)
│
MEDIUM PRIORITY (Visible, standard contrast)
├── Day headers in timeline (red numbers)
├── Event titles (light gray, semibold)
├── Event descriptions (secondary gray)
├── Day selector buttons
│
LOW PRIORITY (Ambient, muted)
├── Actor badges (muted, small)
├── Timestamps / coordinates (dim, monospace)
├── Panel borders and dividers
├── Footer text
├── Map attribution
└── Scanline / grid overlays
```

### Guiding the Eye

1. **Red = Action/Danger**: The eye naturally goes to the brightest warm color. Reserve doom-red for things that need attention: critical events, the CTA button, the active day.

2. **Cyan = Information/Data**: Use `#00e5ff` as a secondary accent for data elements that are informational but not urgent: selected states, data highlights, section indicators.

3. **Left-to-right flow**: Users scan left→center→right. Sidebar (input) → Map (visualization) → Timeline (detail). This matches the natural workflow: configure → observe → analyze.

4. **Temporal flow in timeline**: Each day entry should read like a declassified briefing. Large day number draws the eye, summary provides context, event cards provide detail. The user should be able to scan just the day numbers and summaries without reading event cards.

5. **Severity as visual urgency**: Critical events should literally pulse and glow. Low severity events should be calm and muted. The visual urgency should match the narrative urgency.

### Contrast Ratios (WCAG targets)

| Element | Foreground | Background | Ratio | Passes |
|---------|-----------|------------|-------|--------|
| Primary text | `#ededed` | `#13131d` | 14.2:1 | AAA |
| Secondary text | `#9ca3af` | `#13131d` | 7.1:1 | AAA |
| Muted text | `#6b7280` | `#13131d` | 4.5:1 | AA |
| Dim text | `#4b5563` | `#13131d` | 3.0:1 | Fails — use only for decorative |
| Doom red on dark | `#ff2d2d` | `#13131d` | 5.5:1 | AA |
| Cyan on dark | `#00e5ff` | `#13131d` | 9.8:1 | AAA |

---

## 9. Reference Examples

### Design Inspirations

| Reference | What to Steal | Link/Description |
|-----------|--------------|------------------|
| **Bloomberg Terminal** | Data density, tab architecture, orange/blue on black palette, concealed complexity | The iconic financial terminal. Panels of dense data with strong color coding. Key insight: show summaries, reveal detail on interaction. |
| **Palantir Gotham** | Map-centric layout, entity relationship visualization, dark military aesthetic | Intelligence platform with dark UI, map as primary view, sidebar entity panels. The gold standard for "war room" data apps. |
| **Arwes Framework** | Sci-fi panel components, animated borders, sound design, HUD aesthetic | Open-source React framework for sci-fi UIs. Use as visual reference, not as dependency. [arwes.dev](https://arwes.dev) |
| **NORAD Command Center** | Layout structure, status displays, amber-on-dark color scheme | Real-world military command center with ambient displays, status boards, and map projection as central element. |
| **DEFCON / WarGames UI** | Typography, grid overlays, blinking status lights, retro terminal feel | Film UIs that defined the "war room" aesthetic. Monospace fonts, green/amber phosphor colors, grid paper overlays. |
| **Eve Online UI** | Nested panels, sci-fi badges, dark transparency layers, bracket-style borders | Game UI that achieves extreme data density while remaining readable. Sharp corners, thin borders, transparency layering. |

### CSS Patterns to Steal

**Corner brackets (Eve Online / sci-fi HUD style):**
```css
.hud-bracket {
  position: relative;
}
.hud-bracket::before,
.hud-bracket::after {
  content: "";
  position: absolute;
  width: 12px;
  height: 12px;
  border-color: #00e5ff30;
  border-style: solid;
}
.hud-bracket::before {
  top: 0; left: 0;
  border-width: 1px 0 0 1px;
}
.hud-bracket::after {
  bottom: 0; right: 0;
  border-width: 0 1px 1px 0;
}
```

**Animated border glow (Arwes-inspired):**
```css
@keyframes border-trace {
  0% { background-position: 0% 0%; }
  100% { background-position: 200% 0%; }
}

.traced-border {
  border: 1px solid #2a2a3d;
  background: linear-gradient(90deg, transparent, #ff2d2d30, transparent);
  background-size: 200% 100%;
  animation: border-trace 3s linear infinite;
}
```

**Data readout styling (Bloomberg-inspired):**
```css
.data-readout {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: #00e5ff;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.data-readout .label {
  color: #6b7280;
  margin-right: 8px;
}
.data-readout .value {
  color: #ededed;
}
```

### Useful Resources

| Resource | URL | Value |
|----------|-----|-------|
| Arwes sci-fi framework | arwes.dev | React components with sci-fi aesthetic — reference implementation |
| CYBERCORE CSS | github.com/sebyx07/cybercore-css | Pure CSS cyberpunk framework — scan lines, glitch, neon effects |
| Dribbble military UI tag | dribbble.com/tags/military-ui | Visual inspiration for military dashboard layouts |
| Carbon Design data viz colors | carbondesignsystem.com/data-visualization/color-palettes | Well-tested sequential and categorical color palettes for dark themes |
| Orbitron font | fonts.google.com/specimen/Orbitron | Display font — geometric, futuristic |
| Rajdhani font | fonts.google.com/specimen/Rajdhani | Body font — angular, tactical |
| Space Mono font | fonts.google.com/specimen/Space+Mono | Data font — retro-futuristic monospace |

---

## 10. Quick Wins

The top 10 changes ranked by **visual impact ÷ implementation effort**. These are designed to be implemented in order — each one builds on the previous.

### 1. Swap Fonts (30 min)
**Impact: ★★★★★ | Effort: ★☆☆☆☆**

Add Google Fonts link to `index.html`. Update `src/index.css`:
```css
body { font-family: 'Rajdhani', sans-serif; }
```
Change app title to `font-family: 'Orbitron'`. Change all data elements (timestamps, coordinates, counts) to `font-family: 'Space Mono'`.

This single change transforms the entire feel from "SaaS" to "command center".

### 2. Add Cyan Accent Color (15 min)
**Impact: ★★★★☆ | Effort: ★☆☆☆☆**

Add `--color-accent-cyan: #00e5ff` to CSS variables. Use it for:
- Section label dots in sidebar
- Active/selected states
- Data highlights in timeline
- "LIVE" status indicator (replace green with cyan)

Breaking the red monochrome immediately adds depth and visual interest.

### 3. Add Scanline Overlay (10 min)
**Impact: ★★★☆☆ | Effort: ★☆☆☆☆**

Add the scanline CSS to `index.css` and apply `className="scanlines"` to the app root. Keep opacity at 0.08 or lower. Instant atmosphere upgrade with zero layout impact.

### 4. Sharpen Border Radius (10 min)
**Impact: ★★★☆☆ | Effort: ★☆☆☆☆**

Global find-and-replace: change `rounded-lg` to `rounded-sm` (2px) on all inputs, cards, and buttons. Military/command interfaces have sharp corners, not soft ones. Keep `rounded-full` on status dots and badges.

### 5. Left Severity Border on Event Cards (20 min)
**Impact: ★★★★☆ | Effort: ★★☆☆☆**

Replace the tiny severity dot with a 2px left border in the severity color. Makes event cards instantly scannable and adds the "dossier" feel.

```tsx
<div className="border-l-2" style={{ borderColor: severityColor }}>
```

### 6. Gradient Panel Borders (15 min)
**Impact: ★★★☆☆ | Effort: ★☆☆☆☆**

Replace flat `border-r border-doom-border` on sidebar and `border-l border-doom-border` on timeline with gradient borders that fade to transparent at top and bottom. Adds elegance without complexity.

### 7. Panel Header Accent Lines (15 min)
**Impact: ★★★☆☆ | Effort: ★☆☆☆☆**

Add a thin gradient line at the top of sidebar and timeline panels. `linear-gradient(90deg, transparent, #ff2d2d40, transparent)`, height 1px. Subtle framing that defines each panel.

### 8. Space Mono for Data Elements (20 min)
**Impact: ★★★☆☆ | Effort: ★★☆☆☆**

Apply `Space Mono` to: day numbers, event counts, severity badges, coordinates in popups, timestamps, the footer. Data elements should look like data readouts, not like paragraph text.

### 9. Event Card Hover Animation (15 min)
**Impact: ★★☆☆☆ | Effort: ★☆☆☆☆**

Add `transform: translateX(2px)` on hover to event cards in the timeline. Small but satisfying — makes the UI feel responsive and alive.

### 10. Map Grid Overlay (10 min)
**Impact: ★★★☆☆ | Effort: ★☆☆☆☆**

Add the CSS grid overlay to the map container. Cyan lines at 0.02 opacity with 60px spacing. Adds the "tactical display" feel without obscuring map content.

---

## Implementation Priority

For a hackathon sprint, implement Quick Wins 1–5 first (total ~1.5 hours). These transform the app from "dark React app" to "command center". Quick Wins 6–10 are polish that can be done if time allows.

The full design system (sections 2–4) is the reference spec for a more thorough implementation pass. The visual effects (section 5) and micro-interactions (section 7) are the "wow factor" layer — implement after the foundation is solid.

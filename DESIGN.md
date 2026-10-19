---
name: Winston Kan — Oxide Color Chart
description: A portfolio built as a thermal-oxide color chart; every color is the computed interference color of SiO₂ on silicon at a labeled thickness.
colors:
  bare-silicon: "#d8d8ed"
  film-125-royal-blue: "#78a1e0"
  film-225-gold: "#dec193"
  film-310-blue: "#54a2ee"
  film-426-carnation-pink: "#eca2d0"
  film-476-violet: "#ac8fe4"
  film-600-carnation-pink: "#dfb1db"
  ink: "#17141f"
  ink-soft: "rgba(23, 20, 31, .84)"
  ink-faint: "rgba(23, 20, 31, .38)"
  rule: "rgba(23, 20, 31, .22)"
  plot-surface: "#fbfbfd"
  error-ink: "#8b1d2c"
  film-465-plasma: "#c585e8"
  film-void: "#ecebf5"
  series-copper: "#2a78d6"
  series-ruthenium: "#eb6834"
  series-cobalt: "#1baf7a"
  series-molybdenum: "#eda100"
  series-tungsten: "#e87ba4"
  series-aluminum: "#008300"
typography:
  display:
    fontFamily: "Big Shoulders Display, Arial Narrow, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(2.6rem, 12vmin, 6rem)"
    fontWeight: 900
    lineHeight: 0.86
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Big Shoulders Display, Arial Narrow, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(38px, 5.4vw, 64px)"
    fontWeight: 800
    lineHeight: 0.92
  swatch-figure:
    fontFamily: "Big Shoulders Display, Arial Narrow, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(44px, 6vw, 72px)"
    fontWeight: 800
    lineHeight: 0.9
    fontFeature: "tnum"
  body:
    fontFamily: "Schibsted Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Schibsted Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.4
  ui-small:
    fontFamily: "Schibsted Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.4
  ui:
    fontFamily: "Schibsted Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  ui-strong:
    fontFamily: "Schibsted Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.5
  button:
    fontFamily: "Schibsted Grotesk, Helvetica Neue, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.2
  swatch-unit:
    fontFamily: "Big Shoulders Display, Arial Narrow, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(18px, 2.5vw, 30px)"
    fontWeight: 700
    lineHeight: 1
rounded:
  sm: "2px"
  md: "3px"
  lg: "4px"
spacing:
  gutter: "max(16px, env(safe-area-inset-left, 0px))"
  band-block: "clamp(40px, 7vw, 88px)"
  column-gap: "clamp(20px, 4vw, 56px)"
components:
  button-open:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.bare-silicon}"
    rounded: "{rounded.md}"
    padding: "13px 20px"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "9px 14px"
  band-225:
    backgroundColor: "{colors.film-225-gold}"
    textColor: "{colors.ink}"
  plot-card:
    backgroundColor: "{colors.plot-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "14px"
---

# Design System: Winston Kan — Oxide Color Chart

## Overview

**Creative North Star: "The Oxide Color Chart."** Fabs estimate silicon dioxide thickness by eye from a printed chart of interference colors. This site is that chart. Each section is a full-width band painted with the color a real SiO₂ film on silicon shows at the thickness printed beside it, and the bands get thicker as you scroll. The colors are computed from physics in `filmcolor.js`, never picked by eye.

The opening is the one object: a silicon wafer with its flat, carrying the name. A chart strip from 0 to 600 nm under it is the control; dragging it regrows the oxide and recolors the wafer. Every page is a single, committed light world, because film colors are physical and do not have a dark mode.

Anti-references: the dark tech portfolio with one neon accent; the white résumé template; colors chosen for mood rather than computed.

## Colors

All film colors come from `FilmColor.hex(thickness)` and are named by thickness and by the Rogue Valley Microdevices thermal oxide chart.

### Primary
- **Film colors** (`film-<nm>-<name>`): full-bleed band grounds. A band's color is always the computed color for the thickness its swatch label shows. Thickness increases down the page.

### Neutral
- **Bare Silicon** (#d8d8ed): the 0 nm ground. Page background, the opening, tool pages.
- **Ink** (#17141f): all text, rules, and controls on every band. Every film band in use is light enough for dark ink.
- **Ink Soft** (ink at 84%): secondary text. Mixes with the band hue instead of going gray.
- **Rule** (ink at 22%): hairlines between bands and in fact lists.
- **Plot Surface** (#fbfbfd): the near-white ground under charts on tool pages.

### Data series (tool pages only)
- **Error Ink** (#8b1d2c): error messages in tool forms only.
- **Plasma** (#c585e8, the 465 nm red-violet film color): the argon plasma glow in the chamber diagram. **Heater glow** uses the 225 nm gold. Both stay computed film colors.
- **Film Void** (#ecebf5): empty space in simulated film cross-sections; atoms are drawn in ink and a lighter ink (#5a5470) to band growth layers.
- **Chart strip gradient:** the 0–600 nm strip uses 121 computed stops (every 5 nm) from `filmcolor.js`. They are data, not tokens, and are never reused as UI colors.
- Copper #2a78d6, Ruthenium #eb6834, Cobalt #1baf7a, Molybdenum #eda100, Tungsten #e87ba4, Aluminum #008300. A validated categorical order; each metal keeps its color whatever is toggled. Three sit under 3:1 on the plot surface, so every chart ships with a value table.

### Named Rules
**The Computed Color Rule.** Never pick a band color by hand. Choose a thickness, compute its color with `filmcolor.js`, and label the band with that thickness and the chart's color name.

**The Rising Thickness Rule.** Bands appear in increasing thickness down the page, like the printed chart. The chart repeats colors in higher orders; a repeated name is labeled as such.

**The Agreeing Name Rule.** Only use a thickness where the computed color visibly matches the chart's color name.

**The Ink Rule.** Text on bands is always ink; check contrast (≥4.5:1 body) for any new thickness before using it, since dark films near 75–110 nm get close to the limit.

## Typography

**Display:** Big Shoulders Display. **Body and labels:** Schibsted Grotesk. Two faces only, self-hosted from `fonts/` (OFL), Latin subset.

### Hierarchy
- **Display** (900, clamp(2.6rem, 12vmin, 6rem), 0.86, uppercase): the name on the wafer and tool page titles.
- **Headline** (800, clamp(38px, 5.4vw, 64px), 0.92, uppercase): project and section titles.
- **Swatch figure** (800, clamp(44px, 6vw, 72px), tabular figures): the thickness number in each band's swatch label, with "nm" set smaller.
- **Body** (400, 17px, 1.6): running text, max 62ch.
- **Label** (600, 13–15px): fact-list terms, control labels, the chart's color name.

### Named Rules
**The Measured Numbers Rule.** Every thickness, resistivity, and angle uses tabular figures.

**No Eyebrows Rule.** Headings stand alone; no small label above a heading.

## Layout

- Full-bleed bands; side gutter `max(16px, env(safe-area-inset-*))`; band padding `clamp(40px, 7vw, 88px)`.
- Each band is a two-column grid: a swatch-label column (130–200px) and the work. Under 760px the swatch label moves above the work as a single row.
- Project bands put text and a live preview side by side above 1000px and stack below.
- The opening is centered on the wafer, never a split hero.

## Elevation & Depth

Flat. Depth comes from color changes between bands and hairline rules. The only shadow is the tooltip on tool charts (`0 6px 18px rgba(23,20,31,.25)`). The wafer has one subtle diagonal sheen, a polished-surface reflection.

## Shapes

Near-square: 2–4px radii. The wafer is the one round form, always drawn with its flat at the bottom.

## Components

### Buttons
- **Open (primary):** ink fill, bare-silicon text, 3px radius, 13px 20px, trailing arrow icon (inline SVG). Hover nudges right 4px with an exponential ease-out.
- **Quiet:** transparent with a rule-colored border, ink text.

### Swatch Label (signature)
Thickness in the swatch-figure style with a smaller "nm", the chart color name below in label weight, and "SiO₂ on Si" in ink soft.

### Chart Strip (signature)
A 54px strip with a gradient of computed colors from 0 to 600 nm (stops every 5 nm), ticks every 100 nm, and an ink marker with a diamond tab. A native range input sits over it for keyboard and screen-reader access.

### Fact List
Definition list with rule lines: term in label weight, value in ink soft.

### Live Preview
A canvas drawn in ink on the band's film color, with a short caption starting "Live:".

### Plot Card (tool pages)
Plot surface, rule border, 4px radius. 2.25px series lines, 5px markers with a surface ring at the selected thickness, dashed ink crosshair, ink tooltip.

## Do's and Don'ts

### Do:
- **Do** compute any new band color from a thickness with `filmcolor.js` and label it.
- **Do** keep bands in rising thickness order.
- **Do** draw previews and diagrams in ink so they sit on any film color.
- **Do** give every chart a value table.

### Don't:
- **Don't** pick colors by eye or add a dark theme.
- **Don't** put a label above a heading.
- **Don't** use thicknesses whose computed color fails ink contrast.
- **Don't** wrap content in rounded, shadowed cards on the bands.

---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: ["visualizer.html","glad.html","resistivity.html"]
---

# Surface brief: portfolio home (index.html)

Scope: the portfolio home page. Visitor mode: Experience (the work leads). Related tool pages (visualizer.html, glad.html, resistivity.html) inherit this world in an Operate register.

Audience: fab recruiters/engineers skimming quickly; classmates who may use the simulations. Job: leave remembering who Winston is and his direction. Proof: three working simulations with checked results. Constraints: static HTML on GitHub Pages; phone width; no invented claims; no contact details yet.

## Direction contract

THESIS: The page is a thermal-oxide color chart: every color is the physically computed interference color of SiO₂ on silicon at a labeled thickness. Refuses the dark-mode tech portfolio and the white résumé template.

OWN-WORLD: Full-bleed bands of computed film color, ordered by increasing thickness down the page, each carrying its thickness in nm and chart color name in a swatch-label column. Bare-silicon lavender-gray ground at 0 nm. Ink chosen per band by contrast. Tall condensed display type for names and section titles (Big Shoulders Display), a workhorse grotesk for reading (Schibsted Grotesk) with tabular figures for every nm and number. Wafer circle with a flat as the one object.

STORY: A visitor sees a silicon wafer whose film color changes as they drag thickness, understands this person builds working physics, scrolls down the chart through three simulation projects (each a band with a live preview), then experience, then the close.

FIRST VIEWPORT: Top row: name mark left, two links right. Center: a large wafer (≈70vmin) carrying "Winston Kan" in huge condensed type and the one-line statement. Bottom edge: the full color chart strip 0–600 nm as a draggable scale with ticks every 100 nm and a marker; label reads thickness and chart color name live. Primary action: the strip (drag), then "See the projects" link down.

FORM: Thin-film color chart, candidate 1 of 7 (Impeccable's pick, chosen by the user over assigned candidate 4). seed:2b732ac5139ac4b8

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

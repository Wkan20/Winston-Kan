# Thin-Wire Resistivity — notes

Why copper wiring gets worse as chips shrink, and how the explorer models it.

## The problem in one paragraph

Every chip has kilometers of tiny copper wires connecting its transistors. As chips shrink, the wires get thinner. Once a wire or film is only a few tens of nanometers across, it conducts much worse than bulk copper: its resistivity can be several times higher. Higher resistance means slower signals and more wasted power, so the industry is looking at other metals (ruthenium, cobalt, molybdenum) for the smallest wires.

## Three ideas

**Mean free path (λ).** In bulk metal, an electron travels an average distance λ between collisions with vibrating atoms. Those collisions set the bulk resistivity ρ₀. Copper: ρ₀ = 1.68 μΩ·cm, λ ≈ 40 nm.

**Surface scattering (Fuchs–Sondheimer).** When a film isn't much thicker than λ, electrons keep hitting its top and bottom surfaces. The specularity p says what happens there: p = 1 means a mirror-smooth surface that bounces electrons back without adding resistance; p = 0 means a rough surface that scatters them randomly and adds the most resistance.

**Grain-boundary scattering (Mayadas–Shatzkes).** Sputtered films are made of many small crystals (grains). Each boundary reflects a fraction R of the electrons that hit it. Thinner films usually have smaller grains, so more boundaries, so more resistance.

## Why copper loses

Both effects scale with λ divided by the film thickness. Copper has the lowest ρ₀ but the longest λ, so it suffers the most as films get thin. A metal with a higher ρ₀ but a much shorter λ, like ruthenium (λ ≈ 6 nm), barely notices the thinning. Below some thickness, the curves cross.

A handy figure of merit is the product ρ₀ × λ: the lower it is, the better a metal does in very thin wires.

| Metal | ρ₀ (μΩ·cm) | λ (nm) | ρ₀λ (10⁻¹⁶ Ω·m²) |
|---|---|---|---|
| Copper | 1.68 | 39.9 | 6.7 |
| Ruthenium | 7.8 | 5.7 | 4.5 |
| Aluminum | 2.65 | 18.9 | 5.0 |
| Molybdenum | 5.34 | 11.2 | 6.0 |
| Cobalt | 6.2 | 9.8 | 6.1 |
| Tungsten | 5.28 | 15.5 | 8.2 |

Source: D. Gall, "Electron mean free path in elemental metals," J. Appl. Phys. 119, 085101 (2016). Co and Ru are hexagonal, so λ depends on direction; the table uses the average of the two values. The Mo value comes from that paper's ρ₀λ.

## The equations

Surface scattering, with κ = d/λ:

ρ₀/ρ_FS = 1 − (3(1−p) / 2κ) ∫₁^∞ (1/t³ − 1/t⁵) (1 − e^(−κt)) / (1 − p e^(−κt)) dt

Grain boundaries, with grain size D and α = (λ/D)·R/(1−R):

ρ₀/ρ_MS = 3 [1/3 − α/2 + α² − α³ ln(1 + 1/α)]

Combined (a common simplification): ρ = ρ_FS + ρ_MS − ρ₀

## What I checked

- For thick films, the surface-scattering result matches the textbook approximation ρ/ρ₀ ≈ 1 + 3λ(1−p)/(8d) to within 0.2% at 400 nm.
- p = 1 gives no surface penalty, and R = 0 gives no grain-boundary penalty, as they should.
- Fitting synthetic data made with p = 0.2, R = 0.3 recovers exactly p = 0.2, R = 0.3.
- With diffuse surfaces and R = 0.4, ruthenium beats copper below about 4 nm and aluminum below about 23 nm.

## What the model leaves out

- Real chip wires are narrow in two directions (width and height), which makes the size effect stronger than in a flat film.
- Wires have liner and barrier layers that take up space and carry little current.
- Adding the two effects is an approximation; the full combined theory is more complex.
- p and R trade off against each other, so a fit gives a matching pair, not unique values.

So the explorer shows **trends and crossovers**, not exact predictions for a specific process.

## How to use it in the lab

Grow the same metal at several thicknesses, measure each with a four-point probe, and paste the results (thickness in nm, resistivity in μΩ·cm) into "Compare your own measurements." The fit tells you which p and R describe your films.

## How the code is organized

- `resistivity.js`: the model. `fsRatio()` and `msRatio()` are the two scattering effects, `resistivity()` combines them, `crossover()` finds where two metals cross, and `fit()` searches p and R to match measured points.
- `resistivity.html`: the chart, controls, value table, and the paste-your-data panel.

# GLAD Film Simulator — notes

How the simulator works and what it shows, written so I can explain it.

## The question it answers

How does the way atoms arrive at a substrate decide the structure of the film? In particular, why does tilting the substrate far over (glancing-angle deposition, GLAD) turn a solid film into separate columns?

## The model in three rules

The simulation is a side view of a film on a grid. Each atom:

1. **Flies** in a straight line at the deposition angle (0° = straight down, 85° = almost sideways).
2. **Sticks** at the first empty spot that touches the substrate or another atom.
3. **Hops** (only if the substrate is hot) up to N times toward neighboring spots where it touches more atoms. More neighbors means more bonds, which means lower energy.

Nothing about columns is programmed in. They come out of the rules.

## Why columns form: shadowing

At a steep angle, every bump on the surface blocks atoms headed for the area behind it. The bump catches those atoms and grows taller, which makes its shadow longer, so it catches even more. Spots in the shadow get nothing. After a few thousand atoms, the film is separate tilted columns with empty space between them.

At 0°, nothing casts a shadow, so the film grows as a solid layer. Its density is still only about 48% in a cold model, because atoms stick where they first touch and leave small gaps.

## What the controls change

| Setting | What it does to the atoms | What happens to the film |
|---|---|---|
| Deposition angle | Tilts their flight path | Steeper angle → stronger shadowing → lower density, tilted columns |
| Substrate temperature | Lets them hop after landing | Fills small gaps; denser film. At steep angles, shadowing still wins |
| Continuous rotation | Flux arrives from every direction in turn | Columns stop leaning and grow straight up as posts |
| Flip back and forth | Flux switches sides every N monolayers | Columns change lean each time → zigzags |

## What I checked

| Deposition angle | Density (model) | Column tilt (model) | Tait's rule |
|---|---|---|---|
| 0° | 48% | no columns | 0° |
| 45° | 33% | about 26° | 37° |
| 70° | 20% | about 38° | 51° |
| 85° | 6% | about 50° | 58° |

- Density falls steadily as the angle rises, which is the defining behavior of GLAD.
- Columns lean toward the incoming flux and lean more at steeper angles. The model's tilt sits under **Tait's rule**, a geometric estimate from the GLAD literature: β = α − arcsin[(1 − cos α) / 2]. Simple grid models like this one usually come in under it.
- Rotation produces vertical posts, and flipping produces zigzags, matching what real GLAD films do.

## What the model leaves out

- It's 2D. Real films are 3D, so real densities are higher and shadows are shaped differently.
- Every atom is identical, with no material-specific chemistry or crystal structure.
- No ion bombardment, no gas-phase scattering (sputtered atoms can bounce off argon on the way), no stress.
- "Temperature" is just a hop count, not real kelvin.

So it predicts **trends and shapes**, not exact sizes. The next step to make it useful in a lab would be to compare its output against real SEM cross-sections and tune the hop count and angle until they match.

## How the code is organized

- `glad.js` — the model: `createSim()` builds the grid, `fly()` and `hop()` are the rules, `density()` and `columnTilt()` measure the film.
- `glad.html` — the page: draws the grid, runs a few hundred atoms per frame, and wires up the controls.

`columnTilt()` works by comparing each row of the film with the row 10 atoms above it and finding the sideways shift where they match best. Tilt = arctan(shift ÷ 10).

## Ideas for next steps

- Show a 3D version, or at least a top-down view of column spacing
- Add sputtered atoms scattering off argon gas, so the arrival angle spreads out
- Plot density vs. angle automatically by running every angle in the background
- Compare against SEM images from the lab

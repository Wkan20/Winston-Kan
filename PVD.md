# Sputter Chamber Simulator — notes

How each knob on a magnetron sputtering system changes the film, and how the simulator models it. Written so I can explain it.

## The page

1. **A tour of the machine:** a 3D model (three.js, built from simple shapes in `tour.js`) with eleven slides: the chamber, pumps, load lock, argon inlet, magnetron guns, plasma, shutters, sample holder and heater, thickness monitor, and how they work together.
2. **The simulator:** two guns, a layer recipe (bottom to top), and settings for gas, position, spinning, and sample temperature. Only one gun runs at a time; the other sits behind its shutter.

## The system in one paragraph

A sputter chamber is pumped down to high vacuum, then filled with a little argon (a few mTorr). A voltage on the target lights an argon plasma right in front of it, held there by magnets (the "magnetron"). Argon ions slam into the target and knock metal atoms off. Those atoms fly across the chamber, land on the substrate, and build up the film.

## The knobs

| Knob | What it changes physically | What happens to the film |
|---|---|---|
| **Argon pressure** | How often sputtered atoms hit argon on the way (mean free path) | Low pressure: atoms arrive fast and straight, film is denser. High pressure: atoms arrive slow and from random directions, film is more porous. |
| **Two guns and layers** | Each gun holds a different metal; switching guns grows one metal on top of another | A thin titanium layer under copper helps it stick; alternating thin layers makes a multilayer stack. |
| **Power** | How many ions hit the target per second | Faster deposition. Slightly less time for each atom to settle before it's buried. |
| **Target material** | How many atoms each ion knocks off (sputter yield), and the melting point | Copper sputters fast; tungsten and titanium slowly. High-melting-point metals give porous films at room temperature. |
| **Distance** | How far atoms travel | Longer distance spreads atoms out (slower rate) and adds collisions. |
| **Substrate tilt** | The angle atoms arrive at | Steep angles cause shadowing: tilted columns (GLAD). |
| **Rotation** | Changes the arrival direction during growth | Continuous rotation straightens columns into posts; flipping makes zigzags. |
| **Substrate temperature** | How far landed atoms can wander | Hotter substrate fills gaps: denser films and bigger grains. |

## The physics in the model

**Mean free path.** From kinetic theory, the average distance between collisions is

λ = kT / (√2 · π · d² · p)

with d ≈ 0.35 nm as the collision diameter for a metal atom hitting argon. At 3 mTorr that's about 1.9 cm, so over a 10 cm throw an atom hits argon about 5 times.

**Straight-line arrivals.** One collision with a light argon atom doesn't fully redirect a heavy metal atom; it takes several. The model counts an atom as still "directional" if it has fewer than 4 collisions, using Poisson statistics with mean L/λ. At 1 mTorr that's 90% of atoms; at 3 mTorr, 23%; at 10 mTorr, almost none.

**Deposition rate.** Proportional to power and sputter yield, falling as 1/L² with distance, reduced when gas scattering sends atoms to the chamber walls, and reduced by cos(tilt) on a tilted substrate. The absolute numbers are rough estimates for a small lab gun.

**Surface diffusion.** What matters is the homologous temperature: substrate temperature divided by the metal's melting point (both in kelvin). Copper at room temperature is at 0.22; tungsten is at 0.08. In the simulation, each landed atom searches a short distance along the surface and settles in the spot with the most neighbors. The search distance grows with homologous temperature, and atoms that arrived in a straight line (with more energy) get a bit extra.

**Structure zones (Thornton, 1974).** A classic map of film structure versus homologous temperature and argon pressure:
- **Zone 1:** thin tapered columns with gaps. Atoms stick where they land.
- **Zone T:** densely packed fibrous grains. Energetic arrivals fill the gaps.
- **Zone 2:** dense columnar grains running through the film. Surface diffusion dominates.
- **Zone 3:** large equiaxed grains. Atoms move through the bulk.

The zone boundaries move to higher temperature at higher pressure. The simulator's boundaries are approximate.

**Sputter yields** (atoms per 600 eV Ar⁺ ion, Angstrom Sciences table): Cu 2.3, Ru 1.3, Al 1.2, Mo 0.9, Ti 0.6, W 0.6.

## What I checked

| Settings | Film density |
|---|---|
| Copper, 3 mTorr, 25 °C | 58% |
| Copper, 1 mTorr, 25 °C | 83% |
| Copper, 3 mTorr, 100 / 200 °C | 87% / 99% |
| Tungsten, 3 mTorr, 25 °C | 40% |
| Aluminum, 3 mTorr, 25 °C | 98% |
| Copper, 85° tilt, 1 mTorr | 38% (tilted columns) |
| Copper, 85° tilt, 10 mTorr | 59% (gas scrambles the angle, shadowing weakens) |

Every trend points the way Thornton's model and real GLAD experiments say it should.

## What the model leaves out

- The film is a 2D slice, so absolute densities aren't realistic; compare settings against each other.
- Each "atom" is identical: no crystal structure, no chemistry, no reactive gases (like N₂ for TiN).
- No ion bombardment of the growing film, no substrate bias, no film stress.
- The plasma itself isn't modeled; power only sets the rate.
- Rates are estimates, not a calibration for any particular system.

## Questions to take to the lab

- What pressure and power do we usually sputter at, and why those values?
- How does the lab measure deposition rate (quartz crystal monitor, profilometer, XRR)?
- When do we heat the substrate, and how hot?
- For GLAD growth, what pressure do we use, and how fast does the substrate rotate?

## How the code is organized

- `pvd.js`: the chamber physics. `meanFreePathCm()`, `ballisticFraction()`, `rateNmPerMin()`, `homologous()`, `mobilityFor()`, `zone()`, and `atomSource()`, which tells the growth engine each atom's arrival angle and how far it can wander.
- `glad.js`: the growth engine. Atoms fly, stick on contact, then diffuse along the surface.
- `pvd.html`: the animated chamber, the growing film, the controls, the live explanation, and the structure zone map.

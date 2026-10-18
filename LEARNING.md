# Learning notes

What this project taught me, and how the code works. Written so I can explain it in an interview.

## 1. Miller indices in one paragraph

A crystal is a repeating box (the unit cell) defined by edge vectors **a**, **b**, **c**. A plane with Miller indices `(h k l)` cuts those axes at `1/h`, `1/k`, `1/l` (in units of each edge). A zero means the plane never hits that axis (intercept ∞), so it runs parallel to it. A negative index is written with a bar on top: `(1̄00)`.

Examples in a cube:
- `(100)` hits **a** at 1, never hits **b** or **c** → a cube face
- `(110)` hits **a** and **b** at 1 → a diagonal slice through the cube
- `(111)` hits all three at 1 → a triangle across the corner

## 2. Why hexagonal crystals get four indices

Sapphire (Al₂O₃), GaN, and ZnO are hexagonal. Their base has three equivalent directions at 120°: **a₁**, **a₂**, **a₃**, plus **c** pointing up. Three-index notation hides that symmetry: two planes that are physically identical can get indices that look unrelated.

Miller–Bravais notation adds a fourth index `i` so the symmetry shows:

```
(h k i l)   with   i = −(h + k)
```

So `i` is never free. You only need `h`, `k`, `l`; the viewer fills in `i`.

The four sapphire cuts that matter for thin films:

| Name | Indices | What it is |
|---|---|---|
| C-plane | (0001) | Flat basal plane, normal to the c-axis |
| A-plane | (11-20) | Vertical prism plane, contains the c-axis |
| M-plane | (10-10) | The other vertical prism plane |
| R-plane | (1-102) | Tilted 57.6° from C |

## 3. The one equation the code is built on

Every plane in the family `(h k l)` satisfies

```
G · r = n        n = …, −1, 0, 1, 2, …
```

where **r** is a position and **G** is the *reciprocal-lattice vector*:

```
G = h·b₁ + k·b₂ + l·b₃
b₁ = (a₂ × a₃) / V,   b₂ = (a₃ × a₁) / V,   b₃ = (a₁ × a₂) / V,   V = a₁ · (a₂ × a₃)
```

Two facts fall out of this for free:
- **G is perpendicular to the planes**, so the angle between two planes is just the angle between their G vectors.
- **|G| = 1/d**, where d is the spacing between neighboring planes. That d is what X-ray diffraction measures through Bragg's law, `λ = 2d sin θ`.

For a cube this simplifies to the textbook formula `d = a / √(h² + k² + l²)`.

## 4. How the code draws a plane

In `lattice.js`:

1. **`makeLattice`** builds the cell: edge vectors, corner points, the list of edges, and the reciprocal vectors.
2. **`planeFamily`** finds every integer `n` where the plane `G·r = n` passes through the cell. For each one it:
   - walks every edge of the cell and finds where the plane crosses it (`t = (n − G·P) / (G·Q − G·P)`, keep it if `0 ≤ t ≤ 1`);
   - collects those crossing points (a flat plane through a convex box always makes a convex polygon whose corners lie on edges);
   - sorts the points by angle around their center so they draw as a clean polygon.
3. **`render`** rotates every 3D point by the current view angles, flattens it to 2D (orthographic projection), and paints far polygons before near ones so overlaps look right.
4. **`attachViewer`** turns mouse or touch drags into rotation.

## 5. What I'd say about it in an interview

"In my lab we grow on C- and R-plane sapphire, and I wanted to actually see the difference. I built a viewer from the reciprocal-lattice definition of a plane, which gives the normal and the d-spacing directly, then clipped each plane against the unit cell to draw it. I checked it against known values, like the R-plane spacing of 3.48 Å and its 57.6° tilt from C, before trusting it."

## Questions to ask in the lab

- Why does the lab use R-plane sapphire for some growths and C-plane for others?
- What orientation relationship does our film take on each substrate?
- When we anneal an amorphous film, what decides whether it crystallizes with a preferred orientation?
- Why does the heater need to ramp slowly? (Thermal shock to the substrate? Outgassing? Stress on the heater and shield?)

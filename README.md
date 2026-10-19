# Winston Kan — Portfolio + Substrate Plane Viewer

My portfolio site, plus the main project on it: an interactive viewer for crystal planes in thin-film substrates.

- **`index.html`** — the portfolio page
- **`visualizer.html`** — the Substrate Plane Viewer
- **`lattice.js`** — the crystallography and 3D drawing code both pages share
- **`LEARNING.md`** — notes on the concepts and how the code works

## The Substrate Plane Viewer

Every chip starts on a wafer cut along a specific crystal plane: silicon (100) for most CMOS, C-plane sapphire for GaN LEDs. This tool shows what those cuts look like inside the crystal.

- Pick a material: sapphire, GaN, ZnO (hexagonal) or Si, MgO, SrTiO₃ (cubic), or type your own lattice constants
- Enter Miller indices `(h k l)`, or Miller–Bravais `(h k i l)` for hexagonal crystals, where `i = −(h + k)` fills in automatically
- Drag to rotate the unit cell and see the plane (and its whole family of parallel planes) cut through it
- Read the interplanar spacing `d` and the angle between two planes

### Checked against reference values

| Plane | Computed | Reference |
|---|---|---|
| Sapphire R-plane (1-102), d | 3.480 Å | 3.479 Å |
| Sapphire A-plane (11-20), d | 2.379 Å | 2.379 Å |
| Angle R-plane to C-plane | 57.60° | 57.6° |
| Si (111), d | 3.136 Å | 3.136 Å |
| Angle Si (100) to (111) | 54.74° | 54.74° |

## Run it

No build step. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Put it online with GitHub Pages

1. Push this repo to GitHub.
2. In the repo, go to **Settings → Pages**.
3. Under **Source**, pick **Deploy from a branch**, branch `main`, folder `/ (root)`.
4. After a minute the site is live at `https://<your-username>.github.io/<repo-name>/`.

Tip: if you name the repo `<your-username>.github.io`, the site lives at `https://<your-username>.github.io/` directly.

## Ideas for what to add next

- Draw atom positions on each plane, not just the plane outline
- A lattice-mismatch calculator for a film on a substrate
- Plot predicted XRD peak positions (2θ) from the d-spacings, using Bragg's law
- Add YBCO (orthorhombic) once the superconductor project is running

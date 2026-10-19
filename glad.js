/*
 * glad.js — a 2D atom-by-atom model of thin-film growth by PVD,
 * including glancing-angle deposition (GLAD).
 *
 * The world is a grid seen from the side. Row 0 sits on the substrate.
 * Every cell is either empty or holds one atom.
 *
 * Each atom does three things:
 *   1. FLY:   it starts above the film and travels in a straight line,
 *             tilted by the deposition angle (0° = straight down).
 *   2. STICK: it stops at the first empty spot that touches the substrate
 *             or another atom. Anything in its path blocks it, so tall
 *             features cast "shadows" that the next atoms can't reach.
 *   3. HOP:   if the substrate is hot (mobility > 0), it can hop to a
 *             neighboring spot where it has more neighbors. That's how
 *             heat fills in gaps and makes denser films.
 *
 * That's the whole model. Everything you see on screen comes from
 * repeating those three steps tens of thousands of times.
 */
(function (root) {
  // Small seeded random number generator, so the same seed gives the same film
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const DEG = Math.PI / 180;

  /*
   * opts:
   *   width, height  grid size in atoms
   *   angle          deposition angle in degrees from straight down (0–89)
   *   mobility       how many hops each atom may take after landing (0 = cold substrate)
   *   rotation       'none' | 'continuous' | 'flip'
   *   period         monolayers of material per full rotation (continuous) or per flip
   *   seed           random seed
   */
  function createSim(opts = {}) {
    const W = opts.width || 320;
    const H = opts.height || 220;
    const angle = Math.min(89, Math.max(0, opts.angle ?? 85)) * DEG;
    const mobility = Math.max(0, Math.round(opts.mobility ?? 0));
    const rotation = opts.rotation || 'none';
    const period = Math.max(0.5, opts.period ?? 8);
    const rand = mulberry32(opts.seed ?? 1);

    // grid[y*W + x] = 0 for empty, otherwise the order the atom arrived in (1, 2, 3...)
    const grid = new Int32Array(W * H);
    // colTop[x] = height of the highest atom in column x (0 = bare substrate)
    const colTop = new Int32Array(W);
    let count = 0;
    let maxY = 0;
    let full = false;

    const wrap = (x) => ((x % W) + W) % W; // the film repeats left-to-right
    const filled = (x, y) => (y < 0 ? true : y >= H ? false : grid[y * W + wrap(x)] > 0);

    // Number of neighbors touching (x, y). The substrate counts as one under row 0.
    // `skip` lets us ignore the atom's own old position while it's hopping.
    function neighbors(x, y, skipX = -1, skipY = -1) {
      let n = 0;
      const check = (nx, ny) => {
        if (wrap(nx) === skipX && ny === skipY) return;
        if (filled(nx, ny)) n++;
      };
      check(x - 1, y); check(x + 1, y); check(x, y - 1); check(x, y + 1);
      return n;
    }

    // Where each new atom comes from. With rotation, the flux arrives from a
    // changing direction; we only see the part of that in our 2D slice.
    function horizontalSlope() {
      let side = 1;
      const layers = count / W; // material deposited so far, in monolayers
      if (rotation === 'continuous') side = Math.cos((2 * Math.PI * layers) / period);
      if (rotation === 'flip') side = Math.floor(layers / period) % 2 ? -1 : 1;
      return Math.tan(angle) * side; // sideways cells traveled per cell of drop
    }

    // every atom's position in arrival order, so the page can draw only the new ones
    const order = new Int32Array(W * H);

    function place(x, y) {
      order[count] = y * W + x;
      grid[y * W + x] = ++count;
      if (y + 1 > colTop[x]) colTop[x] = y + 1;
      if (y > maxY) maxY = y;
      if (y >= H - 3) full = true;
    }

    // 1. FLY and 2. STICK
    function fly() {
      const slope = horizontalSlope();
      const len = Math.hypot(1, slope);
      const stepX = (slope / len) * 0.5; // half-cell steps so we never skip a cell
      const stepY = (-1 / len) * 0.5;
      let px = rand() * W;
      let py = Math.min(H - 1, maxY + 2) + 0.5;
      let cx = wrap(Math.floor(px)), cy = Math.floor(py);
      for (let guard = 0; guard < 200000; guard++) {
        px += stepX; py += stepY;
        const nx = wrap(Math.floor(px)), ny = Math.floor(py);
        if (nx === cx && ny === cy) continue;
        if (ny < 0 || filled(nx, ny)) return [cx, cy]; // ran into something: stop just before it
        cx = nx; cy = ny;
        if (cy === 0 || neighbors(cx, cy) > 0) return [cx, cy]; // touching the film: stick
      }
      return [cx, cy];
    }

    // 3. HOP: move toward spots with more neighbors (more bonds = lower energy)
    function hop(x, y) {
      for (let k = 0; k < mobility; k++) {
        const here = y === 0 ? neighbors(x, y) + 1 : neighbors(x, y);
        let best = null, bestN = -1, ties = 0;
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const nx = wrap(x + dx), ny = y + dy;
          if (ny < 0 || ny >= H || filled(nx, ny)) continue;
          let n = neighbors(nx, ny, x, y);
          if (ny === 0) n += 1; // resting on the substrate counts as a bond
          if (n === 0) continue; // can't float away
          if (n > bestN) { best = [nx, ny]; bestN = n; ties = 1; }
          else if (n === bestN && rand() < 1 / ++ties) best = [nx, ny];
        }
        if (!best || bestN < here) break; // nowhere better to go
        if (bestN === here && rand() < 0.5) break; // sideways moves happen half the time
        [x, y] = best;
      }
      return [x, y];
    }

    function addAtom() {
      if (full) return false;
      let [x, y] = fly();
      if (mobility > 0) [x, y] = hop(x, y);
      if (filled(x, y)) return true; // rare collision after a hop; skip this atom
      place(x, y);
      return true;
    }

    function step(n) {
      for (let i = 0; i < n; i++) if (!addAtom()) return false;
      return true;
    }

    // ---------- measurements ----------
    function thickness() {
      let s = 0;
      for (let x = 0; x < W; x++) s += colTop[x];
      return s / W;
    }

    // Fraction of space filled, measured in the middle of the film
    // (skipping the first few rows and the rough top surface)
    function density() {
      const t = thickness();
      const y0 = Math.floor(t * 0.15), y1 = Math.floor(t * 0.75);
      if (y1 - y0 < 4) return NaN;
      let occ = 0;
      for (let y = y0; y < y1; y++) for (let x = 0; x < W; x++) if (grid[y * W + x]) occ++;
      return occ / ((y1 - y0) * W);
    }

    // Column tilt: take every row in the middle of the film, compare it with the
    // row `rise` cells above, and find the sideways shift where they match best.
    // Averaging over many row pairs makes the answer steady. tilt = atan(shift / rise).
    // Returns NaN when there's no clear column structure to measure.
    function columnTilt() {
      const t = thickness();
      const y0 = Math.floor(t * 0.15), y1 = Math.floor(t * 0.75);
      const rise = 10;
      if (y1 - y0 < rise + 10) return NaN;
      const maxS = Math.min(Math.floor(W / 2) - 1, rise * 8);
      const corr = new Float64Array(2 * maxS + 1);
      for (let y = y0; y + rise < y1; y++) {
        let ma = 0, mb = 0;
        for (let x = 0; x < W; x++) { ma += grid[y * W + x] ? 1 : 0; mb += grid[(y + rise) * W + x] ? 1 : 0; }
        ma /= W; mb /= W;
        for (let s = -maxS; s <= maxS; s++) {
          let c = 0;
          for (let x = 0; x < W; x++) {
            const a = (grid[y * W + x] ? 1 : 0) - ma;
            const b = (grid[(y + rise) * W + wrap(x + s)] ? 1 : 0) - mb;
            c += a * b;
          }
          corr[s + maxS] += c;
        }
      }
      let k = 0;
      for (let i = 1; i < corr.length; i++) if (corr[i] > corr[k]) k = i;
      // Is the peak real? Compare it with the typical correlation level.
      const avg = corr.reduce((p, v) => p + Math.abs(v), 0) / corr.length;
      if (!(corr[k] > 3 * avg)) return NaN;
      // refine between whole cells with a parabola through the peak
      let s = k - maxS;
      if (k > 0 && k < corr.length - 1) {
        const l = corr[k - 1], c = corr[k], r = corr[k + 1];
        const den = l - 2 * c + r;
        if (den !== 0) s += 0.5 * (l - r) / den;
      }
      // Flux travels toward +x, so columns lean back toward the source (−x)
      return Math.atan2(-s, rise) / DEG;
    }

    return {
      W, H, grid, colTop, order,
      step,
      get count() { return count; },
      get full() { return full; },
      thickness, density, columnTilt,
    };
  }

  // Tait's rule: an established geometric estimate of GLAD column tilt (degrees)
  function taitTilt(angleDeg) {
    const a = angleDeg * DEG;
    return (a - Math.asin((1 - Math.cos(a)) / 2)) / DEG;
  }

  const api = { createSim, taitTilt };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Glad = api;
})(typeof window !== 'undefined' ? window : globalThis);

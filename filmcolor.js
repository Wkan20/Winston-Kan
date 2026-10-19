/*
 * filmcolor.js — the color of a silicon dioxide film on silicon, from physics.
 *
 * Why thin films have color: light reflects off the top of the oxide AND off
 * the silicon underneath. The two reflections overlap. For some wavelengths
 * they line up and get brighter; for others they cancel. Which wavelengths
 * survive depends on the film's thickness, so thickness decides the color.
 * Fabs use this to estimate oxide thickness by eye from a color chart.
 *
 * Steps:
 *   1. For each wavelength 380–780 nm, compute how much light the
 *      air / SiO₂ / Si stack reflects (thin-film interference).
 *   2. Weight that spectrum by daylight and by how the eye responds to
 *      each wavelength (CIE color matching functions) → XYZ color.
 *   3. Convert XYZ to the sRGB color a screen can show.
 */
(function (root) {
  // ---- complex number helpers ----
  const C = (re, im = 0) => ({ re, im });
  const add = (a, b) => C(a.re + b.re, a.im + b.im);
  const sub = (a, b) => C(a.re - b.re, a.im - b.im);
  const mul = (a, b) => C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
  const div = (a, b) => {
    const d = b.re * b.re + b.im * b.im;
    return C((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
  };
  const expi = (phi) => C(Math.cos(phi), Math.sin(phi)); // e^(i·phi)
  const abs2 = (a) => a.re * a.re + a.im * a.im;

  // ---- optical constants ----
  // Fused silica (SiO₂), Sellmeier equation (Malitson 1965), λ in µm
  function nSiO2(nm) {
    const l2 = (nm / 1000) ** 2;
    return Math.sqrt(1 + (0.6961663 * l2) / (l2 - 0.0684043 ** 2) + (0.4079426 * l2) / (l2 - 0.1162414 ** 2) + (0.8974794 * l2) / (l2 - 9.896161 ** 2));
  }
  // Crystalline silicon n + ik, room temperature (approximate values after Green 2008)
  const SI = [
    [380, 6.00, 0.60], [400, 5.57, 0.387], [450, 4.67, 0.135], [500, 4.30, 0.073],
    [550, 4.08, 0.041], [600, 3.94, 0.025], [650, 3.85, 0.016], [700, 3.78, 0.012],
    [750, 3.73, 0.008], [800, 3.69, 0.006],
  ];
  function nSi(nm) {
    for (let i = 0; i < SI.length - 1; i++) {
      const [l0, n0, k0] = SI[i], [l1, n1, k1] = SI[i + 1];
      if (nm <= l1) {
        const t = (nm - l0) / (l1 - l0);
        // physics sign convention here: n − ik, so loss shows up as −im
        return C(n0 + t * (n1 - n0), -(k0 + t * (k1 - k0)));
      }
    }
    const last = SI[SI.length - 1];
    return C(last[1], -last[2]);
  }

  // ---- 1. thin-film reflectance at normal incidence ----
  function reflectance(nm, thickness) {
    const n0 = C(1), n1 = C(nSiO2(nm)), n2 = nSi(nm);
    const r01 = div(sub(n0, n1), add(n0, n1));
    const r12 = div(sub(n1, n2), add(n1, n2));
    const delta = (2 * Math.PI * n1.re * thickness) / nm; // phase across the film
    const e = expi(-2 * delta);
    const r = div(add(r01, mul(r12, e)), add(C(1), mul(mul(r01, r12), e)));
    return abs2(r);
  }

  // ---- 2. eye response: CIE 1931 color matching functions ----
  // Analytic fit by Wyman, Sloan & Shirley (2013)
  const g = (x, mu, s1, s2) => { const t = (x - mu) / (x < mu ? s1 : s2); return Math.exp(-0.5 * t * t); };
  const xBar = (l) => 1.056 * g(l, 599.8, 37.9, 31.0) + 0.362 * g(l, 442.0, 16.0, 26.7) - 0.065 * g(l, 501.1, 20.4, 26.2);
  const yBar = (l) => 0.821 * g(l, 568.8, 46.9, 40.5) + 0.286 * g(l, 530.9, 16.3, 31.1);
  const zBar = (l) => 1.217 * g(l, 437.0, 11.8, 36.0) + 0.681 * g(l, 459.0, 26.0, 13.8);
  // Daylight approximated as a 6504 K blackbody (close to the D65 white point)
  const daylight = (l) => { const m = l * 1e-9; return 1 / (m ** 5 * (Math.exp(1.4388e-2 / (m * 6504)) - 1)); };

  const STEP = 5;
  const WL = [];
  for (let l = 380; l <= 780; l += STEP) WL.push(l);
  const W = WL.map((l) => [daylight(l) * xBar(l), daylight(l) * yBar(l), daylight(l) * zBar(l)]);
  const Ywhite = W.reduce((s, w) => s + w[1], 0);

  function xyz(thickness) {
    let X = 0, Y = 0, Z = 0;
    WL.forEach((l, i) => {
      const R = reflectance(l, thickness);
      X += R * W[i][0]; Y += R * W[i][1]; Z += R * W[i][2];
    });
    return [X / Ywhite, Y / Ywhite, Z / Ywhite];
  }

  // ---- 3. XYZ → sRGB ----
  const gamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
  // exposure: a polished wafer under lab light looks brighter than its ~35% reflectance suggests
  const EXPOSURE = 1.9;
  function rgb(thickness) {
    const [X, Y, Z] = xyz(thickness).map((v) => v * EXPOSURE);
    let r = 3.2406 * X - 1.5372 * Y - 0.4986 * Z;
    let gg = -0.9689 * X + 1.8758 * Y + 0.0415 * Z;
    let b = 0.0557 * X - 0.204 * Y + 1.057 * Z;
    // pull out-of-gamut colors back in by mixing toward gray
    const lum = 0.2126 * r + 0.7152 * gg + 0.0722 * b;
    const lo = Math.min(r, gg, b);
    if (lo < 0) { const t = lum / (lum - lo); r = lum + (r - lum) * t; gg = lum + (gg - lum) * t; b = lum + (b - lum) * t; }
    const hi = Math.max(r, gg, b);
    if (hi > 1) { r /= hi; gg /= hi; b /= hi; }
    return [r, gg, b].map((c) => Math.round(255 * gamma(Math.max(0, c))));
  }

  const hex = (t) => '#' + rgb(t).map((c) => c.toString(16).padStart(2, '0')).join('');

  // Relative luminance (WCAG), to choose dark or light text on a film color
  function luminance([r, gg, b]) {
    const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * lin(r) + 0.7152 * lin(gg) + 0.0722 * lin(b);
  }

  // Color names from the standard thermal-oxide chart (Rogue Valley Microdevices)
  const CHART = [
    [0, 'Bare silicon'], [50, 'Tan'], [75, 'Brown'], [100, 'Dark violet to red-violet'], [125, 'Royal blue'],
    [150, 'Light blue to metallic blue'], [175, 'Metallic, very light yellow-green'], [200, 'Light gold'],
    [225, 'Gold, slight yellow-orange'], [250, 'Orange to melon'], [275, 'Red-violet'], [300, 'Blue to violet-blue'],
    [310, 'Blue'], [325, 'Blue to blue-green'], [345, 'Light green'], [350, 'Green to yellow-green'],
    [365, 'Yellow-green'], [375, 'Green-yellow'], [390, 'Yellow'], [412, 'Light orange'], [426, 'Carnation pink'],
    [443, 'Violet-red'], [465, 'Red-violet'], [476, 'Violet'], [480, 'Blue-violet'], [493, 'Blue'],
    [502, 'Blue-green'], [520, 'Green'], [540, 'Yellow-green'], [560, 'Green-yellow'], [574, 'Pale yellow'],
    [585, 'Light orange to pink'], [600, 'Carnation pink'],
  ];
  function chartName(t) {
    let best = CHART[0];
    for (const row of CHART) if (Math.abs(row[0] - t) < Math.abs(best[0] - t)) best = row;
    return best[1];
  }

  const api = { reflectance, xyz, rgb, hex, luminance, chartName, CHART };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FilmColor = api;
})(typeof window !== 'undefined' ? window : globalThis);

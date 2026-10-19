/*
 * resistivity.js — why thin metal films conduct worse than bulk metal.
 *
 * In bulk metal, electrons travel an average distance λ (the "mean free path")
 * between collisions with vibrating atoms. Bulk resistivity ρ0 comes from that.
 *
 * In a thin film, two extra things get in the way:
 *
 *   1. SURFACES (Fuchs–Sondheimer model)
 *      When the film is not much thicker than λ, electrons keep hitting the
 *      top and bottom surfaces. p = fraction that bounce off like a mirror
 *      (p = 1, no extra resistance) vs. scatter randomly (p = 0, maximum).
 *
 *   2. GRAIN BOUNDARIES (Mayadas–Shatzkes model)
 *      Sputtered films are made of many small crystals ("grains"). Electrons
 *      get reflected at the boundaries between them. R = chance of reflection
 *      at each boundary. Smaller grains → more boundaries → more resistance.
 *
 * Both effects get worse as the film gets thinner, and both are worse for
 * metals with a long mean free path. That's why copper, the best bulk wire
 * metal, loses its advantage in the tiniest chip wires.
 */
(function (root) {
  // Bulk room-temperature values. ρ0 in μΩ·cm, λ in nm.
  // Source: D. Gall, "Electron mean free path in elemental metals,"
  // J. Appl. Phys. 119, 085101 (2016). Co and Ru are hexagonal, so λ depends on
  // direction; we use the average of the two values in that paper.
  const METALS = [
    { id: 'Cu', name: 'Copper',     rho0: 1.678, lambda: 39.9, note: 'Today’s standard wiring metal. Best in bulk, longest mean free path.' },
    { id: 'Ru', name: 'Ruthenium',  rho0: 7.8,   lambda: (6.59 + 4.88) / 2, note: 'A leading candidate to replace copper in the smallest wires.' },
    { id: 'Co', name: 'Cobalt',     rho0: 6.2,   lambda: (11.8 + 7.77) / 2, note: 'Already used in some of the smallest local wires and contacts.' },
    { id: 'Mo', name: 'Molybdenum', rho0: 5.34,  lambda: 11.2, note: 'Another replacement candidate. λ here is from ρ0λ = 5.99×10⁻¹⁶ Ω·m².' },
    { id: 'W',  name: 'Tungsten',   rho0: 5.28,  lambda: 15.5, note: 'Used for contacts that connect transistors to the wiring.' },
    { id: 'Al', name: 'Aluminum',   rho0: 2.65,  lambda: 18.9, note: 'The wiring metal before copper took over around 2000.' },
  ];

  // ---------- 1. Surface scattering (Fuchs–Sondheimer, exact integral) ----------
  // ρ0/ρ = 1 − (3(1−p) / 2κ) ∫₁^∞ (1/t³ − 1/t⁵) (1 − e^(−κt)) / (1 − p·e^(−κt)) dt,   κ = d/λ
  // Substituting u = 1/t turns it into a smooth integral over u from 0 to 1.
  function fsRatio(d, lambda, p) {
    const k = d / lambda;
    const N = 400; // Simpson's rule, even number of slices
    const h = 1 / N;
    const f = (u) => {
      if (u <= 0) return 0;
      const e = Math.exp(-k / u);
      return (u - u * u * u) * (1 - e) / (1 - p * e);
    };
    let s = f(0) + f(1);
    for (let i = 1; i < N; i++) s += (i % 2 ? 4 : 2) * f(i * h);
    const integral = (s * h) / 3;
    const conductanceRatio = 1 - ((3 * (1 - p)) / (2 * k)) * integral;
    return 1 / conductanceRatio; // ρ_FS / ρ0
  }

  // ---------- 2. Grain-boundary scattering (Mayadas–Shatzkes) ----------
  // α = (λ / D) · R / (1 − R),   ρ0/ρ = 3 [1/3 − α/2 + α² − α³ ln(1 + 1/α)]
  function msRatio(grain, lambda, R) {
    if (R <= 0) return 1;
    const a = (lambda / grain) * (R / (1 - R));
    const inv = 3 * (1 / 3 - a / 2 + a * a - a * a * a * Math.log(1 + 1 / a));
    return 1 / inv; // ρ_MS / ρ0
  }

  // ---------- Both together ----------
  // Add the extra resistance from each effect on top of the bulk value.
  // (A common simplification; the full combined theory is more involved.)
  //   d     film thickness in nm
  //   opts  { p, R, grainFactor }  grain size = grainFactor × thickness
  function resistivity(metal, d, opts) {
    const { p = 0, R = 0.4, grainFactor = 1 } = opts || {};
    const fs = fsRatio(d, metal.lambda, p);
    const ms = msRatio(d * grainFactor, metal.lambda, R);
    return metal.rho0 * (fs + ms - 1);
  }

  // Thickness (nm) below which `metal` beats `ref`, searching 1–1000 nm.
  // Returns null if one is better at every thickness.
  function crossover(metal, ref, opts) {
    let prev = null;
    for (let i = 0; i <= 600; i++) {
      const d = Math.pow(10, i / 200); // 1 → 1000 nm, log spaced
      const diff = resistivity(metal, d, opts) - resistivity(ref, d, opts);
      if (prev !== null && Math.sign(diff) !== Math.sign(prev.diff)) {
        // linear interpolation in log(d)
        const t = prev.diff / (prev.diff - diff);
        return Math.pow(10, Math.log10(prev.d) + t * (Math.log10(d) - Math.log10(prev.d)));
      }
      prev = { d, diff };
    }
    return null;
  }

  // Fit p and R to measured points [{d, rho}] by trying every combination on a
  // grid and keeping the one with the smallest relative error.
  function fit(metal, points, grainFactor = 1) {
    let best = null;
    for (let pi = 0; pi <= 20; pi++) {
      const p = pi / 20;
      for (let ri = 0; ri <= 38; ri++) {
        const R = ri / 40;
        let err = 0;
        for (const pt of points) {
          const m = resistivity(metal, pt.d, { p, R, grainFactor });
          err += ((m - pt.rho) / pt.rho) ** 2;
        }
        if (!best || err < best.err) best = { p, R, err };
      }
    }
    best.rmsPercent = 100 * Math.sqrt(best.err / points.length);
    return best;
  }

  const api = { METALS, fsRatio, msRatio, resistivity, crossover, fit };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Resistivity = api;
})(typeof window !== 'undefined' ? window : globalThis);

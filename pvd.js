/*
 * pvd.js — what the knobs on a sputter-deposition system do to the film.
 *
 * In magnetron sputtering, argon ions from a plasma knock atoms off a metal
 * target. Those atoms fly across the chamber and land on the substrate.
 * Each setting changes the trip, or what happens after landing:
 *
 *   PRESSURE   More argon means more collisions on the way. Atoms that hit
 *              argon lose energy and arrive from random directions.
 *   POWER      More ions hitting the target means more atoms per second:
 *              a faster deposition rate.
 *   DISTANCE   A longer trip spreads the atoms out (slower rate) and gives
 *              them more chances to collide.
 *   TILT and   The angle the substrate faces the target. Steep angles cause
 *   ROTATION   shadowing (GLAD); rotating averages the direction out.
 *   TEMPERATURE A hot substrate lets landed atoms move into better spots,
 *              which fills gaps and makes denser films.
 *
 * With two magnetrons, each gun sits off to one side aimed at the substrate
 * (offset), so its atoms arrive at an angle. Only one gun runs at a time here;
 * the other sits behind a closed shutter.
 *
 * The numbers here are simplified on purpose so the cause and effect stay
 * visible. Rates are rough estimates for a small (2") lab gun, not a
 * calibration for any particular system.
 */
(function (root) {
  // Sputter yield: atoms knocked off per Ar⁺ ion at 600 eV (Angstrom Sciences table).
  // Tm: melting point in kelvin.
  const MATERIALS = {
    Cu: { name: 'Copper', yield: 2.3, Tm: 1358, mass: 63.55 },
    Al: { name: 'Aluminum', yield: 1.2, Tm: 933, mass: 26.98 },
    Ti: { name: 'Titanium', yield: 0.6, Tm: 1941, mass: 47.87 },
    Mo: { name: 'Molybdenum', yield: 0.9, Tm: 2896, mass: 95.95 },
    W:  { name: 'Tungsten', yield: 0.6, Tm: 3695, mass: 183.84 },
    Ru: { name: 'Ruthenium', yield: 1.3, Tm: 2607, mass: 101.07 },
  };

  // Crystal structure and lattice constant (Å) of each metal, for the
  // "does the film line up with the substrate?" check. Room-temperature values.
  const LATTICE = {
    Cu: { type: 'fcc', a: 3.615 }, Al: { type: 'fcc', a: 4.05 },
    Mo: { type: 'bcc', a: 3.147 }, W: { type: 'bcc', a: 3.165 },
    Ti: { type: 'hcp', a: 2.951 }, Ru: { type: 'hcp', a: 2.706 },
  };

  // Substrates. Only MgO(001) is a crystal with a pattern to copy here;
  // the oxide on silicon and glass are amorphous.
  const SUBSTRATES = {
    mgo:   { name: 'MgO(001) crystal', short: 'MgO', crystal: true, a: 4.212 },
    sio2:  { name: 'Silicon wafer with oxide', short: 'SiO₂/Si', crystal: false },
    glass: { name: 'Glass slide', short: 'glass', crystal: false },
  };

  // Lattice match of a metal on MgO(001). A cubic metal lines up "cube on cube"
  // (fcc) or rotated 45° (bcc), which compares the metal's spacing with
  // a(MgO) or a(MgO)/√2. Returns the mismatch as a fraction, or null.
  function mismatch(material, substrate) {
    const sub = SUBSTRATES[substrate], f = LATTICE[material];
    if (!sub.crystal || !f) return null;
    if (f.type === 'fcc') return { m: (f.a - sub.a) / sub.a, rotated: false };
    if (f.type === 'bcc') return { m: (f.a - sub.a / Math.SQRT2) / (sub.a / Math.SQRT2), rotated: true };
    return null;
  }

  // A rough guide to whether the film grows lined up with the substrate
  // (epitaxial). Needs a crystal substrate, a close spacing match, and a
  // sample hot enough for atoms to find their places.
  function epitaxy(material, substrate, th) {
    const sub = SUBSTRATES[substrate];
    const name = MATERIALS[material].name;
    if (!sub.crystal) return { verdict: 'No template', likely: false, text: `${sub.name.replace(' crystal', '')} has no crystal pattern on top, so ${name.toLowerCase()} grains grow pointing in random directions.` };
    const mm = mismatch(material, substrate);
    if (!mm) return { verdict: 'Unknown', likely: false, text: `${name} has a hexagonal crystal, and this simple check only handles cubic metals on MgO.` };
    const pct = `${Math.abs(mm.m * 100).toFixed(1)}%`;
    const how = mm.rotated ? `${name} turns 45° to match MgO, leaving a ${pct} spacing difference` : `the spacing differs by ${pct}`;
    if (Math.abs(mm.m) > 0.08) return { verdict: 'Unlikely', likely: false, text: `On MgO, ${how}. That is too large a difference for the film to line up.` };
    if (th < 0.25) return { verdict: 'Too cold', likely: false, text: `On MgO, ${how}, which is close enough to line up, but the sample is too cold for atoms to move into place.` };
    return { verdict: 'Likely', likely: true, text: `On MgO, ${how}. The sample is hot enough that the film can grow lined up with the crystal underneath (epitaxial).` };
  }

  const K_B = 1.380649e-23;
  const MTORR_TO_PA = 0.13332;

  // Mean free path of a sputtered atom through argon gas (hard-sphere kinetic theory):
  //   λ = kT / (√2 · π · d² · p)
  // d ≈ 0.35 nm is an effective collision diameter for a metal atom hitting argon.
  function meanFreePathCm(pressure_mTorr, gasK = 300) {
    const p = pressure_mTorr * MTORR_TO_PA;
    const d = 0.35e-9;
    return ((K_B * gasK) / (Math.SQRT2 * Math.PI * d * d * p)) * 100;
  }

  // A heavy metal atom keeps most of its direction and energy through a few
  // glancing collisions with light argon; it takes several to randomize it.
  // Fraction that arrives "directional" = chance of fewer than THERMALIZE
  // collisions on the way (Poisson, mean L/λ).
  const THERMALIZE = 4;
  function ballisticFraction(L_cm, lambda_cm) {
    const m = L_cm / lambda_cm;
    let term = Math.exp(-m), sum = term;
    for (let k = 1; k < THERMALIZE; k++) { term *= m / k; sum += term; }
    return Math.min(1, sum);
  }

  // Split of atoms by number of gas hits on the way: [no hits, 1–3 hits, 4 or more].
  // The first two together are the "directional" fraction above.
  function hitSplit(L_cm, lambda_cm) {
    const m = L_cm / lambda_cm, p0 = Math.exp(-m);
    const lt4 = ballisticFraction(L_cm, lambda_cm);
    return [p0, Math.max(0, lt4 - p0), Math.max(0, 1 - lt4)];
  }

  // Speeds for the chamber animation, in m/s. Sputtered atoms leave the target
  // with a few eV (5 eV assumed here); atoms that have lost that energy to the
  // gas move at the thermal speed of the room-temperature gas, sqrt(8kT/πm).
  const AMU = 1.66054e-27, EV = 1.602177e-19, AR_MASS = 39.95, LAUNCH_EV = 5;
  const launchSpeed = (mat) => Math.sqrt((2 * LAUNCH_EV * EV) / (MATERIALS[mat].mass * AMU));
  const thermalSpeed = (mat, K = 300) => Math.sqrt((8 * K_B * K) / (Math.PI * MATERIALS[mat].mass * AMU));

  // Deposition rate estimate in nm/min.
  // Proportional to power and sputter yield, falls off as 1/L² with distance,
  // and drops when gas scattering sends atoms elsewhere in the chamber.
  function rateNmPerMin(s) {
    const m = MATERIALS[s.material];
    const lambda = meanFreePathCm(s.pressure);
    const fb = ballisticFraction(s.distance, lambda);
    const geometry = (10 / s.distance) ** 2;
    const delivery = 0.35 + 0.65 * fb; // scattered atoms mostly land on chamber walls
    // a substrate facing away from the gun catches less flux. offset = where the gun sits
    // (degrees off the substrate's normal); rotation averages the direction out
    const off = s.offset || 0;
    const incidence = s.rotation && s.rotation !== 'none' ? Math.max(s.tilt, Math.abs(off)) : Math.abs(s.tilt + off);
    const tiltLoss = Math.cos((Math.min(incidence, 89) * Math.PI) / 180);
    return 14 * (s.power / 100) * (m.yield / MATERIALS.Cu.yield) * geometry * delivery * Math.max(tiltLoss, 0.05);
  }

  // Homologous temperature: substrate temperature as a fraction of the metal's melting point
  const homologous = (s) => (s.tempC + 273.15) / MATERIALS[s.material].Tm;

  // Surface mobility: how far (in atom spacings) a landed atom can wander
  // before the next layer buries it. Grows with homologous temperature,
  // shrinks a little when atoms arrive faster. A fractional value means an
  // atom sometimes gets one extra step.
  function mobilityFor(s, rate) {
    const th = homologous(s);
    const t = Math.min(1, Math.max(0, (th - 0.1) / (0.5 - 0.1)));
    const smooth = t * t * (3 - 2 * t);
    const rateFactor = Math.min(1.3, Math.max(0.7, (10 / Math.max(rate, 0.1)) ** 0.2));
    return 2.4 * smooth * rateFactor;
  }
  const ENERGETIC_BONUS = 0.5; // extra reach for atoms that arrive without being slowed by the gas

  // Thornton's structure zone model: film structure vs. T/Tm and argon pressure.
  // Boundaries rise with pressure; values are approximate.
  function zone(th, pressure) {
    const f = Math.min(1, Math.max(0, Math.log10(pressure) / Math.log10(30)));
    const b1 = 0.1 + 0.2 * f;   // Zone 1 → Zone T
    const b2 = 0.3 + 0.15 * f;  // Zone T → Zone 2
    const b3 = 0.5 + 0.1 * f;   // Zone 2 → Zone 3
    if (th < b1) return { id: '1', name: 'Zone 1', plain: 'Porous', text: 'Thin columns with gaps between them. Atoms stick where they land.' };
    if (th < b2) return { id: 'T', name: 'Zone T', plain: 'Packed', text: 'Tightly packed thin grains. Atoms move a little and fill most gaps.' };
    if (th < b3) return { id: '2', name: 'Zone 2', plain: 'Dense', text: 'Solid columns of crystal running through the coating.' };
    return { id: '3', name: 'Zone 3', plain: 'Crystals', text: 'Large crystals. Atoms move around inside the coating, not just on top.' };
  }
  zone.bounds = (pressure) => {
    const f = Math.min(1, Math.max(0, Math.log10(pressure) / Math.log10(30)));
    return [0.1 + 0.2 * f, 0.3 + 0.15 * f, 0.5 + 0.1 * f];
  };

  // Everything the page needs for one set of knob positions
  function analyze(s) {
    const lambda = meanFreePathCm(s.pressure);
    const fb = ballisticFraction(s.distance, lambda);
    const rate = rateNmPerMin(s);
    const th = homologous(s);
    return {
      lambda, fb, rate, th,
      mobility: mobilityFor(s, rate),
      zone: zone(th, s.pressure),
      minutesFor: (nm) => nm / rate,
    };
  }

  // A per-atom generator for the growth engine (glad.js): decides each atom's
  // arrival direction and how many hops it gets after landing.
  function atomSource(s, a) {
    const DEG = Math.PI / 180;
    const tilt = Math.min(s.tilt, 88) * DEG;
    const spread = Math.atan(2.5 / s.distance); // half-width of a 2" target seen from the substrate
    const cap = Math.tan(88 * DEG);
    return function next(rand, layers) {
      let theta;
      const ballistic = rand() < a.fb;
      if (ballistic) {
        // straight from the target: the tilt angle, plus the target's own size
        const jitter = (rand() + rand() - 1) * spread;
        let side = 1;
        if (s.rotation === 'continuous') side = Math.cos((2 * Math.PI * layers) / s.period);
        if (s.rotation === 'flip') side = Math.floor(layers / s.period) % 2 ? -1 : 1;
        // in our 2D side view we see the part of the tilt that lies in the slice
        const t = Math.tan(tilt) * side;
        // a gun mounted off to one side adds its own angle (confocal guns)
        theta = Math.atan(t) + (s.offset || 0) * DEG * side + jitter;
      } else {
        // scattered by argon: arrives from a random direction (cosine distribution)
        theta = Math.asin(2 * rand() - 1);
      }
      const slope = Math.max(-cap, Math.min(cap, Math.tan(theta)));
      // straight-line arrivals carry more energy and nudge atoms into place
      const m = a.mobility + (ballistic ? ENERGETIC_BONUS : 0);
      const hops = Math.floor(m) + (rand() < m - Math.floor(m) ? 1 : 0);
      return { slope, hops };
    };
  }

  const api = { hitSplit, launchSpeed, thermalSpeed, AR_MASS, LAUNCH_EV, MATERIALS, LATTICE, SUBSTRATES, mismatch, epitaxy, meanFreePathCm, ballisticFraction, THERMALIZE, rateNmPerMin, homologous, mobilityFor, zone, analyze, atomSource };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PVD = api;
})(typeof window !== 'undefined' ? window : globalThis);

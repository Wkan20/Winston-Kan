/*
 * process.js — an animated, step-by-step view of a whole sputtering run:
 * cleaning, mounting, pump-down, degassing, sputter-cleaning the target,
 * coating, annealing, cooling, and measuring. Each step has a small
 * animation of what is physically happening, plus a strip of temperature
 * and pressure for the whole run so you can see where each step sits.
 *
 * Numbers follow the Mo-on-MgO procedure cited on the page; the target
 * sputter-clean time is a typical value, not from that paper.
 */
(function () {
  const root = document.getElementById('proc');
  if (!root) return;
  const $ = (s) => root.querySelector(s);
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const STEPS = [
    { name: 'Clean', title: 'Clean the crystal', temp: 25, p: 'air', time: '4 × 15 min',
      text: 'Ultrasonic baths shake off grease and dust: trichloroethylene, acetone, isopropyl alcohol, then DI water.' },
    { name: 'Mount', title: 'Dry and mount', temp: 25, p: 'air', time: 'minutes',
      text: 'Nitrogen blows it dry. Silver paint glues it to a molybdenum holder and carries heat into it.' },
    { name: 'Pump', title: 'Load and pump down', temp: 25, p: '10⁻⁹ Torr', time: 'hours',
      text: 'In through the load lock. Pumps remove almost every gas molecule so nothing reacts with the film.' },
    { name: 'Degas', title: 'Degas the sample', temp: 1000, p: '10⁻⁹ Torr', time: '1 h',
      text: 'Heating to 1,000 °C drives off water and gas stuck to the surface. A clean surface lets the film line up.' },
    { name: 'Pre-sputter', title: 'Sputter-clean the target', temp: 900, p: '20 mTorr Ar', time: 'a few min',
      text: 'Argon goes in and the plasma lights, but the shutter stays closed. The dirty top of the target is knocked off onto the shutter, not the sample.' },
    { name: 'Coat', title: 'Coat', temp: 900, p: '20 mTorr Ar', time: 'minutes', sim: true,
      text: 'The shutter opens. Molybdenum atoms land on the hot, spinning crystal and line up with it, layer by layer.' },
    { name: 'Anneal', title: 'Anneal', temp: 1000, p: '10⁻⁹ Torr', time: '2 h',
      text: 'Argon off, heat to 1,000 °C. Atoms shuffle into place and flaws in the crystal heal.' },
    { name: 'Cool', title: 'Cool slowly', temp: 25, p: '10⁻⁹ Torr', time: '12 h',
      text: 'Film and crystal shrink by different amounts as they cool. Going slowly keeps the film from cracking.' },
    { name: 'Measure', title: 'Measure', temp: 25, p: '10⁻⁹ Torr', time: '—',
      text: 'Four-point probe for resistance (still in vacuum), then X-ray diffraction for alignment and X-ray reflectivity for thickness.' },
  ];

  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const cv = $('#procCanvas'), ctx = cv.getContext('2d');
  let idx = 0, t0 = performance.now();

  // ---------- step strip: temperature bars for the whole run ----------
  const strip = $('#procStrip');
  STEPS.forEach((s, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'pstep' + (s.sim ? ' sim' : '');
    b.setAttribute('aria-label', `Step ${i + 1}: ${s.title}`);
    b.innerHTML = `<span class="bar"><i style="height:${8 + (s.temp / 1000) * 92}%"></i></span><span class="t">${s.temp > 25 ? s.temp.toLocaleString('en-US') + '°' : 'room'}</span><span class="n">${i + 1}. ${s.name}</span>`;
    b.addEventListener('click', () => go(i));
    strip.appendChild(b);
  });

  function go(i) {
    idx = Math.max(0, Math.min(STEPS.length - 1, i)); t0 = performance.now();
    const s = STEPS[idx];
    $('#procNum').textContent = `Step ${idx + 1} of ${STEPS.length}`;
    $('#procTitle').textContent = s.title;
    $('#procText').textContent = s.text;
    $('#procFacts').innerHTML = `<span><b>${s.temp > 25 ? s.temp.toLocaleString('en-US') + ' °C' : 'room temp'}</b>sample</span><span><b>${s.p}</b>pressure</span><span><b>${s.time}</b>time</span>`;
    $('#procPrev').disabled = idx === 0;
    $('#procNext').disabled = idx === STEPS.length - 1;
    $('#procSim').hidden = !s.sim;
    [...strip.children].forEach((b, k) => b.setAttribute('aria-current', k === idx ? 'step' : 'false'));
    if (reduce) draw(2.5);
  }
  $('#procPrev').addEventListener('click', () => go(idx - 1));
  $('#procNext').addEventListener('click', () => go(idx + 1));
  root.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'ArrowRight') { go(idx + 1); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { go(idx - 1); e.preventDefault(); }
  });

  // ---------- drawing helpers ----------
  const rgba = (hex, a) => { const n = parseInt(hex.replace('#', ''), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
  let W = 0, H = 0;
  const rnd = (i, k = 1) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
  function label(text, x, y, align = 'center', color) {
    ctx.fillStyle = color || css('--ink-soft'); ctx.textAlign = align;
    ctx.font = '12px "Schibsted Grotesk", Arial, sans-serif'; ctx.fillText(text, x, y);
  }
  // the MgO crystal, optionally with a molybdenum film of thickness f (0–1)
  function sample(x, y, w, h, f = 0, film = '--epi') {
    ctx.fillStyle = '#ecebf5'; ctx.strokeStyle = css('--ink'); ctx.lineWidth = 1.5;
    ctx.fillRect(x - w / 2, y - h, w, h); ctx.strokeRect(x - w / 2, y - h, w, h);
    // faint lattice to show it's a crystal
    ctx.strokeStyle = 'rgba(23,20,31,.12)'; ctx.lineWidth = 1;
    for (let gx = x - w / 2 + 6; gx < x + w / 2; gx += 6) { ctx.beginPath(); ctx.moveTo(gx, y - h); ctx.lineTo(gx, y); ctx.stroke(); }
    if (f > 0) { const fh = Math.max(2, f * 9); ctx.fillStyle = css(film); ctx.fillRect(x - w / 2, y - h - fh, w, fh); }
  }
  function holder(x, y, w, hot = 0) {
    if (hot > 0) {
      const g = ctx.createRadialGradient(x, y + 8, 4, x, y + 8, w * 0.9);
      g.addColorStop(0, rgba(css('--film-225'), Math.min(0.95, hot))); g.addColorStop(1, rgba(css('--film-225'), 0));
      ctx.fillStyle = g; ctx.fillRect(x - w, y - 30, w * 2, 70);
    }
    ctx.fillStyle = '#5b5a6b'; ctx.fillRect(x - w / 2, y, w, 9);
  }
  function chamberBox() {
    ctx.strokeStyle = css('--ink'); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(W * 0.08, H * 0.06, W * 0.84, H * 0.86, 10); ctx.stroke();
  }
  function plasma(x, y, r, a) {
    const g = ctx.createRadialGradient(x, y, 2, x, y, r);
    g.addColorStop(0, rgba(css('--film-465'), a)); g.addColorStop(1, rgba(css('--film-465'), 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, r * 1.3, r * 0.55, 0, 0, 6.29); ctx.fill();
  }
  function gun(x, y, w) {
    ctx.fillStyle = css('--ink'); ctx.fillRect(x - w / 2, y - 28, w, 24);
    ctx.fillStyle = '#8d8a9c'; ctx.fillRect(x - w * 0.55, y - 5, w * 1.1, 5);
  }
  function thermo(x, y, frac, text) {
    ctx.strokeStyle = css('--ink'); ctx.lineWidth = 1.5;
    ctx.strokeRect(x - 5, y - 70, 10, 70);
    ctx.fillStyle = frac > 0.1 ? '#d4483b' : css('--gun2'); ctx.fillRect(x - 3, y - 2 - frac * 66, 6, frac * 66);
    label(text, x + 12, y - 4 - frac * 62, 'left', css('--ink'));
  }

  const SCENES = [
    // 1. Clean: beaker, bubbles, the four solvents in turn
    (t) => {
      const solvents = ['trichloroethylene', 'acetone', 'isopropyl alcohol', 'DI water'];
      const k = Math.floor(t / 1.6) % 4;
      const bx = W * 0.5, by = H * 0.82, bw = W * 0.36, bh = H * 0.56;
      ctx.fillStyle = rgba('#7fb3e6', 0.25 + 0.05 * k); ctx.fillRect(bx - bw / 2, by - bh * 0.78, bw, bh * 0.78);
      ctx.strokeStyle = css('--ink'); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(bx - bw / 2, by - bh); ctx.lineTo(bx - bw / 2, by); ctx.lineTo(bx + bw / 2, by); ctx.lineTo(bx + bw / 2, by - bh); ctx.stroke();
      const jig = Math.sin(t * 40) * 1.2;
      sample(bx + jig, by - 8, bw * 0.34, bw * 0.12);
      for (let i = 0; i < 18; i++) {
        const ph = (t * 0.5 + rnd(i)) % 1;
        ctx.strokeStyle = 'rgba(23,20,31,.35)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(bx - bw * 0.42 + rnd(i, 2) * bw * 0.84, by - 10 - ph * bh * 0.7, 2 + rnd(i, 3) * 2, 0, 6.29); ctx.stroke();
      }
      solvents.forEach((s, i) => label(`${i + 1}. ${s}`, W * 0.08, H * 0.2 + i * 18, 'left', i === k ? css('--ink') : css('--ink-faint')));
      label('ultrasonic bath', bx, by + 18);
    },
    // 2. Dry and mount: nitrogen stream, then silver paint onto the holder
    (t) => {
      const x = W * 0.5, y = H * 0.66;
      holder(x, y, W * 0.4);
      sample(x, y, W * 0.18, 14);
      const ph = (t % 3.2) / 3.2;
      if (ph < 0.55) {
        ctx.fillStyle = css('--ink'); ctx.fillRect(W * 0.16, H * 0.24, 46, 12); ctx.fillRect(W * 0.16 + 40, H * 0.24 + 6, 18, 6);
        for (let i = 0; i < 10; i++) {
          const k = (t * 1.6 + rnd(i)) % 1;
          ctx.strokeStyle = 'rgba(42,120,214,.5)'; ctx.lineWidth = 1.5;
          const sx = W * 0.16 + 60 + k * (x - W * 0.16 - 60), sy = H * 0.24 + 9 + k * (y - 24 - H * 0.24) + (rnd(i, 4) - 0.5) * 20;
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 10, sy + 4); ctx.stroke();
        }
        label('nitrogen blows it dry', W * 0.16, H * 0.2, 'left');
      } else {
        ctx.fillStyle = '#c9c9d4';
        [-1, 1].forEach((sd) => { ctx.beginPath(); ctx.arc(x + sd * W * 0.09, y - 2, 5, 0, 6.29); ctx.fill(); });
        label('silver paint holds it and carries heat', x, y - 40);
      }
      label('molybdenum holder', x, y + 26);
    },
    // 3. Pump down: gas molecules vanish while the gauge falls
    (t) => {
      chamberBox();
      const ph = Math.min(1, (t % 5) / 4);
      const n = Math.round(120 * Math.pow(1 - ph, 2));
      ctx.fillStyle = 'rgba(23,20,31,.4)';
      for (let i = 0; i < n; i++) {
        ctx.beginPath(); ctx.arc(W * 0.1 + rnd(i) * W * 0.8 + Math.sin(t * 3 + i) * 3, H * 0.09 + rnd(i, 5) * H * 0.8 + Math.cos(t * 2 + i) * 3, 2, 0, 6.29); ctx.fill();
      }
      const x = W * 0.5, y = H * 0.74; holder(x, y, W * 0.3); sample(x, y, W * 0.14, 12);
      const exp = 2.88 - ph * 11.88; // log10 of Torr, 760 → 1e-9
      const torr = exp > 0 ? `${Math.round(Math.pow(10, exp))} Torr` : `10${String(Math.round(exp)).replace('-', '⁻').replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d])} Torr`;
      ctx.fillStyle = css('--ink'); ctx.font = '700 22px "Big Shoulders Display", Arial, sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(torr, W * 0.88, H * 0.2);
      label('pressure', W * 0.88, H * 0.2 + 16, 'right');
    },
    // 4. Degas: the sample heats; water and gas molecules leave the surface
    (t) => {
      chamberBox();
      const x = W * 0.5, y = H * 0.7, heat = Math.min(1, t / 1.5);
      holder(x, y, W * 0.34, heat); sample(x, y, W * 0.18, 14);
      for (let i = 0; i < 14; i++) {
        const k = (t * 0.5 + rnd(i)) % 1; if (heat < 0.3) continue;
        const px = x - W * 0.08 + rnd(i, 2) * W * 0.16 + Math.sin(t * 2 + i) * 6, py = y - 16 - k * H * 0.45;
        ctx.globalAlpha = 1 - k; ctx.fillStyle = '#d4483b'; ctx.beginPath(); ctx.arc(px, py, 3, 0, 6.29); ctx.fill();
        ctx.fillStyle = css('--ink-faint'); ctx.beginPath(); ctx.arc(px - 4, py + 2, 2, 0, 6.29); ctx.arc(px + 4, py + 2, 2, 0, 6.29); ctx.fill();
        ctx.globalAlpha = 1;
      }
      thermo(W * 0.82, H * 0.8, heat, `${Math.round(25 + heat * 975).toLocaleString('en-US')} °C`);
      label('water and gas leave the surface', x, H * 0.16);
    },
    // 5. Pre-sputter: plasma on, shutter closed, dirty target material lands on the shutter
    (t) => {
      chamberBox();
      const gx = W * 0.5, gy = H * 0.26, sy = H * 0.4;
      gun(gx, gy, W * 0.28); plasma(gx, gy + 12, W * 0.13, 0.6 + 0.1 * Math.sin(t * 6));
      ctx.fillStyle = '#5b5a6b'; ctx.fillRect(gx - W * 0.2, sy, W * 0.4, 5);
      label('shutter (closed)', gx + W * 0.22, sy + 5, 'left');
      for (let i = 0; i < 16; i++) {
        const k = (t * 1.2 + rnd(i)) % 1;
        const px = gx - W * 0.1 + rnd(i, 7) * W * 0.2, py = gy + 2 + k * (sy - gy - 4);
        ctx.fillStyle = i % 3 ? css('--ink') : '#b07a3a'; ctx.beginPath(); ctx.arc(px, py, 2.4, 0, 6.29); ctx.fill();
      }
      // grime building up on the shutter
      ctx.fillStyle = 'rgba(176,122,58,.8)'; ctx.fillRect(gx - W * 0.12, sy - Math.min(4, t * 0.8), W * 0.24, Math.min(4, t * 0.8));
      const x = W * 0.5, y = H * 0.8; holder(x, y, W * 0.3, 0.7); sample(x, y, W * 0.14, 12);
      label('sample stays clean', x, y + 26);
    },
    // 6. Coat: shutter swung aside, atoms land and a lined-up layer grows
    (t) => {
      chamberBox();
      const gx = W * 0.5, gy = H * 0.26;
      gun(gx, gy, W * 0.28); plasma(gx, gy + 12, W * 0.13, 0.6 + 0.1 * Math.sin(t * 6));
      ctx.fillStyle = '#5b5a6b'; ctx.save(); ctx.translate(gx + W * 0.2, H * 0.4); ctx.rotate(-1.2); ctx.fillRect(0, 0, W * 0.2, 5); ctx.restore();
      const x = W * 0.5, y = H * 0.8; holder(x, y, W * 0.3, 0.7);
      const f = Math.min(1, t / 6);
      sample(x, y, W * 0.14, 12, f);
      for (let i = 0; i < 22; i++) {
        const k = (t * 0.9 + rnd(i)) % 1;
        const px = gx - W * 0.08 + rnd(i, 7) * W * 0.16 + (rnd(i, 8) - 0.5) * k * W * 0.06, py = gy + 2 + k * (y - 14 - f * 9 - gy);
        ctx.fillStyle = css('--epi'); ctx.beginPath(); ctx.arc(px, py, 2.6, 0, 6.29); ctx.fill();
      }
      ctx.strokeStyle = css('--ink'); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y + 22, 16, 5, 0, 0.3 + t * 2, 5.9 + t * 2); ctx.stroke();
      label('teal = molybdenum lined up with the crystal', x, H * 0.14);
    },
    // 7. Anneal: hot again; flaws (gaps and misplaced atoms) in the film close up
    (t) => {
      const x = W * 0.5, y = H * 0.74, cell = 13, cols = 14, rows = 4;
      holder(x, y + 6, W * 0.5, 0.9);
      const heal = Math.min(1, t / 4);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const i = r * cols + c, flaw = rnd(i, 9) < 0.18;
        const off = flaw ? (1 - heal) * (rnd(i, 3) - 0.5) * 9 : 0;
        if (flaw && rnd(i, 4) < 0.4 && heal < 0.7) continue; // a gap that fills in
        ctx.fillStyle = flaw && heal < 1 ? css('--hit1') : css('--epi');
        ctx.beginPath(); ctx.arc(x - (cols / 2) * cell + c * cell + cell / 2 + off, y - r * cell - cell / 2 + off * 0.5, cell * 0.42, 0, 6.29); ctx.fill();
      }
      ctx.fillStyle = '#ecebf5'; ctx.strokeStyle = css('--ink'); ctx.lineWidth = 1.5;
      ctx.fillRect(x - (cols / 2) * cell, y, cols * cell, 10); ctx.strokeRect(x - (cols / 2) * cell, y, cols * cell, 10);
      label('zoomed in: atoms shuffle into place, gaps close', x, H * 0.14);
      label('MgO', x - (cols / 2) * cell - 40, y + 9, 'right');
      thermo(W * 0.88, H * 0.8, 1, '1,000 °C');
    },
    // 8. Cool: temperature falls slowly; the glow fades
    (t) => {
      const ph = Math.min(1, (t % 6) / 5);
      const temp = 1000 - ph * 975;
      const x = W * 0.5, y = H * 0.7;
      holder(x, y, W * 0.4, 0.9 * (1 - ph)); sample(x, y, W * 0.2, 14, 1);
      thermo(W * 0.82, H * 0.8, temp / 1000, `${Math.round(temp).toLocaleString('en-US')} °C`);
      // slow ramp drawn as a curve
      ctx.strokeStyle = 'rgba(23,20,31,.5)'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let i = 0; i <= 40; i++) { const k = i / 40, px = W * 0.12 + k * W * 0.26, py = H * 0.18 + k * H * 0.2; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke();
      ctx.fillStyle = '#d4483b'; ctx.beginPath(); ctx.arc(W * 0.12 + ph * W * 0.26, H * 0.18 + ph * H * 0.2, 4, 0, 6.29); ctx.fill();
      label('temperature, over ~12 hours', W * 0.12, H * 0.14, 'left');
    },
    // 9. Measure: four probe pins on the film and a reading
    (t) => {
      const x = W * 0.5, y = H * 0.66;
      holder(x, y, W * 0.44); sample(x, y, W * 0.34, 16, 1);
      const down = Math.min(1, t / 1.2);
      for (let i = 0; i < 4; i++) {
        const px = x - W * 0.12 + i * W * 0.08;
        ctx.strokeStyle = css('--ink'); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, H * 0.2); ctx.lineTo(px, H * 0.2 + down * (y - 25 - H * 0.2)); ctx.stroke();
        ctx.fillStyle = i === 0 || i === 3 ? css('--gun2') : '#d4483b'; ctx.beginPath(); ctx.arc(px, H * 0.2 + down * (y - 25 - H * 0.2), 3, 0, 6.29); ctx.fill();
      }
      label('outer pins push current', x - W * 0.14, H * 0.14, 'right', css('--gun2'));
      label('inner pins read voltage', x + W * 0.14, H * 0.14, 'left', '#b0352a');
      if (down >= 1) { ctx.fillStyle = css('--ink'); ctx.font = '700 20px "Big Shoulders Display", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('resistance → how well the film conducts', x, y + 40); }
    },
  ];

  function draw(t) {
    const dpr = window.devicePixelRatio || 1;
    W = cv.clientWidth; H = cv.clientHeight; if (!W) return;
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    SCENES[idx](t);
  }
  function frame(now) { draw((now - t0) / 1000); requestAnimationFrame(frame); }
  go(0);
  if (reduce) draw(2.5); else requestAnimationFrame(frame);
  window.addEventListener('resize', () => reduce && draw(2.5));
})();

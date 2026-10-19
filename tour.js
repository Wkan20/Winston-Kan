/*
 * tour.js — a 3D model of a two-gun sputtering system and a beginner's
 * slideshow through its parts. Built from simple three.js shapes.
 *
 * Each slide moves the camera to one part, highlights it, and shows a short
 * explanation. Drag the model to look around; the arrows or the buttons move
 * between slides.
 */
(function () {
  const root = document.getElementById('tour');
  if (!root || !window.THREE) return;
  const T = window.THREE;
  const $ = (sel) => root.querySelector(sel);
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- the slides ----------
  const SLIDES = [
    { part: null, title: 'A machine that paints with atoms',
      text: 'A sputtering machine coats a sample, like a silicon wafer, with an even layer of metal only a few hundred atoms thick. Chip factories use machines like this to lay down the metal wiring inside chips. This tour walks through the parts, one at a time.',
      cam: { f: [0.6, 0, 0], d: 14, t: 0.65, p: 0.32 } },
    { part: 'chamber', label: 'Vacuum chamber', title: 'The vacuum chamber',
      text: 'Everything happens inside a sealed steel chamber. Before coating, almost all the air is pumped out, because stray air would react with the metal and ruin the coating. The windows let you watch the glow inside.',
      cam: { f: [0, 0, 0], d: 10.5, t: 0.45, p: 0.28 } },
    { part: 'pumps', label: 'Pumps', title: 'The pumps',
      text: 'Two pumps work in a relay. A roughing pump removes most of the air. Then a turbo pump, a fan spinning tens of thousands of times a minute, knocks the remaining gas molecules out. Together they reach about a billionth of normal air pressure.',
      cam: { f: [0, -1.6, -3.1], d: 7.5, t: 2.55, p: 0.22 } },
    { part: 'loadlock', label: 'Load lock', title: 'The load lock',
      text: 'Samples go in through a small side chamber called the load lock. Only the load lock is opened to air and pumped down again; then a valve opens and a long rod slides the sample into the main chamber. The main chamber stays clean the whole time.',
      cam: { f: [3.8, -0.85, 0], d: 7, t: 1.05, p: 0.25 } },
    { part: 'gas', label: 'Argon inlet', title: 'The argon inlet',
      text: 'Once the chamber is empty, a valve lets a tiny, steady trickle of argon gas back in. Argon does not react with anything, so it can be used to knock metal atoms loose without changing them. The amount of argon is one of the main settings.',
      cam: { f: [-3.2, 0.2, 1.2], d: 6, t: -0.55, p: 0.2 } },
    { part: 'guns', label: 'Magnetron guns', title: 'The magnetron guns',
      text: 'Each gun holds a disk of metal, the target, with strong magnets behind it. This machine has two guns, so it can hold two different metals. The magnets keep the plasma close to the target, which makes coating faster.',
      cam: { f: [0, 1.25, 0], d: 6.2, t: 0.3, p: 0.22 } },
    { part: 'plasma', label: 'Plasma', title: 'The plasma',
      text: 'A high voltage on the target turns the argon in front of it into a glowing purple plasma. Argon ions in the plasma slam into the target and knock metal atoms off. This knocking loose is called sputtering.',
      cam: { f: [0.9, 0.85, 0], d: 4.6, t: 0.55, p: 0.12 } },
    { part: 'shutters', label: 'Shutters', title: 'The shutters',
      text: 'A metal flap in front of each gun blocks atoms from reaching the sample. The gun is turned on with its shutter closed for a minute to clean the target’s surface, then the shutter opens and the coating starts. Closing it stops the coating at exactly the right moment.',
      cam: { f: [-1.0, 0.75, 0.2], d: 4.6, t: -0.35, p: 0.15 } },
    { part: 'holder', label: 'Sample holder', title: 'The sample holder',
      text: 'The sample sits on a holder below the guns. A heater underneath can warm it, which helps atoms settle into a tighter coating; it is heated and cooled slowly so the sample doesn’t crack. A motor can spin or tilt the holder to change how the coating grows.',
      cam: { f: [0, -0.95, 0], d: 5.2, t: 0.5, p: 0.42 } },
    { part: 'qcm', label: 'Thickness monitor', title: 'The thickness monitor',
      text: 'Next to the sample sits a tiny quartz crystal that vibrates millions of times a second. As metal lands on it, the extra weight slows the vibration, so the machine can tell how fast the coating is growing, down to fractions of a nanometer.',
      cam: { f: [1.35, -0.55, 0.65], d: 3.4, t: 0.85, p: 0.3 } },
    { part: 'run', label: null, title: 'Putting it together',
      text: 'Pump down, let in argon, light the plasma, clean the target behind the shutter, then open it. Metal atoms fly across the chamber and build the coating atom by atom. The simulator below lets you change each of these settings and see what happens.',
      cam: { f: [0.3, 0, 0], d: 11.5, t: 0.7, p: 0.3 } },
  ];

  // ---------- scene ----------
  const canvas = $('#tourCanvas');
  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true }); }
  catch (e) { $('#tourFallback').hidden = false; canvas.hidden = true; }
  if (!renderer) return;
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(32, 16 / 10, 0.1, 100);
  scene.add(new T.HemisphereLight(0xffffff, 0x8d8a9c, 0.85));
  const sun = new T.DirectionalLight(0xffffff, 0.75); sun.position.set(5, 8, 6); scene.add(sun);

  const C = {
    steel: 0x9c9aab, dark: 0x2a2733, ink: 0x17141f, wafer: 0x54a2ee, plasma: 0xc585e8,
    heater: 0xdec193, ti: 0xb5b4bf, cu: 0xc27a4e, glass: 0xbfc3dd, accent: 0xeb6834,
  };
  const parts = {}; // name → array of meshes
  const add = (name, mesh) => { (parts[name] = parts[name] || []).push(mesh); scene.add(mesh); return mesh; };
  const mat = (color, opts = {}) => new T.MeshStandardMaterial({ color, metalness: 0.35, roughness: 0.55, ...opts });
  const cyl = (rt, rb, h, m, seg = 40) => new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg), m);
  // a cylinder between two points
  function rod(a, b, r, m) {
    const A = new T.Vector3(...a), B = new T.Vector3(...b);
    const mesh = cyl(r, r, A.distanceTo(B), m, 16);
    mesh.position.copy(A).add(B).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), B.clone().sub(A).normalize());
    return mesh;
  }

  // chamber: see-through wall, solid flanges, a viewport
  const R = 2.4, H = 3.2;
  const wall = cyl(R, R, H, new T.MeshStandardMaterial({ color: C.glass, transparent: true, opacity: 0.16, depthWrite: false, side: T.DoubleSide, metalness: 0.1, roughness: 0.2 }), 64);
  add('chamber', wall);
  const wallEdges = new T.LineSegments(new T.EdgesGeometry(new T.CylinderGeometry(R, R, H, 24, 1, true)), new T.LineBasicMaterial({ color: C.ink, transparent: true, opacity: 0.18 }));
  add('chamber', wallEdges);
  for (const y of [H / 2, -H / 2]) { const f = cyl(R + 0.2, R + 0.2, 0.16, mat(C.steel)); f.position.y = y; add('chamber', f); }
  const port = rod([0, 0.35, R - 0.05], [0, 0.35, R + 0.25], 0.45, mat(C.steel)); add('chamber', port);
  const glassWin = cyl(0.38, 0.38, 0.04, new T.MeshStandardMaterial({ color: 0x6e7aa8, transparent: true, opacity: 0.55 }));
  glassWin.rotation.x = Math.PI / 2; glassWin.position.set(0, 0.35, R + 0.28); add('chamber', glassWin);

  // pumps at the back: port, turbo pump, roughing line
  add('pumps', rod([0, -0.8, -R + 0.1], [0, -0.8, -3.3], 0.5, mat(C.steel)));
  const turbo = cyl(0.65, 0.65, 1.3, mat(C.steel)); turbo.position.set(0, -1.75, -3.6); add('pumps', turbo);
  const turboTop = cyl(0.66, 0.66, 0.12, mat(C.dark)); turboTop.position.set(0, -1.05, -3.6); add('pumps', turboTop);
  const fan = new T.Group(); fan.position.set(0, -1.0, -3.6);
  for (let i = 0; i < 10; i++) { const b = new T.Mesh(new T.BoxGeometry(0.5, 0.03, 0.1), mat(C.ti)); b.position.x = 0.28; b.rotation.x = 0.4; const p = new T.Group(); p.add(b); p.rotation.y = (i / 10) * Math.PI * 2; fan.add(p); }
  scene.add(fan); (parts.pumps = parts.pumps || []).push(...fan.children.map((g) => g.children[0]));
  add('pumps', rod([0, -2.4, -3.6], [0, -2.4, -5.2], 0.12, mat(C.steel)));
  const rough = new T.Mesh(new T.BoxGeometry(0.9, 0.6, 0.7), mat(C.dark)); rough.position.set(0, -2.4, -5.5); add('pumps', rough);

  // load lock on the right, level with the sample holder
  add('loadlock', rod([R - 0.05, -0.85, 0], [3.3, -0.85, 0], 0.33, mat(C.steel)));
  const gate = new T.Mesh(new T.BoxGeometry(0.22, 0.95, 0.95), mat(C.dark)); gate.position.set(2.85, -0.85, 0); add('loadlock', gate);
  const llBox = new T.Mesh(new T.BoxGeometry(1.1, 1.1, 1.1), mat(C.steel)); llBox.position.set(3.9, -0.85, 0); add('loadlock', llBox);
  const transfer = rod([4.45, -0.85, 0], [6.1, -0.85, 0], 0.07, mat(C.ti)); add('loadlock', transfer);
  const handle = cyl(0.16, 0.16, 0.22, mat(C.dark)); handle.rotation.z = Math.PI / 2; handle.position.set(6.2, -0.85, 0); add('loadlock', handle);

  // argon inlet on the left with a valve
  add('gas', rod([-R + 0.05, 0.2, 1.2], [-4.4, 0.2, 1.2], 0.07, mat(C.steel)));
  const valve = new T.Mesh(new T.BoxGeometry(0.4, 0.4, 0.4), mat(C.dark)); valve.position.set(-3.4, 0.2, 1.2); add('gas', valve);
  const bottle = cyl(0.3, 0.3, 1.4, mat(0x6e7a8a)); bottle.position.set(-4.6, -0.2, 1.2); add('gas', bottle);
  const gasDots = new T.Group(); scene.add(gasDots);
  for (let i = 0; i < 10; i++) { const d = new T.Mesh(new T.SphereGeometry(0.05, 8, 8), new T.MeshBasicMaterial({ color: C.plasma })); d.userData.k = i / 10; gasDots.add(d); }

  // two magnetron guns through the top flange, tilted toward the center
  const guns = [];
  [[-1.0, 1, C.ti], [1.0, -1, C.cu]].forEach(([x, s, tc], i) => {
    const g = new T.Group(); g.position.set(x, 1.3, 0); g.rotation.z = (s * 20 * Math.PI) / 180;
    const body = cyl(0.36, 0.36, 0.95, mat(C.dark)); body.position.y = 0.45; g.add(body);
    const target = cyl(0.4, 0.4, 0.07, mat(tc, { metalness: 0.7, roughness: 0.35 })); target.position.y = -0.04; g.add(target);
    const magnet = new T.Mesh(new T.TorusGeometry(0.24, 0.035, 8, 32), mat(0x5b5a6b)); magnet.rotation.x = Math.PI / 2; magnet.position.y = 0.06; g.add(magnet);
    scene.add(g); (parts.guns = parts.guns || []).push(body, target, magnet);
    // plasma glow in front of the target
    const pl = new T.Mesh(new T.SphereGeometry(0.42, 24, 16), new T.MeshBasicMaterial({ color: C.plasma, transparent: true, opacity: 0.0, depthWrite: false, blending: T.AdditiveBlending }));
    pl.scale.set(1, 0.38, 1); pl.position.y = -0.2; g.add(pl); (parts.plasma = parts.plasma || []).push(pl);
    // shutter on a swing arm
    const sh = cyl(0.46, 0.46, 0.03, mat(C.steel)); sh.position.set(0, -0.5, 0); g.add(sh);
    const arm = rod([0, -0.5, 0], [s * 0.9, -0.55, 0], 0.03, mat(C.steel)); g.add(arm);
    (parts.shutters = parts.shutters || []).push(sh, arm);
    guns.push({ g, pl, sh, target });
  });

  // sample holder: plate, wafer, heater coil, shaft, motor
  const plate = cyl(0.95, 0.95, 0.12, mat(C.steel)); plate.position.y = -0.95; add('holder', plate);
  const wafer = cyl(0.72, 0.72, 0.03, mat(C.wafer, { metalness: 0.5, roughness: 0.25 })); wafer.position.y = -0.875; add('holder', wafer);
  const heater = new T.Mesh(new T.TorusGeometry(0.55, 0.05, 10, 40), new T.MeshStandardMaterial({ color: C.heater, emissive: C.heater, emissiveIntensity: 0.4 }));
  heater.rotation.x = Math.PI / 2; heater.position.y = -1.08; add('holder', heater);
  add('holder', rod([0, -1.05, 0], [0, -2.15, 0], 0.08, mat(C.steel)));
  const motor = cyl(0.3, 0.3, 0.45, mat(C.dark)); motor.position.y = -2.15; add('holder', motor);

  // quartz crystal thickness monitor beside the sample
  add('qcm', rod([R - 0.05, -0.55, 0.65], [1.45, -0.55, 0.65], 0.04, mat(C.steel)));
  const qcm = cyl(0.13, 0.13, 0.18, mat(C.ti, { metalness: 0.7 })); qcm.position.set(1.35, -0.6, 0.65); add('qcm', qcm);
  const quartz = cyl(0.09, 0.09, 0.02, new T.MeshStandardMaterial({ color: 0xe9e4d4, emissive: 0x000000 })); quartz.position.set(1.35, -0.5, 0.65); add('qcm', quartz);

  // sputtered atoms flying from the active gun to the wafer
  const atoms = [];
  const atomMat = new T.MeshBasicMaterial({ color: C.ink });
  for (let i = 0; i < 40; i++) { const a = new T.Mesh(new T.SphereGeometry(0.035, 8, 8), atomMat); a.visible = false; scene.add(a); atoms.push({ m: a, t: -Math.random(), from: new T.Vector3(), to: new T.Vector3() }); }

  // ---------- highlighting ----------
  const all = Object.values(parts).flat();
  all.forEach((m) => { if (m.material && m.material.emissive) m.userData.baseEmissive = m.material.emissive.getHex(); m.userData.baseIntensity = m.material.emissiveIntensity ?? 1; });
  function highlight(name) {
    all.forEach((m) => {
      if (!m.material || !m.material.emissive || m.userData.shared) return;
      const on = name && parts[name] && parts[name].includes(m) && name !== 'plasma';
      m.material.emissive.setHex(on ? C.accent : m.userData.baseEmissive);
      m.material.emissiveIntensity = on ? 0.45 : m.userData.baseIntensity;
    });
    wall.material.opacity = name === 'chamber' ? 0.3 : 0.14;
    wallEdges.material.opacity = name === 'chamber' ? 0.5 : 0.16;
  }
  // give each mesh its own material so highlighting one part never tints another
  all.forEach((m) => { if (m.material && m.material.clone && m !== wall && m !== wallEdges) m.material = m.material.clone(); });
  all.forEach((m) => { if (m.material && m.material.emissive) { m.userData.baseEmissive = m.material.emissive.getHex(); m.userData.baseIntensity = m.material.emissiveIntensity; } });

  // ---------- camera ----------
  let cur = { f: new T.Vector3(...SLIDES[0].cam.f), d: SLIDES[0].cam.d, t: SLIDES[0].cam.t, p: SLIDES[0].cam.p };
  let from = null, to = null, t0 = 0;
  const DUR = 1100;
  let drag = { t: 0, p: 0 }, dragging = null;
  function placeCamera() {
    const t = cur.t + drag.t, p = Math.max(-0.2, Math.min(1.2, cur.p + drag.p));
    const d = cur.d * (camera.aspect < 1.4 ? 1.3 : 1); // step back on narrow screens
    camera.position.set(cur.f.x + d * Math.sin(t) * Math.cos(p), cur.f.y + d * Math.sin(p), cur.f.z + d * Math.cos(t) * Math.cos(p));
    camera.lookAt(cur.f);
  }
  const ease = (k) => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k));

  // ---------- slide UI ----------
  let idx = 0;
  const dots = $('#tourDots');
  SLIDES.forEach((s, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'dot'; b.setAttribute('aria-label', `Slide ${i + 1}: ${s.title}`);
    b.addEventListener('click', () => go(i)); dots.appendChild(b);
  });
  function go(i) {
    idx = Math.max(0, Math.min(SLIDES.length - 1, i));
    const s = SLIDES[idx];
    $('#tourStep').textContent = `${idx + 1} of ${SLIDES.length}`;
    $('#tourTitle').textContent = s.title;
    $('#tourText').textContent = s.text;
    $('#tourPrev').disabled = idx === 0;
    $('#tourNext').textContent = idx === SLIDES.length - 1 ? 'Go to the simulator' : 'Next';
    [...dots.children].forEach((d, k) => d.setAttribute('aria-current', k === idx ? 'step' : 'false'));
    highlight(s.part);
    from = { f: cur.f.clone(), d: cur.d, t: cur.t, p: cur.p };
    to = { f: new T.Vector3(...s.cam.f), d: s.cam.d, t: s.cam.t, p: s.cam.p };
    drag = { t: 0, p: 0 };
    t0 = performance.now();
    if (reduce) { cur = to; from = null; }
  }
  $('#tourPrev').addEventListener('click', () => go(idx - 1));
  $('#tourNext').addEventListener('click', () => {
    if (idx === SLIDES.length - 1) document.getElementById('simulator').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    else go(idx + 1);
  });
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { go(idx + 1); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { go(idx - 1); e.preventDefault(); }
  });
  canvas.addEventListener('pointerdown', (e) => { dragging = { x: e.clientX, y: e.clientY, t: drag.t, p: drag.p }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => { if (!dragging) return; drag.t = dragging.t - (e.clientX - dragging.x) * 0.008; drag.p = dragging.p + (e.clientY - dragging.y) * 0.006; });
  const end = () => (dragging = null);
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);

  // ---------- label pinned to the highlighted part ----------
  const label = $('#tourLabel');
  function placeLabel() {
    const s = SLIDES[idx];
    if (!s.label) { label.hidden = true; return; }
    const v = new T.Vector3(...s.cam.f).project(camera);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    label.hidden = false; label.textContent = s.label;
    label.style.left = Math.max(8, Math.min(w - label.offsetWidth - 8, ((v.x + 1) / 2) * w + 14)) + 'px';
    label.style.top = Math.max(8, Math.min(h - 30, ((1 - v.y) / 2) * h - 34)) + 'px';
  }

  // ---------- loop ----------
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  const activeGun = 1;
  function frame(now) {
    resize();
    if (from && to) {
      const k = ease((now - t0) / DUR);
      cur = { f: from.f.clone().lerp(to.f, k), d: from.d + (to.d - from.d) * k, t: from.t + (to.t - from.t) * k, p: from.p + (to.p - from.p) * k };
      if (k >= 1) from = null;
    }
    placeCamera();
    const part = SLIDES[idx].part;
    const lit = idx >= 6;           // plasma is on from the plasma slide onward
    const flowing = part === 'run' || part === 'holder' || part === 'qcm';
    guns.forEach((g, i) => {
      g.pl.material.opacity = lit && (i === activeGun || part === 'plasma') ? 0.55 + 0.12 * Math.sin(now / 180 + i) : 0;
      // gun 2's shutter swings open once coating starts
      const open = flowing && i === activeGun;
      g.sh.position.x = open ? 0.75 : 0; g.sh.rotation.z = open ? 0.6 : 0;
    });
    if (!reduce) { fan.rotation.y += 0.25; }
    wafer.rotation.y += part === 'holder' || part === 'run' ? 0.01 : 0;
    gasDots.children.forEach((d) => { const k = (d.userData.k + now / 4000) % 1; d.position.set(-3.6 + k * 1.4, 0.2, 1.2); d.visible = part === 'gas' || part === 'run'; });
    const tgt = guns[activeGun].target, src = new T.Vector3(); tgt.getWorldPosition(src);
    atoms.forEach((a) => {
      a.t += 0.012;
      a.m.visible = flowing && !reduce && a.t >= 0;
      if (!flowing || reduce || a.t < 0) return;
      if (a.t >= 1) { a.t = 0; a.from.copy(src).add(new T.Vector3((Math.random() - 0.5) * 0.5, -0.1, (Math.random() - 0.5) * 0.5)); a.to.set((Math.random() - 0.5) * 1.2, -0.86, (Math.random() - 0.5) * 1.2); }
      a.m.position.copy(a.from).lerp(a.to, a.t);
    });
    renderer.render(scene, camera);
    placeLabel();
    requestAnimationFrame(frame);
  }
  go(0); cur = { ...to }; from = null;
  requestAnimationFrame(frame);
})();

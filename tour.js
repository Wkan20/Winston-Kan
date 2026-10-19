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
      text: 'A sputtering machine coats a sample, like a silicon wafer or a small crystal, with an even layer of metal only a few hundred atoms thick. Chip factories use machines like this to lay down the metal wiring inside chips. This tour walks through the parts, one at a time.',
      cam: { f: [0.8, -0.2, 0], d: 15, t: 0.62, p: 0.3 } },
    { part: 'chamber', label: 'Vacuum chamber', title: 'The vacuum chamber',
      text: 'Everything happens inside a sealed steel chamber. Before coating, almost all the air is pumped out, because stray air would react with the metal and ruin the coating. A window on the front lets you watch the glow inside.',
      cam: { f: [0, 0, 0], d: 10.5, t: 0.42, p: 0.25 } },
    { part: 'pumps', label: 'Pumps', title: 'The pumps',
      text: 'Two pumps work in a relay. A roughing pump removes most of the air. Then a turbo pump, a fan spinning tens of thousands of times a minute, knocks the remaining gas molecules out. A good system reaches about a trillionth of normal air pressure.',
      cam: { f: [0, -1.7, -4.3], d: 10.5, t: 2.3, p: 0.22 } },
    { part: 'loadlock', label: 'Load lock', title: 'The load lock',
      text: 'Samples go in through a small side chamber called the load lock. Only the load lock is opened to air and pumped down again; then a valve opens and a long rod slides the sample into the main chamber. The main chamber stays clean the whole time.',
      cam: { f: [3.9, -0.85, 0], d: 7.5, t: 1.0, p: 0.24 } },
    { part: 'gas', label: 'Argon inlet', title: 'The argon inlet',
      text: 'Once the chamber is empty, a flow controller lets a tiny, steady trickle of argon gas back in from a bottle. Argon does not react with anything, so it can knock metal atoms loose without changing them. The amount of argon is one of the main settings.',
      cam: { f: [-3.3, -0.2, 1.0], d: 7, t: -0.6, p: 0.18 } },
    { part: 'guns', label: 'Magnetron guns', title: 'The magnetron guns',
      text: 'Each gun holds a disk of metal, the target, with strong magnets behind it. This machine has two guns, so it can hold two different metals. The magnets keep the plasma close to the target, which makes coating faster.',
      cam: { f: [0, 1.15, 0], d: 6.4, t: 0.3, p: 0.2 } },
    { part: 'plasma', label: 'Plasma', title: 'The plasma',
      text: 'A high voltage on the target turns the argon in front of it into a glowing purple plasma. Argon ions in the plasma slam into the target and knock metal atoms off. This knocking loose is called sputtering.',
      cam: { f: [0.85, 0.75, 0], d: 4.8, t: 0.6, p: 0.1 } },
    { part: 'shutters', label: 'Shutters', title: 'The shutters',
      text: 'A metal flap in front of each gun blocks atoms from reaching the sample. The gun runs for a minute with its shutter closed to clean the target’s surface, then the shutter swings open and coating starts. Closing it stops the coating at exactly the right moment.',
      cam: { f: [-0.85, 0.65, 0.2], d: 4.8, t: -0.3, p: 0.14 } },
    { part: 'holder', label: 'Sample holder', title: 'The sample and its holder',
      text: 'The sample, here a small square MgO crystal, is clamped to a holder below the guns. A heater underneath can warm it, which helps atoms settle into a tighter coating; it is heated and cooled slowly so nothing cracks. A motor spins the holder so the coating comes out even.',
      cam: { f: [0, -0.95, 0], d: 5, t: 0.5, p: 0.45 } },
    { part: 'qcm', label: 'Thickness monitor', title: 'The thickness monitor',
      text: 'Next to the sample sits a tiny quartz crystal that vibrates millions of times a second. As metal lands on it, the extra weight slows the vibration, so the machine can tell how fast the coating is growing, down to fractions of a nanometer.',
      cam: { f: [1.25, -0.55, 0.6], d: 3.6, t: 0.85, p: 0.32 } },
    { part: 'run', label: null, title: 'Putting it together',
      text: 'Pump down, let in argon, light the plasma, clean the target behind the shutter, then open it. Metal atoms fly across the chamber and build the coating atom by atom. The example run and the simulator below walk through a real recipe.',
      cam: { f: [0.3, -0.1, 0], d: 11.5, t: 0.68, p: 0.28 } },
  ];

  // ---------- renderer ----------
  const canvas = $('#tourCanvas');
  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true }); }
  catch (e) { $('#tourFallback').hidden = false; canvas.hidden = true; }
  if (!renderer) return;
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(32, 16 / 10, 0.1, 100);
  scene.add(new T.HemisphereLight(0xffffff, 0xb9b7c9, 0.9));
  const key = new T.DirectionalLight(0xffffff, 0.7); key.position.set(5, 9, 7); scene.add(key);
  const fill = new T.DirectionalLight(0xdfe3ff, 0.3); fill.position.set(-6, 3, -4); scene.add(fill);

  const C = {
    steel: 0xa9a7b8, steelDark: 0x77758a, dark: 0x2b2836, ink: 0x17141f, mgo: 0xf3f1f8,
    plasma: 0xc585e8, heater: 0xdec193, ti: 0xbdbcc7, cu: 0xc8835a, glass: 0xc9cce6, accent: 0xeb6834, gasBottle: 0x5f6f86,
  };

  // ---------- part bookkeeping ----------
  // every mesh is registered under a part name; each gets its own outline
  const parts = {};
  const outlines = [];
  function reg(name, mesh, opts = {}) {
    (parts[name] = parts[name] || []).push(mesh);
    mesh.userData.part = name;
    if (opts.outline !== false) {
      const edges = new T.LineSegments(new T.EdgesGeometry(mesh.geometry, 35), new T.LineBasicMaterial({ color: C.ink, transparent: true, opacity: 0.22 }));
      edges.userData.part = name; mesh.add(edges); outlines.push(edges);
    }
    return mesh;
  }
  const M = (color, o = {}) => new T.MeshStandardMaterial({ color, metalness: 0.45, roughness: 0.45, ...o });
  const cyl = (r, h, m, seg = 48) => new T.Mesh(new T.CylinderGeometry(r, r, h, seg), m);
  const box = (x, y, z, m) => new T.Mesh(new T.BoxGeometry(x, y, z), m);
  function tube(a, b, r, m, seg = 20) {
    const A = new T.Vector3(...a), B = new T.Vector3(...b);
    const mesh = new T.Mesh(new T.CylinderGeometry(r, r, A.distanceTo(B), seg), m);
    mesh.position.copy(A).add(B).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), B.clone().sub(A).normalize());
    return mesh;
  }
  const put = (name, mesh, parent = scene, opts) => { parent.add(mesh); return reg(name, mesh, opts); };

  // ---------- ground shadow ----------
  {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'); const grd = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    grd.addColorStop(0, 'rgba(23,20,31,0.28)'); grd.addColorStop(1, 'rgba(23,20,31,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    const shadow = new T.Mesh(new T.PlaneGeometry(13, 9), new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.set(0.8, -2.95, -0.6); scene.add(shadow);
  }

  // ---------- chamber ----------
  const R = 2.2, H = 3.0, TOP = H / 2, BOT = -H / 2;
  const wall = new T.Mesh(new T.CylinderGeometry(R, R, H, 72, 1, true), new T.MeshStandardMaterial({ color: C.glass, transparent: true, opacity: 0.13, depthWrite: false, side: T.DoubleSide, metalness: 0.1, roughness: 0.15 }));
  scene.add(wall); (parts.chamber = parts.chamber || []).push(wall);
  const rimTop = new T.LineSegments(new T.EdgesGeometry(new T.CylinderGeometry(R, R, H, 72, 1, true), 20), new T.LineBasicMaterial({ color: C.ink, transparent: true, opacity: 0.25 }));
  scene.add(rimTop); outlines.push(rimTop); rimTop.userData.part = 'chamber';
  const lid = cyl(R + 0.18, 0.18, M(C.steel)); lid.position.y = TOP + 0.09; put('chamber', lid);
  const base = cyl(R + 0.18, 0.18, M(C.steel)); base.position.y = BOT - 0.09; put('chamber', base);
  // bolt circles
  for (const y of [TOP + 0.2, BOT - 0.2]) for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const b = cyl(0.045, 0.06, M(C.steelDark), 10); b.position.set(Math.cos(a) * (R + 0.08), y, Math.sin(a) * (R + 0.08)); put('chamber', b, scene, { outline: false });
  }
  // front viewport
  const vp = tube([0, 0.2, R - 0.02], [0, 0.2, R + 0.3], 0.42, M(C.steel)); put('chamber', vp);
  const vpGlass = cyl(0.33, 0.03, new T.MeshStandardMaterial({ color: 0x7884b4, transparent: true, opacity: 0.6, metalness: 0.1, roughness: 0.1 }));
  vpGlass.rotation.x = Math.PI / 2; vpGlass.position.set(0, 0.2, R + 0.32); put('chamber', vpGlass, scene, { outline: false });
  // legs
  for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + (i * Math.PI) / 2; const leg = tube([Math.cos(a) * 1.7, BOT - 0.18, Math.sin(a) * 1.7], [Math.cos(a) * 1.7, -2.95, Math.sin(a) * 1.7], 0.07, M(C.steelDark)); put('chamber', leg); }

  // ---------- pumps (back) ----------
  put('pumps', tube([0, -0.75, -R + 0.05], [0, -0.75, -3.05], 0.42, M(C.steel)));
  const gv = box(0.95, 0.95, 0.24, M(C.dark)); gv.position.set(0, -0.75, -3.15); put('pumps', gv);
  put('pumps', tube([0, -0.75, -3.27], [0, -0.75, -3.6], 0.42, M(C.steel)));
  const elbow = cyl(0.42, 0.5, M(C.steel)); elbow.position.set(0, -0.75, -3.85); put('pumps', elbow);
  const turbo = cyl(0.6, 1.2, M(C.steel)); turbo.position.set(0, -1.65, -3.85); put('pumps', turbo);
  const turboFlange = cyl(0.7, 0.1, M(C.steelDark)); turboFlange.position.set(0, -1.0, -3.85); put('pumps', turboFlange);
  const fan = new T.Group(); fan.position.set(0, -1.0, -3.85); scene.add(fan);
  for (let i = 0; i < 12; i++) { const blade = box(0.46, 0.02, 0.09, M(C.ti)); blade.position.x = 0.27; blade.rotation.x = 0.45; const arm = new T.Group(); arm.rotation.y = (i / 12) * Math.PI * 2; arm.add(blade); fan.add(arm); reg('pumps', blade, { outline: false }); }
  put('pumps', tube([0, -2.25, -3.85], [0, -2.6, -3.85], 0.1, M(C.steelDark)));
  put('pumps', tube([0, -2.6, -3.85], [0, -2.6, -5.0], 0.1, M(C.steelDark)));
  const rough = box(1.0, 0.6, 0.75, M(C.dark)); rough.position.set(0, -2.65, -5.4); put('pumps', rough);

  // ---------- load lock (right) ----------
  put('loadlock', tube([R - 0.05, -0.9, 0], [2.9, -0.9, 0], 0.3, M(C.steel)));
  const llGate = box(0.22, 0.85, 0.85, M(C.dark)); llGate.position.set(3.0, -0.9, 0); put('loadlock', llGate);
  put('loadlock', tube([3.1, -0.9, 0], [3.35, -0.9, 0], 0.3, M(C.steel)));
  const ll = cyl(0.55, 1.0, M(C.steel)); ll.rotation.z = Math.PI / 2; ll.position.set(3.85, -0.9, 0); put('loadlock', ll);
  const door = cyl(0.42, 0.06, M(C.steelDark)); door.position.set(3.85, -0.32, 0); put('loadlock', door);
  put('loadlock', tube([4.35, -0.9, 0], [6.1, -0.9, 0], 0.06, M(C.ti)));
  const knob = cyl(0.17, 0.24, M(C.dark)); knob.rotation.z = Math.PI / 2; knob.position.set(6.2, -0.9, 0); put('loadlock', knob);

  // ---------- argon inlet (left) ----------
  put('gas', tube([-R + 0.05, 0.3, 0.9], [-4.0, 0.3, 0.9], 0.06, M(C.steel)));
  const mfc = box(0.45, 0.32, 0.3, M(C.dark)); mfc.position.set(-3.1, 0.3, 0.9); put('gas', mfc);
  put('gas', tube([-4.0, 0.3, 0.9], [-4.0, -0.15, 0.9], 0.06, M(C.steel)));
  const bottle = cyl(0.3, 2.5, M(C.gasBottle, { metalness: 0.2, roughness: 0.6 })); bottle.position.set(-4.0, -1.68, 0.9); put('gas', bottle);
  const cap = cyl(0.14, 0.28, M(C.steelDark)); cap.position.set(-4.0, -0.3, 0.9); put('gas', cap);
  const gasDots = new T.Group(); scene.add(gasDots);
  for (let i = 0; i < 12; i++) { const d = new T.Mesh(new T.SphereGeometry(0.045, 8, 8), new T.MeshBasicMaterial({ color: C.plasma })); d.userData.k = i / 12; gasDots.add(d); }

  // ---------- magnetron guns + shutters ----------
  // each gun hangs from a port in the lid, its axis tipped 20° toward the center
  const guns = [];
  [[-0.95, 1, C.ti], [0.95, -1, C.cu]].forEach(([x, s, tc]) => {
    const g = new T.Group(); g.position.set(x, TOP + 0.09, 0); g.rotation.z = (s * 20 * Math.PI) / 180; scene.add(g);
    const collar = cyl(0.44, 0.22, M(C.steelDark)); collar.position.y = 0.1; put('guns', collar, g);
    const body = cyl(0.34, 0.75, M(C.dark)); body.position.y = 0.55; put('guns', body, g);
    const plug = cyl(0.12, 0.25, M(C.steelDark)); plug.position.y = 1.05; put('guns', plug, g);
    const neck = cyl(0.3, 0.55, M(C.steel)); neck.position.y = -0.27; put('guns', neck, g);
    const shield = new T.Mesh(new T.CylinderGeometry(0.42, 0.42, 0.12, 48, 1, true), M(C.steelDark, { side: T.DoubleSide })); shield.position.y = -0.58; put('guns', shield, g);
    const target = cyl(0.36, 0.06, M(tc, { metalness: 0.8, roughness: 0.3 })); target.position.y = -0.58; put('guns', target, g);
    const pl = new T.Mesh(new T.SphereGeometry(0.4, 28, 18), new T.MeshBasicMaterial({ color: C.plasma, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending }));
    pl.scale.set(1, 0.36, 1); pl.position.y = -0.74; g.add(pl); (parts.plasma = parts.plasma || []).push(pl);
    // shutter: a post from the lid, an arm, and a paddle that swings away
    const pivot = new T.Group(); pivot.position.set(s * -0.62, -0.95, 0.12); g.add(pivot);
    const post = tube([0, 0, 0], [0, 0.95, 0], 0.035, M(C.steel)); pivot.add(post); reg('shutters', post);
    const arm = tube([0, 0, 0], [s * 0.62, 0, -0.12], 0.03, M(C.steel)); pivot.add(arm); reg('shutters', arm);
    const paddle = cyl(0.42, 0.025, M(C.steel)); paddle.position.set(s * 0.62, 0, -0.12); pivot.add(paddle); reg('shutters', paddle);
    guns.push({ g, pl, pivot, target, s });
  });

  // ---------- sample holder, heater, sample ----------
  const plate = cyl(0.85, 0.1, M(C.steel)); plate.position.y = -0.95; put('holder', plate);
  const sample = box(0.55, 0.05, 0.55, M(C.mgo, { metalness: 0.05, roughness: 0.15, transparent: true, opacity: 0.92 })); sample.position.y = -0.875; put('holder', sample);
  for (const [cx, cz] of [[0.36, 0], [-0.36, 0], [0, 0.36], [0, -0.36]]) { const clip = box(cx ? 0.14 : 0.3, 0.03, cx ? 0.3 : 0.14, M(C.steelDark)); clip.position.set(cx * 1.05, -0.86, cz * 1.05); put('holder', clip); }
  const heater = new T.Mesh(new T.TorusGeometry(0.55, 0.045, 10, 48), new T.MeshStandardMaterial({ color: C.heater, emissive: C.heater, emissiveIntensity: 0.35 }));
  heater.rotation.x = Math.PI / 2; heater.position.y = -1.06; put('holder', heater);
  put('holder', tube([0, -1.0, 0], [0, BOT - 0.18, 0], 0.08, M(C.steel)));
  const motor = cyl(0.28, 0.42, M(C.dark)); motor.position.y = BOT - 0.4; put('holder', motor);
  const holderSpin = [plate, sample];

  // ---------- quartz crystal thickness monitor ----------
  put('qcm', tube([1.25, BOT, 0.6], [1.25, -0.72, 0.6], 0.04, M(C.steel)));
  const qHead = cyl(0.14, 0.16, M(C.ti, { metalness: 0.75 })); qHead.position.set(1.25, -0.64, 0.6); put('qcm', qHead);
  const quartz = cyl(0.09, 0.02, M(0xece6d2, { metalness: 0.1 })); quartz.position.set(1.25, -0.555, 0.6); put('qcm', quartz, scene, { outline: false });

  // ---------- flying atoms ----------
  const atoms = [];
  const atomMat = new T.MeshBasicMaterial({ color: C.ink });
  for (let i = 0; i < 46; i++) { const a = new T.Mesh(new T.SphereGeometry(0.032, 8, 8), atomMat); a.visible = false; scene.add(a); atoms.push({ m: a, t: -Math.random(), from: new T.Vector3(), to: new T.Vector3() }); }

  // ---------- highlighting: tint the part and turn its outlines orange ----------
  const meshes = Object.entries(parts).flatMap(([, list]) => list);
  meshes.forEach((m) => { if (m.material && m.material.emissive && m !== heater) { m.material = m.material.clone(); m.userData.e0 = m.material.emissive.getHex(); m.userData.i0 = m.material.emissiveIntensity; } });
  function highlight(name) {
    meshes.forEach((m) => {
      if (!m.material || !m.material.emissive || m === heater) return;
      const on = name && m.userData.part === name;
      m.material.emissive.setHex(on ? C.accent : m.userData.e0);
      m.material.emissiveIntensity = on ? 0.32 : m.userData.i0;
    });
    outlines.forEach((o) => {
      const on = name && o.userData.part === name;
      o.material.color.setHex(on ? C.accent : C.ink);
      o.material.opacity = on ? 0.9 : 0.22;
    });
    wall.material.opacity = name === 'chamber' ? 0.24 : 0.12;
  }

  // ---------- camera ----------
  let cur = null, from = null, to = null, t0 = 0;
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
    $('#tourNext').textContent = idx === SLIDES.length - 1 ? 'See an example run' : 'Next';
    [...dots.children].forEach((d, k) => d.setAttribute('aria-current', k === idx ? 'step' : 'false'));
    highlight(s.part);
    const target = { f: new T.Vector3(...s.cam.f), d: s.cam.d, t: s.cam.t, p: s.cam.p };
    if (!cur || reduce) { cur = target; from = null; } else { from = { f: cur.f.clone(), d: cur.d, t: cur.t, p: cur.p }; to = target; t0 = performance.now(); }
    drag = { t: 0, p: 0 };
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
    const pr = renderer.getPixelRatio();
    if (canvas.width !== Math.round(w * pr) || canvas.height !== Math.round(h * pr)) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  }
  const ACTIVE = 1; // gun 2 does the coating in the tour
  const src = new T.Vector3();
  function frame(now) {
    resize();
    if (from && to) {
      const k = ease((now - t0) / DUR);
      cur = { f: from.f.clone().lerp(to.f, k), d: from.d + (to.d - from.d) * k, t: from.t + (to.t - from.t) * k, p: from.p + (to.p - from.p) * k };
      if (k >= 1) from = null;
    }
    placeCamera();
    const part = SLIDES[idx].part;
    const lit = idx >= 6;
    const coating = part === 'run' || part === 'holder' || part === 'qcm';
    guns.forEach((g, i) => {
      g.pl.material.opacity = lit && (i === ACTIVE || part === 'plasma') ? 0.55 + 0.12 * Math.sin(now / 180 + i) : 0;
      const want = coating && i === ACTIVE ? g.s * 1.5 : 0;   // swing the paddle aside
      g.pivot.rotation.y += (want - g.pivot.rotation.y) * (reduce ? 1 : 0.12);
    });
    if (!reduce) fan.rotation.y += 0.3;
    if (!reduce && (part === 'holder' || part === 'run')) holderSpin.forEach((m) => (m.rotation.y += 0.01));
    gasDots.children.forEach((d) => { const k = (d.userData.k + now / 4200) % 1; d.position.set(-3.95 + k * 1.75, 0.3, 0.9); d.visible = part === 'gas' || part === 'run'; });
    guns[ACTIVE].target.getWorldPosition(src);
    atoms.forEach((a) => {
      a.t += 0.012;
      if (a.t >= 1) { a.t = 0; a.from.copy(src).add(new T.Vector3((Math.random() - 0.5) * 0.45, -0.08, (Math.random() - 0.5) * 0.45)); a.to.set((Math.random() - 0.5) * 0.5, -0.85, (Math.random() - 0.5) * 0.5); }
      a.m.visible = coating && !reduce && a.t >= 0;
      if (a.m.visible) a.m.position.copy(a.from).lerp(a.to, a.t);
    });
    renderer.render(scene, camera);
    placeLabel();
    requestAnimationFrame(frame);
  }
  go(0);
  requestAnimationFrame(frame);
})();

/*
 * lattice.js — the crystallography + drawing engine shared by both pages.
 *
 * Big idea: a plane with Miller indices (h k l) is the set of points r where
 *   G · r = n   (n = any integer)
 * and G = h*b1 + k*b2 + l*b3 is the reciprocal-lattice vector.
 * So |G| = 1/d (the interplanar spacing) and G points along the plane normal.
 * Everything else here is geometry: slice that plane through the unit cell
 * and draw the slice.
 */
(function (root) {
  // ---------- tiny 3-vector helpers ----------
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const len = (a) => Math.sqrt(dot(a, a));
  const unit = (a) => scale(a, 1 / len(a));

  // ---------- lattices ----------
  // type: 'cubic' or 'hexagonal'. a and c in ångströms.
  function makeLattice(type, a, c) {
    let A1, A2, A3, verts, edges, origin;
    if (type === 'cubic') {
      A1 = [a, 0, 0]; A2 = [0, a, 0]; A3 = [0, 0, a];
      verts = [];
      for (let x = 0; x < 2; x++)
        for (let y = 0; y < 2; y++)
          for (let z = 0; z < 2; z++) verts.push([x * a, y * a, z * a]);
      edges = [];
      for (let i = 0; i < 8; i++)
        for (let j = i + 1; j < 8; j++) {
          const d = sub(verts[i], verts[j]);
          const nonzero = d.filter((v) => Math.abs(v) > 1e-9).length;
          if (nonzero === 1) edges.push([i, j]);
        }
      origin = [0, 0, 0];
    } else {
      // Hexagonal: a1 and a2 at 120°, c vertical. We draw the familiar
      // hexagonal prism (three primitive cells) so the 6-fold symmetry shows.
      A1 = [a, 0, 0];
      A2 = [-a / 2, (a * Math.sqrt(3)) / 2, 0];
      A3 = [0, 0, c];
      const ring = [A1, add(A1, A2), A2, scale(A1, -1), scale(add(A1, A2), -1), scale(A2, -1)];
      verts = [...ring.map((p) => [p[0], p[1], 0]), ...ring.map((p) => [p[0], p[1], c])];
      edges = [];
      for (let i = 0; i < 6; i++) {
        edges.push([i, (i + 1) % 6]);         // bottom hexagon
        edges.push([i + 6, ((i + 1) % 6) + 6]); // top hexagon
        edges.push([i, i + 6]);               // vertical edges
      }
      origin = [0, 0, 0];
    }
    // Reciprocal vectors (crystallographer's convention, no 2π)
    const vol = dot(A1, cross(A2, A3));
    const B1 = scale(cross(A2, A3), 1 / vol);
    const B2 = scale(cross(A3, A1), 1 / vol);
    const B3 = scale(cross(A1, A2), 1 / vol);
    return { type, a, c, A1, A2, A3, B1, B2, B3, verts, edges, origin };
  }

  // hkl are always the 3 independent indices. For hexagonal, i = -(h + k).
  function gVector(lat, hkl) {
    const [h, k, l] = hkl;
    return add(add(scale(lat.B1, h), scale(lat.B2, k)), scale(lat.B3, l));
  }

  function dSpacing(lat, hkl) {
    const g = len(gVector(lat, hkl));
    return g === 0 ? NaN : 1 / g;
  }

  // Angle between two planes = angle between their normals (0–90°)
  function planeAngle(lat, hkl1, hkl2) {
    const g1 = gVector(lat, hkl1), g2 = gVector(lat, hkl2);
    const c = Math.abs(dot(g1, g2)) / (len(g1) * len(g2));
    return (Math.acos(Math.min(1, c)) * 180) / Math.PI;
  }

  // ---------- directions [uvw] ----------
  // A direction [uvw] is the vector u·a1 + v·a2 + w·a3 (3-index form).
  // Hexagonal crystals are usually written as [U V T W] with T = −(U + V);
  // the page passes the independent U, V, W and we convert:
  //   u = U − T = 2U + V,  v = V − T = U + 2V,  w = W
  function toThreeIndex(type, idx) {
    if (type !== 'hexagonal') return idx.slice();
    const [U, V, W] = idx;
    return [2 * U + V, U + 2 * V, W];
  }
  function dirVector(lat, idx) {
    const [u, v, w] = toThreeIndex(lat.type, idx);
    return add(add(scale(lat.A1, u), scale(lat.A2, v)), scale(lat.A3, w));
  }
  // Repeat distance in Å: how far you travel along the direction before reaching
  // the next identical lattice point (the shortest lattice vector along it).
  const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
  function latticeStep(lat, idx) {
    const t = toThreeIndex(lat.type, idx);
    const g = t.reduce((m, v) => gcd(m, v), 0) || 1;
    const [u, v, w] = t.map((x) => x / g);
    return add(add(scale(lat.A1, u), scale(lat.A2, v)), scale(lat.A3, w));
  }
  function dirLength(lat, idx) { return len(latticeStep(lat, idx)); }
  // Angle between two directions (0–180°)
  function dirAngle(lat, d1, d2) {
    const a = dirVector(lat, d1), b = dirVector(lat, d2);
    return (Math.acos(Math.max(-1, Math.min(1, dot(a, b) / (len(a) * len(b))))) * 180) / Math.PI;
  }
  // Angle between a direction and a plane's normal (0–90°). 90° means the
  // direction lies in the plane; 0° means it points straight out of it.
  function dirToNormal(lat, d, hkl) {
    const a = dirVector(lat, d), g = gVector(lat, hkl);
    return (Math.acos(Math.min(1, Math.abs(dot(a, g)) / (len(a) * len(g)))) * 180) / Math.PI;
  }
  // Weiss zone law: [uvw] lies in (hkl) when h·u + k·v + l·w = 0 (3-index forms)
  function inPlane(lat, d, hkl) {
    const [u, v, w] = toThreeIndex(lat.type, d);
    return hkl[0] * u + hkl[1] * v + hkl[2] * w === 0;
  }
  function dirNotation(type, idx) {
    const [a, b, c] = idx;
    const nums = type === 'hexagonal' ? [a, b, -(a + b), c] : [a, b, c];
    return '[' + nums.map((v) => (v < 0 ? `<span class="bar">${Math.abs(v)}</span>` : `<span>${v}</span>`)).join('') + ']';
  }

  // Slice every plane G·r = n that passes through the cell.
  // A flat plane cut through a convex box is a convex polygon whose corners
  // lie on the box's edges, so we intersect the plane with each edge.
  function planeFamily(lat, hkl, maxPlanes = 9) {
    const g = gVector(lat, hkl);
    if (len(g) < 1e-12) return [];
    const vals = lat.verts.map((v) => dot(g, v));
    const lo = Math.ceil(Math.min(...vals) - 1e-9);
    const hi = Math.floor(Math.max(...vals) + 1e-9);
    const normal = unit(g);
    let polys = [];
    for (let n = lo; n <= hi; n++) {
      const pts = [];
      for (const [i, j] of lat.edges) {
        const den = vals[j] - vals[i];
        if (Math.abs(den) < 1e-12) continue;
        const t = (n - vals[i]) / den;
        if (t < -1e-9 || t > 1 + 1e-9) continue;
        const p = add(lat.verts[i], scale(sub(lat.verts[j], lat.verts[i]), t));
        if (!pts.some((q) => len(sub(p, q)) < 1e-6)) pts.push(p);
      }
      if (pts.length < 3) continue;
      // order corners around the polygon's center
      const ctr = scale(pts.reduce(add, [0, 0, 0]), 1 / pts.length);
      const ref = Math.abs(normal[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
      const u = unit(cross(normal, ref));
      const w = cross(normal, u);
      pts.sort((p, q) => {
        const dp = sub(p, ctr), dq = sub(q, ctr);
        return Math.atan2(dot(dp, w), dot(dp, u)) - Math.atan2(dot(dq, w), dot(dq, u));
      });
      // drop slivers that only graze an edge or corner
      let area = 0;
      for (let k = 0; k < pts.length; k++) {
        area += dot(cross(sub(pts[k], ctr), sub(pts[(k + 1) % pts.length], ctr)), normal);
      }
      if (Math.abs(area) / 2 < 1e-3 * lat.a * lat.a) continue;
      polys.push({ n, pts });
    }
    if (polys.length > maxPlanes) {
      const step = polys.length / maxPlanes;
      polys = Array.from({ length: maxPlanes }, (_, k) => polys[Math.floor(k * step + step / 2)]);
    }
    // the "featured" plane is the middle one
    const mid = Math.floor((polys.length - 1) / 2);
    polys.forEach((p, k) => (p.featured = k === mid));
    return polys;
  }

  // Axis intercepts in units of each lattice vector (∞ when the index is 0)
  function intercepts(lat, hkl) {
    const [h, k, l] = hkl;
    const f = (v) => (v === 0 ? '∞' : fmtFrac(1 / v));
    if (lat.type === 'cubic') return [['a', f(h)], ['b', f(k)], ['c', f(l)]];
    return [['a₁', f(h)], ['a₂', f(k)], ['a₃', f(-(h + k))], ['c', f(l)]];
  }
  function fmtFrac(x) {
    if (Number.isInteger(x)) return String(x);
    const inv = 1 / x;
    if (Number.isInteger(Math.round(inv * 1e6) / 1e6)) return (x < 0 ? '−' : '') + '1/' + Math.abs(Math.round(inv));
    return x.toFixed(3);
  }

  // (h k l) or (h k i l) with overbars for negatives, as HTML
  function notation(type, hkl, brackets = '()') {
    const [h, k, l] = hkl;
    const nums = type === 'hexagonal' ? [h, k, -(h + k), l] : [h, k, l];
    const parts = nums.map((v) =>
      v < 0 ? `<span class="bar">${Math.abs(v)}</span>` : `<span>${v}</span>`
    );
    return `${brackets[0]}${parts.join('')}${brackets[1]}`;
  }

  // ---------- drawing ----------
  function cssVar(name, fallback) {
    if (typeof getComputedStyle === 'undefined') return fallback;
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function project(p, view, center, s, W, H) {
    const q = sub(p, center);
    const cy = Math.cos(view.yaw), sy = Math.sin(view.yaw);
    const x = q[0] * cy - q[1] * sy;
    const y = q[0] * sy + q[1] * cy;
    const cp = Math.cos(view.pitch), sp = Math.sin(view.pitch);
    const y2 = y * cp - q[2] * sp;
    const z2 = y * sp + q[2] * cp;
    return [W / 2 + x * s, H / 2 - z2 * s, y2];
  }

  // planes: [{hkl, color}]  — color is a CSS custom property name
  function render(canvas, lat, planes, view, opts = {}) {
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth, H = canvas.clientHeight;
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const center = scale(lat.verts.reduce(add, [0, 0, 0]), 1 / lat.verts.length);
    const radius = Math.max(...lat.verts.map((v) => len(sub(v, center))));
    const s = (Math.min(W, H) * (opts.fill || 0.4)) / radius;
    const P = (p) => project(p, view, center, s, W, H);

    const cellColor = cssVar('--cell', '#889');
    const fg = cssVar('--fg', '#111');
    const muted = cssVar('--muted', '#666');
    const font = cssVar('--font-mono', 'monospace');

    // back edges first (dashed), front edges last (solid)
    const edgeDepth = lat.edges.map(([i, j]) => (P(lat.verts[i])[2] + P(lat.verts[j])[2]) / 2);
    const mean = edgeDepth.reduce((a, b) => a + b, 0) / edgeDepth.length;
    const drawEdges = (back) => {
      ctx.strokeStyle = cellColor;
      ctx.lineWidth = back ? 1 : 1.5;
      ctx.setLineDash(back ? [3, 4] : []);
      lat.edges.forEach(([i, j], k) => {
        if ((edgeDepth[k] > mean) !== back) return;
        const a = P(lat.verts[i]), b = P(lat.verts[j]);
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      });
      ctx.setLineDash([]);
    };
    drawEdges(true);

    // gather all polygons from all requested planes, sort far → near
    const polys = [];
    planes.forEach((pl, idx) => {
      if (!pl || pl.hidden) return;
      const color = cssVar(pl.color, idx ? '#d80' : '#25f');
      planeFamily(lat, pl.hkl, opts.maxPlanes || 9).forEach((poly) => {
        const pr = poly.pts.map(P);
        const depth = pr.reduce((a, p) => a + p[2], 0) / pr.length;
        polys.push({ pr, depth, color, featured: poly.featured, showFamily: pl.showFamily !== false });
      });
    });
    polys.sort((a, b) => b.depth - a.depth);
    for (const p of polys) {
      if (!p.featured && !p.showFamily) continue;
      ctx.beginPath();
      p.pr.forEach((q, k) => (k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
      ctx.closePath();
      ctx.globalAlpha = p.featured ? 0.42 : 0.1;
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.globalAlpha = p.featured ? 1 : 0.45;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.featured ? 2 : 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    drawEdges(false);

    // direction arrows: drawn from the origin, scaled down if they would leave the picture
    (opts.directions || []).forEach((d) => {
      if (!d || d.hidden) return;
      let v = latticeStep(lat, d.uvw);
      const L = len(v);
      if (L < 1e-9) return;
      if (L > radius * 1.5) v = scale(v, (radius * 1.5) / L);
      const o = P(lat.origin), tip = P(add(lat.origin, v));
      const color = cssVar(d.color, '#12867f');
      ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 4; ctx.lineCap = 'round';
      const ang = Math.atan2(tip[1] - o[1], tip[0] - o[0]);
      ctx.beginPath(); ctx.moveTo(o[0], o[1]); ctx.lineTo(tip[0] - 9 * Math.cos(ang), tip[1] - 9 * Math.sin(ang)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tip[0], tip[1]);
      ctx.lineTo(tip[0] - 15 * Math.cos(ang - 0.42), tip[1] - 15 * Math.sin(ang - 0.42));
      ctx.lineTo(tip[0] - 15 * Math.cos(ang + 0.42), tip[1] - 15 * Math.sin(ang + 0.42));
      ctx.closePath(); ctx.fill(); ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.arc(o[0], o[1], 4, 0, 6.29); ctx.fill();
    });

    // lattice-vector arrows from the origin
    if (opts.axes !== false) {
      const axes = lat.type === 'cubic'
        ? [[lat.A1, 'a'], [lat.A2, 'b'], [lat.A3, 'c']]
        : [[lat.A1, 'a₁'], [lat.A2, 'a₂'], [scale(add(lat.A1, lat.A2), -1), 'a₃'], [lat.A3, 'c']];
      const o = P(lat.origin);
      ctx.font = `600 12px ${font}`;
      for (const [vec, label] of axes) {
        const tip = P(add(lat.origin, scale(vec, label === 'c' && lat.type === 'hexagonal' ? 0.35 : 0.45)));
        ctx.strokeStyle = fg; ctx.fillStyle = fg; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(o[0], o[1]); ctx.lineTo(tip[0], tip[1]); ctx.stroke();
        const ang = Math.atan2(tip[1] - o[1], tip[0] - o[0]);
        ctx.beginPath();
        ctx.moveTo(tip[0], tip[1]);
        ctx.lineTo(tip[0] - 7 * Math.cos(ang - 0.4), tip[1] - 7 * Math.sin(ang - 0.4));
        ctx.lineTo(tip[0] - 7 * Math.cos(ang + 0.4), tip[1] - 7 * Math.sin(ang + 0.4));
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = muted;
        ctx.fillText(label, tip[0] + 6 * Math.cos(ang) + 3, tip[1] + 6 * Math.sin(ang) + 4);
      }
    }
  }

  // Drag-to-rotate controller. getScene() returns {lat, planes, opts}.
  function attachViewer(canvas, getScene, init = {}) {
    const view = { yaw: init.yaw ?? -0.6, pitch: init.pitch ?? 0.32 };
    let drag = null, raf = 0, spinning = !!init.autoSpin;
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) spinning = false;
    const draw = () => {
      const sc = getScene();
      render(canvas, sc.lat, sc.planes, view, sc.opts || {});
    };
    const tick = () => {
      if (spinning && !drag) { view.yaw += 0.0035; draw(); }
      raf = requestAnimationFrame(tick);
    };
    canvas.addEventListener('pointerdown', (e) => {
      drag = { x: e.clientX, y: e.clientY, yaw: view.yaw, pitch: view.pitch };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!drag) return;
      view.yaw = drag.yaw + (e.clientX - drag.x) * 0.01;
      view.pitch = Math.max(-1.4, Math.min(1.4, drag.pitch + (e.clientY - drag.y) * 0.01));
      draw();
    });
    const end = () => { drag = null; };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(draw).observe(canvas);
    if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', draw);
    new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    draw();
    if (init.autoSpin && !reduce) raf = requestAnimationFrame(tick);
    return {
      redraw: draw,
      view,
      setView(v) { Object.assign(view, v); draw(); },
      setSpin(on) { spinning = on && !reduce; },
    };
  }

  const api = { makeLattice, gVector, dSpacing, planeAngle, planeFamily, intercepts, notation, render, attachViewer,
    toThreeIndex, dirVector, dirLength, dirAngle, dirToNormal, inPlane, dirNotation };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Lattice = api;
})(typeof window !== 'undefined' ? window : globalThis);

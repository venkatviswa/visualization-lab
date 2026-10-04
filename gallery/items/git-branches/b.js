// three.js: the same git story in 3D. Branches are glowing rails at different depths, commits are glowing spheres
// with HTML labels, and the merge, rebase or squash animates in. seek(t) sets the exact state; the loop only renders it.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const K = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', main: '#0f766e', feat: '#b4530f', accent: '#2b59c3', warn: '#c2410c', good: '#1f7a4d' };
const TONE = { accent: K.accent, good: K.good, warn: K.warn };
const PRC = { 'Open': K.accent, 'Changes requested': K.feat, 'Approved': K.good, 'Conflict': K.warn, 'Ready to merge': K.good, 'Merged': K.good };
let root, renderer, scene, camera, controls, ro, M, T = 0, byId = {}, G, L, ov, hd, nar, haloTex, objs = [], edges = [], extra = {}, lastSize = '';
const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = k => k * k * (3 - 2 * k);
const back = k => k <= 0 ? 0 : 1 + 2.70158 * Math.pow(k - 1, 3) + 1.70158 * Math.pow(k - 1, 2);
const laneAt = c => { const to = c.lane === 'main' ? 0 : 1; if (c.moveAt == null) return to; const from = c.fromLane === 'main' ? 0 : 1; return from + (to - from) * ease(cl((T - c.moveAt) / 0.9)); };
const appear = c => c.squashOf ? c.born + 0.8 : c.born;
const popK = c => c.born === 0 ? 1 : cl((T - appear(c)) / 0.35);
const ghost = c => c.ghostAt != null && T >= c.ghostAt ? 1 - 0.7 * ease(cl((T - c.ghostAt) / 0.6)) : 1;
const isGhost = c => c.ghostAt != null && T >= c.ghostAt;
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
const chip = (s, color, filled) => `<span style="display:inline-block;padding:1px 8px;border-radius:10px;font:600 11px system-ui,sans-serif;white-space:nowrap;border:1px solid ${color};color:${filled ? '#fff' : color};background:${filled ? color : '#fff'}">${esc(s)}</span>`;
const div = (css, html) => { const d = document.createElement('div'); d.style.cssText = css; if (html) d.innerHTML = html; ov.appendChild(d); return d; };

function layout() {
  const W = root.clientWidth, H = root.clientHeight, vert = W / H < 0.85, n = M.columns, fov = 35, tn = Math.tan(fov * Math.PI / 360), A = W / H;
  const headB = 40 + (vert ? 3 : 2) * 17, ny = H - (vert ? 150 : 100), hA = ny - headB;
  let P, D, dir, U, S;
  if (!vert) {
    S = 1.3; U = new THREE.Vector3(1, 0, 0); const x0 = -(n - 1) * S / 2;
    P = (col, lf) => new THREE.Vector3(x0 + col * S, -1.05 + 2.1 * lf, -1.4 * lf);
    D = Math.max(((n - 1) * S + 3.2) / (2 * tn * A), 5.4 * H / (2 * tn * hA));
    dir = new THREE.Vector3(0.12, 0.42, 1).normalize();
  } else {
    S = 1.0; U = new THREE.Vector3(0, -1, 0); const y0 = (n - 1) * S / 2;
    D = ((n - 1) * S + 2.2) * H / (2 * tn * hA);
    const mx = -D * tn * A * 0.78;
    P = (col, lf) => new THREE.Vector3(mx + 1.25 * lf, y0 - col * S, -0.9 * lf);
    dir = new THREE.Vector3(0.16, 0.12, 1).normalize();
  }
  return { W, H, vert, P, D, dir, U, S, shift: H / 2 - (headB + ny) / 2 - (vert ? 10 : 0) };
}
function tube(curve, r, color, op, seg = 48) {
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, seg, r, 8, false), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: op > 0.5 }));
  G.add(m); return m;
}
function edgeCurve(a, b) {
  const U = L.U, ua = a.dot(U), ub = b.dot(U);
  if (a.distanceTo(b.clone().addScaledVector(U, ua - ub)) < 0.01) return new THREE.LineCurve3(a, b);
  const h = (ub - ua) / 2; // in 3D a cross-lane edge is one smooth S-curve, so it never runs inside another rail
  return new THREE.CubicBezierCurve3(a, a.clone().addScaledVector(U, h), b.clone().addScaledVector(U, -h), b);
}
function clear() {
  if (G) { G.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); scene.remove(G); }
  if (ov) ov.querySelectorAll('.gl').forEach(d => d.remove());
  objs = []; edges = []; extra = {};
}
function build() {
  clear(); L = layout(); G = new THREE.Group(); scene.add(G);
  const { P, vert, n = M.columns } = L, fork = byId[M.forkId];
  camera.aspect = L.W / L.H; camera.setViewOffset(L.W, L.H, 0, L.shift, L.W, L.H);
  controls.target.set(0, vert ? 0 : -0.1, -0.6); camera.position.copy(controls.target).addScaledVector(L.dir, L.D); camera.updateProjectionMatrix(); controls.update();
  // Rails: a bright core inside a soft glow
  const rail = (a, b, color) => [tube(new THREE.LineCurve3(a, b), 0.035, color, 0.55, 4), tube(new THREE.LineCurve3(a, b), 0.13, color, 0.1, 4)];
  extra.mainRail = rail(P(-0.5, 0), P(n - 0.5, 0), K.main);
  extra.featRail = rail(P(fork.col + 0.5, 1), P(n - 0.5, 1), K.feat);
  const lane = (txt, at, color) => div(`position:absolute;left:0;top:0;font:700 12px/1.2 system-ui,sans-serif;color:${color};text-align:${vert ? 'center' : 'right'};pointer-events:none`, txt);
  extra.laneMain = { el: lane('main', 0, K.main), p: vert ? P(-0.85, 0) : P(-0.55, 0) };
  extra.laneFeat = { el: lane(vert ? 'feature' : 'feature/<br>csv-export', 1, K.feat), p: vert ? P(-0.85, 1) : P(-0.55, 1) };
  [extra.laneMain.el, extra.laneFeat.el].forEach(e => e.classList.add('gl'));
  // Commits: glowing spheres with a halo sprite and an HTML label
  M.commits.forEach(c => {
    const big = (c.parents || []).length === 2 || c.squashOf;
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(big ? 0.28 : 0.21, 32, 20), new THREE.MeshStandardMaterial({ color: K.main, emissive: K.main, emissiveIntensity: 0.35, roughness: 0.35, metalness: 0.05, transparent: true }));
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: K.main, transparent: true, depthWrite: false, opacity: 0.5 }));
    G.add(mesh, halo);
    if (big) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.025, 8, 48), new THREE.MeshBasicMaterial({ color: K.main, transparent: true })); mesh.add(ring); }
    const el = div('position:absolute;left:0;top:0;font:11.5px/1.25 system-ui,sans-serif;color:#1d2433;pointer-events:none;text-shadow:0 0 3px #fff,0 0 3px #fff');
    el.classList.add('gl'); objs.push({ c, mesh, halo, el, r: big ? 0.42 : 0.21, p: new THREE.Vector3(), pf: new THREE.Vector3() });
    (c.parents || []).forEach(pid => edges.push({ c, p: byId[pid], mesh: null, key: '' }));
  });
  // Pulse ring on the commit of the current step, conflict link, squash dots
  extra.pulse = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.35, 48), new THREE.MeshBasicMaterial({ color: K.feat, transparent: true, side: THREE.DoubleSide, depthWrite: false })); G.add(extra.pulse);
  extra.cLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]), new THREE.LineDashedMaterial({ color: K.warn, dashSize: 0.15, gapSize: 0.1, transparent: true }));
  extra.cBall = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 14), new THREE.MeshBasicMaterial({ color: K.warn, transparent: true }));
  extra.cTag = div('position:absolute;left:0;top:0;pointer-events:none'); extra.cTag.classList.add('gl');
  G.add(extra.cLine, extra.cBall);
  extra.dots = (byId[M.tipId].squashOf || []).map(() => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 10), new THREE.MeshBasicMaterial({ color: K.feat })); G.add(d); return d; });
  objs.forEach(o => { o.colPx = 0; });
  apply();
}
function apply() {
  if (!M) return;
  const cur = M.events.filter(e => e.t <= T + 1e-6).pop() || M.events[0], done = T >= M.duration - 1.0 - 1e-6;
  // Header and narrator
  const styleName = { merge: 'merge commit', rebase: 'rebase and merge', squash: 'squash and merge' }[M.style];
  hd.lastChild.textContent = done ? M.summary : (M.hotfix ? 'Hotfix on main, ' + (M.sameFile ? 'same file changed' : 'different files') : 'No hotfix on main') + ', ' + styleName + '. Drag to turn the graph.';
  hd.lastChild.style.color = done ? K.ink : K.muted;
  if (!L) return;
  const posOf = c => L.P(c.col, laneAt(c));
  const notes = M.notes.filter(x => T >= x.from && T < x.to), vert = L.vert;
  const who = M.people[cur.actor];
  nar.innerHTML = `<div style="flex:none;width:26px;height:26px;border-radius:50%;background:${who.color};color:#fff;font:700 13px/26px system-ui;text-align:center">${who.name[0]}</div>` +
    `<div style="flex:1;min-width:0"><div style="display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center"><span><b>${who.name}</b> <span style="color:${K.muted};font-size:12px">· ${who.role}</span></span>` +
    (cur.pr !== 'None' ? chip('PR #42 · ' + cur.pr, PRC[cur.pr], cur.pr === 'Merged') : '') +
    `<span style="margin-left:auto;color:${K.muted};font:11.5px ui-monospace,monospace">${cur.clock}${vert ? '' : ' · step ' + (cur.i + 1) + ' of ' + M.events.length}</span></div>` +
    `<div style="margin-top:4px;font-size:12.5px;line-height:1.4">${esc(cur.caption)}</div></div>`;
  // Rails and lane names
  const featOp = T < M.branchT ? 0 : T >= M.deleteT ? 0.3 : ease(cl((T - M.branchT) / 0.6));
  extra.featRail.forEach((m, i) => { m.material.opacity = (i ? 0.1 : 0.55) * featOp; m.visible = featOp > 0; });
  extra.laneFeat.el.style.opacity = T < M.branchT ? 0 : 1;
  extra.laneFeat.el.style.color = T >= M.deleteT ? K.muted : K.feat;
  extra.laneFeat.el.innerHTML = (vert ? 'feature' : 'feature/<br>csv-export') + (T >= M.deleteT ? '<br><span style="font-weight:400;font-size:11px">(deleted)</span>' : '');
  // Commits
  objs.forEach(o => {
    const c = o.c, vis = T >= appear(c) - 1e-6;
    o.mesh.visible = o.halo.visible = o.shown = vis;
    if (!vis) { o.el.style.display = 'none'; return; }
    const lf = laneAt(c), color = lf > 0.5 ? K.feat : K.main, s = Math.max(0.001, back(popK(c))), gh = isGhost(c), op = ghost(c);
    o.p.copy(posOf(c)); o.pf.copy(L.P(c.col, 1)); o.up = lf > 0.5;
    o.mesh.position.copy(o.p); o.halo.position.copy(o.p); o.mesh.scale.setScalar(s); o.halo.scale.setScalar(1.25 * s);
    o.mesh.material.color.set(gh ? '#ffffff' : color); o.mesh.material.emissive.set(color); o.mesh.material.emissiveIntensity = gh ? 0.15 : 0.35; o.mesh.material.opacity = op;
    o.mesh.children.forEach(r => { r.material.color.set(color); r.material.opacity = op; });
    o.halo.material.color.set(color); o.halo.material.opacity = gh ? 0 : 0.55;
    const note = notes.find(x => x.commit === c.id), nh = note ? chip(note.text, TONE[note.tone]) : '';
    const idh = `<span style="font:11px ui-monospace,monospace;color:${K.muted}">${c.id}</span>`, mh = `<span style="color:${gh ? K.muted : K.ink}">${esc(c.msg)}</span>`;
    o.el.innerHTML = vert ? `<div style="white-space:nowrap">${idh} ${mh}</div>${nh ? '<div style="margin-top:2px">' + nh + '</div>' : ''}`
      : (o.up ? `${nh ? '<div style="margin-bottom:3px">' + nh + '</div>' : ''}<div>${mh}</div>${idh}` : `${idh}<div>${mh}</div>${nh ? '<div style="margin-top:3px">' + nh + '</div>' : ''}`);
    o.el.style.display = 'block'; o.el.style.opacity = op * popK(c);
  });
  // Edges: rebuilt only when an end moves; drawn in as the child commit appears
  edges.forEach(e => {
    const vis = T >= appear(e.c) - 1e-6;
    if (!vis) { if (e.mesh) e.mesh.visible = false; return; }
    const a = posOf(e.p), b = posOf(e.c), key = a.toArray().concat(b.toArray()).map(v => v.toFixed(3)).join();
    if (key !== e.key) { if (e.mesh) { e.mesh.geometry.dispose(); e.mesh.material.dispose(); G.remove(e.mesh); } e.mesh = tube(edgeCurve(a, b), 0.06, K.main, 1); e.key = key; }
    const same = Math.abs(laneAt(e.c) - laneAt(e.p)) < 0.01 && laneAt(e.c) < 0.5, k = e.c.born === 0 ? 1 : cl((T - appear(e.c)) / 0.45);
    e.mesh.visible = true; e.mesh.material.color.set(same ? K.main : K.feat); e.mesh.material.opacity = isGhost(e.c) ? 0.3 * ghost(e.c) : 1;
    e.mesh.material.depthWrite = !isGhost(e.c); e.mesh.geometry.setDrawRange(0, Math.floor(k * 48) * 48);
  });
  // Conflict link between the two commits that changed the same line
  const ci = M.conflictInfo, on = ci && T >= ci.found && T < M.mergeT + 0.6;
  extra.cLine.visible = extra.cBall.visible = !!on; extra.cTag.style.display = on ? 'block' : 'none';
  if (on) {
    const ok = T >= ci.resolved, col = ok ? K.good : K.warn, a = posOf(byId[ci.a]), b = posOf(byId[ci.b]), op = T > M.mergeT ? 1 - (T - M.mergeT) / 0.6 : cl((T - ci.found) / 0.3);
    extra.cLine.geometry.setFromPoints([a, b]); extra.cLine.computeLineDistances(); extra.cLine.material.color.set(col); extra.cLine.material.opacity = op;
    extra.mid = a.clone().lerp(b, 0.5); extra.cBall.position.copy(extra.mid); extra.cBall.material.color.set(col); extra.cBall.material.opacity = op;
    extra.cBall.scale.setScalar(ok ? 1 : 1 + 0.25 * Math.abs(Math.sin(T * 5)));
    extra.cTag.innerHTML = chip(ok ? '✓ resolved' : '! same line, src/dates.js', col, true); extra.cTag.style.opacity = op;
  }
  // Squash: the branch commits fly into one new commit
  const tip = byId[M.tipId], sq = M.style === 'squash' && T >= M.mergeT && T < M.mergeT + 0.9;
  extra.dots.forEach((d, i) => { d.visible = sq; if (sq) d.position.copy(posOf(byId[tip.squashOf[i]])).lerp(posOf(tip), ease(cl((T - M.mergeT) / 0.8))); });
  // Pulse on the current commit
  const pc = cur.commit && byId[cur.commit], pOn = pc && T < cur.t + 2 && T >= appear(pc);
  extra.pulse.visible = !!pOn;
  if (pOn) { const ph = ((T - cur.t) / 0.9) % 1; extra.pulse.position.copy(posOf(pc)); extra.pulse.scale.setScalar(1 + 1.6 * ph); extra.pulse.material.opacity = (1 - ph) * 0.8; extra.pulse.material.color.set(laneAt(pc) > 0.5 ? K.feat : K.main); }
}
const V = new THREE.Vector3();
const scr = p => { V.copy(p).project(camera); return [(V.x + 1) / 2 * L.W, (1 - V.y) / 2 * L.H, V.z < 1]; };
function frame() {
  if (!L) return;
  const sz = root.clientWidth + 'x' + root.clientHeight;
  if (sz !== lastSize) { lastSize = sz; renderer.setSize(root.clientWidth, root.clientHeight); build(); }
  controls.update();
  extra.pulse.quaternion.copy(camera.quaternion);
  const colPx = Math.abs(scr(L.P(1, 0))[0] - scr(L.P(0, 0))[0]) || 80;
  objs.forEach(o => {
    if (!o.shown) return;
    o.mesh.children.forEach(r => r.lookAt(camera.position));
    const [x, y, front] = scr(o.p), rp = Math.abs(scr(V.copy(o.p).addScaledVector(camera.up, o.r * o.mesh.scale.x))[1] - y) + 6;
    if (L.vert) { const [fx] = scr(o.pf); o.el.style.transform = `translate(${Math.max(x, fx) + 20}px,${y}px) translateY(-50%)`; o.el.style.maxWidth = (L.W - Math.max(x, fx) - 28) + 'px'; o.el.style.overflow = 'hidden'; }
    else { o.el.style.width = Math.max(64, colPx - 4) + 'px'; o.el.style.textAlign = 'center'; o.el.style.transform = `translate(${x}px,${y}px) translate(-50%,${o.up ? `calc(-100% - ${rp}px)` : rp + 'px'})`; }
    o.el.style.visibility = front ? 'visible' : 'hidden';
  });
  [extra.laneMain, extra.laneFeat].forEach((l, i) => { const [x, y] = scr(l.p); l.el.style.transform = L.vert ? `translate(${x + (i ? -8 : 8)}px,${y}px) translate(${i ? '0' : '-100%'},-100%)` : `translate(${x}px,${y}px) translate(-100%,-50%)`; l.el.style.textAlign = L.vert ? (i ? 'left' : 'right') : 'right'; });
  if (extra.mid && extra.cTag.style.display !== 'none') { const [x, y] = scr(extra.mid); extra.cTag.style.transform = `translate(${x + 14}px,${y}px) translateY(-50%)`; }
  renderer.render(scene, camera);
}
window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  seek(t) { T = cl(t, 0, M ? M.duration : 0); apply(); },
  mount(r, params) {
    root = r; M = model(params); byId = Object.fromEntries(M.commits.map(c => [c.id, c])); T = 0;
    renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.setClearColor(0xffffff);
    renderer.setSize(root.clientWidth, root.clientHeight); lastSize = root.clientWidth + 'x' + root.clientHeight;
    renderer.domElement.style.display = 'block'; renderer.domElement.setAttribute('aria-label', '3D git graph of a feature branch, a hotfix on main and a pull request being merged');
    root.appendChild(renderer.domElement);
    scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd9dee8, 2.0)); const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(3, 6, 8); scene.add(sun);
    camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
    controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.enablePan = false;
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    haloTex = new THREE.CanvasTexture(c);
    ov = document.createElement('div'); ov.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;font-family:system-ui,sans-serif;color:#1d2433'; root.appendChild(ov);
    hd = div('position:absolute;left:14px;top:9px;right:14px;z-index:2', '<div style="font:600 14px system-ui,sans-serif">Branches: a safe place to try ideas</div><div style="font-size:12.5px;line-height:1.35;margin-top:2px"></div>');
    nar = div('position:absolute;left:8px;right:8px;bottom:8px;display:flex;gap:10px;align-items:flex-start;padding:10px 12px;background:rgba(246,248,251,0.94);border:1px solid #dbe0e8;border-radius:10px;font-size:13px;z-index:2');
    apply(); build(); renderer.setAnimationLoop(frame);
    ro = new ResizeObserver(() => { lastSize = ''; }); ro.observe(root);
  },
  update(params) { M = model(params); byId = Object.fromEntries(M.commits.map(c => [c.id, c])); T = 0; build(); },
  destroy() {
    renderer.setAnimationLoop(null); ro && ro.disconnect(); clear(); controls.dispose(); haloTex.dispose(); renderer.dispose();
    root.innerHTML = ''; M = null; L = null;
  }
};

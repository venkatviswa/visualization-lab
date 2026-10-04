// three.js: chunks and the question as directions on a unit sphere (synthetic 3D embeddings).
// seek(t) sets every visual state; the render loop only redraws it (and follows the learner's orbiting).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const COL = ['#2b59c3', '#0f766e', '#b4530f'], INK = '#1d2433', MUTED = '#5b6475', R = 3;
const CAP = ['24 policy chunks as points: chunks with similar meaning point in similar directions.',
  'The question is embedded the same way: the dark diamond.',
  'Each chunk is scored by cosine similarity with the question (1 = same direction).',
  'Only the k highest scores are kept; every other chunk is ignored.'];
let root, M, T = 0, renderer, scene, camera, controls, pivot, world, ro, ui = {}, objs = null;
const clamp = x => Math.max(0, Math.min(1, x)), ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const el = (tag, css, parent, html) => { const n = document.createElement(tag); if (css) n.style.cssText = css; if (html != null) n.innerHTML = html; if (parent) parent.appendChild(n); return n; };
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const pos = v => { const b = M.basis, d = a => v[0] * a[0] + v[1] * a[1] + v[2] * a[2]; return new THREE.Vector3(d(b.e1) * R, d(b.e2) * R, d(b.n) * R); };

function disposeGroup(g) { g.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); }
function build() {
  if (objs) { disposeGroup(objs.group); world.remove(objs.group); ui.labels.innerHTML = ''; }
  const group = new THREE.Group(); world.add(group);
  const grid = new THREE.LineBasicMaterial({ color: 0xdbe0e8 });
  for (let a = 15; a <= 90; a += 15) { const r = R * Math.sin(a * Math.PI / 180), z = R * Math.cos(a * Math.PI / 180);
    group.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 96 }, (_, i) => new THREE.Vector3(r * Math.cos(i / 96 * 6.2832), r * Math.sin(i / 96 * 6.2832), z))), grid)); }
  for (let m = 0; m < 12; m++) { const ph = m / 12 * 6.2832;
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 31 }, (_, i) => { const a = i / 30 * Math.PI / 2; return new THREE.Vector3(R * Math.sin(a) * Math.cos(ph), R * Math.sin(a) * Math.sin(ph), R * Math.cos(a)); })), grid)); }
  const origin = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), new THREE.MeshBasicMaterial({ color: 0x5b6475 })); group.add(origin);
  const geo = new THREE.SphereGeometry(0.095, 24, 16);
  const chunks = M.chunks.map(c => {
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: COL[c.topic], transparent: true }));
    mesh.position.copy(pos(c.vec)); group.add(mesh);
    const badge = el('div', `position:absolute;transform:translate(9px,-60%);font:600 11px system-ui,sans-serif;color:#fff;background:${COL[c.topic]};border-radius:9px;padding:1px 6px;white-space:nowrap;opacity:0`, ui.labels, '' + c.rank);
    return { c, mesh, badge };
  });
  const oLabel = el('div', `position:absolute;transform:translate(-50%,6px);font:11px system-ui,sans-serif;color:${MUTED}`, ui.labels, 'origin');
  const qPos = pos(M.question.vec);
  const q = new THREE.Mesh(new THREE.OctahedronGeometry(0.18), new THREE.MeshLambertMaterial({ color: INK, transparent: true })); group.add(q);
  const ray = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 8), new THREE.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0.55 })); group.add(ray);
  const links = M.context.map(c => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 1, 8), new THREE.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0.8 })); group.add(m); return { c, m, to: pos(c.vec) }; });
  const qLabel = el('div', `position:absolute;transform:translate(-50%,-190%);font:600 12px system-ui,sans-serif;color:${INK};background:rgba(255,255,255,.85);padding:1px 5px;border-radius:4px;white-space:nowrap;opacity:0`, ui.labels, 'Question');
  const topicLabels = M.topics.map((name, t) => {
    const mean = [0, 1, 2].map(i => M.chunks.filter(c => c.topic === t).reduce((s, c) => s + c.vec[i], 0));
    const l = Math.hypot(...mean), at = pos(mean.map(x => x / l));
    return { at, div: el('div', `position:absolute;transform:translate(-50%,-50%);font:600 12.5px system-ui,sans-serif;color:${COL[t]};background:rgba(255,255,255,.8);padding:0 4px;border-radius:4px;white-space:nowrap;opacity:0`, ui.labels, esc(name)) };
  });
  objs = { group, origin, oLabel, chunks, q, qPos, ray, links, qLabel, topicLabels };
  buildPanel();
}
function buildPanel() {
  const nRows = Math.min(M.ranked.length, M.k + 2);
  ui.panel.innerHTML = '';
  el('div', `display:flex;flex-wrap:wrap;gap:4px 12px;font:12px system-ui;color:${MUTED};margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #dbe0e8`, ui.panel,
    M.topics.map((n, i) => `<span><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${COL[i]};margin-right:5px"></span>${esc(n)}</span>`).join('') +
    `<span><span style="display:inline-block;width:8px;height:8px;background:${INK};transform:rotate(45deg);margin-right:6px"></span>question</span>`);
  ui.qBox = el('div', 'opacity:0', ui.panel, `<div style="font:600 11px system-ui;letter-spacing:.06em;color:${MUTED}">QUESTION</div><div style="font:600 13.5px/1.35 system-ui;color:${INK};margin:2px 0 10px">${esc(M.question.text)}</div>`);
  ui.head = el('div', `font:600 11px system-ui;letter-spacing:.06em;color:${MUTED};margin-bottom:4px;opacity:0`, ui.panel, 'RANKED BY COSINE SIMILARITY');
  ui.rows = M.ranked.slice(0, nRows).map((c, i) => el('div', `display:flex;align-items:center;gap:8px;padding:4px 6px;border-radius:6px;font:12.5px/1.25 system-ui;color:${INK};opacity:0;`, ui.panel,
    `<span style="width:9px;height:9px;border-radius:50%;flex:none;background:${COL[c.topic]}"></span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.rank}. ${esc(c.title)}</span><span style="font-variant-numeric:tabular-nums;color:${MUTED}">${c.sim.toFixed(3)}</span>`));
  ui.cut = el('div', 'font:600 11.5px system-ui;color:#c2410c;border-top:1.5px dashed #c2410c;margin:4px 0 2px;padding-top:3px;opacity:0', null, 'top-' + M.k + ' cut-off: the rest is ignored');
  if (ui.rows[M.k]) ui.panel.insertBefore(ui.cut, ui.rows[M.k]);
  ui.foot = el('div', `font:12px/1.35 system-ui;color:${MUTED};margin-top:8px;opacity:0`, ui.panel, `${M.k > 1 ? 'These ' + M.k + ' passages' : 'This passage'} + the question go into the prompt; the model never sees the other ${M.chunks.length - M.k}.`);
}
function apply() {
  if (!objs) return;
  const P = M.phases, t = T, qIn = ease((t - P.question[0]) / 1.0), rank = clamp((t - P.rank[0]) / (P.rank[1] - P.rank[0])), top = ease((t - P.topk[0]) / 1.2), ctx = t >= P.context[0];
  const inTop = new Set(M.context.map(c => c.id));
  for (const { c, mesh, badge } of objs.chunks) {
    const s = ease((t - 0.1 - c.id * 0.075) / 0.35), w = Math.max(0, c.sim);
    const score = 1 + rank * (0.35 + 0.9 * w * w * w * w - 1);
    const keep = inTop.has(c.id);
    mesh.scale.setScalar(Math.max(0.001, s * (keep ? score + top * 0.15 : score)));
    mesh.material.opacity = keep ? 1 : 1 - top * 0.72;
    badge.style.opacity = keep ? top : 0;
  }
  const qr = 1 + (1 - qIn) * 0.6;
  objs.q.position.copy(objs.qPos).multiplyScalar(qr); objs.q.scale.setScalar(Math.max(0.001, qIn)); objs.q.rotation.z = t * 0.6;
  const rl = objs.qPos.length() * qIn;
  objs.ray.visible = qIn > 0.01; objs.ray.scale.set(1, Math.max(0.001, rl), 1);
  objs.ray.position.copy(objs.qPos).setLength(rl / 2); objs.ray.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), objs.qPos.clone().normalize());
  objs.links.forEach(({ m, to }, i) => {
    const g = ease((t - P.topk[0] - i * 0.18) / 0.6), d = to.clone().sub(objs.qPos), len = d.length() * g;
    m.visible = g > 0.01; m.scale.set(1, Math.max(0.001, len), 1);
    m.position.copy(objs.qPos).addScaledVector(d.normalize(), len / 2); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
  });
  objs.qLabel.style.opacity = qIn;
  objs.topicLabels.forEach(l => { l.div.style.opacity = ease((t - 1.6) / 0.6) * (1 - top * 0.5); });
  pivot.rotation.z = -Math.PI / 2 - Math.atan2(objs.qPos.y, objs.qPos.x) - 0.2 + 0.4 * (t / M.duration); // question's side faces the camera
  // panel
  ui.qBox.style.opacity = qIn; ui.head.style.opacity = rank > 0 ? 1 : 0;
  ui.head.textContent = ctx ? 'CONTEXT SENT TO THE MODEL' : 'RANKED BY COSINE SIMILARITY';
  ui.head.style.color = ctx ? '#c2410c' : MUTED;
  ui.rows.forEach((r, i) => {
    const kept = i < M.k, show = ease((rank * 3.4 - 0.2 - i * 0.32) / 0.3);
    r.style.opacity = ctx && !kept ? 0 : show * (kept ? 1 : 1 - top * 0.6);
    r.style.display = ctx && !kept ? 'none' : 'flex';
    r.style.background = kept && top > 0.5 ? '#e8eefb' : 'transparent';
  });
  ui.cut.style.opacity = ctx ? 0 : top; ui.cut.style.display = ctx ? 'none' : 'block';
  ui.foot.style.opacity = ease((t - P.context[0] - 0.3) / 0.6);
  const step = t < P.question[0] ? 0 : t < P.rank[0] ? 1 : t < P.topk[0] ? 2 : 3;
  const done = t >= P.context[0] + 0.8;
  ui.sub.textContent = done ? M.summary : step === 3 ? (M.k > 1 ? CAP[3].replace('the k', 'the ' + M.k) : 'Only the single highest score is kept; every other chunk is ignored.') : CAP[step];
  ui.sub.style.color = done ? INK : MUTED;
}
function labels() {
  if (!objs) return;
  const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight, v = new THREE.Vector3();
  const place = (div, obj, local) => { if (local) v.copy(local).applyMatrix4(objs.group.matrixWorld); else obj.getWorldPosition(v); v.project(camera); div.style.left = ((v.x + 1) / 2 * w) + 'px'; div.style.top = ((1 - v.y) / 2 * h) + 'px'; };
  objs.chunks.forEach(o => { if (o.badge.style.opacity !== '0') place(o.badge, o.mesh); });
  place(objs.qLabel, objs.q); place(objs.oLabel, objs.origin);
  const scr = p => { v.copy(p).applyMatrix4(objs.group.matrixWorld).project(camera); return [(v.x + 1) / 2 * w, (1 - v.y) / 2 * h]; }, apex = scr(new THREE.Vector3(0, 0, R));
  objs.topicLabels.forEach((l, k) => {
    const [x, y] = scr(l.at), dx = x - apex[0], dy = y - apex[1], d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, hw = l.div.offsetWidth / 2 + 4;
    let ext = 0; objs.chunks.forEach(o => { if (o.c.topic === k) { const [cx, cy] = scr(o.mesh.position); ext = Math.max(ext, (cx - x) * ux + (cy - y) * uy); } });
    const r = ext + 14 + Math.abs(ux) * hw;
    l.div.style.left = Math.max(hw, Math.min(w - hw, x + ux * r)) + 'px'; l.div.style.top = Math.max(10, Math.min(h - 10, y + uy * (ext + 16))) + 'px';
  });
}
function layout() {
  const W = root.clientWidth, H = root.clientHeight, wide = W >= 640;
  Object.assign(ui.panel.style, wide ? { left: (W - 304) + 'px', top: '80px', width: '290px', right: '', bottom: '' } : { left: '12px', right: '12px', top: '', width: '', bottom: '8px' });
  const ph = ui.qBox.offsetHeight + ui.head.offsetHeight + ui.rows.length * 26 + 30;
  const cw = wide ? W - 316 : W, chh = wide ? H : Math.round(Math.max(H * 0.45, H - ph - 12));
  Object.assign(ui.view.style, { width: cw + 'px', height: chh + 'px' });
  ui.head0.style.right = '12px';
  renderer.setSize(cw, chh); camera.aspect = cw / chh;
  const top = wide ? 64 : 84, vis = 1.02 * R * (chh / Math.max(120, chh - top));
  const d = vis / Math.tan(camera.fov * Math.PI / 360) / Math.min(1, camera.aspect), tilt = 0.5;
  controls.target.set(0, -R * 0.1, R * 0.5);
  camera.position.set(0, -R * 0.1 - d * Math.sin(tilt), R * 0.5 + d * Math.cos(tilt)); camera.up.set(0, 0, 1);
  camera.updateProjectionMatrix(); controls.update();
}

window.lab = {
  get duration() { return M ? M.duration : 12; },
  get markers() { return M ? M.markers : []; },
  seek(t) { T = t; apply(); },
  mount(r, params) {
    root = r; M = model(params); T = 0;
    ui.view = el('div', 'position:absolute;left:0;top:0', root);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.setClearColor(0xffffff);
    renderer.domElement.style.display = 'block'; renderer.domElement.setAttribute('aria-label', '3D embedding space with policy chunks and the question');
    ui.view.appendChild(renderer.domElement);
    ui.labels = el('div', 'position:absolute;inset:0;pointer-events:none;overflow:hidden', ui.view);
    ui.head0 = el('div', 'position:absolute;left:12px;top:10px;pointer-events:none', root);
    el('div', `font:600 14px system-ui,sans-serif;color:${INK}`, ui.head0, 'How RAG retrieval finds the right policy passages');
    ui.sub = el('div', `font:13px/1.4 system-ui,sans-serif;color:${MUTED}`, ui.head0);
    el('div', `font:11.5px system-ui,sans-serif;color:${MUTED};margin-top:2px`, ui.head0, 'Synthetic 3D vectors for illustration · drag to orbit');
    ui.panel = el('div', 'position:absolute;overflow:hidden;background:#fff;border:1px solid #dbe0e8;border-radius:10px;padding:10px 12px;box-sizing:border-box', root);
    scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 1.6)); const dl = new THREE.DirectionalLight(0xffffff, 1.6); dl.position.set(2, 4, 8); scene.add(dl);
    camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.enablePan = false; controls.minDistance = 4; controls.maxDistance = 30;
    pivot = new THREE.Group(); pivot.position.set(0, 0, 0); scene.add(pivot);
    world = new THREE.Group(); pivot.add(world);
    build(); layout(); apply();
    ro = new ResizeObserver(() => { layout(); apply(); }); ro.observe(root);
    renderer.setAnimationLoop(() => { controls.update(); scene.updateMatrixWorld(); labels(); renderer.render(scene, camera); });
  },
  update(params) { M = model(params); T = 0; build(); layout(); apply(); },
  destroy() {
    if (renderer) renderer.setAnimationLoop(null); if (ro) ro.disconnect();
    if (objs) disposeGroup(objs.group); objs = null;
    if (controls) controls.dispose(); if (renderer) renderer.dispose();
    root.innerHTML = ''; M = null;
  }
};

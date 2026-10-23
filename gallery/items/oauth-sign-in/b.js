// Story mode: the same sign-in as oauth_mermaid.js, told as lanes with a travelling message and a
// "who holds what" panel, so the learner can see that the browser never holds a token or the verifier.
// One SVG plus one paused GSAP timeline built from model(); the host drives it through seek(t).
const NS = 'http://www.w3.org/2000/svg';
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d', bad: '#b42318',
  soft: '#f4f6f9', tint: '#e8eefb', goodTint: '#e6f4ec', badTint: '#fdecea', amberTint: '#fff4e5' };
const ICON = { U: 'user', A: 'smartphone', B: 'globe', X: 'skull', S: 'key-round', R: 'database' };
const ITEMS = [
  { id: 'verifier', label: 'verifier', icon: 'lock', fill: C.goodTint, stroke: C.good },
  { id: 'challenge', label: 'challenge', icon: 'hash', fill: C.soft, stroke: C.muted },
  { id: 'code', label: 'code', icon: 'ticket', fill: C.tint, stroke: C.accent },
  { id: 'token', label: 'access token', icon: 'badge-check', fill: C.amberTint, stroke: C.hi }
];
const LANE_Y = 84, MSG_Y = 236, PANEL_Y = 318;
let svg = null, world = null, tl = null, M = null, hdr = null, lanes = [], chips = {};

function el(tag, attrs, parent) {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}
function txt(parent, x, y, s, o) {
  o = o || {};
  const n = el('text', { x, y, 'font-size': o.size || 13, 'font-weight': o.weight || 400, fill: o.fill || C.ink,
    'text-anchor': o.anchor || 'start', 'font-family': 'system-ui, -apple-system, sans-serif' }, parent);
  n.textContent = s;
  return n;
}
function icon(parent, name, x, y, size, color) {
  const n = labIcon(name, { x, y, width: size, height: size, stroke: color || C.ink });
  parent.appendChild(n);
  return n;
}
function arrowHead(parent, x, y, dir, color) {
  el('path', { d: 'M' + x + ' ' + y + 'l' + (-9 * dir) + ' -6v12z', fill: color }, parent);
}
const X = i => { const n = M.participants.length; return 90 + i * (820 / (n - 1)); };
const lane = id => M.participants.findIndex(q => q.id === id);
const colorOf = s => s.blocked ? C.good : s.attack ? C.bad : C.accent;

// What each participant holds once step `cur` has arrived. A self-step that makes the verifier also makes the challenge.
function holdings(cur) {
  const h = {};
  for (const q of M.participants) h[q.id] = new Set();
  for (const s of M.steps) {
    if (s.i > cur) break;
    for (const it of s.carries || []) {
      if (s.from === s.to) { h[s.to].add(it); if (it === 'verifier') h[s.to].add('challenge'); }
      else if (!s.blocked) h[s.to].add(it);
    }
  }
  return h;
}

function build() {
  if (tl) tl.kill();
  if (world) world.remove();
  world = el('g', {}, svg);
  tl = gsap.timeline({ paused: true });

  lanes = M.participants.map((q, i) => {
    const g = el('g', {}, world);
    el('line', { x1: X(i), y1: LANE_Y + 62, x2: X(i), y2: PANEL_Y - 12, stroke: C.line, 'stroke-width': 2, 'stroke-dasharray': '4 5' }, g);
    const ring = el('circle', { cx: X(i), cy: LANE_Y + 17, r: 27, fill: '#ffffff', stroke: C.line, 'stroke-width': 2 }, g);
    icon(g, ICON[q.id] || 'circle', X(i) - 14, LANE_Y + 3, 28, q.id === 'X' ? C.bad : C.ink);
    txt(g, X(i), LANE_Y + 66, q.label, { anchor: 'middle', size: 13.5, weight: 600, fill: q.id === 'X' ? C.bad : C.ink });
    return ring;
  });

  el('rect', { x: 24, y: PANEL_Y, width: 952, height: 212, rx: 14, fill: C.soft }, world);
  txt(world, 40, PANEL_Y + 24, 'Who holds what', { size: 12.5, weight: 600, fill: C.muted });
  chips = {};
  M.participants.forEach((q, i) => {
    chips[q.id] = {};
    ITEMS.forEach((it, k) => {
      const g = el('g', {}, world), w = 122, x = X(i) - w / 2, y = PANEL_Y + 38 + k * 42;
      const bad = it.id === 'token' && q.id === 'X';
      el('rect', { x, y, width: w, height: 32, rx: 8, fill: bad ? C.badTint : it.fill, stroke: bad ? C.bad : it.stroke }, g);
      icon(g, it.icon, x + 8, y + 8, 16, bad ? C.bad : it.stroke);
      txt(g, x + 30, y + 21, it.label, { size: 12.5 });
      g.setAttribute('opacity', 0);
      chips[q.id][it.id] = g;
    });
  });

  M.steps.forEach((s, k) => {
    const g = el('g', {}, world), start = s.i * M.STEP, col = colorOf(s), a = X(lane(s.from)), b = X(lane(s.to));
    gsap.set(g, { opacity: 0 });
    tl.set(g, { opacity: 1 }, start);
    if (k < M.steps.length - 1) tl.set(g, { opacity: 0 }, start + M.STEP);
    if (s.from === s.to) {
      el('path', { d: 'M' + a + ' ' + (MSG_Y - 14) + 'h46a14 14 0 0 1 0 28h-40', fill: 'none', stroke: col, 'stroke-width': 2.5 }, g);
      arrowHead(g, a + 4, MSG_Y + 14, -1, col);
      txt(g, a + 72, MSG_Y + 5, s.text, { size: 14, weight: 600, fill: col });
      const spin = el('g', {}, g); icon(spin, 'refresh-cw', a - 50, MSG_Y - 13, 26, col);
      tl.fromTo(spin, { rotation: 0, svgOrigin: (a - 37) + ' ' + MSG_Y }, { rotation: 360, duration: 1.2, ease: 'power1.inOut' }, start + 0.2);
      return;
    }
    const dir = b > a ? 1 : -1;
    el('line', { x1: a, y1: MSG_Y, x2: b - 10 * dir, y2: MSG_Y, stroke: col, 'stroke-width': 2.5, 'stroke-dasharray': s.reply ? '6 5' : 'none' }, g);
    arrowHead(g, b, MSG_Y, dir, col);
    txt(g, (a + b) / 2, MSG_Y - 16, s.text, { anchor: 'middle', size: 14, weight: 600, fill: col });
    const carried = (s.carries || []).map(id => ITEMS.find(it => it.id === id));
    const pkt = el('g', {}, g), pw = carried.length ? 26 * carried.length + 8 : 34;
    el('rect', { x: a - pw / 2, y: MSG_Y + 12, width: pw, height: 30, rx: 7, fill: '#ffffff', stroke: col, 'stroke-width': 2 }, pkt);
    if (carried.length) carried.forEach((it, j) => icon(pkt, it.icon, a - pw / 2 + 8 + j * 26, MSG_Y + 19, 16, it.stroke));
    else icon(pkt, 'mail', a - 8, MSG_Y + 19, 16, col);
    tl.fromTo(pkt, { x: 0 }, { x: (b - a) - (s.blocked ? 90 * dir : 0), duration: 1.1, ease: 'power2.inOut' }, start + 0.2);
    if (s.blocked) {
      const x = el('g', {}, g);
      icon(x, 'shield-x', b - 40 * dir - 15, MSG_Y + 12, 30, C.good);
      gsap.set(x, { opacity: 0 }); tl.to(x, { opacity: 1, duration: 0.25 }, start + 1.3);
    }
  });
  tl.set({}, {}, M.duration);
}

function setState(t) {
  const cur = Math.min(M.steps.length - 1, Math.floor(t / M.STEP + 1e-6)), s = M.steps[cur];
  const done = t >= M.duration - 0.05;
  const name = id => M.participants[lane(id)].label;
  hdr.title.textContent = 'Step ' + (cur + 1) + ' of ' + M.steps.length + ' · ' + name(s.from) + (s.from === s.to ? '' : ' → ' + name(s.to));
  hdr.note.textContent = done ? M.summary : s.note;
  hdr.note.setAttribute('fill', done ? (M.tokenTo === 'X' ? C.bad : C.good) : C.muted);
  lanes.forEach((ring, i) => {
    const id = M.participants[i].id, on = id === s.from || id === s.to;
    ring.setAttribute('stroke', on ? colorOf(s) : C.line);
    ring.setAttribute('stroke-width', on ? 3 : 2);
    ring.setAttribute('fill', on ? C.tint : '#ffffff');
  });
  // A chip appears once its message has arrived (after the packet's flight), so it never runs ahead of the story.
  const arrived = t - cur * M.STEP >= 1.3 || s.from === s.to ? cur : cur - 1;
  const h = holdings(arrived);
  for (const id in chips) for (const it in chips[id]) chips[id][it].setAttribute('opacity', h[id].has(it) ? 1 : 0);
}

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  get markerLabels() { return M ? M.markerLabels : []; },
  seek(t) { if (!tl) return; tl.seek(Math.min(t, M.duration), false); setState(t); },
  mount(root, params) {
    M = model(params);
    svg = el('svg', { viewBox: '0 0 1000 545', width: '100%', height: '100%', preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': 'OAuth sign-in told as a story: who sends what, and who holds what' });
    root.appendChild(svg);
    el('rect', { x: 0, y: 0, width: 1000, height: 545, fill: '#ffffff' }, svg);
    hdr = { title: txt(svg, 24, 34, '', { size: 21, weight: 700 }), note: txt(svg, 24, 60, '', { size: 15, fill: C.muted }) };
    build(); setState(0);
  },
  update(params) { M = model(params); build(); setState(0); },
  destroy() { if (tl) tl.kill(); if (svg) svg.remove(); svg = world = tl = M = null; lanes = []; chips = {}; }
};

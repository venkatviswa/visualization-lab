// Story mode: one SVG plus one paused GSAP timeline built from model(). The host drives it through seek(t).
const NS = 'http://www.w3.org/2000/svg';
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d', bad: '#b42318',
  soft: '#f4f6f9', tint: '#e8eefb', goodTint: '#e6f4ec', badTint: '#fdecea', amberTint: '#fff4e5' };
const X = i => 70 + i * 107.5, TRACK = 150;
let svg = null, world = null, tl = null, M = null, hdr = null, stationEls = [], progress = null, arc = null, token = null;
let root = null, ro = null, narrow = false, N = null, T = 0;   // narrow (phone) mode: a vertical station list instead of the wide scene art

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
function chip(parent, x, y, w, label, iconName, color, fill) {
  const g = el('g', {}, parent);
  el('rect', { x, y, width: w, height: 36, rx: 8, fill: fill || '#fff', stroke: color || C.line }, g);
  if (iconName) icon(g, iconName, x + 10, y + 9, 18, color || C.muted);
  txt(g, x + (iconName ? 36 : 12), y + 23, label, { size: 12.5 });
  return g;
}
function appear(g, at, dy) { gsap.set(g, { opacity: 0, y: dy || 10 }); tl.to(g, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }, at); }
function arrow(parent, x1, y1, x2, y2, color) {
  el('line', { x1, y1, x2, y2, stroke: color || C.muted, 'stroke-width': 1.5 }, parent);
  const a = Math.atan2(y2 - y1, x2 - x1), s = 7;
  el('path', { d: 'M' + x2 + ' ' + y2 + 'L' + (x2 - s * Math.cos(a - 0.45)) + ' ' + (y2 - s * Math.sin(a - 0.45)) + 'L' + (x2 - s * Math.cos(a + 0.45)) + ' ' + (y2 - s * Math.sin(a + 0.45)) + 'Z', fill: color || C.muted }, parent);
}
function codeLines(g, x, y, widths) {
  return widths.map((w, k) => el('rect', { x: x + (k % 3 === 1 ? 18 : 0), y: y + k * 24, width: w, height: 9, rx: 4, fill: k % 2 ? '#c9d3e6' : '#9fb3dc' }, g));
}

/* ---------- one builder per station; each draws into its own group for one event ---------- */
const SCENES = {
  jira(g, e, s) {
    const stories = [['SP-101', 'Capture consent at intake'], ['SP-102', 'Check member eligibility'], ['SP-103', 'Nightly provider roster sync']];
    stories.forEach(([id, title], k) => {
      const c = el('g', {}, g);
      el('rect', { x: 60 + k * 205, y: 250, width: 190, height: 74, rx: 10, fill: '#fff', stroke: C.line }, c);
      icon(c, 'ticket', 74 + k * 205, 263, 20, C.accent);
      txt(c, 102 + k * 205, 279, id, { weight: 600 });
      txt(c, 74 + k * 205, 307, title, { size: 12, fill: C.muted });
      gsap.set(c, { opacity: 0, x: -50 });
      tl.to(c, { opacity: 1, x: 0, duration: 0.5, ease: 'power2.out' }, s + 0.2 + k * 0.3);
    });
    const b = el('g', {}, g);
    el('rect', { x: 700, y: 246, width: 250, height: 120, rx: 12, fill: C.goodTint, stroke: C.good }, b);
    icon(b, 'shield-check', 718, 264, 28, C.good);
    txt(b, 756, 284, 'Read-only Atlassian MCP', { weight: 600 });
    txt(b, 718, 318, 'Guardrails: the agent can read', { size: 12, fill: C.muted });
    txt(b, 718, 336, 'stories but never edit Jira', { size: 12, fill: C.muted });
    appear(b, s + 1.2);
    const bot = el('g', {}, g);
    icon(bot, 'bot', 420, 400, 44, C.accent);
    txt(bot, 442, 470, 'Agent pipeline', { size: 12, fill: C.muted, anchor: 'middle' });
    arrow(bot, 255, 330, 410, 410, C.line); arrow(bot, 460, 330, 450, 395, C.line); arrow(bot, 665, 330, 480, 410, C.line);
    appear(bot, s + 1.6);
  },
  plan(g, e, s) {
    const a = el('g', {}, g);
    icon(a, 'bot', 96, 268, 80, C.accent);
    txt(a, 136, 378, 'planner agent', { anchor: 'middle', weight: 600 });
    appear(a, s + 0.1);
    const c1 = chip(g, 300, 260, 230, 'Confluence pages', 'book-open', C.accent);
    const c2 = chip(g, 300, 320, 230, 'Sourceprimary metadata', 'database', C.accent);
    appear(c1, s + 0.4); appear(c2, s + 0.7);
    const ar = el('g', {}, g); arrow(ar, 296, 300, 190, 310, C.muted); appear(ar, s + 0.9, 0);
    const card = el('g', {}, g);
    el('rect', { x: 600, y: 240, width: 340, height: 190, rx: 12, fill: '#fff', stroke: C.line }, card);
    icon(card, 'clipboard-list', 618, 256, 22, C.ink);
    txt(card, 650, 273, 'Build plan', { weight: 600, size: 14 });
    appear(card, s + 1.0);
    ['Objects and fields to change', 'Apex classes and triggers', 'LWC components', 'Tests to write first'].forEach((line, k) => {
      const r = el('g', {}, g);
      icon(r, 'check', 622, 296 + k * 30, 18, C.good);
      txt(r, 650, 310 + k * 30, line, { size: 13 });
      appear(r, s + 1.3 + k * 0.25, 0);
    });
  },
  build(g, e, s) {
    const d = e.dur;
    const w = el('g', {}, g);
    el('rect', { x: 60, y: 236, width: 480, height: 250, rx: 10, fill: '#fff', stroke: C.line }, w);
    el('rect', { x: 60, y: 236, width: 480, height: 28, rx: 10, fill: '#eef1f5' }, w);
    [0, 1, 2].forEach(k => el('circle', { cx: 78 + k * 16, cy: 250, r: 4.5, fill: ['#e5867a', '#e6c06b', '#86c79b'][k] }, w));
    txt(w, 132, 254, e.cycle === 1 ? 'Apex class + LWC' : 'Fix for review finding', { size: 12, fill: C.muted });
    const lines = codeLines(w, 84, 284, [220, 300, 180, 340, 260, 200, 150]);
    lines.forEach((ln, k) => {
      const full = +ln.getAttribute('width');
      ln.setAttribute('width', e.cycle === 1 ? 0 : full);
      if (e.cycle === 1) tl.to(ln, { attr: { width: full }, duration: 0.25, ease: 'none' }, s + 0.25 + k * 0.17);
    });
    if (e.cycle > 1) {
      const fix = el('rect', { x: 80, y: 326, width: 360, height: 17, rx: 4, fill: C.badTint, stroke: C.bad }, w);
      w.insertBefore(fix, lines[0]);
      tl.to(fix, { attr: { fill: C.goodTint, stroke: C.good }, duration: 0.3 }, s + d * 0.45);
    }
    const t = el('g', {}, g);
    el('rect', { x: 580, y: 236, width: 360, height: 250, rx: 10, fill: '#fff', stroke: C.line }, t);
    icon(t, 'test-tube', 598, 252, 22, C.ink);
    txt(t, 628, 269, 'Test-driven cycle ' + e.cycle, { weight: 600, size: 14 });
    const phases = [
      ['RED', 'New test written. It fails.', C.badTint, C.bad, 'x'],
      ['GREEN', 'Code makes the test pass.', C.goodTint, C.good, 'check'],
      ['REFACTOR', 'Clean up. Tests stay green.', C.tint, C.accent, 'sparkles']
    ];
    const at = [0.1, 0.42, 0.72];
    phases.forEach(([name, line, fill, stroke, ic], k) => {
      const p = el('g', {}, t);
      el('rect', { x: 600, y: 296, width: 320, height: 64, rx: 12, fill, stroke, 'stroke-width': 2 }, p);
      icon(p, ic, 616, 314, 28, stroke);
      txt(p, 656, 324, name, { weight: 700, size: 16, fill: stroke });
      txt(p, 656, 344, line, { size: 12.5 });
      gsap.set(p, { opacity: 0 });
      tl.set(p, { opacity: 1 }, s + d * at[k]);
      if (k < 2) tl.set(p, { opacity: 0 }, s + d * at[k + 1]);
    });
    phases.forEach(([name, , , stroke], k) => {
      const dot = el('g', {}, t);
      el('circle', { cx: 620 + k * 110, cy: 400, r: 8, fill: stroke }, dot);
      txt(dot, 634 + k * 110, 405, name, { size: 12, fill: C.muted });
      gsap.set(dot, { opacity: 0.25 });
      tl.to(dot, { opacity: 1, duration: 0.2 }, s + d * at[k]);
    });
    const count = txt(t, 600, 450, 'Tests passing: ' + (2 + 2 * e.cycle), { size: 13, fill: C.good, weight: 600 });
    gsap.set(count, { opacity: 0 }); tl.to(count, { opacity: 1, duration: 0.2 }, s + d * 0.45);
  },
  review(g, e, s) {
    const d = e.dur;
    const w = el('g', {}, g);
    el('rect', { x: 60, y: 236, width: 480, height: 250, rx: 10, fill: '#fff', stroke: C.line }, w);
    codeLines(w, 84, 262, [260, 320, 200, 360, 280, 220, 300, 170, 240]);
    const mag = el('g', {}, g); icon(mag, 'search', 80, 250, 56, C.accent);
    tl.fromTo(mag, { x: 0, y: 0 }, { x: 360, y: 150, duration: d * 0.6, ease: 'sine.inOut' }, s + 0.1);
    const p = el('g', {}, g);
    el('rect', { x: 580, y: 236, width: 360, height: 250, rx: 10, fill: '#fff', stroke: C.line }, p);
    txt(p, 600, 266, e.open ? 'Review found issues' : 'Review passed', { weight: 600, size: 14, fill: e.open ? C.bad : C.good });
    ['Code quality', 'Security', 'Governor limits'].forEach((name, k) => {
      const r = el('g', {}, p);
      txt(r, 600, 308 + k * 46, name, { size: 13.5 });
      const bad = k < e.open;
      icon(r, bad ? 'bug' : 'circle-check', 880, 292 + k * 46, 24, bad ? C.bad : C.good);
      gsap.set(r, { opacity: 0.2 });
      tl.to(r, { opacity: 1, duration: 0.25 }, s + 0.4 + k * d * 0.18);
    });
    if (e.open) {
      const back = txt(p, 600, 462, e.open + (e.open === 1 ? ' finding' : ' findings') + ', back to Build', { weight: 600, fill: C.hi });
      gsap.set(back, { opacity: 0 }); tl.to(back, { opacity: 1, duration: 0.2 }, s + d * 0.75);
    }
  },
  deploy(g, e, s) {
    const src = el('g', {}, g);
    icon(src, 'laptop', 80, 290, 64, C.muted);
    txt(src, 112, 382, 'Build output', { anchor: 'middle', size: 12, fill: C.muted });
    const sb = el('g', {}, g);
    el('rect', { x: 380, y: 250, width: 260, height: 170, rx: 12, fill: C.goodTint, stroke: C.good, 'stroke-width': 2 }, sb);
    icon(sb, 'server', 400, 268, 34, C.good);
    txt(sb, 444, 290, 'deploytarget', { weight: 700, size: 15 });
    txt(sb, 400, 330, 'Dedicated dev sandbox', { size: 12.5, fill: C.muted });
    const ok = el('g', {}, sb); icon(ok, 'circle-check', 400, 350, 22, C.good); txt(ok, 430, 366, 'Deployed', { weight: 600, fill: C.good });
    gsap.set(ok, { opacity: 0 }); tl.to(ok, { opacity: 1, duration: 0.25 }, s + 1.5);
    const live = el('g', {}, g);
    el('rect', { x: 690, y: 250, width: 260, height: 170, rx: 12, fill: '#fff', stroke: C.line, 'stroke-dasharray': '5 4' }, live);
    icon(live, 'server', 710, 268, 34, '#9aa3b2');
    icon(live, 'lock', 910, 264, 26, C.bad);
    txt(live, 754, 290, 'Sourceprimary', { weight: 700, size: 15, fill: C.muted });
    txt(live, 710, 330, 'Live org', { size: 12.5, fill: C.muted });
    txt(live, 710, 366, 'Never a deploy target', { weight: 600, fill: C.bad });
    const pkg = el('g', {}, g); icon(pkg, 'package', 96, 248, 36, C.accent);
    tl.fromTo(pkg, { x: 0, y: 0 }, { x: 500, y: 92, duration: 1.0, ease: 'power2.inOut' }, s + 0.35);
  },
  document(g, e, s) {
    const items = [['Requirement', 'ticket'], ['Plan', 'clipboard-list'], ['Tests', 'test-tube'], ['Code', 'code'], ['Review', 'search'], ['Deployment', 'package']];
    items.forEach(([label, ic], k) => {
      const c = el('g', {}, g);
      el('rect', { x: 40 + k * 155, y: 280, width: 132, height: 76, rx: 10, fill: '#fff', stroke: C.accent }, c);
      icon(c, ic, 92 + k * 155, 292, 26, C.accent);
      txt(c, 106 + k * 155, 340, label, { anchor: 'middle', size: 12.5, weight: 600 });
      appear(c, s + 0.2 + k * 0.28);
      if (k) { const l = el('g', {}, g); icon(l, 'link', 21 + k * 155, 308, 16, C.muted); appear(l, s + 0.2 + k * 0.28, 0); }
    });
    const cap = txt(g, 500, 410, 'Every decision links back to the story it came from', { anchor: 'middle', size: 14, fill: C.muted });
    appear(cap, s + 2.0);
  },
  govern(g, e, s) {
    const shadow = e.kind === 'shadow';
    const a = el('g', {}, g);
    icon(a, 'shield-check', 84, 262, 76, C.accent);
    txt(a, 122, 372, 'Assurance', { anchor: 'middle', weight: 600 });
    txt(a, 122, 390, 'Control Plane', { anchor: 'middle', weight: 600 });
    appear(a, s + 0.1);
    const c1 = chip(g, 230, 250, 250, 'DAB / Governance councils', 'users', C.accent); appear(c1, s + 0.4);
    const c2 = chip(g, 230, 300, 250, 'RAG index: evidence', 'layers', C.accent); appear(c2, s + 0.6);
    const graph = el('g', {}, g);
    const nodes = [[560, 290], [640, 260], [720, 300], [620, 350], [700, 380], [780, 340]];
    [[0, 1], [1, 2], [0, 3], [3, 4], [2, 5], [4, 5], [1, 3]].forEach(([i, j]) => el('line', { x1: nodes[i][0], y1: nodes[i][1], x2: nodes[j][0], y2: nodes[j][1], stroke: '#b9c6e4', 'stroke-width': 2 }, graph));
    nodes.forEach(([x, y], k) => el('circle', { cx: x, cy: y, r: 11, fill: k === 0 ? C.accent : '#fff', stroke: C.accent, 'stroke-width': 2 }, graph));
    txt(graph, 670, 420, 'Neo4j graph: lineage and cross-feature impact', { anchor: 'middle', size: 12, fill: C.muted });
    appear(graph, s + 0.8);
    const m = el('g', {}, g);
    el('rect', { x: 230, y: 360, width: 250, height: 88, rx: 12, fill: shadow ? C.tint : C.goodTint, stroke: shadow ? C.accent : C.good, 'stroke-width': 2 }, m);
    icon(m, shadow ? 'eye' : 'lock', 246, 378, 26, shadow ? C.accent : C.good);
    txt(m, 282, 396, shadow ? 'Shadow mode' : 'Enforce mode', { weight: 700, size: 15 });
    txt(m, 246, 430, shadow ? 'Observes and records; blocks nothing' : 'The gate must approve the work', { size: 12, fill: C.muted });
    appear(m, s + 1.4);
  },
  score(g, e, s) {
    M.scores.forEach((sc, k) => {
      const y = 240 + k * 32;
      txt(g, 60, y + 13, sc.name, { size: 12.5 });
      el('rect', { x: 230, y, width: 300, height: 16, rx: 8, fill: '#e7ebf1' }, g);
      const bar = el('rect', { x: 230, y, width: 0, height: 16, rx: 8, fill: sc.value >= 90 ? C.good : sc.value >= 75 ? C.accent : C.hi }, g);
      tl.to(bar, { attr: { width: sc.value * 3 }, duration: 0.5, ease: 'power2.out' }, s + 0.2 + k * 0.14);
      const v = txt(g, 542, y + 13, String(sc.value), { size: 12.5, weight: 600 });
      gsap.set(v, { opacity: 0 }); tl.to(v, { opacity: 1, duration: 0.2 }, s + 0.6 + k * 0.14);
    });
    const big = txt(g, 640, 300, '0', { size: 54, weight: 700, fill: C.ink });
    const counter = { v: 0 };
    tl.to(counter, { v: M.overall, duration: 1.2, ease: 'power1.out', onUpdate: () => { big.textContent = Math.round(counter.v); } }, s + 0.3);
    txt(g, 640, 326, 'ScoreCardV2 overall', { size: 12.5, fill: C.muted });
    for (let k = 0; k < M.boardSections; k++) {
      const pg = el('g', {}, g);
      el('rect', { x: 640 + k * 22, y: 372 - k * 2, width: 40, height: 52, rx: 4, fill: '#fff', stroke: C.accent }, pg);
      el('line', { x1: 647 + k * 22, y1: 386 - k * 2, x2: 673 + k * 22, y2: 386 - k * 2, stroke: '#c9d3e6', 'stroke-width': 3 }, pg);
      appear(pg, s + 1.3 + k * 0.1, -8);
    }
    txt(g, 640, 452, 'BoardPacket v2: 13 sections', { size: 12.5, fill: C.muted });
    txt(g, 60, 522, 'Dimension names and values are illustrative placeholders, not ScoreCardV2 definitions.', { size: 11, fill: C.muted });
  },
  improve(g, e, s) {
    const steps = [['Issues and retros', 'git-pull-request'], ['Root cause', 'brain'], ['Proposed fix', 'wrench'], ['Human gate', 'user-check']];
    steps.forEach(([label, ic], k) => {
      const c = chip(g, 40 + k * 235, 262, 190, label, ic, k === 3 ? C.hi : C.accent);
      appear(c, s + 0.2 + k * 0.4);
      if (k) { const a = el('g', {}, g); arrow(a, 2 + k * 235, 280, 36 + k * 235, 280, C.muted); appear(a, s + 0.2 + k * 0.4, 0); }
    });
    const ok = e.kind === 'applied';
    const r = el('g', {}, g);
    el('rect', { x: 745, y: 330, width: 210, height: 96, rx: 12, fill: ok ? C.goodTint : C.amberTint, stroke: ok ? C.good : C.hi, 'stroke-width': 2 }, r);
    icon(r, ok ? 'circle-check' : 'pause', 761, 348, 28, ok ? C.good : C.hi);
    txt(r, 798, 368, ok ? 'Fix applied' : 'Held at the gate', { weight: 700, size: 15 });
    txt(r, 761, 404, ok ? 'A person approved it' : 'Waits for a person', { size: 12.5, fill: C.muted });
    appear(r, s + 2.0);
    const person = el('g', {}, g); icon(person, 'user', 822, 448, 40, C.ink); appear(person, s + 1.6);
    const note = txt(g, 40, 360, 'No fix reaches the pipeline without a human decision.', { size: 13.5, fill: C.muted });
    appear(note, s + 2.3);
  }
};

function build() {
  if (tl) tl.kill();
  if (world) world.remove();
  world = el('g', {}, svg);
  tl = gsap.timeline({ paused: true });

  progress = el('line', { x1: X(0), y1: TRACK, x2: X(0), y2: TRACK, stroke: C.accent, 'stroke-width': 4, 'stroke-linecap': 'round' }, world);
  world.insertBefore(el('line', { x1: X(0), y1: TRACK, x2: X(8), y2: TRACK, stroke: C.line, 'stroke-width': 4, 'stroke-linecap': 'round' }), progress);
  if (M.findings) {
    arc = el('g', {}, world);
    el('path', { d: 'M' + X(3) + ' 122 C ' + X(3) + ' 80 ' + X(2) + ' 80 ' + X(2) + ' 122', fill: 'none', stroke: C.hi, 'stroke-width': 2, 'stroke-dasharray': '5 4' }, arc);
    txt(arc, (X(2) + X(3)) / 2, 84, 'rework ×' + M.findings, { anchor: 'middle', size: 11.5, fill: C.hi, weight: 600 });
  } else arc = null;
  stationEls = M.stations.map((st, i) => {
    const g = el('g', {}, world);
    const c = el('circle', { cx: X(i), cy: TRACK, r: 26, fill: '#fff', stroke: C.line, 'stroke-width': 2 }, g);
    icon(g, st.icon, X(i) - 12, TRACK - 12, 24, C.ink);
    txt(g, X(i), TRACK + 48, st.n + ' · ' + st.label, { anchor: 'middle', size: 13 });
    return c;
  });
  token = el('g', {}, world);
  el('rect', { x: X(0) - 16, y: 96, width: 32, height: 22, rx: 5, fill: C.accent }, token);
  icon(token, 'ticket', X(0) - 8, 99, 16, '#ffffff');
  el('rect', { x: 24, y: 214, width: 952, height: 318, rx: 14, fill: C.soft }, world);

  const idx = id => M.stations.findIndex(st => st.id === id);
  M.events.forEach((e, k) => {
    const g = el('g', {}, world);
    gsap.set(g, { opacity: 0 });
    tl.set(g, { opacity: 1 }, e.start);
    if (k < M.events.length - 1) tl.set(g, { opacity: 0 }, e.start + e.dur);
    SCENES[e.station](g, e, e.start);
    tl.to(token, { x: X(idx(e.station)) - X(0), duration: 0.5, ease: 'power2.inOut' }, e.start);
  });
  tl.set({}, {}, M.duration);
}

/* ---------- narrow mode: the same model as a vertical station list with the current event's note ---------- */
function wrapText(n, str, max, lh) {
  while (n.firstChild) n.removeChild(n.firstChild);
  const lines = [], x = n.getAttribute('x'); let cur = '';
  String(str).split(' ').forEach(w => { if (cur && (cur + ' ' + w).length > max) { lines.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; }); if (cur) lines.push(cur);
  lines.forEach((ln, k) => { const t = el('tspan', { x, dy: k ? lh : 0 }, n); t.textContent = ln; });
  return lines.length;
}
function buildNarrow() {
  if (tl) tl.kill();
  if (svg) svg.remove();
  const W = 420, avail = Math.round(W * (root.clientHeight || 600) / Math.max(1, root.clientWidth || 420)), H = Math.max(560, avail), ROW = 38, Y0 = 92;
  svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', height: '100%', preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': 'Agentic delivery pipeline, animated' });
  root.appendChild(svg);
  el('rect', { x: 0, y: 0, width: W, height: H, fill: '#ffffff' }, svg);
  world = el('g', {}, svg); tl = gsap.timeline({ paused: true });
  N = { H, ROW, Y0, title: txt(svg, 14, 26, '', { size: 14, weight: 700 }), note: txt(svg, 14, 46, '', { size: 11.5, fill: C.muted }), rows: [] };
  el('line', { x1: 34, y1: Y0, x2: 34, y2: Y0 + ROW * 8, stroke: C.line, 'stroke-width': 4, 'stroke-linecap': 'round' }, world);
  N.progress = el('line', { x1: 34, y1: Y0, x2: 34, y2: Y0, stroke: C.accent, 'stroke-width': 4, 'stroke-linecap': 'round' }, world);
  if (M.findings) { N.arc = el('g', {}, world); txt(N.arc, 60, Y0 + ROW * 3 + 16, '↩ rework ×' + M.findings + ': back to Build', { size: 10, fill: C.hi, weight: 600 }); }
  M.stations.forEach((st, i) => {
    const y = Y0 + i * ROW, g = el('g', {}, world);
    const c = el('circle', { cx: 34, cy: y, r: 15, fill: '#fff', stroke: C.line, 'stroke-width': 2 }, g);
    icon(g, st.icon, 26, y - 8, 16, C.ink);
    const label = txt(g, 60, y + 4, st.n + ' · ' + st.label, { size: 12.5 });
    const pillBg = el('rect', { x: W - 108, y: y - 10, width: 94, height: 20, rx: 10, fill: C.soft }, g);
    const pill = txt(g, W - 61, y + 4, '', { size: 10.5, anchor: 'middle', weight: 600, fill: C.muted });
    N.rows.push({ c, label, pillBg, pill });
  });
  N.token = el('g', {}, world);
  el('rect', { x: -14, y: -9, width: 28, height: 18, rx: 4, fill: C.accent }, N.token); icon(N.token, 'ticket', -7, -7, 14, '#ffffff');
  gsap.set(N.token, { x: 34, y: Y0 - 26 });
  const cy = Y0 + ROW * 8 + 24;
  N.cardBg = el('rect', { x: 10, y: cy, width: W - 20, height: Math.max(60, H - cy - 10), rx: 10, fill: C.soft }, world);
  N.cardT = txt(world, 22, cy + 20, '', { size: 11.5, weight: 700, fill: C.accent });
  N.card = txt(world, 22, cy + 40, '', { size: 12 });
  const idx = id => M.stations.findIndex(st => st.id === id);
  M.events.forEach(e => { tl.to(N.token, { y: Y0 + idx(e.station) * ROW - 26, duration: 0.5, ease: 'power2.inOut' }, e.start); });
  tl.set({}, {}, M.duration);
}
function setStateNarrow(t) {
  let e = M.events[0];
  for (const ev of M.events) if (ev.start <= t + 1e-6) e = ev;
  const st = M.stations.find(x => x.id === e.station), done = t >= M.duration - 0.05;
  N.title.textContent = st.n + ' · ' + st.label + (e.cycle ? ', cycle ' + e.cycle : '');
  wrapText(N.note, done ? M.summary : 'Agentic delivery pipeline · ' + M.findings + (M.findings === 1 ? ' finding' : ' findings') + ' · ' + M.governanceMode + ' mode', 60, 13);
  let reach = 0; const seen = new Set();
  for (const ev of M.events) { if (ev.start > e.start) break; reach = Math.max(reach, M.stations.findIndex(x => x.id === ev.station)); if (ev !== e) seen.add(ev.station); }
  N.rows.forEach((r, i) => {
    const id = M.stations[i].id, active = id === e.station && !done, visited = seen.has(id) || (done && i <= reach);
    r.c.setAttribute('fill', active ? C.tint : visited ? C.goodTint : '#fff'); r.c.setAttribute('stroke', active ? C.accent : visited ? C.good : C.line); r.c.setAttribute('stroke-width', active ? 3 : 2);
    r.label.setAttribute('font-weight', active ? 700 : 400);
    const txtv = active ? (e.kind === 'findings' ? e.open + ' open' : e.kind === 'rework' ? 'cycle ' + e.cycle : e.kind === 'applied' ? 'applied' : e.kind === 'held' ? 'held' : 'now') : visited ? 'done' : '';
    r.pill.textContent = txtv; r.pill.setAttribute('fill', active ? (e.kind === 'held' || e.kind === 'findings' ? C.hi : C.accent) : C.good);
    r.pillBg.setAttribute('fill', txtv ? (active ? (e.kind === 'held' || e.kind === 'findings' ? C.amberTint : C.tint) : C.goodTint) : 'transparent');
  });
  N.progress.setAttribute('y2', N.Y0 + reach * N.ROW);
  if (N.arc) N.arc.setAttribute('opacity', e.kind === 'findings' || e.kind === 'rework' ? 1 : 0.45);
  N.cardT.textContent = done ? 'Outcome' : 'Step ' + st.n + ' of ' + M.stations.length;
  wrapText(N.card, done ? M.summary : e.note, 56, 15);
}

function setState(t) {
  let e = M.events[0];
  for (const ev of M.events) if (ev.start <= t + 1e-6) e = ev;
  const st = M.stations.find(x => x.id === e.station);
  const done = t >= M.duration - 0.05;
  hdr.title.textContent = st.n + ' · ' + st.label + (e.cycle ? ', cycle ' + e.cycle : '');
  hdr.note.textContent = done ? M.summary : e.note;
  let reach = 0;
  const seen = new Set();
  for (const ev of M.events) { if (ev.start > e.start) break; reach = Math.max(reach, M.stations.findIndex(x => x.id === ev.station)); if (ev !== e) seen.add(ev.station); }
  stationEls.forEach((c, i) => {
    const id = M.stations[i].id, active = id === e.station && !done, visited = seen.has(id) || (done && i <= reach);
    c.setAttribute('fill', active ? C.tint : visited ? C.goodTint : '#fff');
    c.setAttribute('stroke', active ? C.accent : visited ? C.good : C.line);
    c.setAttribute('stroke-width', active ? 3 : 2);
  });
  progress.setAttribute('x2', X(reach));
  if (arc) arc.setAttribute('opacity', e.kind === 'findings' || e.kind === 'rework' ? 1 : 0.45);
}

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.events.map(e => e.start) : []; },
  seek(t) { if (!tl) return; T = t; tl.seek(Math.min(t, M.duration), false); if (narrow) setStateNarrow(t); else setState(t); },
  mount(r, params) {
    root = r; M = model(params); narrow = (root.clientWidth || 1000) < 640;
    this._build();
    ro = new ResizeObserver(() => { const nn = root.clientWidth < 640; if (nn !== narrow) { narrow = nn; requestAnimationFrame(() => { if (M) { this._build(); this.seek(T); } }); } });
    ro.observe(root);
  },
  _build() {
    if (narrow) { buildNarrow(); setStateNarrow(0); return; }
    if (svg) svg.remove();
    svg = el('svg', { viewBox: '0 0 1000 545', width: '100%', height: '100%', preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': 'Agentic delivery pipeline, animated' });
    root.appendChild(svg);
    el('rect', { x: 0, y: 0, width: 1000, height: 545, fill: '#ffffff' }, svg);
    hdr = { title: txt(svg, 24, 34, '', { size: 21, weight: 700 }), note: txt(svg, 24, 60, '', { size: 15, fill: C.muted }) };
    build(); setState(0);
  },
  update(params) { M = model(params); this._build(); },
  destroy() { if (ro) ro.disconnect(); if (tl) tl.kill(); if (svg) svg.remove(); svg = world = tl = M = N = null; }
};

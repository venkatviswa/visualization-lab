// Story: one push through a GitHub Actions workflow. One SVG, one paused GSAP timeline for the travelling tokens
// (the push, the queued run, the check, the deploy); every state (cards, step rows, terminal, captions, stats) is set from model() in setState(t).
const NS = 'http://www.w3.org/2000/svg';
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d', bad: '#b42318',
  soft: '#f4f6f9', tint: '#e8eefb', goodTint: '#e6f4ec', badTint: '#fdecea', hiTint: '#fbefe8', term: '#1d2433' };
const FONT = 'system-ui, -apple-system, sans-serif', MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace', TRAVEL = 0.6;
let root = null, svg = null, world = null, tl = null, M = null, L = null, R = {}, ro = null, T = 0, mode = '';

function el(tag, a, parent) { const n = document.createElementNS(NS, tag); for (const k in a) n.setAttribute(k, a[k]); if (parent) parent.appendChild(n); return n; }
function wrap(s, max) { const out = []; let cur = ''; String(s).split(' ').forEach(w => { if (cur && (cur + ' ' + w).length > max) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; }); if (cur) out.push(cur); return out; }
function txt(parent, x, y, s, o) {
  o = o || {};
  const n = el('text', { x, y, 'font-size': o.size || 13, 'font-weight': o.weight || 400, fill: o.fill || C.ink, 'text-anchor': o.anchor || 'start', 'font-family': o.mono ? MONO : FONT }, parent);
  setText(n, s, o.max, o.lh); return n;
}
function setText(n, s, max, lh) {
  while (n.firstChild) n.removeChild(n.firstChild);
  const lines = max ? wrap(s, max) : [String(s)], x = n.getAttribute('x');
  lines.forEach((ln, k) => { const t = el('tspan', { x, dy: k ? (lh || 16) : 0 }, n); t.textContent = ln; });
  return lines.length;
}
function icon(parent, name, x, y, size, color) { const n = labIcon(name, { x, y, width: size, height: size, stroke: color || C.ink }); parent.appendChild(n); return n; }
const fmt = ms => { const s = Math.round(ms / 1000); return s >= 60 ? Math.floor(s / 60) + ' min ' + String(s % 60).padStart(2, '0') + ' s' : s + ' s'; };

function layout(w, h) {
  if (w >= 640) return { W: 1000, H: 600, narrow: false, dev: { x: 30, y: 62, w: 170, h: 340 },
    box: { github: { x: 222, y: 62, w: 290, h: 68 }, pr: { x: 528, y: 62, w: 232, h: 68 }, server: { x: 776, y: 62, w: 204, h: 68 }, runner: { x: 222, y: 150, w: 758, h: 254 } },
    rows: { x0: 236, y0: 192, colW: 372, rowH: 50, cols: 2 }, cap: { x: 20, y: 420, w: 960, h: 110, chars: 112, nchars: 124, size: 15.5 }, stats: { y: 544, h: 42 }, sub: 118 };
  const W = 420, avail = Math.round(W * h / Math.max(1, w)), cw = (W - 20 - 12) / 3;
  if (avail < 800) {
    // compact: a short root (an embed, a landscape phone). Tighter rows, no step sub-lines, one stats line, no note line.
    const H = Math.max(600, avail);
    return { W, H, narrow: true, compact: true, dev: { x: 10, y: 54, w: 400, h: 40 },
      box: { github: { x: 10, y: 102, w: cw, h: 56 }, pr: { x: 10 + cw + 6, y: 102, w: cw, h: 56 }, server: { x: 10 + 2 * (cw + 6), y: 102, w: cw, h: 56 }, runner: { x: 10, y: 166, w: 400, h: 240 } },
      rows: { x0: 20, y0: 198, colW: 380, rowH: 26, cols: 1 }, cap: { x: 10, y: 414, w: 400, h: H - 414 - 40, chars: 54, nchars: 58, size: 12.5 }, stats: { y: H - 32, h: 26 }, sub: 64 };
  }
  const H = Math.max(820, avail);
  return { W, H, narrow: true, dev: { x: 10, y: 58, w: 400, h: 54 },
    box: { github: { x: 10, y: 122, w: cw, h: 70 }, pr: { x: 10 + cw + 6, y: 122, w: cw, h: 70 }, server: { x: 10 + 2 * (cw + 6), y: 122, w: cw, h: 70 }, runner: { x: 10, y: 202, w: 400, h: 318 } },
    rows: { x0: 20, y0: 238, colW: 380, rowH: 34, cols: 1 }, cap: { x: 10, y: 530, w: 400, h: H - 530 - 58, chars: 54, nchars: 58, size: 12.5 }, stats: { y: H - 50, h: 42 }, sub: 64 };
}
function anchor(id) { if (id === 'dev') { const d = L.dev; return L.narrow ? { x: d.x + d.w / 2, y: d.y + d.h } : { x: d.x + d.w, y: d.y + 40 }; } const b = L.box[id]; return { x: b.x + b.w / 2, y: b.y + b.h / 2 }; }
function side(id, nb) {
  const c = anchor(id); if (id === 'dev') return c;
  const b = L.box[id], o = anchor(nb), dx = o.x - c.x, dy = o.y - c.y;
  return Math.abs(dx) * b.h > Math.abs(dy) * b.w ? { x: dx > 0 ? b.x + b.w : b.x, y: c.y } : { x: c.x, y: dy > 0 ? b.y + b.h : b.y };
}
const PATH = { push: ['dev', 'github'], event: ['github', 'runner'], red: ['runner', 'pr'], green: ['runner', 'pr'], merge: ['pr', 'github'], live: ['runner', 'server'] };
function pathFor(e) { if (e.kind === 'red' && e.station === 'github') return ['runner', 'github']; return PATH[e.kind] || null; }

function card(id) {
  const b = L.box[id], s = M.stations.find(x => x.id === id), g = el('g', {}, world);
  const r = { g, rect: el('rect', { x: b.x, y: b.y, width: b.w, height: b.h, rx: 10, fill: '#fff', stroke: C.line, 'stroke-width': 2 }, g) };
  if (id === 'runner') {
    icon(g, s.icon, b.x + 12, b.y + 10, 20, C.ink);
    r.name = txt(g, b.x + 40, b.y + 25, s.name + (L.narrow ? '' : ' · a fresh Ubuntu virtual machine, nothing installed'), { size: 13, weight: 600 });
    r.pillBg = el('rect', { x: b.x + b.w - (L.narrow ? 96 : 150), y: b.y + 9, width: L.narrow ? 88 : 140, height: 20, rx: 10, fill: C.soft }, g);
    r.pill = txt(g, b.x + b.w - (L.narrow ? 52 : 80), b.y + 23, '', { size: 11, anchor: 'middle', weight: 600 });
    r.steps = M.steps.map((st, k) => {
      const col = k % L.rows.cols, row = Math.floor(k / L.rows.cols), x = L.rows.x0 + col * L.rows.colW, y = L.rows.y0 + row * L.rows.rowH;
      const sg = el('g', {}, g);
      const dot = el('circle', { cx: x + 10, cy: y + 10, r: 9, fill: C.soft, stroke: C.line }, sg);
      const ic = el('g', {}, sg);
      const name = txt(sg, x + 28, y + 14, (k + 1) + '. ' + st.name, { size: L.narrow ? 11.5 : 12.5, weight: 600 });
      const dur = txt(sg, x + L.rows.colW - 14, y + 14, '', { size: L.narrow ? 10.5 : 11.5, fill: C.muted, anchor: 'end', mono: true });
      const sub = L.narrow ? null : txt(sg, x + 28, y + 30, '', { size: 11, fill: C.muted, max: 52 });
      const bar = el('rect', { x: x + 28, y: y + (L.narrow ? 20 : 36), width: 0, height: 4, rx: 2, fill: C.accent }, sg);
      return { sg, dot, ic, name, dur, sub, bar, x, y };
    });
    return r;
  }
  icon(g, s.icon, b.x + 10, b.y + 10, 20, C.ink);
  r.name = txt(g, b.x + 38, b.y + 24, s.name, { size: L.narrow ? 11.5 : 13, weight: 600, max: L.narrow ? 10 : 30, lh: 13 });
  const pw = b.w - 20, py = b.y + b.h - 26;
  r.pillBg = el('rect', { x: b.x + 10, y: py, width: pw, height: 20, rx: 10, fill: C.soft }, g);
  r.pill = txt(g, b.x + 10 + pw / 2, py + 14, '', { size: L.narrow ? 9.5 : 11, anchor: 'middle', weight: 600 });
  return r;
}
function stat(i) {
  const g = el('g', {}, world);
  if (L.compact) { const w = (L.W - 20) / 3, x = 10 + i * w; return { k: txt(g, x, L.stats.y + 10, '', { size: 9.5, fill: C.muted }), v: txt(g, x, L.stats.y + 23, '', { size: 11.5, weight: 700 }) }; }
  if (L.narrow) { const w = (L.W - 20 - 12) / 3, x = 10 + i * (w + 6); el('rect', { x, y: L.stats.y, width: w, height: L.stats.h, rx: 8, fill: C.soft }, g);
    return { k: txt(g, x + 8, L.stats.y + 15, '', { size: 10, fill: C.muted }), v: txt(g, x + 8, L.stats.y + 33, '', { size: 12, weight: 700 }) }; }
  const w = (L.W - 40 - 24) / 3, x = 20 + i * (w + 12); el('rect', { x, y: L.stats.y, width: w, height: L.stats.h, rx: 8, fill: C.soft }, g);
  return { k: txt(g, x + 12, L.stats.y + 26, '', { size: 12, fill: C.muted }), v: txt(g, x + w - 12, L.stats.y + 27, '', { size: 14, weight: 700, anchor: 'end' }) };
}

function build() {
  if (tl) tl.kill();
  if (svg) svg.remove();
  L = layout(root.clientWidth || 1000, root.clientHeight || 600); mode = L.narrow ? 'narrow' : 'wide';
  svg = el('svg', { viewBox: '0 0 ' + L.W + ' ' + L.H, width: '100%', height: '100%', preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': 'Animated story: one push, one workflow, one deploy' });
  root.appendChild(svg);
  el('rect', { x: 0, y: 0, width: L.W, height: L.H, fill: '#ffffff' }, svg);
  world = el('g', {}, svg); R = { cards: {}, edges: {} };
  R.title = txt(world, L.narrow ? 10 : 20, 26, 'One push, one workflow, one deploy', { size: 14, weight: 600 });
  R.sub = txt(world, L.narrow ? 10 : 20, 46, '', { size: L.narrow ? 11 : 12.5, fill: C.muted, max: L.sub, lh: 13 });
  R.clock = txt(world, L.W - (L.narrow ? 10 : 20), 26, '', { size: L.narrow ? 10.5 : 12, fill: C.muted, anchor: 'end', mono: true });
  const edgeG = el('g', {}, world);
  [['dev', 'github'], ['github', 'runner'], ['runner', 'pr'], ['runner', 'server'], ['pr', 'github']].forEach(([a, b]) => {
    const p1 = side(a, b), p2 = side(b, a);
    R.edges[a + '>' + b] = el('line', { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, stroke: C.line, 'stroke-width': 2.5, 'stroke-linecap': 'round', opacity: (a === 'pr' || b === 'pr') && M.target === 'main' ? 0.35 : 1 }, edgeG);
  });
  ['github', 'pr', 'server', 'runner'].forEach(id => { R.cards[id] = card(id); });
  // the developer and a terminal
  const d = L.dev;
  el('rect', { x: d.x, y: d.y, width: d.w, height: d.h, rx: 12, fill: C.soft, stroke: C.line }, world);
  icon(world, 'user', d.x + 12, d.y + 10, 22, C.accent);
  txt(world, d.x + 42, d.y + 26, 'Developer', { size: L.narrow ? 12 : 14, weight: 700 });
  if (L.narrow) {
    R.term = el('rect', { x: d.x + 120, y: d.y + 8, width: d.w - 130, height: d.h - 16, rx: 6, fill: C.term }, world);
    R.termT = txt(world, d.x + 130, d.y + (L.compact ? 22 : 24), '', { size: 9.5, fill: '#cfe0ff', mono: true, max: L.compact ? 44 : 36, lh: 12 });
  } else {
    el('rect', { x: d.x + 10, y: d.y + 44, width: d.w - 20, height: d.h - 56, rx: 8, fill: C.term }, world);
    R.termT = txt(world, d.x + 18, d.y + 64, '', { size: 10.5, fill: '#cfe0ff', mono: true, max: 20, lh: 14 });
  }
  const c = L.cap;
  R.capBox = el('rect', { x: c.x, y: c.y, width: c.w, height: c.h, rx: 12, fill: C.soft, stroke: C.soft, 'stroke-width': 2 }, world);
  R.scene = txt(world, c.x + 18, c.y + 23, '', { size: L.narrow ? 11 : 12.5, weight: 700, fill: C.accent });
  R.cap = txt(world, c.x + 18, c.y + 45, '', { size: c.size, max: c.chars, lh: c.size + 4 });
  R.note = txt(world, c.x + 18, c.y + 86, '', { size: c.size - 1.5, fill: C.muted, max: c.nchars, lh: c.size + 2 });
  R.stats = [0, 1, 2].map(stat);
  // tokens
  tl = gsap.timeline({ paused: true });
  M.events.forEach(e => {
    const path = pathFor(e); if (!path) return;
    const col = e.kind === 'red' ? C.bad : e.kind === 'green' || e.kind === 'live' ? C.good : C.accent;
    const tok = el('g', { opacity: 0 }, world);
    el('rect', { x: -14, y: -10, width: 28, height: 20, rx: 5, fill: col, stroke: '#fff', 'stroke-width': 2 }, tok);
    icon(tok, e.kind === 'red' ? 'x' : e.kind === 'green' || e.kind === 'live' ? 'check' : e.kind === 'merge' ? 'git-merge' : 'git-commit-horizontal', -7, -7, 14, '#ffffff');
    const p1 = side(path[0], path[1]), p2 = side(path[1], path[0]), total = Math.min(e.dur - 0.2, TRAVEL);
    gsap.set(tok, { x: p1.x, y: p1.y }); tl.set(tok, { opacity: 1 }, e.start);
    tl.to(tok, { x: p2.x, y: p2.y, duration: total, ease: 'none' }, e.start);
    tl.to(tok, { opacity: 0, duration: 0.2 }, e.start + total + 0.1);
    e._arrive = e.start + total; e._path = path;
  });
  tl.set({}, {}, M.duration);
}

function pill(r, text, col, fill) { setText(r.pill, text); r.pill.setAttribute('fill', col); r.pillBg.setAttribute('fill', fill); }
function setState(t) {
  T = t;
  let e = M.events[0];
  for (const ev of M.events) if (ev.start <= t + 1e-6) e = ev;
  const done = t >= M.duration - 0.05, arrived = e._arrive == null || t >= e._arrive - 0.02, prev = e.i ? M.events[e.i - 1].snap : null;
  const snap = arrived || !prev ? e.snap : prev, sc = M.scenes[e.scene], last = sc.i === M.scenes.length - 1, u = Math.max(0, Math.min(1, (t - e.start) / e.dur));
  setText(R.sub, done ? M.summary : L.narrow ? (M.target === 'main' ? 'To main' : 'Pull request') + ' · ' + (M.warm ? 'warm' : 'cold') + ' cache · tests ' + (M.fails ? 'fail' : 'pass') + ' · protection ' + (M.protect ? 'on' : 'off')
    : (M.target === 'main' ? 'Push straight to main' : 'Branch with a pull request') + ' · cache ' + (M.warm ? 'warm' : 'cold') + ' · tests ' + (M.fails ? 'fail' : 'pass') + ' · protection ' + (M.protect ? 'on' : 'off'), L.sub, 13);
  // clock: interpolate inside a running step
  const nx = M.events[e.i + 1], gap = nx ? nx.realMs - e.realMs : 0;
  setText(R.clock, '+' + fmt(e.realMs + (e.kind === 'run' && gap > 0 ? gap * u : 0)) + (L.narrow ? '' : ' after push'));
  const lit = new Set();
  M.events.forEach(ev => { if (ev._path && ev.start <= t + 1e-6 && (ev.i < e.i || arrived)) lit.add(ev._path.join('>')); });
  Object.entries(R.edges).forEach(([k, ln]) => ln.setAttribute('stroke', lit.has(k) ? C.accent : C.line));
  // cards
  const act = id => !done && (e.station === id || (e._path && e._path[1] === id && arrived));
  const set = (id, stroke, fill, dash) => { const r = R.cards[id].rect; r.setAttribute('stroke', stroke); r.setAttribute('fill', fill); r.setAttribute('stroke-dasharray', dash || ''); r.setAttribute('stroke-width', act(id) ? 3 : 2); };
  const run = snap.run;
  pill(R.cards.github, { none: 'Waiting for a push', queued: 'Run queued', running: 'Run in progress', passed: 'Run passed', failed: 'Run failed' }[run], run === 'failed' ? '#fff' : run === 'passed' ? C.good : run === 'none' ? C.muted : C.accent, run === 'failed' ? C.bad : run === 'passed' ? C.goodTint : run === 'none' ? C.soft : C.tint);
  set('github', act('github') ? C.accent : run === 'failed' ? C.bad : C.line, act('github') ? C.tint : '#fff');
  const prT = { none: ['No pull request', C.muted, C.soft], open: ['Open · check pending', C.accent, C.tint], green: ['Check passed ✓', C.good, C.goodTint], red: ['Check failed ✕', '#fff', C.bad], blocked: ['Merge blocked', C.hi, C.hiTint], merged: ['Merged', C.good, C.goodTint] }[snap.pr];
  pill(R.cards.pr, L.narrow ? prT[0].replace('Open · check pending', 'Check pending').replace('No pull request', 'No PR') : prT[0], prT[1], prT[2]);
  set('pr', act('pr') ? C.accent : snap.pr === 'blocked' ? C.hi : snap.pr === 'red' ? C.bad : C.line, act('pr') ? C.tint : snap.pr === 'blocked' ? C.hiTint : '#fff', M.target === 'main' ? '5 4' : '');
  pill(R.cards.server, snap.deployed ? 'v42 live (new build)' : 'v41 (previous build)', snap.deployed ? C.good : C.muted, snap.deployed ? C.goodTint : C.soft);
  set('server', act('server') ? C.accent : snap.deployed ? C.good : C.line, act('server') ? C.tint : snap.deployed ? C.goodTint : '#fff');
  const rn = R.cards.runner;
  pill(rn, { none: 'Not started', queued: 'Starting…', running: 'Job running', passed: 'Job passed', failed: 'Job failed' }[run], run === 'failed' ? '#fff' : run === 'passed' ? C.good : run === 'none' ? C.muted : C.accent, run === 'failed' ? C.bad : run === 'passed' ? C.goodTint : run === 'none' ? C.soft : C.tint);
  set('runner', act('runner') ? C.accent : run === 'failed' ? C.bad : run === 'passed' ? C.good : C.line, '#fff');
  // step rows
  M.steps.forEach((st, k) => {
    const row = rn.steps[k], s = snap.steps[st.id], running = e.kind === 'run' && e.step === st.id && !done;
    const col = running ? C.accent : s === 'passed' ? C.good : s === 'failed' ? C.bad : s === 'skipped' ? C.hi : C.muted;
    row.dot.setAttribute('fill', running ? C.tint : s === 'passed' ? C.goodTint : s === 'failed' ? C.badTint : s === 'skipped' ? C.hiTint : C.soft); row.dot.setAttribute('stroke', s === 'queued' && !running ? C.line : col);
    while (row.ic.firstChild) row.ic.removeChild(row.ic.firstChild);
    icon(row.ic, running ? 'loader' : s === 'passed' ? 'check' : s === 'failed' ? 'x' : s === 'skipped' ? 'minus' : 'circle-dashed', row.x + 3, row.y + 3, 14, col);
    if (running) row.ic.setAttribute('transform', 'rotate(' + ((t * 180) % 360) + ' ' + (row.x + 10) + ' ' + (row.y + 10) + ')'); else row.ic.removeAttribute('transform');
    row.name.setAttribute('fill', s === 'queued' && !running ? C.muted : C.ink);
    setText(row.dur, running ? Math.round(u * st.dur) + ' s' : s === 'passed' || s === 'failed' ? st.dur + ' s' : s === 'skipped' ? 'skipped' : '');
    row.dur.setAttribute('fill', s === 'failed' ? C.bad : s === 'skipped' ? C.hi : C.muted);
    if (row.sub) setText(row.sub, running ? 'running…' : s === 'passed' ? 'exit 0' : s === 'failed' ? 'exit 1 · the job stops here' : s === 'skipped' ? (st.id === 'deploy' && !snap.steps.unit.match(/failed/) && !M.fails ? 'only on main' : 'never ran') : 'queued', 52);
    row.bar.setAttribute('width', running ? u * (L.rows.colW - 42) : s === 'passed' || s === 'failed' ? L.rows.colW - 42 : 0); row.bar.setAttribute('fill', s === 'failed' ? C.bad : s === 'passed' ? C.good : C.accent);
  });
  // terminal
  const term = e.kind === 'push' ? '$ git push origin ' + (M.target === 'main' ? 'main' : 'feature/export-course') + '\n' + (u > 0.4 ? 'Writing objects: 100%\nTo github.com:acme/visualization-lab\n   e24f3ea..f6e3e29' : '')
    : done ? '$ _\n' + (snap.deployed ? '# shipped' : '# fix the test, push again') : snap.pr === 'blocked' ? '$ # check failed\n$ # fixing the test…' : '$ _\n# waiting for the check';
  setText(R.termT, L.compact ? term.split('\n')[0] + (term.includes('\n') ? ' …' : '') : term.replace(/\n/g, ' ⏎ '), L.compact ? 44 : L.narrow ? 36 : 20, L.narrow ? 12 : 14);
  // caption and stats
  setText(R.scene, 'Scene ' + (sc.i + 1) + ' of ' + M.scenes.length + ' · ' + sc.title);
  const capLines = setText(R.cap, last ? M.outcome : sc.caption, L.cap.chars, L.cap.size + 4);
  R.note.setAttribute('y', L.cap.y + 45 + capLines * (L.cap.size + 4) + 2);
  setText(R.note, L.compact && !last && L.cap.h < 100 ? '' : last ? M.soWhat : '▸ ' + e.note, L.cap.nchars, L.cap.size + 2);
  R.note.setAttribute('font-weight', last ? 700 : 400); R.note.setAttribute('fill', last ? C.ink : C.muted);
  R.capBox.setAttribute('fill', last ? (M.deployed ? C.goodTint : C.hiTint) : C.soft); R.capBox.setAttribute('stroke', last ? (M.deployed ? C.good : C.hi) : C.soft);
  const vals = Object.values(snap.steps), np = vals.filter(v => v === 'passed').length, nf = vals.filter(v => v === 'failed').length, ns = vals.filter(v => v === 'skipped').length;
  const S = [['Elapsed since push', fmt(e.realMs)], [L.narrow ? 'Steps' : 'Steps passed / failed / skipped', np + ' / ' + nf + ' / ' + ns], ['Server', snap.deployed ? 'new build live' : 'previous build']];
  R.stats.forEach((s, k) => { setText(s.k, S[k][0]); setText(s.v, S[k][1]); });
  R.stats[1].v.setAttribute('fill', nf ? C.bad : C.ink); R.stats[2].v.setAttribute('fill', snap.deployed ? C.good : C.ink);
}

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  seek(t) { if (!tl) return; T = Math.min(Math.max(0, t), M.duration); tl.seek(T, false); setState(T); },
  mount(r, params) {
    root = r; M = model(params); build(); this.seek(0);
    ro = new ResizeObserver(() => { const nm = layout(root.clientWidth, root.clientHeight); if ((nm.narrow ? 'narrow' : 'wide') !== mode || (nm.narrow && (nm.H !== L.H || !!nm.compact !== !!L.compact))) requestAnimationFrame(() => { if (M) { build(); this.seek(T); } }); });
    ro.observe(root);
  },
  update(params) { M = model(params); build(); this.seek(0); },
  destroy() { if (ro) ro.disconnect(); if (tl) tl.kill(); if (svg) svg.remove(); svg = world = tl = M = null; }
};

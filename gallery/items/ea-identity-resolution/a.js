// Story: one SVG sized to the root (1 unit = 1 px) and one paused GSAP timeline built from model().
// Record cards land in their source columns, fly into match groups, get linked with the reason, become profiles, then meet the truth.
const NS = 'http://www.w3.org/2000/svg', FONT = 'system-ui, -apple-system, sans-serif';
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', accent: '#2b59c3', good: '#1f7a4d', bad: '#b42318', amber: '#b4530f',
  soft: '#f4f6f9', gold: '#c9a227', goldTint: '#fdf8e8', goodTint: '#e6f4ec', badTint: '#fdecea', amberTint: '#fff4e5' };
const PERSON = { P1: '#2b59c3', P2: '#0f766e', P3: '#6d4bbf' };
const STATUS = { correct: [C.good, C.goodTint], merge: [C.bad, C.badTint], split: [C.amber, C.amberTint] };
let root = null, svg = null, tl = null, M = null, L = null, H = null, T = 0, ro = null, lastW = 0, lastH = 0;

function el(tag, attrs, parent) { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; }
function txt(parent, x, y, s, o = {}) {
  const n = el('text', { x, y, 'font-size': o.size || 12, 'font-weight': o.weight || 400, fill: o.fill || C.ink, 'text-anchor': o.anchor || 'start', 'font-family': FONT }, parent);
  if (o.italic) n.setAttribute('font-style', 'italic');
  n.textContent = s; return n;
}
function wrapText(node, s, x, maxW, lh, maxLines) {
  while (node.firstChild) node.removeChild(node.firstChild);
  const per = Math.max(8, Math.floor(maxW / (+node.getAttribute('font-size') * 0.52))), lines = [];
  let cur = '';
  for (const w of String(s).split(' ')) { if ((cur + ' ' + w).trim().length > per && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
  if (cur) lines.push(cur);
  lines.slice(0, maxLines || 9).forEach((l, i) => { const t = el('tspan', { x, dy: i ? lh : 0 }, node); t.textContent = l; });
  return Math.min(lines.length, maxLines || 9);
}
function icon(parent, name, x, y, size, color) { const n = labIcon(name, { x, y, width: size, height: size, stroke: color || C.ink }); parent.appendChild(n); return n; }
const show = (g, at, end) => { gsap.set(g, { opacity: 0 }); tl.set(g, { opacity: 1 }, at); if (end != null) tl.set(g, { opacity: 0 }, end); };
const fade = (g, at, d) => { gsap.set(g, { opacity: 0 }); tl.to(g, { opacity: 1, duration: d || 0.35 }, at); };
const st = id => M.steps.find(s => s.id === id).t;

function geometry() {
  const W = root.clientWidth, Hh = root.clientHeight, narrow = W < 640;
  const headBot = narrow ? 82 : 66, ruleY = headBot, stageTop = headBot + 34;
  const cols = narrow ? 2 : 4, colW = (W - 32 - (cols - 1) * 10) / cols, cw = Math.min(200, colW - 12);
  const band = narrow ? 86 : 80, bandY = Hh - band - 6;
  return { W, H: Hh, narrow, headBot, ruleY, stageTop, cols, colW, cw, ch: narrow ? 50 : 56, lg: narrow ? 16 : 20, hh: narrow ? 20 : 22, band, bandY };
}
// Shelf-pack the profile boxes into the cluster area; try every rows-per-box limit and keep the largest scale
function clusterLayout(area) {
  const { cw, ch, lg, hh } = L, pad = 6, cg = 22, sp = 10;
  let best = null;
  for (let R = 1; R <= 11; R++) {
    const dims = M.profiles.map(pr => { const n = pr.records.length, rows = Math.min(n, R), cols = Math.ceil(n / R); return { rows, cols, w: cols * cw + (cols - 1) * cg + 2 * pad, h: hh + rows * ch + (rows - 1) * lg + pad }; });
    let s = 1, pack = null;
    for (let it = 0; it < 4; it++) {
      const maxW = area.w / s; if (dims.some(d => d.w > maxW)) { pack = null; break; }
      const rows = []; // first fit: each box goes into the first shelf with room
      dims.forEach((d, i) => { let row = rows.find(r => r.w + sp + d.w <= maxW); if (!row) { row = { items: [], w: -sp, h: 0 }; rows.push(row); } d.x = row.w + sp; row.w += sp + d.w; row.h = Math.max(row.h, d.h); row.items.push(i); });
      let y = 0; rows.forEach(r => { r.y = y; y += r.h + sp; });
      pack = { rows, height: y - sp, maxW };
      s = Math.min(1, area.h / pack.height);
      if (pack.height * s <= area.h + 0.5 && pack.rows.every(r => r.w <= maxW)) break;
    }
    const wraps = dims.reduce((a, d) => a + d.cols - 1, 0); // links between columns cannot carry a label
    if (pack && (!best || s > best.s + 0.02 || (s > best.s - 0.02 && (wraps < best.wraps || (wraps === best.wraps && pack.height < best.pack.height))))) best = { R, s, wraps, pack, dims: dims.map(d => Object.assign({}, d)) };
  }
  const { R, s, pack, dims } = best, out = [], oy = Math.max(0, (area.h - pack.height * s) / 2);
  pack.rows.forEach(r => r.items.forEach(i => {
    const d = dims[i], ox = area.x + (area.w - r.w * s) / 2, bx = ox + d.x * s, by = area.y + oy + r.y * s;
    const cards = M.profiles[i].records.map((_, k) => ({ x: bx + (pad + Math.floor(k / R) * (cw + cg)) * s, y: by + (hh + (k % R) * (ch + lg)) * s }));
    out[i] = { x: bx, y: by, w: d.w * s, h: d.h * s, cards };
  }));
  return { s, boxes: out };
}

function card(parent, r) {
  const g = el('g', {}, parent), { cw, ch } = L, y0 = L.narrow ? 15 : 18, dy = L.narrow ? 14 : 15.5;
  el('rect', { x: 0, y: 0, width: cw, height: ch, rx: 7, fill: '#fff', stroke: C.line }, g);
  const stripe = el('rect', { x: 0, y: 0, width: 5, height: ch, rx: 2, fill: C.line }, g);
  icon(g, M.sources[r.src].icon, cw - 21, 6, 14, C.muted);
  const f = {
    name: txt(g, 11, y0, r.name, { size: 12.5, weight: 600 }),
    email: txt(g, 11, y0 + dy, r.email || 'no email', { size: 11, fill: r.email ? C.ink : C.muted, italic: !r.email }),
    phone: txt(g, 11, y0 + 2 * dy, r.phone || 'no phone', { size: 11, fill: r.phone ? C.ink : C.muted, italic: !r.phone }),
    dob: txt(g, 74, y0 + 2 * dy, '· DOB ' + r.dob, { size: 11 })
  };
  return { g, stripe, f };
}

function build() {
  if (tl) tl.kill();
  if (svg) svg.remove();
  L = geometry();
  const { W, narrow, cw, ch } = L, sf = M.salesforce;
  svg = el('svg', { width: W, height: L.H, viewBox: `0 0 ${W} ${L.H}`, role: 'img', 'aria-label': 'Animated story: matching member records from four systems into profiles' }, root);
  svg.style.display = 'block';
  el('rect', { x: 0, y: 0, width: W, height: L.H, fill: '#fff' }, svg);
  tl = gsap.timeline({ paused: true });
  H = { title: txt(svg, 16, 24, '', { size: 14, weight: 600 }), note: txt(svg, 16, 44, '', { size: 12.5, fill: C.muted }) };
  // Rule chip and truth legend
  const rule = el('g', {}, svg), rw = Math.min(W - 32, 34 + (sf ? 110 : 76) + M.ruleLabel.length * 6.6);
  el('rect', { x: 16, y: L.ruleY, width: rw, height: 24, rx: 12, fill: '#e8eefb', stroke: C.accent }, rule);
  icon(rule, 'filter', 26, L.ruleY + 5, 14, C.accent);
  txt(rule, 46, L.ruleY + 16, (sf ? 'Ruleset match rule: ' : 'Match rule: ') + M.ruleLabel, { size: 12, weight: 600, fill: C.accent });
  fade(rule, st('rule'));
  if (narrow) tl.to(rule, { opacity: 0, duration: 0.3 }, st('reveal')); // the legend takes its row on phones
  const leg = el('g', {}, svg), lx0 = narrow ? 16 : Math.max(rw + 32, W - 380), ly = L.ruleY + 16;
  txt(leg, lx0, ly, 'Truth:', { size: 11.5, fill: C.muted });
  M.people.forEach((pp, k) => { const x = lx0 + 40 + k * (narrow ? 112 : 110); el('rect', { x, y: ly - 10, width: 6, height: 12, rx: 2, fill: PERSON[pp.id] }, leg); txt(leg, x + 10, ly, pp.name, { size: 11.5, weight: 600 }); });
  fade(leg, st('reveal'));
  // Intro: three copies of one letter
  const intro = el('g', {}, svg), cx = W / 2, cy = (L.stageTop + L.bandY) / 2;
  [-1, 0, 1].forEach(k => { const g = el('g', { transform: `translate(${cx - 46 + k * 62} ${cy - 74 + Math.abs(k) * 10}) rotate(${k * 9} 46 34)` }, intro);
    el('rect', { x: 0, y: 0, width: 92, height: 68, rx: 6, fill: '#fff', stroke: C.muted }, g); el('path', { d: 'M0 4 L46 38 L92 4', fill: 'none', stroke: C.muted }, g); });
  txt(intro, cx, cy + 26, 'Dear Maria Lopez ×3', { size: 15, weight: 600, anchor: 'middle' });
  txt(intro, cx, cy + 46, 'one member, three copies of every letter', { size: 12.5, fill: C.muted, anchor: 'middle' });
  tl.to(intro, { opacity: 0, duration: 0.4 }, 1.9);
  // Source columns
  const srcLayer = el('g', {}, svg), boxH = 40 + 3 * (ch + 6), slots = {};
  M.sources.forEach((s, k) => {
    const col = k % L.cols, row = Math.floor(k / L.cols), x = 16 + col * (L.colW + 10), y = L.stageTop + row * (boxH + 10);
    const g = el('g', {}, srcLayer);
    el('rect', { x, y, width: L.colW, height: boxH, rx: 10, fill: C.soft }, g);
    icon(g, s.icon, x + 10, y + 9, 18, C.accent);
    txt(g, x + 34, y + 19, s.name, { size: 12.5, weight: 600 });
    txt(g, x + 34, y + 33, s.sub + (sf ? ' · data stream' : ''), { size: 11, fill: C.muted });
    fade(g, 2.0 + k * 0.2);
    M.records.filter(r => r.src === k).forEach((r, j) => { slots[r.i] = { x: x + (L.colW - cw) / 2, y: y + 40 + j * (ch + 6) }; });
  });
  tl.to(srcLayer, { opacity: 0, duration: 0.4 }, st('match'));
  // Profile frames (behind), cards, links (in front)
  const area = { x: 16, y: L.stageTop, w: W - 32, h: L.bandY - L.stageTop - 8 }, CL = clusterLayout(area), s = CL.s;
  const frames = el('g', {}, svg), cardLayer = el('g', {}, svg), linkLayer = el('g', {}, svg);
  const cards = M.records.map(r => card(cardLayer, r));
  const tRule = st('rule'), tMatch = st('match'), tProf = st('profiles'), tRev = st('reveal');
  const hl = { 0: ['email'], 1: ['email', 'phone'], 2: ['name', 'dob'], 3: ['name'] }[M.rule];
  M.records.forEach((r, k) => {
    const c = cards[r.i], sl = slots[r.i];
    gsap.set(c.g, { x: sl.x, y: sl.y - 16, opacity: 0, transformOrigin: '0% 0%' });
    tl.to(c.g, { y: sl.y, opacity: 1, duration: 0.35, ease: 'power2.out' }, st('arrive') + 0.2 + k * 0.35);
    hl.forEach(f => tl.to(c.f[f], { attr: { fill: C.accent }, duration: 0.3 }, tRule + 0.5 + k * 0.05));
  });
  let li = 0;
  M.profiles.forEach((pr, b) => {
    const B = CL.boxes[b], [sc, stint] = STATUS[pr.status];
    pr.records.forEach((ri, k) => tl.to(cards[ri].g, { x: B.cards[k].x, y: B.cards[k].y, scale: s, duration: 1.1, ease: 'power2.inOut' }, tMatch + 0.3 + ri * 0.04));
    const fr = el('g', {}, frames);
    const box = el('rect', { x: B.x, y: B.y, width: B.w, height: B.h, rx: 10, fill: C.goldTint, stroke: C.gold, 'stroke-width': 1.5 }, fr);
    const fs = Math.max(10.5, 11.5 * s), hy = B.y + 15 * s + 1;
    const nameH = txt(fr, B.x + 8, hy, '#' + pr.id + ' ' + pr.label + ' · ' + pr.records.length, { size: fs, weight: 600, fill: '#7a5d00' });
    const who = M.people.find(pp => pp.id === pr.people[0]).name, cnt = M.perPerson.find(pp => pp.id === pr.people[0]).profiles;
    const stH = txt(fr, B.x + 8, hy, pr.status === 'correct' ? '✓ Correct: ' + who : pr.status === 'merge' ? '✗ False merge: ' + pr.people.length + ' people' : 'Duplicate 1/' + cnt + ': ' + who, { size: fs, weight: 700, fill: sc });
    fade(fr, tProf, 0.4); show(nameH, tProf, tRev); show(stH, tRev);
    tl.to(box, { attr: { stroke: sc, fill: stint }, duration: 0.4 }, tRev);
    pr.links.forEach((lk, k) => {
      const a = B.cards[k], z = B.cards[k + 1], same = Math.abs(a.x - z.x) < 1, cross = M.records[lk.a].person !== M.records[lk.b].person;
      const g = el('g', {}, linkLayer), at = tMatch + 1.6 + li++ * Math.min(0.25, 2.2 / Math.max(1, M.records.length - M.profiles.length));
      const ln = same ? el('line', { x1: a.x + cw * s / 2, y1: a.y + ch * s, x2: z.x + cw * s / 2, y2: z.y, stroke: C.accent, 'stroke-width': 2 }, g)
        : el('path', { d: `M${a.x + cw * s} ${a.y + ch * s / 2} C${a.x + cw * s + 18} ${a.y + ch * s / 2} ${z.x - 18} ${z.y + ch * s / 2} ${z.x} ${z.y + ch * s / 2}`, fill: 'none', stroke: C.accent, 'stroke-width': 2, 'stroke-dasharray': '4 3' }, g);
      if (same && L.lg * s >= 14) {   // the reason pill needs the gap between cards; when the cluster is scaled down on a phone the line alone carries the link
        const pw = lk.reason.length * 6 + 14, px = a.x + cw * s / 2 - pw / 2, py = a.y + ch * s + L.lg * s / 2 - 8;
        const pill = el('rect', { x: px, y: py, width: pw, height: 16, rx: 8, fill: '#fff', stroke: C.accent }, g);
        const t = txt(g, px + pw / 2, py + 12, lk.reason, { size: 11, weight: 600, fill: C.accent, anchor: 'middle' });
        if (cross) { tl.to(pill, { attr: { fill: C.bad, stroke: C.bad }, duration: 0.3 }, tRev + 0.3); tl.to(t, { attr: { fill: '#fff' }, duration: 0.3 }, tRev + 0.3); }
      }
      if (cross) tl.to(ln, { attr: { stroke: C.bad, 'stroke-width': 3 }, duration: 0.3 }, tRev + 0.3);
      fade(g, at, 0.25);
    });
    pr.records.forEach(ri => tl.to(cards[ri].stripe, { attr: { fill: PERSON[M.records[ri].person] }, duration: 0.3 }, tRev + 0.1));
  });
  buildBand();
  tl.set({}, {}, M.duration);
}

function buildBand() {
  const { W, narrow, bandY } = L, m = M.metrics, tRev = st('reveal'), tw = 116, th = L.band;
  if (!narrow) [[m.correct + ' / 3', 'people resolved correctly', m.correct === 3 ? C.good : C.ink],
   [String(m.falseMerges), m.falseMerges === 1 ? 'false merge' : 'false merges', m.falseMerges ? C.bad : C.good],
   [String(m.missed), m.missed === 1 ? 'duplicate' : 'duplicates', m.missed ? C.amber : C.good]].forEach(([v, lab, col], k) => {
    const g = el('g', {}, svg), x = 16 + k * (tw + 8);
    el('rect', { x, y: bandY, width: tw, height: th, rx: 10, fill: C.soft }, g);
    txt(g, x + 10, bandY + 32, v, { size: 24, weight: 700, fill: col });
    const t = txt(g, x + 10, bandY + 52, '', { size: 11, fill: C.muted }); wrapText(t, lab, x + 10, tw - 16, 13, 2);
    fade(g, tRev + 0.6 + k * 0.2);
  });
  const sx = narrow ? 16 : 16 + 3 * 124, sy = bandY, sw = W - 16 - sx, sh = th;
  const g = el('g', {}, svg);
  el('rect', { x: sx, y: sy, width: sw, height: sh, rx: 10, fill: '#fff', stroke: C.bad, 'stroke-width': 1.5 }, g);
  icon(g, 'shield-alert', sx + 10, sy + 9, 18, C.bad);
  txt(g, sx + 34, sy + 22, 'So what for architects', { size: 12.5, weight: 700 });
  const t = txt(g, sx + 12, sy + 40, '', { size: 11.5 });
  wrapText(t, narrow ? 'Too strict: duplicate letters, a split care history. Too loose: one member sees another\'s claims (PHI). Match rules are a business and privacy decision.'
    : 'Too strict leaves duplicates: repeat letters, a split care history. Too loose merges people: one member can see another member\'s claims (PHI). Match ' + (M.salesforce ? 'rules in the ruleset' : 'rules') + ' are a business and privacy decision.', sx + 12, sw - 24, 14.5, 3);
  fade(g, st('sowhat'), 0.5);
}

function setState(t) {
  let k = 0; M.steps.forEach((s, i) => { if (s.t <= t + 1e-6) k = i; });
  const done = t >= M.duration - 0.05;
  H.title.textContent = (k + 1) + ' / ' + M.steps.length + ' · ' + M.steps[k].title;
  wrapText(H.note, done ? M.summary : M.steps[k].note, 16, L.W - 32, 16, L.narrow ? 3 : 2);
}

window.lab = {
  get duration() { return M ? M.duration : 23.5; },
  get markers() { return M ? M.markers : []; },
  seek(t) { if (!tl) return; T = Math.max(0, Math.min(M.duration, t)); tl.seek(T, false); setState(T); },
  mount(r, params) {
    root = r; M = model(params); T = 0; lastW = root.clientWidth; lastH = root.clientHeight;
    build(); this.seek(0);
    ro = new ResizeObserver(() => { if (root.clientWidth !== lastW || root.clientHeight !== lastH) { lastW = root.clientWidth; lastH = root.clientHeight; build(); this.seek(T); } });
    ro.observe(root);
  },
  update(params) { M = model(params); T = 0; build(); this.seek(0); },
  destroy() { if (ro) ro.disconnect(); if (tl) tl.kill(); if (svg) svg.remove(); svg = tl = M = null; }
};

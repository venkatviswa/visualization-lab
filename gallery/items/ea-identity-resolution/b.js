// D3 match graph: records are nodes coloured by source, matching pairs are edges, profiles are rings (hulls).
// seek(t) recomputes the exact frame: nodes leave their source lanes, edges draw in, profiles form, then the truth recolours everything.
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', accent: '#2b59c3', good: '#1f7a4d', bad: '#b42318', amber: '#b4530f',
  soft: '#f4f6f9', gold: '#c9a227', goldTint: '#fdf8e8', goodTint: '#e6f4ec', badTint: '#fdecea', amberTint: '#fff4e5' };
const SRC = ['#2b59c3', '#0f766e', '#6d4bbf', '#be4d8a'];
const PERSON = { P1: '#2b59c3', P2: '#0f766e', P3: '#6d4bbf' };
const STATUS = { correct: [C.good, C.goodTint], merge: [C.bad, C.badTint], split: [C.amber, C.amberTint] };
const FONT = 'system-ui, -apple-system, sans-serif';
let rootEl = null, svg = null, M = null, G = null, T = 0, ro = null, lastW = 0, lastH = 0;
const PAD = 22;
function profLabel(pr) { return '#' + pr.id + ' ' + pr.label + (pr.records.length > 1 ? ' · ' + pr.records.length : ''); }
function statusLabel(pr) { return pr.status === 'correct' ? '✓ Correct' : pr.status === 'merge' ? '✗ False merge: ' + pr.people.length + ' people' : 'Duplicate 1 of ' + M.perPerson.find(pp => pp.id === pr.people[0]).profiles; }
const clamp01 = v => Math.max(0, Math.min(1, v));
const st = id => M.steps.find(s => s.id === id).t;

function layout() {
  const W = rootEl.clientWidth, H = rootEl.clientHeight, narrow = W < 640;
  const head = narrow ? 82 : 66, legY = head + 6, top = legY + (narrow ? 46 : 30);
  const panel = narrow ? { x: 16, y: H - 126, w: W - 32, h: 120 } : { x: W - 246, y: top, w: 230, h: H - top - 12 };
  const area = narrow ? { x: 16, y: top + 16, w: W - 32, h: panel.y - top - 40 } : { x: 16, y: top + 16, w: W - 290, h: H - top - 40 };
  // Each profile is a group of its records (a ring when 3 or more) with a rectangular footprint for its labels;
  // footprints are shelf-packed (first fit) and centred, then compressed slightly if they still do not fit
  const lw = s => s.length * 6.3 + 8;
  const rings = M.profiles.map(pr => {
    const n = pr.records.length, ring = n === 1 ? 0 : n === 2 ? 48 : Math.max(62, n * 76 / (2 * Math.PI)), big = n >= 3 ? ring : 0, up = big + PAD + 20;
    const w = Math.max(n === 1 ? lw(pr.label) + 8 : 2 * ring + 86, lw(statusLabel(pr)), lw(profLabel(pr)));
    return { pr, n, ring, w, h: up + big + 36, up };
  });
  const sp = 12, rows = [];
  rings.forEach(c => { let r = rows.find(r => r.w + sp + c.w <= area.w); if (!r) { r = { w: -sp, h: 0, items: [] }; rows.push(r); } c.x = r.w + sp; r.w += sp + c.w; r.h = Math.max(r.h, c.h); r.items.push(c); });
  let y = 0; rows.forEach(r => { r.y = y; y += r.h + sp; });
  const k = Math.min(1, area.h / (y - sp)), oy = area.y + Math.max(0, (area.h - (y - sp)) / 2);
  const pos = [];
  rows.forEach(r => r.items.forEach(c => {
    c.cx = area.x + (area.w - r.w) / 2 + c.x + c.w / 2; c.cy = oy + (r.y + c.up) * k; c.ring *= c.n > 2 ? k : 1;
    // Group each ring by true person so that, at the reveal, edges between people show up as chords between arcs
    const order = c.pr.records.slice().sort((a, b) => M.records[a].person.localeCompare(M.records[b].person) || a - b);
    order.forEach((ri, j) => { const a = (c.n === 2 ? Math.PI : -Math.PI / 2) + 2 * Math.PI * j / c.n; pos[ri] = { x: c.cx + c.ring * Math.cos(a), y: c.cy + c.ring * Math.sin(a) }; });
  }));
  // Source lanes for the arrival steps
  const cols = narrow ? 2 : 4, laneW = (W - 32 - (cols - 1) * 10) / cols, lanes = M.sources.map((s, i) => ({ s, i, x: 16 + (i % cols) * (laneW + 10), y: area.y + Math.floor(i / cols) * 196, w: laneW }));
  const lanePos = M.records.map(r => { const ln = lanes[r.src], j = M.records.filter(q => q.src === r.src && q.i < r.i).length; return { x: ln.x + 18, y: ln.y + 44 + j * 50 }; });
  return { W, H, narrow, head, legY, top, panel, area, rings, pos, lanes, lanePos };
}

function draw() {
  if (!svg || !M) return;
  const { W, H, narrow, rings, pos, lanePos, panel } = G, t = T, done = t >= M.duration - 0.05;
  svg.attr('width', W).attr('height', H).selectAll('*').remove();
  svg.append('rect').attr('width', W).attr('height', H).attr('fill', '#fff');
  let k = 0; M.steps.forEach((s, i) => { if (s.t <= t + 1e-6) k = i; });
  const tRule = st('rule'), tMatch = st('match'), tProf = st('profiles'), tRev = st('reveal'), tSo = st('sowhat');
  const move = d3.easeCubicInOut(clamp01((t - tMatch - 0.3) / 1.2)), rev = clamp01((t - tRev) / 0.5), revealed = t >= tRev;
  svg.append('text').attr('x', 16).attr('y', 24).attr('font-size', 14).attr('font-weight', 600).attr('fill', C.ink).text((k + 1) + ' / ' + M.steps.length + ' · ' + M.steps[k].title);
  wrap(svg.append('text').attr('x', 16).attr('y', 44).attr('font-size', 12.5).attr('fill', C.muted), done ? M.summary : M.steps[k].note, W - 32, narrow ? 3 : 2);
  // Legend row: sources until the reveal, then the truth
  const leg = svg.append('g').attr('font-size', 11.5).attr('font-family', FONT);
  const items = revealed ? M.people.map(pp => [pp.name, PERSON[pp.id]]) : M.sources.map((s, i) => [s.name, SRC[i]]);
  leg.append('text').attr('x', 16).attr('y', G.legY + 12).attr('fill', C.muted).text(revealed ? 'Truth:' : (M.salesforce ? 'Data stream:' : 'Source:'));
  let lx = revealed ? 58 : M.salesforce ? 96 : 66, ly = G.legY + 12;
  items.forEach(([name, col]) => {
    const w = name.length * 6.4 + 24; if (lx + w > W - 16) { lx = 16; ly += 18; }
    leg.append('circle').attr('cx', lx + 5).attr('cy', ly - 4).attr('r', 5).attr('fill', col);
    leg.append('text').attr('x', lx + 14).attr('y', ly).attr('fill', C.ink).attr('font-weight', 600).text(name); lx += w;
  });
  if (t >= tRule) {
    const label = (M.salesforce ? 'Match rule in the ruleset: ' : 'Match rule: ') + M.ruleLabel;
    svg.append('text').attr('x', narrow ? 16 : G.area.x).attr('y', G.top + 8).attr('font-size', 12).attr('font-weight', 600).attr('fill', C.accent).attr('opacity', clamp01((t - tRule) / 0.4)).text(label);
  }
  // Source lanes fade out as the records leave them
  const laneOp = 1 - clamp01((t - tMatch) / 0.5);
  if (laneOp > 0) G.lanes.forEach(ln => {
    const g = svg.append('g').attr('opacity', laneOp);
    g.append('rect').attr('x', ln.x).attr('y', ln.y).attr('width', ln.w).attr('height', 188).attr('rx', 10).attr('fill', C.soft);
    g.append('circle').attr('cx', ln.x + 16).attr('cy', ln.y + 17).attr('r', 6).attr('fill', SRC[ln.i]);
    g.append('text').attr('x', ln.x + 28).attr('y', ln.y + 21).attr('font-size', 12.5).attr('font-weight', 600).attr('fill', C.ink).text(ln.s.name);
  });
  // Profile rings (hulls)
  const ringOp = clamp01((t - tProf) / 0.4);
  if (ringOp > 0) rings.forEach(c => {
    // Hull: a circle around a ring, a rounded box around one or two records and their labels
    const [sc, stint] = STATUS[c.pr.status], mix = d3.interpolateRgb, ringy = c.n >= 3;
    const hw = ringy ? c.ring + PAD : c.n === 2 ? c.ring + 45 : Math.max(PAD, M.records[c.pr.records[0]].name.length * 3.2 + 10), hh = ringy ? c.ring + PAD : PAD;
    svg.append('rect').attr('x', c.cx - hw).attr('y', c.cy - hh).attr('width', 2 * hw).attr('height', ringy ? 2 * hh : PAD + 36).attr('rx', ringy ? hh : 14).attr('opacity', ringOp)
      .attr('fill', mix(C.goldTint, stint)(rev)).attr('stroke', mix(C.gold, sc)(rev)).attr('stroke-width', revealed ? 2.2 : 1.5);
    const lab = !revealed ? profLabel(c.pr) : statusLabel(c.pr);
    svg.append('text').attr('x', c.cx).attr('y', c.cy - hh - 6).attr('text-anchor', 'middle').attr('font-size', 11.5).attr('font-weight', 700).attr('opacity', ringOp)
      .attr('fill', revealed ? sc : '#7a5d00').attr('paint-order', 'stroke').attr('stroke', '#fff').attr('stroke-width', 3).text(lab);
  });
  // Where each node is now
  const P = M.records.map(r => { const a = lanePos[r.i], b = pos[r.i]; return { x: a.x + (b.x - a.x) * move, y: a.y + (b.y - a.y) * move }; });
  // Edges: every matching pair, drawn in one by one after the move
  const pairOnly = new Set(M.profiles.filter(pr => pr.records.length === 2).map(pr => pr.records.join())), stagger = Math.min(0.2, 2.0 / M.pairs.length);
  const eg = svg.append('g');
  M.pairs.forEach((e, j) => {
    const f = clamp01((t - tMatch - 1.6 - j * stagger) / 0.3); if (f <= 0) return;
    const a = P[e.a], b = P[e.b], cross = M.records[e.a].person !== M.records[e.b].person;
    const col = revealed ? (cross ? C.bad : '#b9c2d0') : C.accent;
    eg.append('line').attr('x1', a.x).attr('y1', a.y).attr('x2', a.x + (b.x - a.x) * f).attr('y2', a.y + (b.y - a.y) * f)
      .attr('stroke', col).attr('stroke-width', revealed && cross ? 3 : 1.8).attr('stroke-dasharray', e.reason === 'same phone' ? '5 3' : null);
    if (pairOnly.has(e.a + ',' + e.b) && f >= 1) {
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, w = e.reason.length * 6 + 14;
      eg.append('rect').attr('x', mx - w / 2).attr('y', my - 8).attr('width', w).attr('height', 16).attr('rx', 8).attr('fill', revealed && cross ? C.bad : '#fff').attr('stroke', revealed && cross ? C.bad : C.accent);
      eg.append('text').attr('x', mx).attr('y', my + 4).attr('text-anchor', 'middle').attr('font-size', 11).attr('font-weight', 600).attr('fill', revealed && cross ? '#fff' : C.accent).text(e.reason);
    }
  });
  const kinds = [...new Set(M.pairs.map(e => e.reason))];
  if (M.pairs.length > 1 && t >= tMatch + 1.6) svg.append('text').attr('x', G.area.x + G.area.w / 2).attr('y', G.area.y + G.area.h + 14).attr('text-anchor', 'middle').attr('font-size', 11.5).attr('fill', C.muted)
    .text((kinds.length === 1 ? M.pairs.length + ' links, all "' + kinds[0] + '"' : M.pairs.length + ' links: solid = email, dashed = phone') + (revealed ? '; red = different people' : ''));
  // Nodes
  M.records.forEach((r, j) => {
    const at = st('arrive') + 0.2 + j * 0.35, op = clamp01((t - at) / 0.3); if (op <= 0) return;
    const p = P[r.i], col = d3.interpolateRgb(SRC[r.src], PERSON[r.person])(rev), inLane = move < 0.5;
    const half = r.name.length * 3.4, lx = inLane ? 14 : Math.max(16 + half, Math.min(W - 16 - half, p.x)) - p.x; // labels sit under the node once grouped
    const g = svg.append('g').attr('opacity', op).attr('transform', `translate(${p.x},${p.y - (1 - op) * 10})`);
    g.append('title').text([r.id, r.source, r.name, r.email || 'no email', r.phone || 'no phone', 'DOB ' + r.dob, r.address].join(' · '));
    g.append('circle').attr('r', 9).attr('fill', col).attr('stroke', '#fff').attr('stroke-width', 2);
    if (!inLane) g.append('rect').attr('x', lx - half - 3).attr('y', 12).attr('width', 2 * half + 6).attr('height', 15).attr('rx', 3).attr('fill', '#fff').attr('opacity', 0.9);
    g.append('text').attr('x', lx).attr('y', inLane ? 4 : 23).attr('text-anchor', inLane ? 'start' : 'middle').attr('font-size', 12).attr('font-weight', 600).attr('fill', C.ink)
      .attr('paint-order', 'stroke').attr('stroke', '#fff').attr('stroke-width', 3).text(r.name);
    if (inLane) [r.email || 'no email', (r.phone || 'no phone') + ' · DOB ' + r.dob].forEach((s, q) => g.append('text').attr('x', 14).attr('y', 19 + q * 14).attr('font-size', 11).attr('fill', C.muted).text(s));
  });
  drawPanel(t, panel);
}

function drawPanel(t, p) {
  const g = svg.append('g').attr('font-family', FONT), m = M.metrics, narrow = G.narrow, revealed = t >= st('reveal');
  if (t < st('match') + 1.6) return;
  const tiles = [
    [String(M.pairs.length), 'matching pairs', C.accent, true],
    [String(m.profiles), m.profiles === 1 ? M.terms.profile : M.terms.profiles, t >= st('profiles') ? '#7a5d00' : C.muted, t >= st('profiles')],
    [m.correct + ' / 3', 'people resolved correctly', m.correct === 3 ? C.good : C.ink, revealed],
    [String(m.falseMerges), m.falseMerges === 1 ? 'false merge' : 'false merges', m.falseMerges ? C.bad : C.good, revealed],
    [String(m.missed), m.missed === 1 ? 'duplicate' : 'duplicates', m.missed ? C.amber : C.good, revealed]
  ].filter(d => d[3]).slice(narrow && revealed ? 2 : 0);
  const so = t >= st('sowhat'), tw = narrow ? (p.w - 16) / 3 : p.w, th = narrow ? 40 : 50;
  tiles.forEach(([v, lab, col], i) => {
    const x = narrow ? p.x + i * (tw + 8) : p.x, y = narrow ? p.y : p.y + i * (th + 6);
    g.append('rect').attr('x', x).attr('y', y).attr('width', tw).attr('height', th).attr('rx', 9).attr('fill', C.soft);
    g.append('text').attr('x', x + 10).attr('y', y + (narrow ? 18 : 31)).attr('font-size', narrow ? 16 : 22).attr('font-weight', 700).attr('fill', col).text(v);
    g.append('text').attr('x', narrow ? x + 10 : x + 70).attr('y', narrow ? y + 33 : y + 30).attr('font-size', 11).attr('fill', C.muted).text(narrow && lab.length > 16 ? lab.replace('people resolved correctly', 'correct') : lab);
  });
  if (!so) return;
  const sy = narrow ? p.y + th + 6 : p.y + 5 * (th + 6) + 4, box = g.append('rect');
  g.append('text').attr('x', p.x + 12).attr('y', sy + (narrow ? 18 : 20)).attr('font-size', 12.5).attr('font-weight', 700).attr('fill', C.bad).text('So what for architects');
  const n = wrap(g.append('text').attr('x', p.x + 12).attr('y', sy + (narrow ? 34 : 38)).attr('font-size', 11.5).attr('fill', C.ink),
    'Too strict: duplicate letters, a split care history. Too loose: one member sees another member\'s claims (PHI). Match rules are a business and privacy decision.', p.w - 24, narrow ? 3 : 7, narrow ? 14 : 14.5);
  box.attr('x', p.x).attr('y', sy).attr('width', p.w).attr('height', narrow ? p.h - th - 6 : 32 + n * 14.5 + 6).attr('rx', 10).attr('fill', '#fff').attr('stroke', C.bad).attr('stroke-width', 1.5);
}

function wrap(sel, s, maxW, maxLines, lh) {
  const per = Math.max(8, Math.floor(maxW / (+sel.attr('font-size') * 0.52))), lines = []; let cur = '';
  s.split(' ').forEach(w => { if ((cur + ' ' + w).trim().length > per && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); });
  if (cur) lines.push(cur);
  const x = sel.attr('x');
  lines.slice(0, maxLines).forEach((l, i) => sel.append('tspan').attr('x', x).attr('dy', i ? (lh || 16) : 0).text(l));
  return Math.min(lines.length, maxLines);
}

window.lab = {
  get duration() { return M ? M.duration : 23.5; },
  get markers() { return M ? M.markers : []; },
  seek(t) { T = Math.max(0, Math.min(M.duration, t)); draw(); },
  mount(root, params) {
    rootEl = root; M = model(params); T = 0;
    svg = d3.select(root).append('svg').style('display', 'block').style('font-family', FONT).attr('role', 'img').attr('aria-label', 'Match graph of member records forming profiles');
    G = layout(); lastW = root.clientWidth; lastH = root.clientHeight; draw();
    ro = new ResizeObserver(() => { if (root.clientWidth !== lastW || root.clientHeight !== lastH) { lastW = root.clientWidth; lastH = root.clientHeight; G = layout(); draw(); } });
    ro.observe(root);
  },
  update(params) { M = model(params); T = 0; G = layout(); draw(); },
  destroy() { if (ro) ro.disconnect(); if (svg) svg.remove(); svg = null; }
};

// Plain SVG: an architect's data-flow matrix. Hops are columns (the vendor splits into consented and opted-out records),
// fields are rows. Columns fill left to right as playback advances; seek(t) computes every cell's state directly from t.
const NS = 'http://www.w3.org/2000/svg', FONT = 'system-ui, -apple-system, Segoe UI, sans-serif';
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d', bad: '#b42318',
  soft: '#f4f6f9', tint: '#e8eefb', goodTint: '#e6f4ec', badTint: '#fdecea', faint: '#9aa3b2' };
// state: [fill, stroke, text colour, desktop word, phone word]
const ST = {
  hidden: ['#fbfcfd', '#eef1f5', C.faint, '', ''], arrives: [C.soft, C.line, C.muted, 'arrives', '·'],
  needed: [C.goodTint, '#8cc7a6', C.good, 'needed', '✓'], exposed: [C.badTint, C.bad, C.bad, 'exposed', '!'],
  dropped: ['#fff', C.hi, C.hi, 'dropped', 'cut'], tokenised: [C.tint, C.accent, C.accent, '', ''],
  blocked: ['#eceef2', '#b8bfcc', C.muted, 'blocked', 'stop'], absent: ['#fff', C.line, '#b8bfcc', '–', '–']
};
const SHORT = { token: 'tok', 'age band': 'age', region: 'reg' };
let root = null, svg = null, M = null, T = 0, cells = [], cols = [], hdr = null, scoreEl = null, soWhat = null, ro = null, size = '', timer = 0;
const ctx = document.createElement('canvas').getContext('2d');
const tw = (s, fs, wt) => { ctx.font = (wt || 400) + ' ' + fs + 'px ' + FONT; return ctx.measureText(s).width; };
function wrap(s, maxW, fs, wt) {
  const out = []; let line = '';
  for (const w of s.split(' ')) { const t = line ? line + ' ' + w : w; if (line && tw(t, fs, wt) > maxW) { out.push(line); line = w; } else line = t; }
  if (line) out.push(line);
  return out;
}
function el(tag, attrs, parent) {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}
function txt(parent, x, y, s, o) {
  o = o || {};
  const n = el('text', { x, y, 'font-size': o.fs || 12, 'font-weight': o.wt || 400, fill: o.fill || C.ink, 'text-anchor': o.anchor || 'start', 'font-family': FONT }, parent);
  if (o.rot) n.setAttribute('transform', `rotate(${o.rot} ${x} ${y})`);
  n.textContent = s;
  return n;
}

function build() {
  while (svg.firstChild) svg.firstChild.remove();
  const W = root.clientWidth, H = root.clientHeight, narrow = W < 640;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  el('rect', { width: W, height: H, fill: '#fff' }, svg);
  txt(svg, 16, 24, 'Where does PHI travel?', { fs: 14, wt: 600 });
  txt(svg, narrow ? W - 50 : W - 16, narrow ? 24 : 15, 'Exposure score', { fs: 11, fill: C.muted, anchor: 'end' });
  scoreEl = txt(svg, W - 16, narrow ? 26 : 38, '0', { fs: narrow ? 20 : 22, wt: 700, anchor: 'end' });
  hdr = { lines: [0, 1, 2].map(k => txt(svg, 16, 46 + k * 16, '', { fs: 12.5, fill: C.muted })), w: W - (narrow ? 32 : 140), max: narrow ? 3 : 2 };
  // columns: one per hop, the vendor split by consent status
  cols = [];
  M.hops.forEach((h, i) => h.groups.forEach(g => cols.push({ hop: h, i, g, ev: M.events.find(e => e.hop === i) })));
  const lw = narrow ? Math.max(...M.fields.map(f => tw(f.short, 11.5))) + 10 : Math.max(...M.fields.map(f => tw(f.label, 12.5))) + 16;
  const x0 = 16 + lw, cw = (W - 16 - x0) / cols.length, top = narrow ? 92 : 80;
  // flow strip: who feeds whom
  const fy = top + 8, px = cols.findIndex(c => c.hop.id === 'platform'), cx = k => x0 + k * cw + cw / 2;
  const flow = el('g', {}, svg);
  for (let k = 1; k <= px; k++) { el('line', { x1: cx(k - 1) + 8, y1: fy, x2: cx(k) - 8, y2: fy, stroke: C.faint, 'stroke-width': 1.5 }, flow); el('path', { d: `M${cx(k) - 8} ${fy}l-6 -4v8z`, fill: C.faint }, flow); }
  el('path', { d: `M${cx(px) + 8} ${fy}H${cx(cols.length - 1)}M${cx(px + 1)} ${fy}v6M${cx(cols.length - 1)} ${fy}v6`, fill: 'none', stroke: C.faint, 'stroke-width': 1.5 }, flow);
  for (let k = px + 2; k < cols.length - 1; k++) el('line', { x1: cx(k), y1: fy, x2: cx(k), y2: fy + 6, stroke: C.faint, 'stroke-width': 1.5 }, flow);
  txt(flow, (cx(px + 1) + cx(cols.length - 1)) / 2, fy - 4, narrow ? 'fed by the platform' : 'all fed by the data platform', { fs: 10.5, fill: C.muted, anchor: 'middle' });
  // column headers
  const hh = narrow ? 88 : 54, hy = fy + 12;
  cols.forEach((c, k) => {
    const x = x0 + k * cw, g = el('g', {}, svg), vend = c.hop.gate;
    c.head = el('rect', { x: x + 2, y: hy, width: cw - 4, height: hh, rx: 6, fill: '#fff', stroke: C.line }, g);
    if (narrow) {
      txt(g, x + cw / 2 + 4, hy + hh - 20, vend ? (c.g.optedOut ? 'Opted out' : 'Vendor') : c.hop.short, { fs: 11, wt: 600, rot: -90 });
      txt(g, x + cw / 2, hy + hh - 6, '×' + c.g.count, { fs: 10.5, fill: C.muted, anchor: 'middle' });
    } else {
      const tight = cw < 120;   // a pane-sized root: short hop names and sub-lines, so seven headers do not run into each other
      const ls = wrap(tight ? c.hop.short : c.hop.label, cw - 12, 12, 600).slice(0, 2);
      ls.forEach((l, j) => txt(g, x + cw / 2, hy + 17 + j * 14, l, { fs: 12, wt: 600, anchor: 'middle' }));
      const sub = vend ? (c.g.optedOut ? (tight ? 'M3 opted out' : 'Member 3, opted out') : (tight ? 'Members 1–2' : 'Members 1 and 2')) : '3 records';
      txt(g, x + cw / 2, hy + hh - 7, sub, { fs: 10.5, fill: c.g.optedOut ? C.hi : C.muted, anchor: 'middle' });
    }
  });
  // rows
  const legendH = narrow ? 44 : 26, soH = narrow ? 52 : 34, gy = hy + hh + 6;
  const rh = Math.max(24, Math.min(40, (H - gy - legendH - soH - 16) / (M.fields.length + 1)));
  cells = M.fields.map((f, r) => {
    const y = gy + r * rh;
    txt(svg, 16, y + rh / 2 + 4, narrow ? f.short : f.label, { fs: narrow ? 11.5 : 12.5 });
    return cols.map((c, k) => {
      const x = x0 + k * cw, g = el('g', {}, svg);
      const rect = el('rect', { x: x + 2, y: y + 2, width: cw - 4, height: rh - 4, rx: 5, fill: '#fff', stroke: C.line }, g);
      const t = txt(g, x + cw / 2, y + rh / 2 + 4, '', { fs: narrow ? 11 : 11.5, anchor: 'middle' });
      return { rect, t, cell: c.g.cells[f.id], up: c.hop.from >= 0 ? M.hops[c.hop.from].records[Number(String(c.g.members).split(', ')[0]) - 1].cells[f.id] : null, col: c, r };
    });
  });
  // totals row
  const ty = gy + M.fields.length * rh;
  el('line', { x1: 16, y1: ty + 1, x2: W - 16, y2: ty + 1, stroke: C.line }, svg);
  txt(svg, 16, ty + rh / 2 + 5, narrow ? 'Exposed' : 'Exposures (× records)', { fs: narrow ? 11.5 : 12.5, wt: 600 });
  cols.forEach((c, k) => { c.tot = txt(svg, x0 + k * cw + cw / 2, ty + rh / 2 + 5, '', { fs: narrow ? 12 : 13, wt: 700, anchor: 'middle' }); });
  // legend
  const items = [['needed', 'needed'], ['exposed', 'exposed: present, not needed'], ['dropped', 'dropped by filter'], ['tokenised', 'tokenised'], ['blocked', 'blocked at gate']];
  let lx = 16, ly = ty + rh + 18;
  items.forEach(([s, lab]) => {
    const label = narrow ? lab.split(':')[0] : lab, w = 16 + tw(label, 11.5) + 14;
    if (lx + w > W - 16) { lx = 16; ly += 20; }
    el('rect', { x: lx, y: ly - 10, width: 12, height: 12, rx: 3, fill: ST[s][0], stroke: ST[s][1] }, svg);
    txt(svg, lx + 16, ly, label, { fs: 11.5, fill: C.muted });
    lx += w;
  });
  soWhat = el('g', {}, svg);
  wrap('So what: ' + M.soWhat, W - 32, 12.5, 600).slice(0, 3).forEach((l, k) => txt(soWhat, 16, ly + 24 + k * 16, l, { fs: 12.5, wt: 600, fill: C.accent }));
}

function cellState(c, t) {
  const ev = c.col.ev;
  if (t < ev.start + c.r * 0.06) return 'hidden';
  const a = c.cell.action, arrive = c.up && !c.up.present ? 'absent' : 'arrives';
  if (a === 'absent') return 'absent';
  if (a === 'none') return t >= ev.revealAt + c.r * 0.06 ? (c.cell.exposed ? 'exposed' : 'needed') : arrive;
  return t >= ev.checkAt + c.r * 0.06 ? a : arrive;
}

function setState(t) {
  const narrow = root.clientWidth < 640, e = M.events.reduce((a, ev) => ev.start <= t + 1e-6 ? ev : a, M.events[0]);
  const done = t >= M.duration - 0.05;
  const ls = wrap(done ? M.summary : e.note, hdr.w, 12.5).slice(0, hdr.max);
  hdr.lines.forEach((n, k) => { n.textContent = ls[k] || ''; n.setAttribute('fill', done ? C.ink : C.muted); });
  cells.forEach(row => row.forEach(c => {
    const s = cellState(c, t), [fill, stroke, ink, word, short] = ST[s];
    c.rect.setAttribute('fill', fill); c.rect.setAttribute('stroke', stroke);
    c.rect.setAttribute('stroke-width', s === 'exposed' ? 1.6 : 1);
    c.rect.setAttribute('stroke-dasharray', s === 'dropped' ? '4 3' : 'none');
    c.t.textContent = s === 'tokenised' ? (narrow ? SHORT[c.cell.as] : c.cell.as) : narrow ? short : word;
    c.t.setAttribute('fill', ink); c.t.setAttribute('font-weight', s === 'exposed' ? 700 : 400);
  }));
  let score = 0;
  cols.forEach(c => {
    const shown = t >= c.ev.revealAt + 0.45, n = c.g.weighted;
    if (shown) score += n;
    c.tot.textContent = shown ? (n ? '+' + n : '0') : '';
    c.tot.setAttribute('fill', n ? C.bad : C.good);
    const active = e === c.ev && !done;
    c.head.setAttribute('stroke', active ? C.accent : C.line); c.head.setAttribute('stroke-width', active ? 2 : 1);
    c.head.setAttribute('fill', active ? C.tint : '#fff');
  });
  scoreEl.textContent = score;
  scoreEl.setAttribute('fill', score ? C.bad : e.kind === 'finale' ? C.good : C.ink);
  soWhat.setAttribute('opacity', e.kind === 'finale' ? 1 : 0);
}

function redraw() { build(); setState(T); }

window.lab = {
  get duration() { return M ? M.duration : 22; },
  get markers() { return M ? M.markers : []; },
  seek(t) { T = t; if (svg) setState(t); },
  mount(r, params) {
    root = r; M = model(params); T = 0;
    svg = el('svg', { width: '100%', height: '100%', role: 'img', 'aria-label': 'Data-flow matrix of hops and fields showing needed, exposed, dropped, tokenised and blocked fields' });
    svg.style.display = 'block';
    root.appendChild(svg);
    redraw();
    ro = new ResizeObserver(() => { const k = root.clientWidth + 'x' + root.clientHeight; if (k === size) return; size = k; clearTimeout(timer); timer = setTimeout(redraw, 60); });
    ro.observe(root);
  },
  update(params) { M = model(params); T = 0; redraw(); },
  destroy() { if (ro) ro.disconnect(); clearTimeout(timer); if (svg) svg.remove(); svg = M = null; }
};

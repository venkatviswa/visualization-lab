// D3: the same three regions with direct labels at the line ends (no legend), comparison windows shaded,
// and a callout on the fastest-growing region once all months are revealed. seek(t) draws the exact state at t.
const COLORS = ['#2b59c3', '#0f766e', '#b4530f'], INK = '#1d2433', MUTED = '#5b6475', LINE = '#dbe0e8';
const FONT = 'system-ui, -apple-system, Segoe UI, sans-serif';
let root = null, svg = null, M = null, T = 0, onResize = null, hoverI = null;

const pct = v => (v >= 0 ? '+' : '') + Math.round(v) + '%';
const vals = r => M.view === 'monthly' ? r.smooth : r.change;
function wrapText(s, px, size) {
  const max = Math.max(18, Math.floor(px / (size * 0.52))), out = [];
  let line = '';
  for (const w of s.split(' ')) { if (line && (line + ' ' + w).length > max) { out.push(line); line = w; } else line = line ? line + ' ' + w : w; }
  return out.concat(line);
}
function txt(g, x, y, s, o = {}) {
  return g.append('text').attr('x', x).attr('y', y).attr('font-family', FONT).attr('font-size', o.size || 12)
    .attr('font-weight', o.weight || 400).attr('fill', o.fill || MUTED).attr('text-anchor', o.anchor || 'start').text(s);
}

function draw() {
  if (!svg || !M) return;
  const W = root.clientWidth, H = root.clientHeight, narrow = W < 560;
  svg.attr('width', W).attr('height', H).selectAll('*').remove();
  const done = T >= M.annotateAt, n = M.revealAt.filter(a => a <= T).length;
  // Header: title + subtitle (wraps on phones)
  txt(svg, 14, 22, M.view === 'monthly' ? 'Monthly new hires by region, 2024–2025' : 'Hires vs the same month a year earlier, 2025', { size: 14, weight: 600, fill: INK });
  const sub = done ? M.summary : n === 0 ? 'Months appear in order. Watch the slope of each line, not its height.'
    : 'Up to ' + M.months[M.shown[n - 1]].label + (M.window > 1 ? ' · ' + M.windowLabel : '');
  const lines = wrapText(sub, W - 28, 12.5);
  lines.forEach((l, i) => txt(svg, 14, 42 + i * 16, l, { size: 12.5, fill: done ? INK : MUTED }));
  const m = { l: narrow ? 40 : 52, r: narrow ? 86 : 104, t: 44 + lines.length * 16 + 18, b: 30 };
  const x = d3.scaleLinear().domain([M.shown[0], M.shown[M.shown.length - 1]]).range([m.l, W - m.r]);
  const all = M.regions.flatMap(r => M.shown.map(i => vals(r)[i]));
  const y = d3.scaleLinear().domain(M.view === 'monthly' ? [0, d3.max(all) * 1.08] : [Math.min(-10, d3.min(all)), d3.max(all) + 4]).nice().range([H - m.b, m.t]);
  // Comparison windows: Jul–Dec 2024 and Jul–Dec 2025 (the growth definition)
  const bands = M.view === 'monthly' ? [[6, 11, 'Jul–Dec 2024'], [18, 23, 'Jul–Dec 2025']] : [[18, 23, 'Jul–Dec 2025']];
  const bandOn = Math.max(0, Math.min(1, (T - M.revealAt[M.revealAt.length - 1]) / 0.6));
  if (bandOn > 0) bands.forEach(([a, b, label]) => {
    const x0 = Math.max(m.l, x(a - 0.5)), x1 = Math.min(W - m.r, x(b + 0.5));
    svg.append('rect').attr('x', x0).attr('width', x1 - x0)
      .attr('y', m.t - 14).attr('height', H - m.b - m.t + 14).attr('fill', '#f3f5f8').attr('opacity', bandOn);
    txt(svg, x((a + b) / 2), m.t - 4, narrow ? label.replace('Jul–Dec ', 'H2 ') : label, { size: 11, anchor: 'middle' }).attr('opacity', bandOn);
  });
  // Axes
  const yAxis = svg.append('g').attr('transform', `translate(${m.l},0)`)
    .call(d3.axisLeft(y).ticks(narrow ? 5 : 6).tickSize(-(W - m.l - m.r)).tickFormat(v => M.view === 'monthly' ? v : (v > 0 ? '+' : '') + v + '%'));
  yAxis.select('.domain').remove();
  yAxis.selectAll('line').attr('stroke', '#eef1f5');
  yAxis.selectAll('text').attr('fill', MUTED).attr('font-size', 11).attr('font-family', FONT);
  if (M.view === 'change') svg.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(0)).attr('y2', y(0)).attr('stroke', '#aab2c0');
  const step = narrow ? 6 : 3, ticks = M.shown.filter(i => i % step === 0 || M.view === 'change' && i % (narrow ? 3 : 2) === 0);
  const xAxis = svg.append('g').attr('transform', `translate(0,${H - m.b})`)
    .call(d3.axisBottom(x).tickValues([...new Set(ticks)]).tickSize(4).tickFormat(i => M.months[i].short + (M.months[i].short === 'Jan' || i === M.shown[0] ? ' ’' + M.months[i].label.slice(-2) : '')));
  xAxis.select('.domain').attr('stroke', LINE); xAxis.selectAll('line').attr('stroke', LINE);
  xAxis.selectAll('text').attr('fill', MUTED).attr('font-size', 11).attr('font-family', FONT);
  txt(svg, 14, m.t - 10, M.view === 'monthly' ? 'New hires per month' : 'Change vs same month last year', { size: 11 });
  // Lines up to time T (the last segment grows smoothly)
  const k = Math.min(M.shown.length - 1, n), frac = n === 0 || n >= M.shown.length ? 0 : Math.max(0, Math.min(1, (T - M.revealAt[n - 1]) / (M.revealAt[n] - M.revealAt[n - 1])));
  const ends = [];
  M.regions.forEach((r, ri) => {
    const v = vals(r), pts = M.shown.slice(0, n).map(i => [i, v[i]]);
    if (n > 0 && n < M.shown.length && frac > 0) { const a = M.shown[n - 1], b = M.shown[k]; pts.push([a + frac * (b - a), v[a] + frac * (v[b] - v[a])]); }
    if (!pts.length) return;
    const hi = ri === M.fastest, fade = done && !hi;
    svg.append('path').datum(pts).attr('fill', 'none').attr('stroke', COLORS[ri]).attr('stroke-width', done && hi ? 3.5 : 2)
      .attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round').attr('opacity', fade ? 0.45 : 1)
      .attr('d', d3.line().x(d => x(d[0])).y(d => y(d[1])).curve(d3.curveMonotoneX));
    const last = pts[pts.length - 1];
    svg.append('circle').attr('cx', x(last[0])).attr('cy', y(last[1])).attr('r', hi && done ? 5 : 4).attr('fill', COLORS[ri]).attr('stroke', '#fff').attr('stroke-width', 2).attr('opacity', fade ? 0.6 : 1);
    ends.push({ ri, x: x(last[0]), y: y(last[1]), v: last[1], ly: y(last[1]), fade });
  });
  // Direct labels: spread vertically so they never collide
  ends.sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) ends[i].ly = Math.max(ends[i].ly, ends[i - 1].ly + 28);
  ends.forEach(e => {
    const r = M.regions[e.ri];
    const g = svg.append('g').attr('opacity', e.fade ? 0.6 : 1);
    txt(g, e.x + 9, e.ly - 1, r.short, { size: 12, weight: 600, fill: INK });
    txt(g, e.x + 9, e.ly + 12, M.view === 'monthly' ? Math.round(e.v) + ' hires' : pct(e.v), { size: 11 });
  });
  // Annotation: callout on the fastest-growing region inside the Jul–Dec 2025 window
  if (done) {
    const f = M.regions[M.fastest], cx = x(20.5), fy = y((vals(f)[20] + vals(f)[21]) / 2);
    const boxW = narrow ? 170 : 250, tx = Math.min(W - m.r - 4, cx + 30), i0 = Math.max(M.shown[0], Math.floor(x.invert(tx - boxW)));
    const span = r => { const ys = d3.range(i0, 24).map(i => y(vals(r)[i])); return [d3.min(ys), d3.max(ys)]; };
    const fs = span(f), os = M.regions.filter(r => r.index !== M.fastest).map(span);
    const free = c => c - 14 > m.t && c + 20 < H - m.b && os.every(([lo, hi]) => c + 20 < lo - 4 || c - 14 > hi + 4);
    const cands = [{ cy: fs[1] + 30, below: true }, { cy: fs[0] - 26, below: false }].filter(c => free(c.cy));
    const pick = cands.length ? cands[0] : { cy: Math.min(fs[1] + 30, H - m.b - 22), below: true };
    const cy = pick.cy, below = pick.below;
    svg.append('line').attr('x1', cx).attr('x2', cx).attr('y1', below ? cy - 14 : cy + 20).attr('y2', below ? fy + 7 : fy - 7).attr('stroke', '#c2410c').attr('stroke-width', 1.5);
    txt(svg, tx, cy, f.short + ' ' + pct(f.growth), { size: 13, weight: 700, fill: '#c2410c', anchor: 'end' });
    txt(svg, tx, cy + 15, narrow ? 'fastest growth vs H2 2024' : 'fastest growth: ' + f.last6 + ' vs ' + f.prev6 + ' hires a year earlier', { size: 11, fill: INK, anchor: 'end' });
  }
  // Hover: crosshair with values for the nearest revealed month
  if (hoverI !== null && M.shown.indexOf(hoverI) > -1 && M.shown.indexOf(hoverI) < n) {
    const hx = x(hoverI), g = svg.append('g').attr('pointer-events', 'none');
    g.append('line').attr('x1', hx).attr('x2', hx).attr('y1', m.t).attr('y2', H - m.b).attr('stroke', '#aab2c0').attr('stroke-dasharray', '3 3');
    const rows = M.regions.map(r => r.short + ': ' + (M.view === 'monthly' ? Math.round(vals(r)[hoverI]) + ' hires' : pct(vals(r)[hoverI])));
    const bx = hx + 150 > W - 8 ? hx - 158 : hx + 8;
    g.append('rect').attr('x', bx).attr('y', m.t + 4).attr('width', 150).attr('height', 22 + rows.length * 15).attr('rx', 6).attr('fill', '#fff').attr('stroke', LINE);
    txt(g, bx + 8, m.t + 20, M.months[hoverI].label, { size: 12, weight: 600, fill: INK });
    rows.forEach((s, i) => txt(g, bx + 8, m.t + 36 + i * 15, s, { size: 11.5, fill: INK }));
  }
  svg.append('rect').attr('x', m.l).attr('y', m.t).attr('width', Math.max(0, W - m.l - m.r)).attr('height', Math.max(0, H - m.b - m.t)).attr('fill', 'transparent')
    .on('mousemove', ev => { const i = Math.round(x.invert(d3.pointer(ev)[0])); if (i !== hoverI) { hoverI = i; draw(); } })
    .on('mouseleave', () => { hoverI = null; draw(); });
}

window.lab = {
  get duration() { return M ? M.duration : 12; },
  get markers() { return M ? M.markers : []; },
  seek(t) { T = t; draw(); },
  mount(r, params) {
    root = r; M = model(params); T = 0;
    svg = d3.select(root).append('svg').style('display', 'block').style('background', '#fff')
      .attr('role', 'img').attr('aria-label', 'Line chart of monthly new hires for three regions with direct labels');
    onResize = () => draw();
    addEventListener('resize', onResize);
    draw();
  },
  update(params) { M = model(params); T = 0; hoverI = null; draw(); },
  destroy() { removeEventListener('resize', onResize); if (svg) svg.remove(); svg = null; M = null; }
};

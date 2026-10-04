// D3 annotated story: each team's overall bar is cut into its deal-size segments. Segment WIDTH is the team's mix
// (share of its deals) and HEIGHT is the win rate, so the overall bar is the width-weighted average of the segments.
// seek(t) computes every position directly from t (no running transitions).
const INK = '#1d2433', MUTED = '#5b6475', LINE = '#dbe0e8', ACCENT = '#2b59c3', HI = '#c2410c';
const SEG = { small: '#0f766e', large: '#b4530f' }, FONT = 'system-ui, -apple-system, Segoe UI, sans-serif';
let root = null, svg = null, M = null, T = 0, onResize = null;

const clamp = v => Math.max(0, Math.min(1, v));
const ease = v => { v = clamp(v); return v * v * (3 - 2 * v); };
const ramp = (t, a, b) => ease((t - a) / (b - a));
const pc = v => (v * 100).toFixed(1) + '%';
const mixC = (a, b, k) => d3.interpolateRgb(a, b)(k);
function wrapText(s, px, size) {
  const max = Math.max(18, Math.floor(px / (size * 0.53))), out = [];
  let line = '';
  for (const w of s.split(' ')) { if (line && (line + ' ' + w).length > max) { out.push(line); line = w; } else line = line ? line + ' ' + w : w; }
  return out.concat(line);
}
function txt(g, x, y, s, o = {}) {
  return g.append('text').attr('x', x).attr('y', y).attr('font-family', FONT).attr('font-size', o.size || 12)
    .attr('font-weight', o.weight || 400).attr('fill', o.fill || MUTED).attr('text-anchor', o.anchor || 'start').text(s);
}
function stepAt(t) { let i = 0; M.steps.forEach((s, k) => { if (t >= s.start) i = k; }); return i; }

function draw() {
  if (!svg || !M) return;
  const W = root.clientWidth, H = root.clientHeight, narrow = W < 560, t = T;
  svg.attr('width', W).attr('height', H).selectAll('*').remove();
  const si = stepAt(t), step = M.steps[si], done = t >= M.summaryAt;
  // Story clock
  const grow = ramp(t, -0.4, 1.2);
  const split = M.view === 'segments' ? ramp(t, 3, 4.2) : ramp(t, 3, 4.2) * (1 - ramp(t, 9.6, 10.8));
  const mixOn = ramp(t, 6, 6.6), avgOn = ramp(t, 9, 9.8);
  // Header
  txt(svg, 14, 22, 'Win rate by team: Team A vs Team B', { size: 14, weight: 600, fill: INK });
  const sub = wrapText(done ? M.summary : step.text, W - 28, 12.5);
  sub.forEach((l, i) => txt(svg, 14, 42 + i * 16, l, { size: 12.5, fill: done ? INK : MUTED }));
  let top = 42 + sub.length * 16;
  // Step chips + legend
  const chips = svg.append('g').attr('transform', `translate(14,${top + 4})`);
  let cx = 0;
  M.steps.forEach((s, i) => {
    const label = (i + 1) + (narrow ? '' : ' ' + s.chip), w = narrow ? 22 : label.length * 6.4 + 16;
    chips.append('rect').attr('x', cx).attr('y', 0).attr('width', w).attr('height', 20).attr('rx', 10).attr('fill', i === si ? ACCENT : '#fff').attr('stroke', i <= si ? ACCENT : LINE);
    txt(chips, cx + w / 2, 14, label, { size: 11, anchor: 'middle', fill: i === si ? '#fff' : i < si ? ACCENT : MUTED });
    cx += w + 6;
  });
  const lg = svg.append('g').attr('transform', narrow ? `translate(${14 + cx + 6},${top + 18})` : `translate(${W - 255},${top + 18})`);
  let lx = 0;
  [['Overall', ACCENT], ['Small deals', SEG.small], ['Large deals', SEG.large]].forEach(([l, c]) => {
    const x0 = lx; lx += (narrow ? l.replace(' deals', '') : l).length * 6.3 + 30;
    lg.append('rect').attr('x', x0).attr('y', -9).attr('width', 10).attr('height', 10).attr('rx', 2).attr('fill', c);
    txt(lg, x0 + 14, 0, narrow ? l.replace(' deals', '') : l, { size: 11.5 });
  });
  top += 40;
  // Plot frame
  const m = { l: narrow ? 40 : 56, r: narrow ? 8 : 24, b: narrow ? 66 : 62 };
  const y = d3.scaleLinear().domain([0, 1]).range([H - m.b, top + 18]);
  const ax = svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickFormat(d3.format('.0%')).tickSize(-(W - m.l - m.r)));
  ax.select('.domain').remove(); ax.selectAll('line').attr('stroke', '#eef1f5');
  ax.selectAll('text').attr('fill', MUTED).attr('font-size', 11).attr('font-family', FONT);
  if (!narrow) txt(svg, 14, top + 6, 'Win rate (% of deals won)', { size: 11 });
  svg.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(0)).attr('y2', y(0)).attr('stroke', '#aab2c0');
  const pw = (W - m.l - m.r) / 2, bw = Math.min(pw * (narrow ? 0.86 : 0.7), 300);
  M.teams.forEach((tm, ti) => {
    const g = svg.append('g'), x0 = m.l + pw * ti + (pw - bw) / 2;
    const gap = 3 * split, ws = (bw - gap) * tm.shareSmall, wl = (bw - gap) * tm.shareLarge;
    const segs = [
      { key: 'small', x: x0, w: ws, rate: tm.rateSmall, n: tm.nSmall, won: tm.winSmall },
      { key: 'large', x: x0 + ws + gap, w: wl, rate: tm.rateLarge, n: tm.nLarge, won: tm.winLarge }
    ];
    // Ghost outlines of the segment heights once the bar has merged back (Overall view)
    if (M.view === 'overall' && avgOn > 0) segs.forEach(s => g.append('rect').attr('x', s.x).attr('width', s.w).attr('y', y(s.rate)).attr('height', y(0) - y(s.rate))
      .attr('fill', 'none').attr('stroke', SEG[s.key]).attr('stroke-dasharray', '4 3').attr('opacity', 0.8 * avgOn));
    segs.forEach(s => {
      const h = (tm.overall + (s.rate - tm.overall) * split) * grow;
      g.append('rect').attr('x', s.x).attr('width', Math.max(0, s.w)).attr('y', y(h)).attr('height', y(0) - y(h)).attr('rx', 3 * split)
        .attr('fill', mixC(ACCENT, SEG[s.key], split))
        .append('title').text(`${tm.name}, ${s.key} deals: ${s.won} won of ${s.n} (${pc(s.rate)})`);
      if (split > 0.6 && s.w > 0) txt(g, s.x + s.w / 2, y(h) - 6, pc(s.rate), { size: narrow ? 11 : 12.5, weight: 600, fill: INK, anchor: 'middle' }).attr('opacity', (split - 0.6) / 0.4);
    });
    // Overall level: label above the bar; dashed "water level" when the weighted step is on
    const oy = y(tm.overall * grow);
    const ly = M.view === 'overall' && avgOn > 0 ? Math.min(oy, y(Math.max(tm.rateSmall, tm.rateLarge))) : oy;
    if (split < 0.4 && grow > 0.2) txt(g, x0 + bw / 2, ly - 8, pc(tm.overall * grow), { size: 15, weight: 700, fill: INK, anchor: 'middle' }).attr('opacity', 1 - split / 0.4);
    if (avgOn > 0) {
      g.append('line').attr('x1', x0 - 6).attr('x2', x0 + bw + 6).attr('y1', oy).attr('y2', oy).attr('stroke', HI).attr('stroke-width', 2).attr('stroke-dasharray', '6 4').attr('opacity', avgOn);
      if (split >= 0.4) txt(g, x0 + bw + (narrow ? -2 : 10), oy - 6, (narrow ? '' : 'overall ') + pc(tm.overall), { size: 12, weight: 700, fill: HI, anchor: narrow ? 'end' : 'start' }).attr('opacity', avgOn);
    }
    // Under the bar: team name, mix line, and the weighted-average formula
    const by = y(0);
    txt(g, x0 + bw / 2, by + 18, tm.name + ' · ' + tm.n + ' deals', { size: 13, weight: 600, fill: INK, anchor: 'middle' });
    const mixText = Math.round(tm.shareSmall * 100) + '% small · ' + Math.round(tm.shareLarge * 100) + '% large';
    txt(g, x0 + bw / 2, by + 35, mixText, { size: 12, weight: mixOn > 0.5 ? 700 : 400, fill: mixOn > 0.5 ? (ti === 0 ? HI : INK) : MUTED, anchor: 'middle' });
    if (mixOn > 0 && split > 0.5) {
      const bk = by + 4;
      g.append('path').attr('d', `M${x0 + ws + gap},${bk} v4 h${wl} v-4`).attr('fill', 'none').attr('stroke', HI).attr('opacity', mixOn * (ti === 0 ? 1 : 0.5));
    }
    if (avgOn > 0) txt(g, x0 + bw / 2, by + 52, narrow ? tm.formula.replace(/\.0%/g, '%') : tm.formula, { size: narrow ? 10.5 : 11.5, fill: INK, anchor: 'middle' }).attr('opacity', avgOn);
  });
}

window.lab = {
  get duration() { return M ? M.duration : 12; },
  get markers() { return M ? M.markers : []; },
  seek(t) { T = t; draw(); },
  mount(r, params) {
    root = r; M = model(params); T = 0;
    svg = d3.select(root).append('svg').style('display', 'block').style('background', '#fff')
      .attr('role', 'img').attr('aria-label', 'Annotated bar story of win rates by team and deal size');
    onResize = () => draw();
    addEventListener('resize', onResize);
    draw();
  },
  update(params) { M = model(params); T = 0; draw(); },
  destroy() { removeEventListener('resize', onResize); if (svg) svg.remove(); svg = null; M = null; }
};

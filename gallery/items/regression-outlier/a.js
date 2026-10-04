// Plain SVG: points, the least-squares line, and every squared error drawn as an actual square.
// seek(t) redraws the exact state at time t from model(params).
const NS = 'http://www.w3.org/2000/svg';
const INK = '#1d2433', MUTED = '#5b6475', LINE = '#dbe0e8', ACC = '#2b59c3', HI = '#c2410c', TEAL = '#0f766e';
let svg = null, M = null, T = 0, rootEl = null, ro = null;
const clamp = x => Math.max(0, Math.min(1, x)), ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const fmt = v => Math.round(v).toLocaleString('en-US');

function el(tag, attrs, parent) { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; }
function txt(parent, x, y, s, o = {}) {
  const n = el('text', { x, y, 'font-size': o.size || 12, 'font-weight': o.weight || 400, fill: o.fill || INK, 'text-anchor': o.anchor || 'start', opacity: o.op ?? 1 }, parent);
  if (o.halo) { n.setAttribute('stroke', '#fff'); n.setAttribute('stroke-width', 3); n.setAttribute('paint-order', 'stroke'); }
  n.textContent = s; return n;
}
function wrap(s, n) { const out = []; let cur = ''; for (const w of s.split(' ')) { if ((cur + ' ' + w).trim().length > n && cur) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); } if (cur) out.push(cur); return out; }
function captions() {
  const o = M.outlier, inc = o.included;
  return ['12 learners: more practice hours, higher assessment scores.',
    'The least-squares line through these 12 points.',
    inc ? 'One more learner: ' + o.x + ' hours of practice but a score of only ' + o.y + '.' : 'An outlier at ' + o.x + ' hours (' + o.y + ' points) is left out of the fit.',
    inc ? 'Refit to all 13 points: the line tilts towards the outlier.' : 'The outlier is excluded, so the line stays where it is.',
    'Each error drawn as a square: the fitted line makes their total area as small as possible.'];
}
function draw() {
  if (!svg || !M) return;
  while (svg.firstChild) svg.firstChild.remove();
  const W = rootEl.clientWidth, H = rootEl.clientHeight, wide = W >= 640, P = M.phases, t = T, o = M.outlier;
  svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const step = t < P.clean[0] ? 0 : t < P.outlier[0] ? 1 : t < P.refit[0] ? 2 : t < P.squares[0] ? 3 : 4, done = t >= P.squares[1];
  txt(svg, 12, 22, 'How one outlier pulls a least-squares line', { size: 14, weight: 600 });
  const sub = done ? M.summary : captions()[step], lines = wrap(sub, Math.floor((W - 24) / 6.7));
  lines.forEach((l, i) => txt(svg, 12, 41 + i * 17, l, { size: 13, fill: done ? INK : MUTED }));
  const head = 41 + lines.length * 17;
  // layout: plot + error panel (right on wide, strip on phone)
  const panel = wide ? { x: W - 250, y: head + 10, w: 238, h: 318 } : { x: 12, y: head + 4, w: W - 24, h: 138 };
  const pl = { l: 50, r: wide ? W - 270 : W - 16, t: wide ? head + 14 : panel.y + panel.h + 12, b: H - 42 };
  const xs = v => pl.l + (v - M.xDomain[0]) / (M.xDomain[1] - M.xDomain[0]) * (pl.r - pl.l);
  const sy = (pl.b - pl.t) / (M.yDomain[1] - M.yDomain[0]), ys = v => pl.b - (v - M.yDomain[0]) * sy;
  const defs = el('defs', {}, svg), clip = el('clipPath', { id: 'plotclip' }, defs);
  el('rect', { x: pl.l, y: pl.t, width: pl.r - pl.l, height: pl.b - pl.t }, clip);
  // axes and grid
  const ax = el('g', { 'font-size': 11 }, svg);
  for (let v = 0; v <= 100; v += 20) { el('line', { x1: pl.l, x2: pl.r, y1: ys(v), y2: ys(v), stroke: v ? '#eef1f5' : LINE }, ax); txt(ax, pl.l - 6, ys(v) + 4, v, { size: 11, fill: MUTED, anchor: 'end' }); }
  for (let v = 0; v <= 14; v += 2) { el('line', { x1: xs(v), x2: xs(v), y1: pl.b, y2: pl.b + 4, stroke: LINE }, ax); txt(ax, xs(v), pl.b + 16, v, { size: 11, fill: MUTED, anchor: 'middle' }); }
  el('line', { x1: pl.l, x2: pl.l, y1: pl.t, y2: pl.b, stroke: LINE }, ax);
  txt(ax, (pl.l + pl.r) / 2, pl.b + 34, 'Practice hours', { size: 12, fill: MUTED, anchor: 'middle' });
  const yl = txt(ax, 14, (pl.t + pl.b) / 2, 'Assessment score (points)', { size: 12, fill: MUTED, anchor: 'middle' });
  yl.setAttribute('transform', `rotate(-90 14 ${(pl.t + pl.b) / 2})`);
  // current line: clean line, then morph to the fit during the refit phase
  const lineIn = ease((t - P.clean[0]) / 1.4), rf = ease((t - P.refit[0] - 0.3) / 1.8);
  const cur = { b: M.clean.slope + (M.fit.slope - M.clean.slope) * rf, a: M.clean.intercept + (M.fit.intercept - M.clean.intercept) * rf };
  const g = el('g', { 'clip-path': 'url(#plotclip)' }, svg);
  // squares (residuals of the fitted line), drawn behind points
  let shownSSE = 0;
  const sqStart = i => P.squares[0] + (i < 12 ? i * 0.13 : 12 * 0.13 + 0.35);
  M.residuals.forEach((r, i) => {
    const k = ease((t - sqStart(i)) / 0.5); if (k <= 0) return;
    shownSSE += r.r2 * k;
    const side = Math.abs(r.r) * sy * k, px = xs(r.x), right = px + side <= pl.r;
    const c = r.isOutlier ? HI : ACC;
    el('rect', { x: right ? px : px - side, y: r.r > 0 ? ys(r.y) : ys(r.y) - side, width: side, height: side, fill: c, 'fill-opacity': r.isOutlier ? 0.14 : 0.16, stroke: c, 'stroke-opacity': 0.7, 'stroke-width': 1 }, g);
  });
  // the "without outlier" ghost line once the refit starts
  if (o.included && t >= P.refit[0]) {
    el('line', { x1: xs(0), y1: ys(M.clean.intercept), x2: xs(14), y2: ys(M.clean.intercept + 14 * M.clean.slope), stroke: TEAL, 'stroke-width': 2, 'stroke-dasharray': '6 5', opacity: 0.85 }, g);
  }
  if (lineIn > 0) {
    const x2 = 14 * lineIn;
    el('line', { x1: xs(0), y1: ys(cur.a), x2: xs(x2), y2: ys(cur.a + cur.b * x2), stroke: o.included && rf > 0 ? ACC : (o.included ? TEAL : ACC), 'stroke-width': 2.5 }, g);
  }
  // points
  M.points.forEach((q, i) => { const k = ease((t - 0.1 - i * 0.12) / 0.3); if (k > 0) el('circle', { cx: xs(q.x), cy: ys(q.y), r: 5 * k, fill: ACC, stroke: '#fff', 'stroke-width': 1.5 }, svg); });
  const oIn = ease((t - P.outlier[0]) / 0.6);
  if (oIn > 0) {
    const cy = ys(o.y) - (1 - oIn) * 30;
    el('circle', { cx: xs(o.x), cy, r: 7, fill: o.included ? HI : '#fff', stroke: o.included ? '#fff' : MUTED, 'stroke-width': o.included ? 1.5 : 2, 'stroke-dasharray': o.included ? '' : '3 2', opacity: oIn }, svg);
    txt(svg, xs(o.x) - 11, cy + (o.y > 85 ? 18 : -10), o.included ? 'outlier' : 'outlier (excluded)', { size: 12, weight: 600, fill: o.included ? HI : MUTED, anchor: 'end', op: oIn, halo: true });
  }
  // side panel: slope of the current line, then the squared-error budget
  const pIn = ease((t - P.clean[0]) / 0.6), pk = ease((t - P.squares[0]) / 0.4);
  if (pIn > 0) {
    const pg = el('g', { opacity: pIn }, svg), px = panel.x + 12, bw = panel.w - 24;
    el('rect', { x: panel.x, y: panel.y, width: panel.w, height: panel.h, rx: 10, fill: '#fff', stroke: LINE }, pg);
    const moving = o.included && rf > 0 && rf < 1;
    txt(pg, px, panel.y + 20, 'Slope of the line', { size: 12, fill: MUTED });
    txt(pg, px, panel.y + (wide ? 46 : 44), cur.b.toFixed(2) + (wide ? ' points per hour' : ' pts/hour'), { size: wide ? 20 : 16, weight: 600, fill: moving || rf >= 1 || !o.included ? ACC : TEAL });
    if (wide) txt(pg, px, panel.y + 66, 'intercept ' + cur.a.toFixed(1) + ' points', { size: 12, fill: MUTED });
    // line key (labels for the plotted lines)
    const keys = o.included && t >= P.refit[0] ? [['least-squares fit, all 13', ACC, ''], ['without outlier, slope ' + M.clean.slope.toFixed(2), TEAL, '6 4']]
      : [[o.included ? 'least-squares fit, 12 points' : 'least-squares fit (outlier left out)', o.included ? TEAL : ACC, '']];
    keys.forEach(([label, c, dash], k) => {
      const ky = wide ? panel.y + 90 + k * 18 : panel.y + 110 + k * 18, kx = px;
      el('line', { x1: kx, x2: kx + 22, y1: ky - 4, y2: ky - 4, stroke: c, 'stroke-width': 2.5, 'stroke-dasharray': dash }, pg);
      txt(pg, kx + 30, ky, label, { size: 12, fill: c, weight: 600 });
    });
    const ex = wide ? px : panel.x + panel.w * 0.5, ey = wide ? panel.y + 140 : panel.y;
    if (wide) el('line', { x1: px, x2: px + bw, y1: panel.y + 128, y2: panel.y + 128, stroke: LINE }, pg);
    const eg = el('g', { opacity: pk }, pg);
    txt(eg, ex, ey + 20, 'Total squared error', { size: 12, fill: MUTED });
    txt(eg, ex, ey + (wide ? 46 : 44), fmt(shownSSE) + ' points\u00b2', { size: wide ? 20 : 16, weight: 600 });
    const by = wide ? ey + 58 : panel.y + 58; let x0 = px;
    el('rect', { x: px, y: by, width: bw, height: 14, rx: 3, fill: '#f4f6f9' }, eg);
    M.residuals.forEach((r, i) => { const k = ease((t - sqStart(i)) / 0.5), wv = bw * r.r2 * k / M.fit.sse; if (wv <= 0) return; el('rect', { x: x0, y: by, width: wv, height: 14, fill: r.isOutlier ? HI : ACC, 'fill-opacity': r.isOutlier ? 0.85 : 0.55, stroke: '#fff', 'stroke-width': 0.6 }, eg); x0 += wv; });
    const oShare = o.included ? M.residuals[12].r2 / M.fit.sse : 0;
    const legend = o.included ? 'Outlier: ' + Math.round(oShare * 100) + '%  \u00b7  other 12 learners: ' + Math.round((1 - oShare) * 100) + '%' : 'One segment per learner';
    txt(eg, px, by + 30, legend, { size: 12, fill: o.included ? HI : MUTED, weight: o.included ? 600 : 400, op: ease((t - P.squares[1] + 1.4) / 0.5) });
    if (wide && done) {
      txt(eg, px, by + 60, 'No other slope or intercept gives', { size: 12, fill: MUTED });
      txt(eg, px, by + 76, 'a smaller total area.', { size: 12, fill: MUTED });
      if (o.included) txt(eg, px, by + 100, 'Old line on these 13 points: ' + fmt(M.oldLineSSE), { size: 12, fill: TEAL, weight: 600 });
    }
  }
}

window.lab = {
  get duration() { return M ? M.duration : 12; },
  get markers() { return M ? M.markers : []; },
  seek(t) { T = t; draw(); },
  mount(root, params) {
    rootEl = root; M = model(params); T = 0;
    svg = el('svg', { role: 'img', 'aria-label': 'Scatter of practice hours against scores with the least-squares line and squared errors drawn as squares' });
    svg.style.cssText = 'display:block;background:#fff;font-family:system-ui,sans-serif';
    root.appendChild(svg);
    ro = new ResizeObserver(() => draw()); ro.observe(root); draw();
  },
  update(params) { M = model(params); T = 0; draw(); },
  destroy() { if (ro) ro.disconnect(); if (svg) svg.remove(); svg = null; M = null; }
};

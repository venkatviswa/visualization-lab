// Plain SVG bullet graphs: one row per option, the weighted score as a bar over three bands (poor, acceptable, good)
// with the target as a tick, and beside each one the gauge a steering committee asks for, drawn from the same number
// so that the lesson can say which picture carries more. The clock fills the bars as the weights apply.
const NS = 'http://www.w3.org/2000/svg', FONT = 'system-ui, -apple-system, sans-serif';
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d', bad: '#b42318', soft: '#f4f6f9', faint: '#9aa3b2' };
const OPT = { native: '#2b59c3', ipaas: '#0f766e', custom: '#6d4bbf', manual: '#b4530f' };
let M = null, wrap = null, head = null, svg = null, foot = null, ro = null, lastT = 0, lastKey = '';
function el(tag, attrs, parent) { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; }
function txt(parent, x, y, s, o) { o = o || {}; const n = el('text', { x, y, 'font-size': o.fs || 12, 'font-weight': o.wt || 400, fill: o.fill || C.ink, 'text-anchor': o.anchor || 'start', 'font-family': FONT }, parent); n.textContent = s; return n; }
const clamp01 = v => Math.max(0, Math.min(1, v));
const st = id => M.steps.find(s => s.id === id).t;
function arcPath(cx, cy, r, a0, a1) { const p = a => [cx + r * Math.cos(a), cy + r * Math.sin(a)]; const [x0, y0] = p(a0), [x1, y1] = p(a1); return `M${x0},${y0}A${r},${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1},${y1}`; }

function draw() {
  if (!svg) return;
  const W = wrap.clientWidth, H = Math.max(120, svg.clientHeight), narrow = W < 560, t = lastT, done = t >= M.duration - 0.05;
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const phase = t >= st('verdict') ? 2 : t >= st('weights') ? 1 : 0, fill = phase >= 1 ? clamp01((t - st('weights')) / 1.2) : 0;
  const n = M.options.length, left = narrow ? 12 : 16, labelW = narrow ? 92 : 170, gaugeW = narrow ? 0 : 150, rowH = Math.min(narrow ? 64 : 84, (H - 40) / n), top = 30;
  const bx = left + labelW, bw = W - bx - 16 - gaugeW, x = v => bx + bw * v / 100;
  txt(svg, bx, 18, narrow ? 'Score 0–100 · tick = target ' + M.target : 'Weighted score, 0 to 100 · bands: poor, acceptable, good · tick = target ' + M.target, { fs: 10.5, fill: C.muted });
  if (!narrow) txt(svg, W - 16 - gaugeW / 2, 18, 'the same number as a gauge', { fs: 10.5, fill: C.muted, anchor: 'middle' });
  M.options.forEach((o, k) => {
    const y = top + k * rowH, bh = Math.min(22, rowH * 0.32), cy = y + rowH / 2, col = OPT[o.id], lead = phase >= 2 && o.id === M.winner;
    const SHORT = { native: 'Native tools', ipaas: 'iPaaS', custom: 'Custom', manual: 'Manual' };
    txt(svg, left, cy - 2, narrow ? SHORT[o.id] : o.label, { fs: narrow ? 11 : 12.5, wt: lead ? 700 : 600 });
    txt(svg, left, cy + 13, phase >= 1 ? (narrow ? '' : o.blurb) : (narrow ? 'raw ' + o.s.join('·') : 'raw scores ' + o.s.join(' · ')), { fs: 10, fill: C.muted });
    // bands
    [[0, 50, '#e6e9ef'], [50, 70, '#d5dbe4'], [70, 100, '#c3cad6']].forEach(([a, b, f]) => el('rect', { x: x(a), y: cy - bh, width: x(b) - x(a), height: 2 * bh, fill: f }, svg));
    // measure
    const v = o.score * fill;
    el('rect', { x: x(0), y: cy - bh / 2.4, width: Math.max(0, x(v) - x(0)), height: bh / 1.2, fill: lead ? col : col + 'cc' }, svg);
    if (fill > 0) txt(svg, x(v) + 6, cy + 4, String(Math.round(v)), { fs: 11.5, wt: 700, fill: o.score >= M.target ? C.ink : C.bad });
    // target tick
    el('line', { x1: x(M.target), x2: x(M.target), y1: cy - bh - 3, y2: cy + bh + 3, stroke: C.ink, 'stroke-width': 2.5 }, svg);
    if (phase >= 2) txt(svg, x(100), cy - bh - 5, o.clears ? 'clears the target' : 'below the target', { fs: 10, wt: 600, fill: o.clears ? C.good : C.bad, anchor: 'end' });
    // the gauge beside it (wide screens): the same score as an arc with the target as a needle mark
    if (!narrow) {
      const gx = W - 16 - gaugeW / 2, gy = cy + 14, r = Math.min(30, rowH * 0.42), a0 = Math.PI, a1 = 2 * Math.PI;
      el('path', { d: arcPath(gx, gy, r, a0, a1), fill: 'none', stroke: '#e6e9ef', 'stroke-width': 9 }, svg);
      if (fill > 0) el('path', { d: arcPath(gx, gy, r, a0, a0 + Math.PI * v / 100), fill: 'none', stroke: col, 'stroke-width': 9 }, svg);
      const ta = a0 + Math.PI * M.target / 100; el('line', { x1: gx + (r - 8) * Math.cos(ta), y1: gy + (r - 8) * Math.sin(ta), x2: gx + (r + 8) * Math.cos(ta), y2: gy + (r + 8) * Math.sin(ta), stroke: C.ink, 'stroke-width': 2 }, svg);
      txt(svg, gx, gy - 2, fill > 0 ? String(Math.round(v)) : '–', { fs: 13, wt: 700, anchor: 'middle' });
    }
  });
  // axis
  const ay = top + n * rowH + 2;
  [0, 50, 70, 100].forEach(v => { el('line', { x1: x(v), x2: x(v), y1: ay - 4, y2: ay, stroke: C.faint }, svg); txt(svg, x(v), ay + 11, String(v), { fs: 9.5, fill: C.muted, anchor: 'middle' }); });
  caption(phase, done, narrow);
}
function caption(phase, done, narrow) {
  let k = 0; M.steps.forEach((s, i) => { if (s.t <= lastT + 1e-6) k = i; });
  const s = M.steps[k], win = M.options.find(o => o.id === M.winner);
  head.querySelector('.sub').textContent = done ? M.summary : s.title + ': ' + s.note;
  const stats = narrow ? [['Profile', M.profile.label], ['Leader', win.label.split(' ')[0] + ' ' + win.score]] : [['Profile', M.profile.label], ['Leader', win.label + ' · ' + win.score], ['Margin', M.margin + ' pts'], ['Clear target', M.options.filter(o => o.clears).length + ' of ' + M.options.length]];
  head.querySelector('.stats').innerHTML = stats.map(([kk, v]) => '<span style="display:inline-block;margin:0 0 4px 6px;padding:3px 8px;border-radius:8px;background:#f4f6f9;font-size:11.5px;color:#5b6475;white-space:nowrap">' + kk + ' <b style="color:#1d2433">' + v + '</b></span>').join('');
  foot.textContent = phase >= 1 ? (narrow ? 'A bullet graph: the bar is the score, the bands say what good looks like, the tick is the target.' : 'A bullet graph shows the score, the bands (what good looks like) and the target in one strip; the gauge beside it shows the same number with none of the context, and takes four times the space. Executives ask for gauges; give them bullets.') : 'Before the weights apply there is no single score to show; the raw scores sit under each name. The weights are the decision.';
}

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  seek(t) { lastT = t; const key = Math.round(t * 20) + '|' + (t >= M.duration - 0.05); if (key !== lastKey) { lastKey = key; draw(); } },
  mount(root, params) {
    M = model(params); lastT = 0; lastKey = '';
    wrap = document.createElement('div'); wrap.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;background:#fff;font-family:system-ui,sans-serif;color:#1d2433';
    head = document.createElement('div'); head.style.cssText = 'flex:none;padding:8px 14px 2px;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:flex-start';
    head.innerHTML = '<div style="flex:1 1 280px;min-width:0"><div style="font-size:14px;font-weight:600">Which option? · bullet graphs against the target (and the gauges)</div><div class="sub" style="font-size:12px;line-height:1.35;color:#5b6475;min-height:32px"></div></div><div class="stats" style="flex:0 1 auto;text-align:right"></div>';
    const box = document.createElement('div'); box.style.cssText = 'flex:1;min-height:0;position:relative';
    svg = el('svg', { style: 'display:block;width:100%;height:100%' }, box);
    foot = document.createElement('div'); foot.style.cssText = 'flex:none;height:52px;box-sizing:border-box;padding:6px 14px;font:12px/1.4 system-ui,sans-serif;color:#5b6475;border-top:1px solid #e3e7ee;background:#fafbfc;overflow:auto';
    wrap.append(head, box, foot); root.append(wrap);
    draw();
    ro = new ResizeObserver(() => requestAnimationFrame(() => { if (svg && M) draw(); })); ro.observe(box);
  },
  update(params) { M = model(params); lastT = 0; lastKey = ''; draw(); },
  destroy() { if (ro) ro.disconnect(); if (wrap) wrap.remove(); wrap = null; svg = null; M = null; }
};

// D3 ridge plot: one density curve per three-hour window, stacked top to bottom through the day and overlapping like a
// mountain range, each ridge rising as its window completes. The shift to the right after the change is the picture.
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d', bad: '#b42318', soft: '#f4f6f9' };
const FONT = 'system-ui, -apple-system, sans-serif';
let M = null, wrap = null, head = null, svg = null, foot = null, ro = null, lastT = 0, lastKey = '', dens = null;
const clamp01 = v => Math.max(0, Math.min(1, v));

function kde(samples, xs, bw) {
  // Gaussian kernel density on a fixed grid; the area under each curve is one
  const n = samples.length, k = 1 / (n * bw * Math.sqrt(2 * Math.PI));
  return xs.map(x => { let s = 0; for (const v of samples) { const z = (x - v) / bw; s += Math.exp(-0.5 * z * z); } return s * k; });
}
function prepare() {
  const xmax = Math.ceil(Math.max(...M.windows.map(w => w.p95)) * 1.5), xs = d3.range(0, xmax + 0.01, xmax / 120);
  dens = { xmax, xs, rows: M.windows.map(w => ({ w, y: kde(w.samples, xs, 0.18) })) };
  dens.peak = Math.max(...dens.rows.flatMap(r => r.y));
}
function draw() {
  if (!svg || !dens) return;
  const W = wrap.clientWidth, H = Math.max(120, svg.node().clientHeight), narrow = W < 640, hourNow = Math.min(24, lastT), done = lastT >= M.duration - 0.05;
  svg.attr('width', W).attr('height', H).selectAll('*').remove();
  const left = narrow ? 64 : 92, right = 14, top = 42, bottom = 30, n = M.windows.length;
  const x = d3.scaleLinear().domain([0, dens.xmax]).range([left, W - right]);
  const step = (H - top - bottom) / n, ridgeH = step * 1.7; // each ridge may rise into the one above it
  const yOf = i => top + (i + 1) * step;
  const area = d3.area().x((d, j) => x(dens.xs[j])).y0(0).y1(d => -d / dens.peak * ridgeH).curve(d3.curveBasis);
  const line = d3.line().x((d, j) => x(dens.xs[j])).y(d => -d / dens.peak * ridgeH).curve(d3.curveBasis);
  // axis and reference lines
  const ax = svg.append('g').attr('transform', `translate(0,${H - bottom + 4})`).call(d3.axisBottom(x).ticks(narrow ? 5 : 8).tickFormat(v => v + ' s').tickSize(3));
  ax.selectAll('text').attr('font-family', FONT).attr('font-size', 10.5).attr('fill', C.muted); ax.selectAll('line,path').attr('stroke', C.line);
  svg.append('text').attr('x', (left + W - right) / 2).attr('y', H - 2).attr('text-anchor', 'middle').attr('font-family', FONT).attr('font-size', 10.5).attr('fill', C.muted).text('latency per request, s');
  const ref = (v, col, dash, label, side) => { svg.append('line').attr('x1', x(v)).attr('x2', x(v)).attr('y1', top - 12).attr('y2', H - bottom + 2).attr('stroke', col).attr('stroke-dasharray', dash).attr('stroke-width', 1.2);
    svg.append('text').attr('x', x(v) + 4 * side).attr('y', top - 14).attr('text-anchor', side < 0 ? 'end' : 'start').attr('font-family', FONT).attr('font-size', 10.5).attr('fill', col).attr('font-weight', 600).text(label); };
  ref(M.limits.mean, C.muted, '2 3', narrow ? 'baseline' : 'baseline median ' + M.limits.mean.toFixed(1) + ' s', -1);
  ref(M.limits.ucl, C.bad, '6 4', narrow ? 'limit' : 'control limit ' + M.limits.ucl.toFixed(1) + ' s', 1);
  // ridges, back to front
  dens.rows.forEach((r, i) => {
    const w = r.w, complete = hourNow >= w.to - 1e-6 || done, f = complete ? 1 : clamp01((hourNow - w.from) / 3);
    const col = w.after ? C.hi : w.straddles ? '#8a5a2b' : C.accent, g = svg.append('g').attr('transform', `translate(0,${yOf(i)}) scale(1,${f})`);
    g.append('path').attr('d', area(r.y)).attr('fill', col).attr('fill-opacity', 0.28);
    g.append('path').attr('d', line(r.y)).attr('fill', 'none').attr('stroke', col).attr('stroke-width', 1.4);
    svg.append('line').attr('x1', left).attr('x2', W - right).attr('y1', yOf(i)).attr('y2', yOf(i)).attr('stroke', C.line);
    svg.append('text').attr('x', left - 6).attr('y', yOf(i) - 3).attr('text-anchor', 'end').attr('font-family', FONT).attr('font-size', narrow ? 10 : 11).attr('font-weight', w.after ? 600 : 400).attr('fill', f > 0 ? C.ink : '#b8bfcc').text(narrow ? w.label.split('–')[0] : w.label);
    if (f >= 1) { // median tick and p95 tick on the baseline of the ridge
      svg.append('line').attr('x1', x(w.p50)).attr('x2', x(w.p50)).attr('y1', yOf(i) - 7).attr('y2', yOf(i)).attr('stroke', col).attr('stroke-width', 2);
      svg.append('line').attr('x1', x(w.p95)).attr('x2', x(w.p95)).attr('y1', yOf(i) - 5).attr('y2', yOf(i)).attr('stroke', col).attr('stroke-width', 1);
      if (!narrow) svg.append('text').attr('x', x(w.p95) + 4).attr('y', yOf(i) - 2).attr('font-family', FONT).attr('font-size', 9.5).attr('fill', col).text('p95 ' + w.p95.toFixed(1));
    }
  });
  if (hourNow >= M.changeHour) { const i = Math.floor(M.changeHour / 3); svg.append('text').attr('x', W - right).attr('y', yOf(i) - step + 10).attr('text-anchor', 'end').attr('font-family', FONT).attr('font-size', 10.5).attr('font-weight', 600).attr('fill', C.hi).text('change ' + M.changeLabel + ' ↓'); }
  caption(hourNow, done, narrow);
}
function caption(hourNow, done, narrow) {
  let k = 0; M.steps.forEach((s, i) => { if (s.t <= lastT + 1e-6) k = i; });
  const s = M.steps[k], doneW = M.windows.filter(w => hourNow >= w.to - 1e-6 || done), last = doneW[doneW.length - 1];
  head.querySelector('.sub').textContent = done ? M.summary : s.title + ': ' + s.note;
  const stats = last ? (narrow ? [['Window', last.label], ['p50 / p95', last.p50.toFixed(1) + ' / ' + last.p95.toFixed(1) + ' s']] : [['Last window', last.label], ['p50', last.p50.toFixed(2) + ' s'], ['p95', last.p95.toFixed(2) + ' s'], ['Baseline p50', M.limits.mean.toFixed(2) + ' s']]) : [['Window', 'gathering…']];
  head.querySelector('.stats').innerHTML = stats.map(([kk, v]) => '<span style="display:inline-block;margin:0 0 4px 6px;padding:3px 8px;border-radius:8px;background:#f4f6f9;font-size:11.5px;color:#5b6475;white-space:nowrap">' + kk + ' <b style="color:#1d2433">' + v + '</b></span>').join('');
  foot.textContent = done ? (narrow ? 'The ridges after the change sit to the right with a longer tail.' : 'Read top to bottom: the ridges after the change sit to the right of the limit with a longer tail. Thick tick: median; thin tick: p95.') : (narrow ? 'A density of latency per three-hour window.' : 'Each ridge is the density of latency in a three-hour window; it rises as the window fills. Thick tick: median; thin tick: p95.');
  foot.style.background = done ? '#fbefe8' : '#fafbfc';
}

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  seek(t) { lastT = t; const key = Math.round(t * 10) + '|' + (t >= M.duration - 0.05); if (key !== lastKey) { lastKey = key; draw(); } },
  mount(root, params) {
    M = model(params); lastT = 0; lastKey = ''; prepare();
    wrap = document.createElement('div'); wrap.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;background:#fff;font-family:system-ui,sans-serif;color:#1d2433';
    head = document.createElement('div'); head.style.cssText = 'flex:none;padding:8px 14px 2px;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:flex-start';
    head.innerHTML = '<div style="flex:1 1 280px;min-width:0"><div style="font-size:14px;font-weight:600">Is the agent healthy? · the day as a ridge of latency distributions</div><div class="sub" style="font-size:12px;line-height:1.35;color:#5b6475;min-height:32px"></div></div><div class="stats" style="flex:0 1 auto;text-align:right"></div>';
    const box = document.createElement('div'); box.style.cssText = 'flex:1;min-height:0;position:relative';
    svg = d3.select(box).append('svg').style('display', 'block').style('width', '100%').style('height', '100%');
    foot = document.createElement('div'); foot.style.cssText = 'flex:none;height:48px;box-sizing:border-box;padding:6px 14px;font:12.5px/1.4 system-ui,sans-serif;border-top:1px solid #e3e7ee;background:#fafbfc;overflow:auto';
    wrap.append(head, box, foot); root.append(wrap);
    draw();
    ro = new ResizeObserver(() => requestAnimationFrame(() => { if (svg && M) draw(); })); ro.observe(box);
  },
  update(params) { M = model(params); lastT = 0; lastKey = ''; prepare(); draw(); },
  destroy() { if (ro) ro.disconnect(); if (wrap) wrap.remove(); wrap = null; svg = null; M = null; dens = null; }
};

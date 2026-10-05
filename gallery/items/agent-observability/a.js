// Chart.js control chart: the half-hour median latency with its mean and control limits on chTop, the error rate with its
// own limit below, revealed as the playback clock walks through the day. Breaches are red dots; the change is a dashed line.
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d', bad: '#b42318', soft: '#f4f6f9' };
let M = null, chTop = null, chBot = null, wrap = null, head = null, foot = null, ro = null, lastT = 0, lastKey = '', hourNow = 0;
const pct = v => (100 * v).toFixed(1) + ' %';

const marks = { id: 'marks', afterDatasetsDraw(c, _, opts) {
  const g = c.ctx, { top: y0, bottom: y1, left, right } = c.chartArea, x = c.scales.x;
  g.save();
  const xc = x.getPixelForValue(M.changeHour), show = hourNow >= M.changeHour - 1e-6;
  if (show && xc >= left && xc <= right) { g.strokeStyle = C.hi; g.lineWidth = 1.5; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(xc, y0); g.lineTo(xc, y1); g.stroke(); g.setLineDash([]);
    if (opts.label) { g.fillStyle = C.hi; g.font = '600 11px system-ui, sans-serif'; g.textAlign = xc > right - 90 ? 'right' : 'left'; g.fillText('change ' + M.changeLabel, xc + (xc > right - 90 ? -5 : 5), y0 + 11); } }
  const xn = x.getPixelForValue(hourNow);
  if (xn >= left && xn <= right && hourNow < 23.5) { g.strokeStyle = C.accent; g.lineWidth = 1.5; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(xn, y0); g.lineTo(xn, y1); g.stroke(); g.setLineDash([]); }
  g.restore();
} };
function series(key, limitHi, limitLo, meanV) {
  const vis = M.buckets.filter(b => b.hour <= hourNow + 1e-6);
  const pts = vis.map(b => ({ x: b.hour, y: b[key] })), breachKey = key === 'p50' ? 'breach' : 'errBreach';
  return [
    { label: key === 'p50' ? 'median latency per half hour' : 'error rate per half hour', data: pts, borderColor: C.ink, borderWidth: 1.6, pointRadius: vis.map(b => b[breachKey] ? 4.5 : 2), pointBackgroundColor: vis.map(b => b[breachKey] ? C.bad : '#fff'), pointBorderColor: vis.map(b => b[breachKey] ? C.bad : C.ink), tension: 0.15, order: 1 },
    { label: 'upper limit', data: [{ x: 0, y: limitHi }, { x: 24, y: limitHi }], borderColor: C.bad, borderDash: [6, 4], borderWidth: 1.2, pointRadius: 0, order: 2 },
    { label: 'mean of the first six hours', data: [{ x: 0, y: meanV }, { x: 24, y: meanV }], borderColor: C.muted, borderDash: [2, 3], borderWidth: 1, pointRadius: 0, order: 3 },
    ...(limitLo !== null ? [{ label: 'lower limit', data: [{ x: 0, y: limitLo }, { x: 24, y: limitLo }], borderColor: C.bad, borderDash: [6, 4], borderWidth: 1.2, pointRadius: 0, order: 2 }] : [])
  ];
}
function render() {
  if (!chTop) return;
  const narrow = wrap.clientWidth < 640, L = M.limits, done = lastT >= M.duration - 0.05;
  hourNow = Math.min(23.5, lastT);
  chTop.data.datasets = series('p50', L.ucl, L.lcl, L.mean); chTop.options.scales.y.max = Math.ceil(Math.max(L.ucl, ...M.buckets.map(b => b.p50)) * 1.15 * 2) / 2;
  chBot.data.datasets = series('errRate', L.errUcl, null, L.errMean); chBot.options.scales.y.max = Math.ceil(Math.max(L.errUcl, ...M.buckets.map(b => b.errRate)) * 1.2 * 100) / 100;
  chTop.options.plugins.legend.display = !narrow; chTop.options.scales.x.ticks.stepSize = chBot.options.scales.x.ticks.stepSize = narrow ? 6 : 3; chTop.update('none'); chBot.update('none');
  let k = 0; M.steps.forEach((s, i) => { if (s.t <= lastT + 1e-6) k = i; });
  const s = M.steps[k], vis = M.buckets.filter(b => b.hour <= hourNow + 1e-6), last = vis[vis.length - 1];
  head.querySelector('.sub').textContent = done ? M.summary : s.title + ': ' + s.note;
  const stats = narrow ? [['Now', last.label], ['p50', last.p50.toFixed(1) + ' s']] : [['Clock', last.label], ['Median', last.p50.toFixed(2) + ' s'], ['p95', last.p95.toFixed(2) + ' s'], ['Errors', pct(last.errRate)], ['Limits', L.lcl.toFixed(1) + '–' + L.ucl.toFixed(1) + ' s']];
  head.querySelector('.stats').innerHTML = stats.map(([kk, v]) => '<span style="display:inline-block;margin:0 0 4px 6px;padding:3px 8px;border-radius:8px;background:#f4f6f9;font-size:11.5px;color:#5b6475;white-space:nowrap">' + kk + ' <b style="color:' + (kk === 'Median' && last.breach ? C.bad : C.ink) + '">' + v + '</b></span>').join('');
  foot.textContent = done ? 'So what: ' + M.steps[3].note : (last.breach ? 'Outside the limits: median ' + last.p50.toFixed(2) + ' s against an upper limit of ' + L.ucl.toFixed(2) + ' s.' : last.errBreach ? 'Error rate above its limit: ' + pct(last.errRate) + '.' : hourNow < M.changeHour ? 'Inside the limits. The limits are mean ± ' + M.k + ' σ of the first six hours.' : 'Inside the limits so far; the change shipped at ' + M.changeLabel + '.');
  foot.style.background = done ? '#fbefe8' : last.breach || last.errBreach ? '#fdecea' : '#fafbfc';
}
function mk(canvas, yTitle, fmt, label) {
  return new Chart(canvas, { type: 'line', plugins: [marks], data: { datasets: [] }, options: {
    responsive: true, maintainAspectRatio: false, animation: false, parsing: { xAxisKey: 'x', yAxisKey: 'y' },
    scales: { x: { type: 'linear', min: 0, max: 24, ticks: { stepSize: 3, maxRotation: 0, color: C.muted, font: { size: 10.5 }, callback: v => String(v).padStart(2, '0') + ':00' }, grid: { color: '#eef1f5' } },
      y: { min: 0, title: { display: true, text: yTitle, color: C.muted, font: { size: 10.5 } }, ticks: { color: C.muted, font: { size: 10.5 }, callback: fmt }, grid: { color: '#eef1f5' } } },
    plugins: { legend: { display: label, position: 'top', align: 'end', labels: { boxWidth: 14, boxHeight: 2, font: { size: 10.5 }, color: C.muted, filter: it => it.text !== 'lower limit' } }, marks: { label },
      tooltip: { callbacks: { title: it => it[0].raw.x !== undefined ? String(Math.floor(it[0].raw.x)).padStart(2, '0') + ':' + (it[0].raw.x % 1 ? '30' : '00') : '', label: it => it.dataset.label + ': ' + fmt(it.raw.y) } } }
  } });
}

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  seek(t) { lastT = t; const key = Math.round(t * 2) + '|' + (t >= M.duration - 0.05); if (key !== lastKey) { lastKey = key; render(); } },
  mount(root, params) {
    M = model(params); lastT = 0; lastKey = '';
    wrap = document.createElement('div'); wrap.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;background:#fff;font-family:system-ui,sans-serif;color:#1d2433';
    head = document.createElement('div'); head.style.cssText = 'flex:none;padding:8px 14px 2px;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:flex-start';
    head.innerHTML = '<div style="flex:1 1 280px;min-width:0"><div style="font-size:14px;font-weight:600">Is the agent healthy? · a control chart on one day</div><div class="sub" style="font-size:12px;line-height:1.35;color:#5b6475;min-height:32px"></div></div><div class="stats" style="flex:0 1 auto;text-align:right"></div>';
    const c1 = document.createElement('div'); c1.style.cssText = 'position:relative;flex:3;min-height:0;padding:0 8px';
    const c2 = document.createElement('div'); c2.style.cssText = 'position:relative;flex:2;min-height:0;padding:0 8px';
    const k1 = document.createElement('canvas'), k2 = document.createElement('canvas'); c1.append(k1); c2.append(k2);
    foot = document.createElement('div'); foot.style.cssText = 'flex:none;height:48px;box-sizing:border-box;padding:6px 14px;font:12.5px/1.4 system-ui,sans-serif;border-chTop:1px solid #e3e7ee;background:#fafbfc;overflow:auto';
    wrap.append(head, c1, c2, foot); root.append(wrap);
    chTop = mk(k1, 'latency, s', v => (+v).toFixed(1) + ' s', true); chBot = mk(k2, 'error rate', v => (100 * v).toFixed(0) + ' %', false);
    render();
    ro = new ResizeObserver(() => requestAnimationFrame(() => { if (chTop) { chTop.resize(); chBot.resize(); render(); } })); ro.observe(c1);
  },
  update(params) { M = model(params); lastT = 0; lastKey = ''; render(); },
  destroy() { if (ro) ro.disconnect(); if (chTop) chTop.destroy(); if (chBot) chBot.destroy(); if (wrap) wrap.remove(); chTop = chBot = null; M = null; }
};

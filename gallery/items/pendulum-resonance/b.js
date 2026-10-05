// Chart.js: the response curve (steady amplitude against drive ÷ natural frequency) with the chosen drive marked, and
// below it the swing against time revealed by the clock with the steady amplitude as dashed lines. The curve is the
// whole lesson; the lower chart shows the one point on it being reached.
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d', soft: '#f4f6f9' };
let M = null, chTop = null, chBot = null, wrap = null, head = null, foot = null, ro = null, lastT = 0, lastKey = '';
const deg = v => +(v * 180 / Math.PI).toFixed(2);

const marker = { id: 'marker', afterDatasetsDraw(c, _, o) {
  if (!o.enabled) return;
  const g = c.ctx, x = c.scales.x.getPixelForValue(M.r), { top: y0, bottom: y1 } = c.chartArea;
  g.save(); g.strokeStyle = C.hi; g.lineWidth = 1.5; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y1); g.stroke(); g.setLineDash([]);
  g.fillStyle = C.hi; g.font = '600 11px system-ui, sans-serif'; g.textAlign = x > c.chartArea.right - 120 ? 'right' : 'left'; g.fillText('your drive ' + M.r.toFixed(2) + ' ×', x + (x > c.chartArea.right - 120 ? -6 : 6), y0 + 12);
  if (M.peakR) { const px = c.scales.x.getPixelForValue(M.peakR); g.strokeStyle = C.good; g.setLineDash([2, 3]); g.beginPath(); g.moveTo(px, y0); g.lineTo(px, y1); g.stroke(); g.setLineDash([]); }
  g.restore();
} };
function render() {
  if (!chTop) return;
  const narrow = wrap.clientWidth < 600, t = Math.min(lastT, M.duration), done = lastT >= M.duration - 0.05;
  const i = Math.min(M.series.length - 1, Math.round(t * 60)), cur = M.series[i];
  chTop.data.datasets = [
    { label: 'steady amplitude', data: M.curve.map(c => ({ x: c.r, y: c.deg })), borderColor: C.accent, borderWidth: 2, pointRadius: 0, tension: 0.2, fill: { target: 'origin', above: 'rgba(43,89,195,0.08)' } },
    { label: 'this drive', data: [{ x: M.r, y: deg(M.steady) }], borderColor: C.hi, backgroundColor: C.hi, pointRadius: 6, pointStyle: 'circle', showLine: false }
  ];
  chTop.options.scales.y.max = Math.ceil(deg(M.peakAmp) * 1.15 / 5) * 5;
  chTop.update('none');
  const vis = M.series.filter((s, j) => j % 2 === 0 && s.t <= t + 1e-6);
  chBot.data.datasets = [
    { label: 'swing', data: vis.map(s => ({ x: s.t, y: deg(s.theta) })), borderColor: C.accent, borderWidth: 1.6, pointRadius: 0, tension: 0 },
    { label: 'pivot push (scaled)', data: vis.map(s => ({ x: s.t, y: deg(s.drive) * 2 })), borderColor: '#c3cad6', borderWidth: 1, pointRadius: 0, tension: 0 },
    { label: 'steady amplitude', data: [{ x: 0, y: deg(M.steady) }, { x: M.duration, y: deg(M.steady) }], borderColor: C.hi, borderDash: [6, 4], borderWidth: 1.2, pointRadius: 0 },
    { label: '-steady', data: [{ x: 0, y: -deg(M.steady) }, { x: M.duration, y: -deg(M.steady) }], borderColor: C.hi, borderDash: [6, 4], borderWidth: 1.2, pointRadius: 0 }
  ];
  const lim = Math.ceil(Math.max(deg(M.steady), deg(M.measured)) * 1.3 / 5) * 5; chBot.options.scales.y.min = -lim; chBot.options.scales.y.max = lim;
  chBot.options.plugins.legend.display = !narrow; chTop.options.plugins.legend.display = !narrow;
  chBot.update('none');
  let k = 0; M.steps.forEach((s, j) => { if (s.t <= t + 1e-6) k = j; });
  head.querySelector('.sub').textContent = done ? M.summary : M.steps[k].title + ': ' + M.steps[k].note;
  const stats = narrow ? [['Drive', M.r.toFixed(2) + ' ×'], ['Now', deg(Math.abs(cur.theta)).toFixed(1) + '°']] : [['Drive', M.r.toFixed(2) + ' × natural (' + M.driveHz.toFixed(2) + ' Hz)'], ['Swing now', deg(Math.abs(cur.theta)).toFixed(1) + '°'], ['Steady', deg(M.steady).toFixed(1) + '°'], ['Peak', deg(M.peakAmp).toFixed(1) + '° at ' + (M.peakR || 0.3).toFixed(2) + ' ×'], ['Q', M.q.toFixed(1)]];
  head.querySelector('.stats').innerHTML = stats.map(([kk, v]) => '<span style="display:inline-block;margin:0 0 4px 6px;padding:3px 8px;border-radius:8px;background:#f4f6f9;font-size:11.5px;color:#5b6475;white-space:nowrap">' + kk + ' <b style="color:#1d2433">' + v + '</b></span>').join('');
  foot.textContent = narrow ? 'Top: steady swing for every drive frequency, yours in orange. Bottom: the swing building up to it.' : 'Top: the steady swing for every drive frequency, with your drive in orange and the peak dotted green; the height and sharpness of the peak are the damping. Bottom: the swing against time, ringing up to the dashed steady amplitude.';
}
function mk(canvas, xTitle, yTitle, withMarker, xmax) {
  return new Chart(canvas, { type: 'line', plugins: [marker], data: { datasets: [] }, options: {
    responsive: true, maintainAspectRatio: false, animation: false, parsing: { xAxisKey: 'x', yAxisKey: 'y' },
    scales: { x: { type: 'linear', min: withMarker ? 0.3 : 0, max: xmax, title: { display: true, text: xTitle, color: C.muted, font: { size: 10.5 } }, ticks: { color: C.muted, font: { size: 10.5 } }, grid: { color: '#eef1f5' } },
      y: { min: 0, title: { display: true, text: yTitle, color: C.muted, font: { size: 10.5 } }, ticks: { color: C.muted, font: { size: 10.5 }, callback: v => v + '°' }, grid: { color: '#eef1f5' } } },
    plugins: { legend: { display: true, position: 'top', align: 'end', labels: { boxWidth: 14, boxHeight: 2, font: { size: 10.5 }, color: C.muted, filter: it => it.text !== '-steady' } }, marker: { enabled: withMarker },
      tooltip: { callbacks: { label: it => it.dataset.label + ': ' + (+it.raw.y).toFixed(1) + '°' + (withMarker ? ' at ' + (+it.raw.x).toFixed(2) + ' ×' : ' at ' + (+it.raw.x).toFixed(2) + ' s') } } }
  } });
}

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  seek(t) { lastT = t; const key = Math.round(t * 10) + '|' + (t >= M.duration - 0.05); if (key !== lastKey) { lastKey = key; render(); } },
  mount(root, params) {
    M = model(params); lastT = 0; lastKey = '';
    wrap = document.createElement('div'); wrap.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;background:#fff;font-family:system-ui,sans-serif;color:#1d2433';
    head = document.createElement('div'); head.style.cssText = 'flex:none;padding:8px 14px 2px;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:flex-start';
    head.innerHTML = '<div style="flex:1 1 280px;min-width:0"><div style="font-size:14px;font-weight:600">Pendulum and resonance · the response curve</div><div class="sub" style="font-size:12px;line-height:1.35;color:#5b6475;min-height:32px"></div></div><div class="stats" style="flex:0 1 auto;text-align:right"></div>';
    const c1 = document.createElement('div'); c1.style.cssText = 'position:relative;flex:3;min-height:0;padding:0 8px';
    const c2 = document.createElement('div'); c2.style.cssText = 'position:relative;flex:2;min-height:0;padding:0 8px';
    const k1 = document.createElement('canvas'), k2 = document.createElement('canvas'); c1.append(k1); c2.append(k2);
    foot = document.createElement('div'); foot.style.cssText = 'flex:none;height:48px;box-sizing:border-box;padding:6px 14px;font:12px/1.4 system-ui,sans-serif;color:#5b6475;border-top:1px solid #e3e7ee;background:#fafbfc;overflow:auto';
    wrap.append(head, c1, c2, foot); root.append(wrap);
    chTop = mk(k1, 'drive frequency ÷ natural frequency', 'steady swing', true, 2); chBot = mk(k2, 'time, s', 'swing', false, M.duration);
    chBot.options.scales.y.min = undefined;
    render();
    ro = new ResizeObserver(() => requestAnimationFrame(() => { if (chTop) { chTop.resize(); chBot.resize(); render(); } })); ro.observe(c1);
  },
  update(params) { M = model(params); lastT = 0; lastKey = ''; render(); },
  destroy() { if (ro) ro.disconnect(); if (chTop) chTop.destroy(); if (chBot) chBot.destroy(); if (wrap) wrap.remove(); chTop = chBot = null; M = null; }
};

// Chart.js: the loss curve over training steps (log scale) with the current step marked,
// plus a smaller chart of the two dial values (slope, intercept) over the same steps.
// The host owns playback: seek(t) reveals the run up to the step shown at time t.
let M = null, T = 0, rootEl = null, box = null, lossChart = null, dialChart = null, ro = null;
const INK = '#1d2433', MUTED = '#5b6475', ACC = '#2b59c3', HI = '#c2410c', GOOD = '#1f7a4d', TEAL = '#0f766e', GRID = '#eef1f5';
const TITLE = 'How a model learns: nudging two dials';
const f0 = v => Math.round(v).toLocaleString('en-US');
const big = v => v >= 1e9 ? +(v / 1e9).toPrecision(3) + ' billion' : v >= 1e6 ? +(v / 1e6).toPrecision(3) + ' million' : f0(v);
const compact = v => v >= 1e12 ? +(v / 1e12).toPrecision(2) + 'T' : v >= 1e9 ? +(v / 1e9).toPrecision(2) + 'B' : v >= 1e6 ? +(v / 1e6).toPrecision(2) + 'M' : v >= 1e3 ? +(v / 1e3).toPrecision(2) + 'k' : String(+v.toPrecision(2));

function stepAt(t) {
  const { lead, span } = M.timing;
  if (t <= lead) return 0;
  const u = Math.min(1, (t - lead) / span);
  return Math.min(M.steps, Math.floor(M.steps * u * u + 1e-9));
}
function caption(k) {
  if (k >= M.steps) return M.summary;
  if (k === 0) return 'Step 0: the starting ' + M.start.toLowerCase() + ' has an error of ' + big(M.firstLoss) + ' tickets². Watch where the curve goes.';
  if (M.outcome === 'diverged') return 'Learning rate ' + M.lr + ': the error goes up, not down. Each nudge overshoots, so the dials zigzag further out.';
  if (M.outcome === 'slow') return 'Learning rate ' + M.lr + ': the error falls every step, but so slowly the curve is almost flat.';
  return M.stallStep && k >= M.stallStep ? 'The curve has flattened on the green line: the error has stopped falling.' : 'Learning rate ' + M.lr + ': each nudge cuts the error; big drops first, then smaller ones.';
}
// Vertical line at the current step, drawn on both charts
const nowLine = { id: 'nowLine', afterDatasetsDraw(c) {
  const k = c.$step; if (k == null) return;
  const x = c.scales.x.getPixelForValue(k), { top, bottom } = c.chartArea, g = c.ctx;
  g.save(); g.strokeStyle = 'rgba(29,36,51,0.35)'; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(x, top); g.lineTo(x, bottom); g.stroke();
  if (c.$note) { const { left, right } = c.chartArea; g.font = '600 ' + (right - left < 400 ? 11 : 12) + 'px system-ui, sans-serif'; g.textAlign = 'right'; g.textBaseline = 'top'; g.fillStyle = HI; g.fillText(c.$note, right - 6, top + 6); }
  g.restore();
} };
const lineDs = (label, color, extra) => Object.assign({ label, data: [], borderColor: color, backgroundColor: color, borderWidth: 2.5, pointRadius: 0, tension: 0 }, extra);

function sizeLayout() {
  const W = rootEl.clientWidth, wide = W >= 640;
  box.charts.style.flexDirection = wide ? 'row' : 'column';
  box.loss.style.flex = wide ? '3 1 0' : '1.2 1 0'; box.dial.style.flex = wide ? '2 1 0' : '1 1 0';
  const fs = wide ? 12 : 11;
  for (const c of [lossChart, dialChart]) if (c) { c.options.plugins.legend.labels.font = { size: fs }; c.options.plugins.title.font = { size: fs + 1, weight: '600' }; }
}
function build() {
  const H = M.history, maxL = Math.max(...H.map(h => h.loss)), xs = { type: 'linear', min: 0, max: M.steps, grid: { color: GRID }, title: { display: true, text: 'Training step' }, ticks: { maxTicksLimit: 7 } };
  lossChart.options.scales.x = xs;
  lossChart.options.scales.y.min = Math.pow(10, Math.floor(Math.log10(M.ls.loss * 0.8) * 2) / 2);
  lossChart.options.scales.y.max = Math.pow(10, Math.ceil(Math.log10(maxL * 1.2) * 2) / 2);
  lossChart.data.datasets[1].data = [{ x: 0, y: M.ls.loss }, { x: M.steps, y: M.ls.loss }];
  dialChart.options.scales.x = Object.assign({}, xs);
  dialChart.data.datasets[2].data = [{ x: 0, y: M.ls.slope }, { x: M.steps, y: M.ls.slope }];
  dialChart.data.datasets[3].data = [{ x: 0, y: M.ls.intercept }, { x: M.steps, y: M.ls.intercept }];
}
function draw() {
  if (!lossChart) return;
  const k = stepAt(T), H = M.history.slice(0, k + 1), h = M.history[k], done = k >= M.steps;
  box.sub.textContent = caption(k); box.sub.style.color = done ? INK : MUTED;
  box.stat.innerHTML = 'Step <b>' + k + '</b> of ' + M.steps + ' · error <b style="color:' + (M.outcome === 'diverged' && k > 0 ? HI : INK) + '">' + big(h.loss) + ' tickets²</b> · slope <b>' + (Math.abs(h.slope) >= 1000 ? f0(h.slope) : h.slope.toFixed(1)) + '</b> · intercept <b>' + f0(h.intercept) + '</b>';
  lossChart.data.datasets[0].data = H.map(q => ({ x: q.step, y: q.loss }));
  lossChart.data.datasets[2].data = [{ x: k, y: h.loss }];
  lossChart.data.datasets[2].backgroundColor = M.outcome === 'diverged' && k > 0 ? HI : ACC;
  // values beyond the dial ranges are left out (a gap), like a needle pinned off the dial
  const inR = (v, r) => v >= r[0] && v <= r[1] ? v : null;
  dialChart.data.datasets[0].data = H.map(q => ({ x: q.step, y: inR(q.slope, M.slopeRange) }));
  dialChart.data.datasets[1].data = H.map(q => ({ x: q.step, y: inR(q.intercept, M.interceptRange) }));
  lossChart.$step = dialChart.$step = k;
  const offS = M.history.findIndex(q => inR(q.slope, M.slopeRange) === null), offI = M.history.findIndex(q => inR(q.intercept, M.interceptRange) === null);
  const sOut = offS >= 0 && k >= offS, iOut = offI >= 0 && k >= offI;
  dialChart.$note = sOut && iOut ? 'Both dials off the scale by step ' + Math.max(offS, offI) : sOut ? 'Slope off the scale from step ' + offS : iOut ? 'Intercept off the scale from step ' + offI : null;
  lossChart.update('none'); dialChart.update('none');
}
function makeCharts() {
  Chart.defaults.font.family = 'system-ui, sans-serif'; Chart.defaults.color = MUTED;
  const common = { responsive: true, maintainAspectRatio: false, animation: false, parsing: false, normalized: true,
    interaction: { mode: 'nearest', axis: 'x', intersect: false }, layout: { padding: { right: 6 } } };
  const legend = { position: 'bottom', labels: { boxWidth: 16, boxHeight: 2, padding: 10, filter: i => i.text } };
  lossChart = new Chart(box.loss.querySelector('canvas'), { type: 'line', plugins: [nowLine],
    data: { datasets: [lineDs('Error at each step', ACC),
      lineDs('Best possible (least squares)', GOOD, { borderDash: [6, 4], borderWidth: 1.8 }),
      { label: '', data: [], type: 'scatter', pointRadius: 5.5, pointBorderColor: '#fff', pointBorderWidth: 2, backgroundColor: ACC }] },
    options: Object.assign({}, common, {
      scales: { y: { type: 'logarithmic', grid: { color: c => c.tick && c.tick.label ? GRID : 'transparent' }, title: { display: true, text: 'Error (tickets², log scale)' },
        ticks: { autoSkip: false, callback(v) {
          const sc = this, dec = Math.log10(sc.max / sc.min), ppd = (sc.bottom - sc.top) / Math.max(1, dec), every = Math.max(1, Math.ceil(16 / ppd));
          const e = Math.floor(Math.log10(v) + 1e-9), m = v / Math.pow(10, e);
          if (Math.abs(m - 1) < 1e-6) return e % every === 0 ? compact(v) : '';
          return Math.abs(m - 3) < 1e-6 && ppd >= 40 ? compact(v) : '';
        } } } },
      plugins: { legend, title: { display: true, text: 'Error falls (or grows) step by step', color: INK, align: 'start' },
        tooltip: { callbacks: { label: c => c.dataset.label ? c.dataset.label + ': ' + big(c.parsed.y) + ' tickets²' : null } } } }) });
  dialChart = new Chart(box.dial.querySelector('canvas'), { type: 'line', plugins: [nowLine],
    data: { datasets: [lineDs('Slope (tickets per 1,000)', ACC, { yAxisID: 'ys', borderWidth: 2, spanGaps: false, pointRadius: c => c.dataIndex === c.chart.$step ? 4 : 0 }), lineDs('Intercept (tickets)', TEAL, { yAxisID: 'yi', borderWidth: 2, spanGaps: false, pointRadius: c => c.dataIndex === c.chart.$step ? 4 : 0 }),
      lineDs('', ACC, { yAxisID: 'ys', borderDash: [5, 4], borderWidth: 1.2 }), lineDs('', TEAL, { yAxisID: 'yi', borderDash: [5, 4], borderWidth: 1.2 })] },
    options: Object.assign({}, common, {
      scales: { ys: { position: 'left', min: M.slopeRange[0], max: M.slopeRange[1], grid: { color: GRID }, title: { display: true, text: 'Slope', color: ACC }, ticks: { color: ACC, stepSize: (M.slopeRange[1] - M.slopeRange[0]) / 4 } },
        yi: { position: 'right', min: M.interceptRange[0], max: M.interceptRange[1], grid: { drawOnChartArea: false }, title: { display: true, text: 'Intercept', color: TEAL }, ticks: { color: TEAL, stepSize: (M.interceptRange[1] - M.interceptRange[0]) / 4 } } },
      plugins: { legend, title: { display: true, text: 'The two dials (dashed: least-squares values)', color: INK, align: 'start' } } }) });
}

window.lab = {
  get duration() { return M.duration; },
  get markers() { return M.markers; },
  seek(t) { T = Math.max(0, Math.min(M.duration, t)); draw(); },
  mount(root, params) {
    rootEl = root; M = model(params); T = 0;
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;background:#fff;color:' + INK + ';font-family:system-ui,sans-serif;padding:10px 12px 6px;box-sizing:border-box;gap:4px';
    wrap.innerHTML = '<div style="font-size:14px;font-weight:600">' + TITLE + '</div><div data-k="sub" style="font-size:13px;line-height:1.35;min-height:2.7em"></div>' +
      '<div data-k="stat" style="font-size:12px;color:' + MUTED + '"></div>' +
      '<div data-k="charts" style="flex:1;min-height:0;display:flex;gap:14px;padding-top:4px"><div data-k="loss" style="position:relative;min-width:0;min-height:0"><canvas></canvas></div><div data-k="dial" style="position:relative;min-width:0;min-height:0"><canvas></canvas></div></div>' +
      '<div style="font-size:11px;color:' + MUTED + ';text-align:right">Illustrative synthetic data: 20 weeks of active customers vs weekly support tickets</div>';
    root.appendChild(wrap);
    box = { wrap }; wrap.querySelectorAll('[data-k]').forEach(n => { box[n.dataset.k] = n; });
    sizeLayout(); makeCharts(); sizeLayout(); build(); draw();
    ro = new ResizeObserver(() => { sizeLayout(); lossChart.resize(); dialChart.resize(); draw(); }); ro.observe(root);
  },
  update(params) { M = model(params); T = 0; build(); draw(); },
  destroy() { if (ro) ro.disconnect(); if (lossChart) lossChart.destroy(); if (dialChart) dialChart.destroy(); if (box) box.wrap.remove(); lossChart = dialChart = box = ro = M = null; }
};

// Chart.js dot plot with ranges: one row per team sorted by its change, a dot for the estimate and a pale bar for the
// 95 % range, a zero line, and the pooled change at the top in orange. The clock adds the dots, then the ranges.
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d', bad: '#b42318', soft: '#f4f6f9', faint: '#9aa3b2' };
let M = null, chart = null, wrap = null, head = null, foot = null, box = null, ro = null, lastT = 0, lastKey = '';
const st = id => M.steps.find(s => s.id === id).t;
const zeroLine = { id: 'zero', afterDatasetsDraw(c) { const g = c.ctx, x = c.scales.x.getPixelForValue(0), { top, bottom } = c.chartArea; g.save(); g.strokeStyle = C.ink; g.lineWidth = 1.2; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(x, top); g.lineTo(x, bottom); g.stroke(); g.restore(); } };

function rows() { return [{ name: 'All teams', change: M.pooled, lo: M.pooled - M.pooledMargin, hi: M.pooled + M.pooledMargin, pooled: true, clear: M.pooled + M.pooledMargin < 0, looksWorse: M.pooled > 0 }].concat(M.sorted.map(i => M.list[i])); }
function render() {
  if (!chart) return;
  const narrow = wrap.clientWidth < 560, t = lastT, done = t >= M.duration - 0.05, phase = t >= st('ranges') ? 2 : t >= st('after') ? 1 : 0;
  const R = rows(), labels = R.map(r => r.name), colOf = r => r.pooled ? C.hi : phase >= 2 ? (r.clear ? C.good : r.looksWorse ? C.bad : C.faint) : C.accent;
  const shown = phase >= 1 ? R.filter((r, k) => t >= st('after') + 0.2 + k * 0.15) : [];
  chart.data.labels = labels;
  chart.data.datasets = [
    { type: 'bar', label: '95 % range', grouped: false, borderSkipped: false, borderRadius: 3, barPercentage: 0.55, categoryPercentage: 0.9, parsing: { xAxisKey: 'x', yAxisKey: 'y' },
      data: phase >= 2 ? shown.map(r => ({ x: [r.lo, r.hi], y: r.name, r })) : [], backgroundColor: ctx => { const r = ctx.raw && ctx.raw.r; return r ? colOf(r) + '33' : C.soft; }, borderColor: ctx => { const r = ctx.raw && ctx.raw.r; return r ? colOf(r) : C.line; }, borderWidth: 1 },
    { type: 'line', label: 'change', showLine: false, parsing: { xAxisKey: 'x', yAxisKey: 'y' }, data: shown.map(r => ({ x: r.change, y: r.name, r })), pointRadius: ctx => (ctx.raw && ctx.raw.r && ctx.raw.r.pooled ? 7 : 5), pointHoverRadius: 7,
      pointBackgroundColor: ctx => (ctx.raw && ctx.raw.r ? colOf(ctx.raw.r) : C.accent), pointBorderColor: '#fff', pointBorderWidth: 1.5 }
  ];
  const span = Math.max(10, ...R.map(r => Math.abs(r.lo)), ...R.map(r => Math.abs(r.hi))) + 5;
  chart.options.scales.x.min = -Math.ceil(span / 10) * 10; chart.options.scales.x.max = Math.ceil(Math.max(10, ...R.map(r => r.hi)) / 10) * 10;
  chart.options.scales.y.ticks.font = { size: narrow ? 10 : 11.5, weight: ctx => (ctx.index === 0 ? '700' : '400') };
  chart.update('none');
  let k = 0; M.steps.forEach((s, i) => { if (s.t <= t + 1e-6) k = i; });
  const s = M.steps[k];
  head.querySelector('.sub').textContent = done ? M.summary : s.title + ': ' + s.note;
  const stats = narrow ? [['Pooled', M.pooled + ' % ± ' + M.pooledMargin], ['Clear zero', M.clearCount + '/' + M.teams]] : [['Pooled change', M.pooled + ' % ± ' + M.pooledMargin], ['Teams clear zero', M.clearCount + ' of ' + M.teams], ['Look worse', String(M.worseCount)], ['n per team', String(M.n)]];
  head.querySelector('.stats').innerHTML = stats.map(([kk, v]) => '<span style="display:inline-block;margin:0 0 4px 6px;padding:3px 8px;border-radius:8px;background:#f4f6f9;font-size:11.5px;color:#5b6475;white-space:nowrap">' + kk + ' <b style="color:#1d2433">' + v + '</b></span>').join('');
  foot.textContent = phase >= 2 ? 'A bar that crosses the dashed zero line means the change could be noise at n = ' + M.n + '. The pooled range is narrower because it adds every team\'s measurements.' : phase === 1 ? 'One dot per team: the change in cycle time, sorted. Negative is better.' : 'Waiting for the after measurements.';
}

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  seek(t) { lastT = t; const key = Math.round(t * 8) + '|' + (t >= M.duration - 0.05); if (key !== lastKey) { lastKey = key; render(); } },
  mount(root, params) {
    M = model(params); lastT = 0; lastKey = '';
    wrap = document.createElement('div'); wrap.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;background:#fff;font-family:system-ui,sans-serif;color:#1d2433';
    head = document.createElement('div'); head.style.cssText = 'flex:none;padding:8px 14px 2px;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:flex-start';
    head.innerHTML = '<div style="flex:1 1 280px;min-width:0"><div style="font-size:14px;font-weight:600">Before and after · each team\'s change with its range</div><div class="sub" style="font-size:12px;line-height:1.35;color:#5b6475;min-height:32px"></div></div><div class="stats" style="flex:0 1 auto;text-align:right"></div>';
    box = document.createElement('div'); box.style.cssText = 'position:relative;flex:1;min-height:0;padding:0 8px';
    const canvas = document.createElement('canvas'); box.append(canvas);
    foot = document.createElement('div'); foot.style.cssText = 'flex:none;height:44px;box-sizing:border-box;padding:6px 14px;font:12px/1.4 system-ui,sans-serif;color:#5b6475;border-top:1px solid #e3e7ee;background:#fafbfc;overflow:auto';
    wrap.append(head, box, foot); root.append(wrap);
    chart = new Chart(canvas, { type: 'bar', plugins: [zeroLine], data: { labels: [], datasets: [] }, options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: false,
      scales: { x: { min: -60, max: 20, title: { display: true, text: 'change in cycle time, % (negative is better)', color: C.muted, font: { size: 11 } }, ticks: { color: C.muted, font: { size: 11 }, callback: v => (v > 0 ? '+' : '') + v + ' %' }, grid: { color: '#eef1f5' } },
        y: { ticks: { color: C.ink, font: { size: 11.5 }, autoSkip: false }, grid: { display: false } } },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => { const r = ctx.raw && ctx.raw.r; return r ? r.name + ': ' + (r.change > 0 ? '+' : '') + r.change + ' % (range ' + r.lo.toFixed(1) + ' to ' + r.hi.toFixed(1) + ')' : ''; } } } }
    } });
    render();
    ro = new ResizeObserver(() => requestAnimationFrame(() => { if (chart) { chart.resize(); render(); } })); ro.observe(box);
  },
  update(params) { M = model(params); lastT = 0; lastKey = ''; render(); },
  destroy() { if (ro) ro.disconnect(); if (chart) chart.destroy(); if (wrap) wrap.remove(); chart = null; M = null; }
};

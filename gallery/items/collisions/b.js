// Chart.js: velocity against time for both carts (flat lines with one step at the hit) on top, and underneath the two
// totals, momentum and kinetic energy, which is where the conservation laws show as a flat line and a dropped one.
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d', teal: '#0f766e', soft: '#f4f6f9' };
let M = null, chTop = null, chBot = null, wrap = null, head = null, foot = null, ro = null, lastT = 0, lastKey = '';
const fmt = v => (Math.round(v * 100) / 100).toFixed(2);
const hitLine = { id: 'hit', afterDatasetsDraw(c) { if (lastT < M.tc) return; const g = c.ctx, x = c.scales.x.getPixelForValue(M.tc), { top, bottom } = c.chartArea; g.save(); g.strokeStyle = C.hi; g.lineWidth = 1.5; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(x, top); g.lineTo(x, bottom); g.stroke(); g.setLineDash([]); g.fillStyle = C.hi; g.font = '600 11px system-ui, sans-serif'; g.textAlign = 'left'; g.fillText('hit ' + M.tc.toFixed(2) + ' s', x + 5, top + 12); g.restore(); } };

function render() {
  if (!chTop) return;
  const narrow = wrap.clientWidth < 600, t = Math.min(lastT, M.duration), done = lastT >= M.duration - 0.05;
  const vis = M.series.filter((s, j) => j % 3 === 0 && s.t <= t + 1e-6), cur = M.series[Math.min(M.series.length - 1, Math.round(t * 60))];
  chTop.data.datasets = [
    { label: 'cart 1 (' + M.m1 + ' kg)', data: vis.map(s => ({ x: s.t, y: s.v1 })), borderColor: C.accent, borderWidth: 2.2, pointRadius: 0, stepped: true },
    { label: 'cart 2 (' + M.m2 + ' kg)', data: vis.map(s => ({ x: s.t, y: s.v2 })), borderColor: C.teal, borderWidth: 2.2, pointRadius: 0, stepped: true }
  ];
  const vmax = Math.max(M.v1, Math.abs(M.u1), Math.abs(M.u2)) * 1.2; chTop.options.scales.y.min = -Math.ceil(vmax); chTop.options.scales.y.max = Math.ceil(vmax);
  chBot.data.datasets = [
    { label: 'momentum, kg·m/s', data: vis.map(s => ({ x: s.t, y: s.p })), borderColor: C.accent, borderWidth: 2.2, pointRadius: 0, stepped: true },
    { label: 'kinetic energy, J', data: vis.map(s => ({ x: s.t, y: s.k })), borderColor: M.e < 1 ? C.hi : C.good, borderWidth: 2.2, pointRadius: 0, stepped: true }
  ];
  chBot.options.scales.y.max = Math.ceil(Math.max(M.pBefore, M.kBefore) * 1.2);
  chTop.options.plugins.legend.display = chBot.options.plugins.legend.display = !narrow;
  chTop.update('none'); chBot.update('none');
  let k = 0; M.steps.forEach((s, j) => { if (s.t <= t + 1e-6) k = j; });
  head.querySelector('.sub').textContent = done ? M.summary : M.steps[k].title + ': ' + M.steps[k].note;
  const stats = narrow ? [['p', fmt(cur.p)], ['KE', fmt(cur.k) + ' J']] : [['Momentum', fmt(cur.p) + ' kg·m/s'], ['Kinetic energy', fmt(cur.k) + ' J'], ['v₁ / v₂', fmt(cur.v1) + ' / ' + fmt(cur.v2) + ' m/s'], ['Elasticity', String(M.e)]];
  head.querySelector('.stats').innerHTML = stats.map(([kk, v]) => '<span style="display:inline-block;margin:0 0 4px 6px;padding:3px 8px;border-radius:8px;background:#f4f6f9;font-size:11.5px;color:#5b6475;white-space:nowrap">' + kk + ' <b style="color:#1d2433">' + v + '</b></span>').join('');
  foot.textContent = narrow ? 'Top: each cart\'s velocity. Bottom: the totals; momentum stays flat, energy drops unless elastic.' : 'Top: each cart\'s velocity, flat before and after with one step at the hit (negative means moving back). Bottom: the totals. Momentum is a flat line in every case; kinetic energy steps down by ' + fmt(M.loss) + ' J' + (M.e === 1 ? ', which is nothing when elastic.' : '.');
}
function mk(canvas, yTitle, fmtY) {
  return new Chart(canvas, { type: 'line', plugins: [hitLine], data: { datasets: [] }, options: {
    responsive: true, maintainAspectRatio: false, animation: false, parsing: { xAxisKey: 'x', yAxisKey: 'y' },
    scales: { x: { type: 'linear', min: 0, max: M.duration, title: { display: true, text: 'time, s', color: C.muted, font: { size: 10.5 } }, ticks: { color: C.muted, font: { size: 10.5 } }, grid: { color: '#eef1f5' } },
      y: { title: { display: true, text: yTitle, color: C.muted, font: { size: 10.5 } }, ticks: { color: C.muted, font: { size: 10.5 }, callback: fmtY }, grid: { color: '#eef1f5' } } },
    plugins: { legend: { display: true, position: 'top', align: 'end', labels: { boxWidth: 14, boxHeight: 2, font: { size: 10.5 }, color: C.muted } }, tooltip: { callbacks: { label: it => it.dataset.label + ': ' + fmt(it.raw.y) } } }
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
    head.innerHTML = '<div style="flex:1 1 280px;min-width:0"><div style="font-size:14px;font-weight:600">Collisions · velocities and the two totals</div><div class="sub" style="font-size:12px;line-height:1.35;color:#5b6475;min-height:32px"></div></div><div class="stats" style="flex:0 1 auto;text-align:right"></div>';
    const c1 = document.createElement('div'); c1.style.cssText = 'position:relative;flex:1;min-height:0;padding:0 8px';
    const c2 = document.createElement('div'); c2.style.cssText = 'position:relative;flex:1;min-height:0;padding:0 8px';
    const k1 = document.createElement('canvas'), k2 = document.createElement('canvas'); c1.append(k1); c2.append(k2);
    foot = document.createElement('div'); foot.style.cssText = 'flex:none;height:48px;box-sizing:border-box;padding:6px 14px;font:12px/1.4 system-ui,sans-serif;color:#5b6475;border-top:1px solid #e3e7ee;background:#fafbfc;overflow:auto';
    wrap.append(head, c1, c2, foot); root.append(wrap);
    chTop = mk(k1, 'velocity, m/s', v => v + ''); chBot = mk(k2, 'total', v => v + '');
    chBot.options.scales.y.min = 0;
    render();
    ro = new ResizeObserver(() => requestAnimationFrame(() => { if (chTop) { chTop.resize(); chBot.resize(); render(); } })); ro.observe(c1);
  },
  update(params) { M = model(params); lastT = 0; lastKey = ''; render(); },
  destroy() { if (ro) ro.disconnect(); if (chTop) chTop.destroy(); if (chBot) chBot.destroy(); if (wrap) wrap.remove(); chTop = chBot = null; M = null; }
};

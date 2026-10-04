// Chart.js: two aligned charts over the same week. Top: tickets arriving per hour against agent capacity.
// Bottom: the backlog that results, with one extra agent as a dashed comparison. seek(t) reveals hours up to t.
const COL = { arrive: '#2b59c3', cap: '#c2410c', plus: '#1f7a4d', backlog: '#b4530f', grid: '#eef1f5', day: '#dbe0e8' };
let M = null, T = 0, wrap = null, head = null, cTop = null, cBot = null, onResize = null;

function xScale(showTicks) {
  return { type: 'linear', offset: false, min: 0, max: 120, border: { color: '#dbe0e8' },
    grid: { color: c => c.tick && c.tick.value % 24 === 0 ? COL.day : 'transparent' },
    ticks: { stepSize: 12, autoSkip: false, maxRotation: 0, display: showTicks, font: { size: 11.5 }, callback: v => v % 24 === 12 ? M.hours[v].day : '' } };
}
function base(yTitle, showX) {
  return { responsive: true, maintainAspectRatio: false, animation: false, parsing: false,
    interaction: { mode: 'nearest', axis: 'x', intersect: false },
    layout: { padding: { right: 8 } },
    scales: { x: xScale(showX), y: { min: 0, grid: { color: COL.grid }, border: { display: false }, afterFit: a => { a.width = 54; },
      title: { display: true, text: yTitle, font: { size: 11.5 } }, ticks: { font: { size: 11 }, maxTicksLimit: 7 } } },
    plugins: { legend: { position: 'top', align: 'start', labels: { boxWidth: 14, boxHeight: 3, padding: 10, font: { size: 11.5 } } },
      tooltip: { callbacks: { title: it => { const x = Math.min(119, Math.floor(it[0].parsed.x - 1e-6)); return M.hours[Math.max(0, x)].day + ' ' + String(M.hours[Math.max(0, x)].h).padStart(2, '0') + ':00–' + String(M.hours[Math.max(0, x)].h + 1).padStart(2, '0') + ':00'; },
        label: c => ' ' + c.dataset.label + ': ' + Math.round(c.parsed.y) } } } };
}
function nice(v) {
  const step = [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000].find(x => v / x <= 5) || 2000;
  return { max: Math.max(step, Math.ceil(v / step) * step), stepSize: step };
}
function header() {
  const done = T >= M.duration - 1e-6, cap = +M.base.capacity.toFixed(1);
  head.innerHTML = '';
  const t = document.createElement('div'); t.style.cssText = 'font:600 14px system-ui,sans-serif;color:#1d2433';
  t.textContent = 'Arrivals vs capacity, and the backlog it leaves (' + M.agents + ' agents, ' + M.handle + ' min per ticket)';
  const s = document.createElement('div'); s.style.cssText = 'font:12.5px/1.35 system-ui,sans-serif;margin-top:2px;color:' + (done ? '#1d2433' : '#5b6475');
  s.textContent = done ? M.summary : M.maxArrivals > cap ? 'Whenever the blue bars rise above the capacity line (' + cap + '/h), the backlog below grows; it only shrinks when they drop under it.'
    : 'Capacity (' + cap + '/h) is above every hour’s arrivals (busiest ' + M.maxArrivals + '/h), so no backlog builds.';
  head.append(t, s);
}
function build() {
  const cap = M.base.capacity, cap2 = M.plus.capacity;
  cTop.data.datasets = [
    { type: 'bar', label: 'Tickets arriving per hour', data: [], backgroundColor: COL.arrive, barPercentage: 1, categoryPercentage: 1, borderWidth: 0, order: 2 },
    { type: 'line', label: M.agents + ' agents can resolve ' + +cap.toFixed(1) + '/h', data: [{ x: 0, y: cap }, { x: 120, y: cap }], borderColor: COL.cap, borderWidth: 2, pointRadius: 0, order: 1 },
    { type: 'line', label: (M.agents + 1) + ' agents: ' + +cap2.toFixed(1) + '/h', data: [{ x: 0, y: cap2 }, { x: 120, y: cap2 }], borderColor: COL.plus, borderDash: [5, 4], borderWidth: 1.5, pointRadius: 0, order: 1 }
  ];
  Object.assign(cTop.options.scales.y, { max: nice(Math.max(M.maxArrivals, cap2) * 1.1).max }); cTop.options.scales.y.ticks.stepSize = nice(Math.max(M.maxArrivals, cap2) * 1.1).stepSize;
  cBot.data.datasets = [
    { label: 'Backlog with ' + M.agents + ' agents', data: [], borderColor: COL.backlog, backgroundColor: 'rgba(180,83,15,0.12)', fill: 'origin', borderWidth: 2.5, pointRadius: 0 },
    { label: 'With ' + (M.agents + 1) + ' agents', data: [], borderColor: COL.plus, borderDash: [5, 4], borderWidth: 1.8, pointRadius: 0 },
    { label: 'Peak', data: [], borderColor: COL.backlog, backgroundColor: '#fff', borderWidth: 2, pointRadius: 5, showLine: false }
  ];
  const nb = nice(Math.max(10, M.base.peak, M.plus.peak) * 1.1); cBot.options.scales.y.max = nb.max; cBot.options.scales.y.ticks.stepSize = nb.stepSize;
  cBot.options.plugins.legend.labels.filter = it => it.text !== 'Peak';
}
function draw() {
  const hf = Math.max(0, Math.min(120, T / M.perHour)), k = Math.floor(hf + 1e-9);
  cTop.data.datasets[0].data = M.hours.slice(0, k).map(x => ({ x: x.i + 0.5, y: x.arrivals }));
  const line = arr => [{ x: 0, y: 0 }].concat(arr.slice(0, k).map((v, i) => ({ x: i + 1, y: v })));
  cBot.data.datasets[0].data = line(M.base.backlog);
  cBot.data.datasets[1].data = line(M.plus.backlog);
  cBot.data.datasets[2].data = M.base.peak > 0 && k > M.base.peakAt ? [{ x: M.base.peakAt + 1, y: M.base.peak }] : [];
  cBot.options.plugins.title.text = M.base.peak > 0 && k > M.base.peakAt ? 'Peak so far: ' + Math.round(M.base.peak) + ' tickets (' + M.peakWhen + ')' : '';
  header(); cTop.update('none'); cBot.update('none');
}

window.lab = {
  get duration() { return M ? M.duration : 12; },
  get markers() { return M ? M.markers : []; },
  seek(t) { T = t; draw(); },
  mount(root, params) {
    M = model(params); T = 0;
    Chart.defaults.font.family = 'system-ui, sans-serif'; Chart.defaults.color = '#5b6475';
    wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;inset:0;padding:8px 12px 4px;display:flex;flex-direction:column;gap:2px;box-sizing:border-box';
    head = document.createElement('div');
    const box = f => { const d = document.createElement('div'); d.style.cssText = 'position:relative;min-height:0;flex:' + f; const c = document.createElement('canvas'); d.append(c); wrap.append(d); return c; };
    wrap.append(head);
    const c1 = box(4), c2 = box(5);
    c1.setAttribute('role', 'img'); c1.setAttribute('aria-label', 'Tickets arriving per hour compared with agent capacity');
    c2.setAttribute('role', 'img'); c2.setAttribute('aria-label', 'Backlog of waiting tickets over the week');
    root.append(wrap);
    cTop = new Chart(c1, { type: 'bar', data: { datasets: [] }, options: base('Tickets / hour', false) });
    const o2 = base('Tickets waiting', true);
    o2.plugins.title = { display: true, align: 'end', color: '#1d2433', font: { size: 12, weight: '600' }, padding: { top: 0, bottom: 0 }, text: '' };
    cBot = new Chart(c2, { type: 'line', data: { datasets: [] }, options: o2 });
    build(); draw();
    onResize = () => draw();
    addEventListener('resize', onResize);
  },
  update(params) { M = model(params); T = 0; build(); draw(); },
  destroy() { removeEventListener('resize', onResize); if (cTop) cTop.destroy(); if (cBot) cBot.destroy(); if (wrap) wrap.remove(); cTop = cBot = wrap = null; M = null; }
};

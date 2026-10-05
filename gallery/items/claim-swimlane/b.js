// Chart.js Gantt by lane: one row per desk, a floating bar per event placed at its business days, solid for work and
// pale for waiting, revealed up to the playback clock with a "today" line. The empty stretches are the lesson.
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d', bad: '#b42318', soft: '#f4f6f9', wait: '#e6e9ef', waitNow: '#fbe3d6' };
let M = null, chart = null, wrap = null, head = null, foot = null, box = null, ro = null, lastKey = '', lastT = 0, dayNow = 0;
const fmtD = d => (Math.round(d * 10) / 10) + ' d';

function currentEvent() { let e = M.events[0]; for (const ev of M.events) if (ev.at <= lastT + 1e-6) e = ev; return e; }
function clock() { const e = currentEvent(), done = lastT >= M.duration - 0.05; return done ? M.totals.elapsed : Math.min(M.totals.elapsed, e.start + Math.max(0, Math.min(1, (lastT - e.at) / Math.max(e.len, 1e-6))) * e.dur); }
const labelsPlugin = { id: 'ganttLabels', afterDatasetsDraw(c) {
  const g = c.ctx, narrow = wrap.clientWidth < 640; g.save(); g.font = (narrow ? '500 9.5px' : '500 11px') + ' system-ui, sans-serif'; g.textBaseline = 'middle';
  c.data.datasets.forEach((ds, di) => { const meta = c.getDatasetMeta(di); meta.data.forEach((bar, i) => {
    const p = ds.data[i]; if (!p || p.x[1] > dayNow + 1e-6 && p.x[0] >= dayNow) return;
    const x0 = c.scales.x.getPixelForValue(p.x[0]), x1 = c.scales.x.getPixelForValue(Math.min(p.x[1], dayNow)), w = x1 - x0, label = p.ev.label + (narrow ? '' : ' · ' + fmtD(p.ev.dur));
    const tw = g.measureText(label).width;
    if (w >= tw + 8) { g.fillStyle = p.ev.kind === 'wait' ? C.muted : '#fff'; g.textAlign = 'center'; g.fillText(label, (x0 + x1) / 2, bar.y); }
    else if (p.ev.kind === 'work' && !narrow) {
      // outside label only when the next bar in this lane leaves room for it
      const next = M.events.find(ev => ev.lane === p.ev.lane && ev.start >= p.ev.end - 1e-6), room = next ? c.scales.x.getPixelForValue(next.start) - x1 : Infinity;
      if (room >= g.measureText(p.ev.label).width + 8) { g.fillStyle = C.ink; g.textAlign = 'left'; g.fillText(p.ev.label, x1 + 4, bar.y); }
    }
  }); });
  // today line
  const x = c.scales.x.getPixelForValue(dayNow), { top, bottom } = c.chartArea;
  if (x >= c.chartArea.left && x <= c.chartArea.right) { g.strokeStyle = C.accent; g.lineWidth = 2; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(x, top); g.lineTo(x, bottom); g.stroke(); g.setLineDash([]);
    g.fillStyle = C.accent; g.font = '600 11px system-ui, sans-serif'; g.textAlign = x > c.chartArea.right - 70 ? 'right' : 'left'; g.fillText('day ' + (Math.round(dayNow * 10) / 10), x + (x > c.chartArea.right - 70 ? -6 : 6), top + 8); }
  g.restore();
} };
function data() {
  const e = currentEvent(), done = lastT >= M.duration - 0.05;
  const pt = ev => ({ x: [ev.start, Math.min(ev.end, dayNow)], y: M.lanes.find(l => l.id === ev.lane).label, ev });
  const vis = M.events.filter(ev => ev.start < dayNow + 1e-6);
  return { labels: M.lanes.map(l => l.label), datasets: [
    { label: 'Work at a desk', grouped: false, borderSkipped: false, borderRadius: 4, barPercentage: 0.62, categoryPercentage: 0.9,
      data: vis.filter(ev => ev.kind === 'work').map(pt), backgroundColor: ctx => { const p = ctx.raw; return !p ? C.good : (!done && p.ev.i === e.i) ? C.accent : p.ev.bad ? C.bad : C.good; } },
    { label: 'Waiting between desks', grouped: false, borderSkipped: false, borderRadius: 4, barPercentage: 0.62, categoryPercentage: 0.9,
      data: vis.filter(ev => ev.kind === 'wait').map(pt), backgroundColor: ctx => { const p = ctx.raw; return p && !done && p.ev.i === e.i ? C.waitNow : C.wait; }, borderColor: ctx => { const p = ctx.raw; return p && !done && p.ev.i === e.i ? C.hi : '#c3cad6'; }, borderWidth: 1, borderDash: [4, 3] }
  ] };
}
function render() {
  if (!chart) return;
  dayNow = clock();
  const d = data(), narrow = wrap.clientWidth < 640, e = currentEvent(), done = lastT >= M.duration - 0.05, T = M.totals;
  chart.data.labels = d.labels; chart.data.datasets = d.datasets;
  chart.options.scales.x.max = Math.ceil(T.elapsed / 5) * 5;
  chart.options.scales.y.ticks.font.size = narrow ? 10 : 11.5;
  chart.update('none');
  const workSoFar = M.events.filter(ev => ev.kind === 'work').reduce((s, ev) => s + Math.max(0, Math.min(ev.dur, dayNow - ev.start)), 0);
  head.querySelector('.sub').textContent = done ? M.summary : 'Step ' + (e.i + 1) + ' of ' + M.events.length + ' · ' + (e.kind === 'wait' ? 'waiting: ' : '') + e.label + ' (' + M.lanes.find(l => l.id === e.lane).label + ')';
  const stats = narrow ? [['Day', Math.round(dayNow * 10) / 10], ['Working', fmtD(workSoFar)]] : [['Day', (Math.round(dayNow * 10) / 10) + ' of ' + T.elapsed], ['Work so far', fmtD(workSoFar)], ['Waiting so far', fmtD(Math.max(0, dayNow - workSoFar))], ['Hand-offs', T.handoffs]];
  head.querySelector('.stats').innerHTML = stats.map(([k, v]) => '<span style="display:inline-block;margin:0 0 4px 6px;padding:3px 8px;border-radius:8px;background:#f4f6f9;font-size:11.5px;color:#5b6475;white-space:nowrap">' + k + ' <b style="color:#1d2433">' + v + '</b></span>').join('');
  foot.innerHTML = ''; const b = document.createElement('b'); b.textContent = done ? 'Outcome: ' : 'Now: '; foot.append(b, document.createTextNode(done ? M.summary + ' ' : e.note));
  if (done) { const w = document.createElement('b'); w.textContent = 'Only ' + T.touchShare + ' % of the elapsed time was anyone working on the claim.'; foot.append(w); }
  foot.style.background = done ? (M.paid ? '#e6f4ec' : '#fbefe8') : '#fafbfc';
}

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  seek(t) { lastT = t; const key = Math.round(t * 12) + '|' + (t >= M.duration - 0.05); if (key !== lastKey) { lastKey = key; render(); } },
  mount(root, params) {
    M = model(params); lastT = 0; lastKey = '';
    const narrow = root.clientWidth < 640;
    wrap = document.createElement('div'); wrap.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;background:#fff;font-family:system-ui,sans-serif;color:#1d2433';
    head = document.createElement('div'); head.style.cssText = 'flex:none;padding:8px 14px 2px;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:flex-start';
    head.innerHTML = '<div style="flex:1 1 280px;min-width:0"><div style="font-size:14px;font-weight:600">One claim, four desks · where the days go</div><div class="sub" style="font-size:12px;line-height:1.35;color:#5b6475;min-height:16px"></div></div><div class="stats" style="flex:0 1 auto;text-align:right"></div>';
    box = document.createElement('div'); box.style.cssText = 'position:relative;flex:1;min-height:0;padding:0 8px';
    const canvas = document.createElement('canvas'); box.append(canvas);
    foot = document.createElement('div'); foot.style.cssText = 'flex:none;height:' + (narrow ? 60 : 66) + 'px;box-sizing:border-box;padding:7px 14px;font:13px/1.4 system-ui,sans-serif;border-top:1px solid #e3e7ee;background:#fafbfc;overflow:auto';
    wrap.append(head, box, foot); root.append(wrap);
    chart = new Chart(canvas, { type: 'bar', plugins: [labelsPlugin], data: { labels: [], datasets: [] }, options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: false, parsing: { xAxisKey: 'x', yAxisKey: 'y' },
      scales: { x: { min: 0, max: 15, title: { display: true, text: 'business days after the visit', color: C.muted, font: { size: 11 } }, ticks: { color: C.muted, font: { size: 11 }, stepSize: 1, callback: v => v % 5 === 0 ? String(v) : '' }, grid: { color: '#eef1f5' } },
        y: { ticks: { color: C.ink, font: { size: narrow ? 10 : 11.5 }, autoSkip: false }, grid: { display: false } } },
      plugins: { legend: { display: true, position: 'top', align: 'end', labels: { boxWidth: 12, font: { size: 11 }, color: C.muted } },
        tooltip: { callbacks: { label: ctx => { const p = ctx.raw; return p ? p.ev.label + ': day ' + p.ev.start + ' to ' + p.ev.end + ' (' + fmtD(p.ev.dur) + ')' : ''; } } } }
    } });
    render();
    ro = new ResizeObserver(() => requestAnimationFrame(() => { if (chart) { chart.resize(); render(); } })); ro.observe(box);
  },
  update(params) { M = model(params); lastT = 0; lastKey = ''; render(); },
  destroy() { if (ro) ro.disconnect(); if (chart) chart.destroy(); if (wrap) wrap.remove(); chart = null; M = null; }
};

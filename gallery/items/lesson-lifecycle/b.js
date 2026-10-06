// Chart.js Gantt timeline: one row per place, a floating bar per step at the real minutes it takes, revealed up to the
// playback clock. The other way out of Export lesson is drawn as pale bars on the same axis, so the trade shows in one
// picture: the import is over in minutes, the publish waits most of an hour on the test run, then reaches everyone.
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d', bad: '#b42318', pale: '#e3e7ee', paleLine: '#c9cfda' };
let M = null, chart = null, wrap = null, head = null, box = null, foot = null, ro = null, lastT = 0, lastKey = '';
const fmtMin = v => v == null ? '—' : v < 10 ? v.toFixed(1) + ' min' : Math.round(v) + ' min';
const MINW = 0.7;   // so a 0.2-minute step still shows as a sliver; the label carries the real minutes

function current() { let i = 0; M.steps.forEach((s, j) => { if (s.t <= lastT + 1e-6) i = j; }); return i; }
const labelsPlugin = { id: 'stepLabels', afterDatasetsDraw(c) {
  const g = c.ctx, narrow = wrap.clientWidth < 600, x = c.scales.x, area = c.chartArea;
  g.save(); g.font = (narrow ? '500 10px' : '500 11px') + ' system-ui, sans-serif'; g.textBaseline = 'middle';
  // per lane, names that do not fit inside their bar are joined and written after the lane's last bar
  const lanes = {}; let failAt = null;
  c.data.datasets.forEach((ds, di) => c.getDatasetMeta(di).data.forEach((bar, i) => { const p = ds.data[i]; if (p && p.s.id !== 'outcome') (lanes[p.y + '|' + ds.label] = lanes[p.y + '|' + ds.label] || []).push({ p, bar, faint: ds.faint }); }));
  for (const items of Object.values(lanes)) {
    const spill = []; let lastX = 0, y = 0, faint = false;
    for (const { p, bar, faint: f } of items) {
      const x0 = x.getPixelForValue(p.x[0]), x1 = x.getPixelForValue(p.x[1]), name = p.s.title, tw = g.measureText(name).width;
      y = bar.y; faint = f; lastX = Math.max(lastX, x1);
      if (p.s.id === 'fail') { failAt = { x: x1, y: bar.y }; continue; }
      if (x1 - x0 >= tw + 10) { g.fillStyle = f ? '#8a93a3' : '#fff'; g.textAlign = 'center'; g.fillText(name, (x0 + x1) / 2, bar.y); } else spill.push(name);
    }
    if (spill.length) { const t = spill.join(', '); g.fillStyle = faint ? '#8a93a3' : C.ink; g.textAlign = 'left'; if (lastX + 6 + g.measureText(t).width < area.right) g.fillText(t, lastX + 6, y); else { g.textAlign = 'right'; g.fillText(t, x.getPixelForValue(items[0].p.x[0]) - 6, y); } }
  }
  // a failed run: the site row stays empty, and says so
  if (failAt) {
    const siteY = c.scales.y.getPixelForValue(c.data.labels[c.data.labels.length - 1]), t = narrow ? 'nothing deployed' : 'nothing deployed: the site keeps its last good version';
    g.fillStyle = C.bad; g.font = '600 ' + (narrow ? 10 : 11.5) + 'px system-ui, sans-serif'; g.textAlign = 'right'; g.fillText('✗ ' + t, Math.min(area.right - 4, failAt.x + 4), siteY);
  }
  // the minute the lesson first shows
  if (M.shownAtMin != null && current() >= M.steps.length - 1) {
    const px = x.getPixelForValue(M.shownAtMin);
    g.strokeStyle = C.good; g.lineWidth = 2; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(px, area.top); g.lineTo(px, area.bottom); g.stroke(); g.setLineDash([]);
    g.fillStyle = C.good; g.font = '600 11px system-ui, sans-serif'; g.textAlign = px > area.right - 120 ? 'right' : 'left';
    g.fillText('shows after ' + fmtMin(M.shownAtMin), px + (px > area.right - 120 ? -6 : 6), area.top + 8);
  }
  g.restore();
} };
function render() {
  if (!chart) return;
  const k = current(), done = lastT >= M.duration - 0.05, narrow = wrap.clientWidth < 600, st = M.steps[k];
  const label = id => { const l = M.lanes.find(x => x.id === id).label; return narrow ? l.replace('Lab on claude.ai', 'Lab').replace('Your computer', 'Computer').replace('GitHub Actions', 'Actions').replace('Published site', 'Site') : l; };
  const pt = s => ({ x: [s.startMin, Math.max(s.endMin, s.startMin + MINW)], y: label(s.lane), s });
  const shown = M.steps.filter((s, i) => i <= k && s.id !== 'outcome' && s.min > 0);
  chart.data.labels = M.lanes.map(l => label(l.id));
  chart.data.datasets = [
    { label: M.route === 'import' ? 'Import it' : 'Publish to the gallery', faint: false, grouped: false, borderSkipped: false, borderRadius: 4, barPercentage: 0.6, categoryPercentage: 0.9, data: shown.map(pt),
      backgroundColor: ctx => { const p = ctx.raw; return !p ? C.good : (!done && p.s === st) ? C.accent : C.good; } },
    { label: 'The other way (' + (M.route === 'import' ? 'publish, green run' : 'import') + ')', faint: true, grouped: false, borderSkipped: false, borderRadius: 4, barPercentage: 0.6, categoryPercentage: 0.9,
      data: M.other.steps.map(pt), backgroundColor: C.pale, borderColor: C.paleLine, borderWidth: 1, borderDash: [4, 3] }
  ];
  if (!M.ciPass && M.route === 'publish' && k >= M.steps.findIndex(s => s.id === 'fail')) chart.data.datasets[0].data.push({ x: [M.steps.find(s => s.id === 'ci').endMin, M.steps.find(s => s.id === 'ci').endMin + MINW], y: label('ci'), s: M.steps.find(s => s.id === 'fail') });
  chart.data.datasets[0].backgroundColor = ctx => { const p = ctx.raw; return !p ? C.good : p.s.bad ? C.bad : (!done && p.s === st) ? C.accent : C.good; };
  chart.options.scales.x.max = Math.ceil((Math.max(M.publishMinutes, M.totalMinutes) + 2) / 10) * 10;
  chart.options.scales.y.ticks.font.size = narrow ? 10 : 11.5;
  chart.options.plugins.legend.display = !narrow;
  chart.update('none');
  head.querySelector('.sub').textContent = done ? M.summary : st.title + ': ' + st.note;
  const stats = narrow ? [['Minute', st.endMin.toFixed(1)]] : [['Minute', st.endMin.toFixed(1)], ['Import shows after', fmtMin(M.importMinutes)], ['Green publish after', fmtMin(M.publishMinutes)]];
  head.querySelector('.stats').innerHTML = stats.map(([kk, v]) => '<span style="display:inline-block;margin:0 0 4px 6px;padding:3px 8px;border-radius:8px;background:#f4f6f9;font-size:11.5px;color:#5b6475;white-space:nowrap">' + kk + ' <b style="color:#1d2433">' + v + '</b></span>').join('');
  foot.innerHTML = '';
  const b = document.createElement('b'), reached = done || k === M.steps.length - 1;
  b.textContent = reached ? (M.visible ? '✓ ' : '✗ ') + M.viewerLabel + ': ' : 'Now: ';
  foot.append(b, document.createTextNode(reached ? M.steps[M.steps.length - 1].note : st.note));
  foot.style.background = reached ? (M.visible ? '#e9f5ee' : '#fdecea') : '#fafbfc';
}

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  seek(t) { lastT = t; const key = current() + '|' + (t >= M.duration - 0.05); if (key !== lastKey) { lastKey = key; render(); } },
  mount(root, params) {
    M = model(params); lastT = 0; lastKey = '';
    wrap = document.createElement('div'); wrap.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;background:#fff;font-family:system-ui,sans-serif;color:#1d2433';
    head = document.createElement('div'); head.style.cssText = 'flex:none;padding:8px 14px 2px;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:flex-start';
    head.innerHTML = '<div style="flex:1 1 300px;min-width:0"><div style="font-size:14px;font-weight:600">From the lab to the gallery · where the minutes go</div><div class="sub" style="font-size:12px;line-height:1.35;color:#5b6475;min-height:32px"></div></div><div class="stats" style="flex:0 1 auto;text-align:right"></div>';
    box = document.createElement('div'); box.style.cssText = 'position:relative;flex:1;min-height:0;padding:0 8px';
    const canvas = document.createElement('canvas'); canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', 'Gantt timeline of the steps in real minutes'); box.append(canvas);
    foot = document.createElement('div'); foot.style.cssText = 'flex:none;height:62px;box-sizing:border-box;padding:7px 14px;font:13px/1.4 system-ui,sans-serif;border-top:1px solid #e3e7ee;background:#fafbfc;overflow:auto';
    wrap.append(head, box, foot); root.append(wrap);
    chart = new Chart(canvas, { type: 'bar', plugins: [labelsPlugin], data: { labels: [], datasets: [] }, options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: false, parsing: { xAxisKey: 'x', yAxisKey: 'y' },
      scales: { x: { min: 0, max: 60, title: { display: true, text: 'real minutes', color: C.muted, font: { size: 11 } }, ticks: { color: C.muted, font: { size: 11 }, stepSize: 10 }, grid: { color: '#eef1f5' } },
        y: { ticks: { color: C.ink, font: { size: 11.5 }, autoSkip: false }, grid: { display: false } } },
      plugins: { legend: { display: true, position: 'top', align: 'end', labels: { boxWidth: 12, font: { size: 11 }, color: C.muted } },
        tooltip: { callbacks: { label: ctx => { const p = ctx.raw; return p ? p.s.title + ': ' + fmtMin(p.s.min) + ' (minute ' + p.s.startMin + ' to ' + p.s.endMin + ')' : ''; } } } }
    } });
    render();
    ro = new ResizeObserver(() => requestAnimationFrame(() => { if (chart) { chart.resize(); render(); } })); ro.observe(box);
  },
  update(params) { M = model(params); lastT = 0; lastKey = ''; render(); },
  destroy() { if (ro) ro.disconnect(); if (chart) chart.destroy(); if (wrap) wrap.remove(); chart = null; M = null; }
};

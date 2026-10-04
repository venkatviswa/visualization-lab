// Chart.js: the same run as a timeline. One row per workflow step, a floating bar per run (the branch run and, after a
// merge, the main run), coloured by outcome, revealed up to the playback clock with a "now" line. Shows where the minutes go.
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d', bad: '#b42318', soft: '#f4f6f9' };
let M = null, chart = null, wrap = null, head = null, foot = null, canvasBox = null, nowSec = 0, lastKey = '', ro = null;
const fmt = s => s >= 60 ? Math.floor(s / 60) + ' min ' + String(Math.round(s % 60)).padStart(2, '0') + ' s' : Math.round(s) + ' s';

function runs() {
  // group the model's step events into runs: a new 'event' (push received) starts a run
  const out = []; let cur = null;
  M.events.forEach(e => {
    if (e.kind === 'event') { cur = { label: out.length ? 'Run 2 · main' : 'Run 1 · ' + (M.target === 'main' ? 'main' : 'branch'), steps: {} }; out.push(cur); }
    if (cur && e.step && e.kind === 'run') cur.steps[e.step] = { start: e.realMs / 1000, end: e.realMs / 1000 + M.steps.find(s => s.id === e.step).dur, status: null };
  });
  // outcome per step per run: everything up to the failing step passed, the failing one failed; the final run's statuses come from the model
  out.forEach((r, k) => { const last = k === out.length - 1; Object.keys(r.steps).forEach(id => { const final = M.steps.find(s => s.id === id).status; r.steps[id].status = last ? final : (id === 'unit' && M.fails ? 'failed' : 'passed'); }); });
  return out;
}
function clockAt(t) {
  let e = M.events[0]; for (const ev of M.events) if (ev.start <= t + 1e-6) e = ev;
  const nx = M.events[e.i + 1], gap = nx ? nx.realMs - e.realMs : 0, u = Math.max(0, Math.min(1, (t - e.start) / e.dur));
  return { e, sec: (e.realMs + (e.kind === 'run' && gap > 0 ? gap * u : 0)) / 1000 };
}
const nowLine = { id: 'nowLine', afterDatasetsDraw(c) {
  const x = c.scales.x.getPixelForValue(nowSec), { top, bottom } = c.chartArea, g = c.ctx;
  if (x < c.chartArea.left || x > c.chartArea.right) return;
  g.save(); g.strokeStyle = C.accent; g.lineWidth = 2; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(x, top); g.lineTo(x, bottom); g.stroke();
  g.setLineDash([]); g.fillStyle = C.accent; g.font = '600 11px system-ui, sans-serif'; g.textAlign = x > c.chartArea.right - 80 ? 'right' : 'left'; g.fillText('now · ' + fmt(nowSec), x + (x > c.chartArea.right - 80 ? -6 : 6), top + 12); g.restore();
} };

function data() {
  const rs = runs(), labels = M.steps.map(s => s.name), colors = { passed: C.good, failed: C.bad, skipped: '#c3cad6', running: C.accent };
  const datasets = rs.map((r, k) => ({
    label: r.label, borderSkipped: false, borderRadius: 4, barPercentage: rs.length > 1 ? 0.8 : 0.6, categoryPercentage: 0.8,
    data: M.steps.map(s => { const st = r.steps[s.id]; if (!st || st.start > nowSec) return null; return [st.start, Math.min(st.end, nowSec)]; }),
    backgroundColor: M.steps.map(s => { const st = r.steps[s.id]; if (!st) return colors.skipped; return nowSec < st.end ? colors.running : colors[st.status]; }),
    borderColor: k ? C.ink : 'transparent', borderWidth: k ? 1 : 0
  }));
  return { labels, datasets, runs: rs };
}
function render() {
  const d = data(), narrow = wrap.clientWidth < 640;
  chart.data.labels = d.labels; chart.data.datasets = d.datasets;
  const maxSec = Math.max(60, Math.ceil(M.totalMs / 1000 / 60) * 60);
  chart.options.scales.x.max = maxSec;
  chart.options.plugins.legend.display = d.runs.length > 1;
  chart.update('none');
  const { e } = clockAt(lastT), sc = M.scenes[e.scene], done = lastT >= M.duration - 0.05, last = sc.i === M.scenes.length - 1;
  head.querySelector('.sub').textContent = done ? M.summary : 'Scene ' + (sc.i + 1) + ' of ' + M.scenes.length + ' · ' + sc.title + (narrow ? '' : ': ' + sc.caption);
  const vals = Object.values(e.snap.steps), np = vals.filter(v => v === 'passed').length, nf = vals.filter(v => v === 'failed').length, ns = vals.filter(v => v === 'skipped').length;
  head.querySelector('.stats').innerHTML = [['Elapsed', fmt(e.realMs / 1000)], ['Steps', np + ' ✓ ' + nf + ' ✕ ' + ns + ' skipped'], ['Install', M.installSeconds + ' s (' + (M.warm ? 'warm' : 'cold') + ')'], ['Server', e.snap.deployed ? 'new build' : 'previous build']]
    .map(([k, v]) => '<span style="display:inline-block;margin:0 0 4px 6px;padding:3px 8px;border-radius:8px;background:#f4f6f9;font-size:11.5px;color:#5b6475;white-space:nowrap">' + k + ' <b style="color:#1d2433">' + v + '</b></span>').join('');
  foot.innerHTML = ''; const b = document.createElement('b'); b.textContent = last ? 'Outcome: ' : 'Now: '; foot.append(b, document.createTextNode(last ? M.outcome + ' ' : e.note));
  if (last) { const w = document.createElement('b'); w.textContent = M.soWhat; foot.append(w); }
  foot.style.background = last ? (M.deployed ? '#e6f4ec' : '#fbefe8') : '#fafbfc';
}
let lastT = 0;

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  seek(t) {
    lastT = t; const { e, sec } = clockAt(t); nowSec = sec;
    const key = e.i + '|' + Math.round(sec) + '|' + (t >= M.duration - 0.05);
    if (key !== lastKey) { lastKey = key; render(); }
  },
  mount(root, params) {
    M = model(params); lastT = 0; nowSec = 0; lastKey = '';
    wrap = document.createElement('div'); wrap.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;background:#fff;font-family:system-ui,sans-serif;color:#1d2433';
    head = document.createElement('div'); head.style.cssText = 'flex:none;padding:8px 14px 2px;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:flex-start';
    head.innerHTML = '<div style="flex:1 1 280px;min-width:0"><div style="font-size:14px;font-weight:600">One push, one workflow, one deploy · where the minutes go</div><div class="sub" style="font-size:12px;line-height:1.35;color:#5b6475;min-height:32px"></div></div><div class="stats" style="flex:0 1 auto;text-align:right"></div>';
    canvasBox = document.createElement('div'); canvasBox.style.cssText = 'position:relative;flex:1;min-height:0;padding:0 8px';
    const canvas = document.createElement('canvas'); canvasBox.append(canvas);
    foot = document.createElement('div'); foot.style.cssText = 'flex:none;height:66px;box-sizing:border-box;padding:7px 14px;font:13px/1.4 system-ui,sans-serif;border-top:1px solid #e3e7ee;background:#fafbfc;overflow:auto';
    wrap.append(head, canvasBox, foot); root.append(wrap);
    chart = new Chart(canvas, { type: 'bar', plugins: [nowLine], data: { labels: [], datasets: [] }, options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: false,
      scales: { x: { min: 0, max: 600, title: { display: true, text: 'seconds after git push', color: C.muted, font: { size: 11 } }, ticks: { color: C.muted, font: { size: 11 }, stepSize: 60, callback: v => v === 0 ? '0' : v % 60 === 0 ? (v / 60) + ' min' : '' }, grid: { color: '#eef1f5' } },
        y: { ticks: { color: C.ink, font: { size: root.clientWidth < 640 ? 10 : 11.5 }, autoSkip: false }, grid: { display: false } } },
      plugins: { legend: { display: false, position: 'top', labels: { boxWidth: 12, font: { size: 11 }, color: C.muted } },
        tooltip: { callbacks: { label: ctx => { const r = ctx.raw; return r ? ctx.dataset.label + ': ' + fmt(r[0]) + ' → ' + fmt(r[1]) : ''; } } } }
    } });
    render();
    ro = new ResizeObserver(() => requestAnimationFrame(() => { if (chart) { chart.options.scales.y.ticks.font.size = wrap.clientWidth < 640 ? 10 : 11.5; chart.resize(); render(); } })); ro.observe(canvasBox);
  },
  update(params) { M = model(params); lastT = 0; nowSec = 0; lastKey = ''; render(); },
  destroy() { if (ro) ro.disconnect(); if (chart) chart.destroy(); if (wrap) wrap.remove(); chart = null; M = null; }
};

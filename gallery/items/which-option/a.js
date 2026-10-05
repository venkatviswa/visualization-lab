// Chart.js radar: one polygon per option over the five criteria. The host clock reveals the criteria one at a time,
// then applies the weights (the polygon is redrawn on the weighted axes), then the verdict is written in the header.
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d', bad: '#b42318', soft: '#f4f6f9' };
const OPT = { native: '#2b59c3', ipaas: '#0f766e', custom: '#6d4bbf', manual: '#b4530f' };
let M = null, chart = null, wrap = null, head = null, foot = null, box = null, ro = null, lastT = 0, lastKey = '';
const st = id => M.steps.find(s => s.id === id).t;
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

function render() {
  if (!chart) return;
  const narrow = wrap.clientWidth < 560, t = lastT, done = t >= M.duration - 0.05;
  const phase = t >= st('verdict') ? 2 : t >= st('weights') ? 1 : 0, revealed = phase >= 1 ? 5 : Math.min(5, Math.floor(t / (st('weights') / 5)) + 1);
  const w = M.profile.w, wmax = Math.max(...w);
  chart.data.labels = M.criteria.map((c, i) => (narrow ? c.short : c.label) + (phase >= 1 && w[i] !== 1 ? ' ×' + w[i] : ''));
  chart.data.datasets = M.options.map(o => ({
    label: o.label + (phase >= 1 ? ' · ' + o.score : ''), data: o.s.map((v, i) => i < revealed ? (phase >= 1 ? v * w[i] / wmax : v) : null),
    borderColor: OPT[o.id], backgroundColor: rgba(OPT[o.id], phase >= 2 && o.id === M.winner ? 0.28 : 0.1), borderWidth: phase >= 2 && o.id === M.winner ? 3 : 1.8,
    pointBackgroundColor: OPT[o.id], pointRadius: narrow ? 2.5 : 3.5, spanGaps: false
  }));
  chart.options.scales.r.max = 10; chart.options.scales.r.ticks.display = !narrow;
  chart.options.scales.r.pointLabels.font.size = narrow ? 10 : 11.5;
  chart.options.plugins.legend.position = narrow ? 'bottom' : 'right';
  chart.update('none');
  let k = 0; M.steps.forEach((s, i) => { if (s.t <= t + 1e-6) k = i; });
  const s = M.steps[k];
  head.querySelector('.sub').textContent = done ? M.summary : s.title + ': ' + s.note;
  const win = M.options.find(o => o.id === M.winner);
  const stats = narrow ? [['Profile', M.profile.label], ['Leader', win.label.split(' ')[0] + ' ' + win.score]] : [['Profile', M.profile.label], ['Leader', win.label + ' · ' + win.score], ['Margin', M.margin + ' pts'], ['Target', String(M.target)]];
  head.querySelector('.stats').innerHTML = stats.map(([kk, v]) => '<span style="display:inline-block;margin:0 0 4px 6px;padding:3px 8px;border-radius:8px;background:#f4f6f9;font-size:11.5px;color:#5b6475;white-space:nowrap">' + kk + ' <b style="color:#1d2433">' + v + '</b></span>').join('');
  foot.textContent = phase >= 1 ? 'Weighted axes: a criterion with weight ' + wmax + ' keeps its full length, the others shrink in proportion, so the area now reflects the profile. The legend shows the weighted score.' : 'Raw scores, 1 to 10, higher is better on every axis. Criteria appear one at a time; notice that no polygon is largest everywhere.';
}

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  seek(t) { lastT = t; const key = Math.round(t * 4) + '|' + (t >= M.duration - 0.05); if (key !== lastKey) { lastKey = key; render(); } },
  mount(root, params) {
    M = model(params); lastT = 0; lastKey = '';
    wrap = document.createElement('div'); wrap.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;background:#fff;font-family:system-ui,sans-serif;color:#1d2433';
    head = document.createElement('div'); head.style.cssText = 'flex:none;padding:8px 14px 2px;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:flex-start';
    head.innerHTML = '<div style="flex:1 1 280px;min-width:0"><div style="font-size:14px;font-weight:600">Which option? · a radar per option</div><div class="sub" style="font-size:12px;line-height:1.35;color:#5b6475;min-height:32px"></div></div><div class="stats" style="flex:0 1 auto;text-align:right"></div>';
    box = document.createElement('div'); box.style.cssText = 'position:relative;flex:1;min-height:0;padding:0 8px';
    const canvas = document.createElement('canvas'); box.append(canvas);
    foot = document.createElement('div'); foot.style.cssText = 'flex:none;height:48px;box-sizing:border-box;padding:6px 14px;font:12px/1.4 system-ui,sans-serif;color:#5b6475;border-top:1px solid #e3e7ee;background:#fafbfc;overflow:auto';
    wrap.append(head, box, foot); root.append(wrap);
    chart = new Chart(canvas, { type: 'radar', data: { labels: [], datasets: [] }, options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      scales: { r: { min: 0, max: 10, ticks: { stepSize: 2, color: C.muted, font: { size: 10 }, backdropColor: 'transparent' }, grid: { color: '#e3e7ee' }, angleLines: { color: '#e3e7ee' }, pointLabels: { color: C.ink, font: { size: 11.5, weight: '600' } } } },
      plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 }, color: C.ink } }, tooltip: { callbacks: { label: ctx => ctx.dataset.label.split(' · ')[0] + ': ' + (ctx.raw === null ? '' : ctx.raw.toFixed(1)) } } }
    } });
    render();
    ro = new ResizeObserver(() => requestAnimationFrame(() => { if (chart) { chart.resize(); render(); } })); ro.observe(box);
  },
  update(params) { M = model(params); lastT = 0; lastKey = ''; render(); },
  destroy() { if (ro) ro.disconnect(); if (chart) chart.destroy(); if (wrap) wrap.remove(); chart = null; M = null; }
};

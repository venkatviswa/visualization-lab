// Chart.js: three regions as a standard multi-line chart with a legend, title and tooltips.
// The fastest-growing region (from the model) gets a thicker line and a legend tag. seek(t) reveals months in order.
const COLORS = ['#2b59c3', '#0f766e', '#b4530f'];
let chart = null, wrap = null, M = null, T = 0, onResize = null;

const pct = v => (v >= 0 ? '+' : '') + Math.round(v) + '%';
function wrapText(s, px) {
  const max = Math.max(20, Math.floor(px / 6.4)), out = [];
  let line = '';
  for (const w of s.split(' ')) { if (line && (line + ' ' + w).length > max) { out.push(line); line = w; } else line = line ? line + ' ' + w : w; }
  return out.concat(line);
}
function values(r) { return M.view === 'monthly' ? r.smooth : r.change; }
function range() {
  const all = M.regions.flatMap(r => M.shown.map(i => values(r)[i]));
  const lo = Math.min(...all), hi = Math.max(...all);
  if (M.view === 'monthly') return { min: 0, max: Math.ceil(hi * 1.08 / 20) * 20 };
  return { min: Math.min(-10, Math.floor(lo / 10) * 10), max: Math.ceil((hi + 4) / 10) * 10 };
}
function build() {
  const narrow = wrap.clientWidth < 560;
  chart.data.labels = M.shown.map(i => narrow ? M.months[i].short + ' ’' + M.months[i].label.slice(-2) : M.months[i].label);
  chart.data.datasets = M.regions.map((r, k) => ({
    label: r.short,
    data: [], borderColor: COLORS[k], backgroundColor: COLORS[k],
    borderWidth: k === M.fastest ? 3.5 : 2, pointRadius: k === M.fastest ? 2.5 : 1.5, pointHoverRadius: 5, cubicInterpolationMode: 'monotone'
  }));
  const yr = range(), s = chart.options.scales;
  s.y.min = yr.min; s.y.max = yr.max;
  s.y.title.text = M.view === 'monthly' ? 'New hires per month' + (M.window > 1 ? ' (' + M.windowLabel + ')' : '') : 'Change vs same month last year (%)';
  s.y.ticks.callback = v => M.view === 'monthly' ? v : (v > 0 ? '+' : '') + v + '%';
  chart.options.plugins.title.text = M.view === 'monthly' ? 'Monthly new hires by region, 2024–2025' : 'Hires vs the same month a year earlier, 2025';
  chart.options.plugins.legend.labels.font = { size: narrow ? 11 : 12 };
}
function draw() {
  const done = T >= M.annotateAt;
  M.regions.forEach((r, k) => { chart.data.datasets[k].label = r.short + (done && k === M.fastest ? ' (fastest growth, ' + pct(r.growth) + ')' : ''); });
  M.regions.forEach((r, k) => { chart.data.datasets[k].data = M.shown.map((i, j) => T >= M.revealAt[j] ? +values(r)[i].toFixed(1) : null); });
  const last = M.revealAt.filter(a => a <= T).length - 1;
  const sub = done ? M.summary
    : last < 0 ? 'Months appear in order. Hover a point for exact numbers.'
    : 'Up to ' + M.months[M.shown[last]].label + '. Which line is climbing fastest?';
  chart.options.plugins.subtitle.text = wrapText(sub, wrap.clientWidth - 24);
  chart.options.plugins.subtitle.color = done ? '#1d2433' : '#5b6475';
  chart.update('none');
}

window.lab = {
  get duration() { return M ? M.duration : 12; },
  get markers() { return M ? M.markers : []; },
  seek(t) { T = t; draw(); },
  mount(root, params) {
    M = model(params); T = 0;
    wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;inset:0;padding:8px 12px 6px';
    const canvas = document.createElement('canvas');
    canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', 'Line chart of monthly new hires for three regions');
    wrap.appendChild(canvas); root.appendChild(wrap);
    Chart.defaults.font.family = 'system-ui, sans-serif';
    Chart.defaults.color = '#5b6475';
    chart = new Chart(canvas, {
      type: 'line',
      data: { labels: [], datasets: [] },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false, spanGaps: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 12, font: { size: 11 } }, border: { color: '#dbe0e8' } },
          y: { grid: { color: '#eef1f5' }, border: { display: false }, title: { display: true, text: '', font: { size: 12 } }, ticks: { font: { size: 11 } } }
        },
        plugins: {
          title: { display: true, align: 'start', color: '#1d2433', font: { size: 14, weight: '600' }, padding: { top: 2, bottom: 2 }, text: '' },
          subtitle: { display: true, align: 'start', font: { size: 12.5 }, padding: { bottom: 8 }, text: '' },
          legend: { position: 'top', align: 'start', labels: { boxWidth: 16, boxHeight: 3, padding: 12 } },
          tooltip: { callbacks: { label: c => ' ' + M.regions[c.datasetIndex].short + ': ' + (M.view === 'monthly' ? Math.round(c.parsed.y) + ' hires' : pct(c.parsed.y)) } }
        }
      }
    });
    build(); draw();
    onResize = () => { if (chart) { build(); draw(); } };
    addEventListener('resize', onResize);
  },
  update(params) { M = model(params); T = 0; build(); draw(); },
  destroy() { removeEventListener('resize', onResize); if (chart) chart.destroy(); if (wrap) wrap.remove(); chart = null; wrap = null; M = null; }
};

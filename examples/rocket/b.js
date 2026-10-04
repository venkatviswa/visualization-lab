// Chart.js: speed and escape speed (left axis) and altitude (right axis) against time.
// The host owns playback; seek(t) reveals the run up to that moment.
let chart = null, wrap = null, M = null, simT = 0;
const PLAY = 12;

function pts(key, scale, upTo) {
  const out = [];
  for (const f of M.frames) { if (f.t > upTo) break; out.push({ x: f.t, y: f[key] / scale }); }
  return out;
}
function title() {
  const f = M.frames.find(x => x.t >= simT) || M.frames[M.frames.length - 1];
  const end = simT >= M.tEnd - 1e-6 || (M.crossT !== null && simT >= M.crossT);
  return [(end || M.outcome === 'no-liftoff') ? M.summary : 'Watch the blue line against the dashed escape speed',
    't = ' + f.t.toFixed(0) + ' s · speed ' + (f.v / 1000).toFixed(2) + ' km/s · altitude ' + Math.round(f.h / 1000).toLocaleString() + ' km'];
}
function draw() {
  chart.data.datasets[0].data = pts('v', 1000, simT);
  chart.data.datasets[2].data = pts('h', 1000, simT);
  chart.options.plugins.title.text = title();
  chart.update('none');
}
function build() {
  chart.data.datasets[1].data = pts('vEsc', 1000, Infinity);
  chart.options.scales.x.max = M.tEnd;
  chart.options.scales.v.max = Math.ceil(Math.max(M.vMax, M.frames[0].vEsc) / 1000 * 1.08);
  chart.options.scales.v.min = Math.floor(Math.min(0, M.vMin) / 1000);
  chart.options.scales.h.max = Math.ceil(Math.max(1, M.maxH / 1000) * 1.05 / 500) * 500;
}

window.lab = {
  get duration() { return PLAY; },
  seek(t) { simT = Math.max(0, Math.min(1, t / PLAY)) * M.tEnd; draw(); },
  mount(root, params) {
    M = model(params); simT = 0;
    wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;inset:0;padding:6px 10px 4px';
    const canvas = document.createElement('canvas');
    wrap.appendChild(canvas); root.appendChild(wrap);
    Chart.defaults.font.family = 'system-ui, sans-serif';
    Chart.defaults.color = '#5b6475';
    chart = new Chart(canvas, {
      type: 'line',
      data: { datasets: [
        { label: 'Speed (km/s)', data: [], borderColor: '#2b59c3', backgroundColor: '#2b59c3', borderWidth: 2.5, pointRadius: 0, yAxisID: 'v' },
        { label: 'Escape speed (km/s)', data: [], borderColor: '#c2410c', backgroundColor: '#c2410c', borderDash: [6, 4], borderWidth: 1.5, pointRadius: 0, yAxisID: 'v' },
        { label: 'Altitude (km)', data: [], borderColor: '#94a3b8', backgroundColor: '#94a3b8', borderWidth: 1.5, pointRadius: 0, yAxisID: 'h' }
      ] },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false, parsing: false,
        interaction: { mode: 'nearest', axis: 'x', intersect: false },
        scales: {
          x: { type: 'linear', min: 0, title: { display: true, text: 'Time since ignition (s)' }, grid: { color: '#eef1f5' } },
          v: { type: 'linear', position: 'left', title: { display: true, text: 'Speed (km/s)' }, grid: { color: '#eef1f5' } },
          h: { type: 'linear', position: 'right', min: 0, title: { display: true, text: 'Altitude (km)' }, grid: { drawOnChartArea: false } }
        },
        plugins: {
          title: { display: true, color: '#1d2433', font: { size: 13, weight: '600' }, text: '' },
          legend: { position: 'bottom', labels: { boxWidth: 18, boxHeight: 2 } }
        }
      }
    });
    build(); draw();
  },
  update(params) { M = model(params); simT = 0; build(); draw(); },
  destroy() { if (chart) chart.destroy(); if (wrap) wrap.remove(); chart = null; wrap = null; M = null; }
};

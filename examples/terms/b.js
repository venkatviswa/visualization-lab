// Chart.js: the same terms as a ranked horizontal bar chart, largest first.
// seek(t) reveals bars in importance order, matching the word cloud.
const COLORS = ['#2b59c3', '#0f766e', '#b4530f'], MUTED = '#c3c9d4';
let chart = null, wrap = null, M = null, T = 0;

function colorOf(t) { return M.focusGroup && !t.highlighted ? MUTED : COLORS[t.groupIndex]; }
function draw() {
  const done = T >= M.terms[M.terms.length - 1].revealAt + 0.3;
  chart.data.labels = M.terms.map(t => t.text);
  chart.data.datasets[0].data = M.terms.map(t => T >= t.revealAt ? t.weight : null);
  chart.data.datasets[0].backgroundColor = M.terms.map(colorOf);
  chart.options.plugins.title.text = ['Key terms, ranked by importance', done ? M.summary : 'Bars appear from most to least important.'];
  chart.update('none');
}

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  seek(t) { T = t; draw(); },
  mount(root, params) {
    M = model(params); T = 0;
    wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;inset:0;padding:6px 12px 6px';
    const canvas = document.createElement('canvas');
    canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', 'Ranked bar chart of key terms by importance');
    wrap.appendChild(canvas); root.appendChild(wrap);
    Chart.defaults.font.family = 'system-ui, sans-serif';
    Chart.defaults.color = '#5b6475';
    chart = new Chart(canvas, {
      type: 'bar',
      data: { labels: [], datasets: [{ label: 'Importance', data: [], borderRadius: 3, barPercentage: 0.82, categoryPercentage: 0.9 }] },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: false,
        scales: {
          x: { min: 0, max: 10, ticks: { stepSize: 2 }, title: { display: true, text: 'Importance (1–10, illustrative)' }, grid: { color: '#eef1f5' } },
          y: { ticks: { color: '#1d2433', autoSkip: false, font: { size: 11.5 } }, grid: { display: false } }
        },
        plugins: {
          legend: { display: false },
          title: { display: true, align: 'start', color: '#1d2433', font: { size: 13, weight: '600' }, text: '' },
          tooltip: { callbacks: { label: c => { const t = M.terms[c.dataIndex]; return `${t.weight}/10 · ${t.group} · rank ${t.rank}`; } } }
        }
      }
    });
    draw();
  },
  update(params) { M = model(params); T = 0; draw(); },
  destroy() { if (chart) chart.destroy(); if (wrap) wrap.remove(); chart = null; wrap = null; M = null; }
};

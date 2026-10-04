// Chart.js: standard grouped bars, Team A vs Team B, with values printed on the bars.
// "Overall" shows one group (all deals); "By deal size" adds small and large deals next to it.
// seek(t) grows the bars, reveals the deal-size groups at the split step, and changes the caption per step.
const TEAM = ['#2b59c3', '#0f766e'];
let chart = null, wrap = null, M = null, T = 0, onResize = null;

const pc = v => (v * 100).toFixed(1) + '%';
function wrapText(s, px) {
  const max = Math.max(20, Math.floor(px / 6.5)), out = [];
  let line = '';
  for (const w of s.split(' ')) { if (line && (line + ' ' + w).length > max) { out.push(line); line = w; } else line = line ? line + ' ' + w : w; }
  return out.concat(line);
}
function stepAt(t) { let i = 0; M.steps.forEach((s, k) => { if (t >= s.start) i = k; }); return i; }
// Value labels above each bar (Chart.js has no built-in data labels)
const valueLabels = {
  id: 'valueLabels',
  afterDatasetsDraw(c) {
    const ctx = c.ctx; ctx.save(); ctx.fillStyle = '#1d2433'; ctx.textAlign = 'center'; ctx.font = '600 12px system-ui, sans-serif';
    c.data.datasets.forEach((ds, i) => c.getDatasetMeta(i).data.forEach((bar, j) => {
      const v = ds.data[j]; if (v == null || v <= 0) return;
      ctx.fillText((v * 100).toFixed(1) + '%', bar.x, bar.y - 6);
    }));
    ctx.restore();
  }
};
function cats() {
  const [A, B] = M.teams, mix = T >= M.steps[2].start, narrow = wrap.clientWidth < 560;
  const lab = (name, a, b) => mix ? [name, narrow ? `A ${a} · B ${b}` : `Team A ${a} deals · Team B ${b}`] : name;
  const all = lab('All deals', A.n, B.n);
  return M.view === 'overall' ? [{ key: 'overall', label: all }]
    : [{ key: 'small', label: lab('Small deals', A.nSmall, B.nSmall) }, { key: 'large', label: lab('Large deals', A.nLarge, B.nLarge) }, { key: 'overall', label: all }];
}
function draw() {
  const grow = Math.max(0, Math.min(1, T / 1.2)), split = T >= M.steps[1].start, done = T >= M.summaryAt;
  const cs = cats(), rate = (tm, k) => k === 'small' ? tm.rateSmall : k === 'large' ? tm.rateLarge : tm.overall;
  chart.data.labels = cs.map(c => c.label);
  M.teams.forEach((tm, i) => {
    chart.data.datasets[i].data = cs.map(c => c.key === 'overall' || split ? rate(tm, c.key) * grow : null);
  });
  const st = M.steps[stepAt(T)];
  const extra = T >= M.steps[3].start && !done ? ' Team B: ' + M.teams[1].formula + '.' : '';
  chart.options.plugins.title.text = 'Win rate by team' + (M.view === 'overall' ? ', all deals' : ' and deal size');
  chart.options.plugins.subtitle.text = wrapText(done ? M.summary : st.text + extra, wrap.clientWidth - 30);
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
    canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', 'Grouped bar chart of win rates for Team A and Team B');
    wrap.appendChild(canvas); root.appendChild(wrap);
    Chart.defaults.font.family = 'system-ui, sans-serif';
    Chart.defaults.color = '#5b6475';
    chart = new Chart(canvas, {
      type: 'bar',
      data: { labels: [], datasets: M.teams.map((tm, i) => ({ label: tm.name, data: [], backgroundColor: TEAM[i], borderRadius: 4, maxBarThickness: 90 })) },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        layout: { padding: { top: 6 } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#1d2433', font: { size: 12 } }, border: { color: '#dbe0e8' } },
          y: { min: 0, max: 1, grid: { color: '#eef1f5' }, border: { display: false }, ticks: { stepSize: 0.25, callback: v => Math.round(v * 100) + '%' },
            title: { display: true, text: 'Win rate (% of deals won)' } }
        },
        plugins: {
          title: { display: true, align: 'start', color: '#1d2433', font: { size: 14, weight: '600' }, padding: { top: 2, bottom: 2 }, text: '' },
          subtitle: { display: true, align: 'start', font: { size: 12.5 }, padding: { bottom: 8 }, text: '' },
          legend: { position: 'top', align: 'start', labels: { boxWidth: 12, boxHeight: 12, padding: 14 } },
          tooltip: { callbacks: { label: c => {
            const tm = M.teams[c.datasetIndex], k = cats()[c.dataIndex].key;
            const won = k === 'small' ? tm.winSmall : k === 'large' ? tm.winLarge : tm.wins, n = k === 'small' ? tm.nSmall : k === 'large' ? tm.nLarge : tm.n;
            return ` ${tm.name}: ${won} won of ${n} (${pc(won / n)})`;
          } } }
        }
      },
      plugins: [valueLabels]
    });
    draw();
    onResize = () => { if (chart) draw(); };
    addEventListener('resize', onResize);
  },
  update(params) { M = model(params); T = 0; draw(); },
  destroy() { removeEventListener('resize', onResize); if (chart) chart.destroy(); if (wrap) wrap.remove(); chart = null; wrap = null; M = null; }
};

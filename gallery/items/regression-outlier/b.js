// Chart.js: a standard scatter with the two fitted lines (without and with the outlier) and residual sticks.
// The host owns playback; seek(t) sets the chart data for that exact moment.
const INK = '#1d2433', MUTED = '#5b6475', ACC = '#2b59c3', HI = '#c2410c', TEAL = '#0f766e';
let chart = null, wrap = null, M = null, T = 0, ro = null;
const clamp = x => Math.max(0, Math.min(1, x)), ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const fmt = v => Math.round(v).toLocaleString('en-US');
function lines(s, maxW) { const ctx = chart.ctx; ctx.save(); ctx.font = '13px system-ui, sans-serif'; const fits = x => ctx.measureText(x).width <= maxW; const out = []; let cur = ''; for (const w of s.split(' ')) { if (!fits((cur + ' ' + w).trim()) && cur) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); } if (cur) out.push(cur); ctx.restore(); return out; }

function caption(step) {
  const o = M.outlier, inc = o.included;
  return ['12 learners: more practice hours, higher assessment scores.',
    'The least-squares line through these 12 points.',
    inc ? 'One more learner: ' + o.x + ' hours of practice but a score of only ' + o.y + '.' : 'An outlier at ' + o.x + ' hours (' + o.y + ' points) is left out of the fit.',
    inc ? 'Refit to all 13 points: the line tilts towards the outlier.' : 'The outlier is excluded, so the line stays where it is.',
    'Residuals of the fitted line. Total squared error: ' + fmt(M.fit.sse) + ' points²' + (inc ? ' (outlier ' + Math.round(M.outlierShare * 100) + '%).' : '.')][step];
}
function draw() {
  if (!chart || !M) return;
  const P = M.phases, t = T, o = M.outlier, d = chart.data.datasets;
  const step = t < P.clean[0] ? 0 : t < P.outlier[0] ? 1 : t < P.refit[0] ? 2 : t < P.squares[0] ? 3 : 4, done = t >= P.squares[1];
  const shown = M.points.filter((q, i) => t >= 0.1 + i * 0.12);
  d[0].data = shown.map(q => ({ x: q.x, y: q.y }));
  const oIn = t >= P.outlier[0];
  d[1].data = oIn ? [{ x: o.x, y: o.y }] : [];
  d[1].label = o.included ? 'Outlier' : 'Outlier (excluded)';
  d[1].backgroundColor = o.included ? HI : '#fff'; d[1].borderColor = o.included ? HI : MUTED;
  const lineIn = ease((t - P.clean[0]) / 1.4), rf = ease((t - P.refit[0] - 0.3) / 1.8), x2 = 14 * lineIn;
  const seg = (b, a, xe) => [{ x: 0, y: a }, { x: xe, y: a + b * xe }];
  const refitting = o.included && t >= P.refit[0];
  d[2].data = lineIn > 0 ? seg(M.clean.slope, M.clean.intercept, refitting ? 14 : x2) : [];
  d[2].borderDash = refitting ? [6, 5] : [];
  const b = M.clean.slope + (M.fit.slope - M.clean.slope) * rf, a = M.clean.intercept + (M.fit.intercept - M.clean.intercept) * rf;
  d[3].data = refitting ? seg(b, a, 14) : [];
  d[3].label = 'With outlier, slope ' + b.toFixed(2);
  d[2].label = (o.included ? 'Without outlier' : 'Least-squares fit (outlier excluded)') + ', slope ' + M.clean.slope.toFixed(2);
  d[2].borderColor = d[2].backgroundColor = o.included ? TEAL : ACC;
  // residual sticks for the fitted line
  const sticks = [[], []];
  M.residuals.forEach((r, i) => {
    const k = ease((t - P.squares[0] - (r.isOutlier ? 12 * 0.13 + 0.35 : i * 0.13)) / 0.5); if (k <= 0) return;
    sticks[r.isOutlier ? 1 : 0].push({ x: r.x, y: r.yhat }, { x: r.x, y: r.yhat + r.r * k }, { x: r.x, y: null });
  });
  d[4].data = sticks[0]; d[5].data = sticks[1];
  const n = Math.max(200, wrap.clientWidth - 40);
  chart.options.plugins.subtitle.text = lines(done ? M.summary : caption(step), n);
  chart.options.plugins.subtitle.color = done ? INK : MUTED;
  chart.update('none');
}

window.lab = {
  get duration() { return M ? M.duration : 12; },
  get markers() { return M ? M.markers : []; },
  seek(t) { T = t; draw(); },
  mount(root, params) {
    M = model(params); T = 0;
    wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;inset:0;padding:6px 10px 4px';
    const canvas = document.createElement('canvas');
    canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', 'Scatter of practice hours against scores with fitted lines with and without the outlier');
    wrap.appendChild(canvas); root.appendChild(wrap);
    Chart.defaults.font.family = 'system-ui, sans-serif';
    Chart.defaults.color = MUTED;
    const lineDs = (label, color, width) => ({ label, data: [], showLine: true, borderColor: color, backgroundColor: color, borderWidth: width, pointRadius: 0, pointHoverRadius: 0, pointStyle: 'line', fill: false });
    chart = new Chart(canvas, {
      type: 'scatter',
      data: { datasets: [
        { label: 'Learners', data: [], backgroundColor: ACC, borderColor: '#fff', borderWidth: 1.5, pointRadius: 5.5, pointHoverRadius: 7 },
        { label: 'Outlier', data: [], backgroundColor: HI, borderColor: HI, borderWidth: 2, pointRadius: 7.5, pointHoverRadius: 9, clip: false },
        lineDs('Without outlier', TEAL, 2),
        lineDs('With outlier', ACC, 2.5),
        Object.assign(lineDs('Residuals', 'rgba(43,89,195,0.55)', 2), { spanGaps: false }),
        Object.assign(lineDs('Outlier residual', HI, 2), { spanGaps: false })
      ] },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        scales: {
          x: { type: 'linear', min: 0, max: 14, ticks: { stepSize: 2 }, title: { display: true, text: 'Practice hours' }, grid: { color: '#eef1f5' } },
          y: { min: 0, max: 100, ticks: { stepSize: 20 }, title: { display: true, text: 'Assessment score (points)' }, grid: { color: '#eef1f5' } }
        },
        plugins: {
          title: { display: true, text: 'How one outlier pulls a least-squares line', align: 'start', color: INK, font: { size: 14, weight: '600' }, padding: { top: 4, bottom: 2 } },
          subtitle: { display: true, text: '', align: 'start', color: MUTED, font: { size: 13 }, padding: { bottom: 8 } },
          legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 16, boxHeight: 8, font: { size: 12 }, filter: (item, data) => data.datasets[item.datasetIndex].data.length > 0 } },
          tooltip: { filter: item => item.datasetIndex < 2, callbacks: { label: c => c.parsed.x + ' h, ' + c.parsed.y + ' points' } }
        }
      }
    });
    ro = new ResizeObserver(() => draw()); ro.observe(root);
    draw();
  },
  update(params) { M = model(params); T = 0; draw(); },
  destroy() { if (ro) ro.disconnect(); if (chart) chart.destroy(); if (wrap) wrap.remove(); chart = null; wrap = null; M = null; }
};

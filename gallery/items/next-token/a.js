// Chart.js: one horizontal bar per candidate word. seek(t) walks the steps: raw scores, softmax, temperature, top-p cut, sampled pick.
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d', cut: '#d5dae3', ghost: '#c3c9d4' };
let chart = null, wrap = null, head = null, M = null, T = 0, LBL = [];

const stepAt = t => { let s = M.steps[0]; for (const x of M.steps) if (x.t <= t + 1e-6) s = x; return s; };
const ease = f => { f = Math.max(0, Math.min(1, f)); return f * f * (3 - 2 * f); };
const pc = v => (v * 100 < 1 && v > 0 ? '<1' : Math.round(v * 100)) + '\u00a0%';

// Writes each bar's value label at its end
const labels = {
  id: 'labels',
  afterDatasetsDraw(c) {
    const meta = c.getDatasetMeta(1), { ctx } = c;
    ctx.save(); ctx.font = '600 11.5px system-ui, sans-serif'; ctx.textBaseline = 'middle';
    meta.data.forEach((bar, i) => {
      const L = LBL[i]; if (!L) return;
      const x0 = c.scales.x.getPixelForValue(0), neg = bar.x < x0;
      const inside = !neg && bar.x + ctx.measureText(L.text).width + 8 > c.chartArea.right + 64;
      ctx.fillStyle = inside ? '#fff' : L.color; ctx.textAlign = neg || inside ? 'right' : 'left';
      ctx.fillText(L.text, bar.x + (neg || inside ? -6 : 6), bar.y);
    });
    ctx.restore();
  }
};

function draw() {
  const step = stepAt(T), key = step.key, k = M.steps.indexOf(step), done = T >= M.duration - 0.05, tk = M.tokens;
  head.querySelector('[data-t]').textContent = step.title;
  head.querySelector('[data-s]').textContent = done ? M.summary : step.note;
  const blank = head.querySelector('[data-b]');
  blank.textContent = key === 'pick' ? M.picked : '?';
  Object.assign(blank.style, key === 'pick' ? { color: '#fff', background: C.hi, borderColor: C.hi, borderStyle: 'solid' } : { color: C.muted, background: '#fff', borderColor: '#9aa3b2', borderStyle: 'dashed' });
  const raw = key === 'raw', ds0 = chart.data.datasets[0], ds1 = chart.data.datasets[1], x = chart.options.scales.x;
  let vals, ghost = tk.map(() => null), cols, lbl;
  if (raw) {
    vals = tk.map((d, i) => T >= i * 0.16 ? d.score : null);
    cols = tk.map(d => d.score >= 0 ? C.accent : '#8aa2dc');
    lbl = tk.map((d, i) => vals[i] === null ? null : { text: d.score.toFixed(1), color: C.ink });
    Object.assign(x, { min: -2.5, max: 4, title: { display: true, text: 'Score (logit): any number, higher = more likely' } });
  } else {
    const f = key === 'temperature' ? ease((T - step.t) / 1.4) : 1;
    vals = tk.map(d => {
      if (key === 'softmax') return d.pBase * 100;
      if (key === 'temperature') return (d.pBase + (d.p - d.pBase) * f) * 100;
      if (key === 'topp') return d.p * 100;
      return d.pFinal * 100;
    });
    if (key === 'temperature') ghost = tk.map(d => d.pBase * 100);
    if (key === 'pick') ghost = tk.map(d => d.p * 100);
    chart.data.datasets[0].label = key === 'pick' ? 'Before the cut and renormalising' : 'Before temperature (T = 1)';
    const cutAt = M.steps[3].t + 0.4;
    cols = tk.map((d, i) => {
      if (key === 'pick') return d.picked ? C.hi : d.kept ? C.accent : C.cut;
      if (key === 'topp') return T >= cutAt + i * 0.12 ? (d.kept ? C.accent : C.cut) : C.accent;
      return C.accent;
    });
    lbl = tk.map((d, i) => {
      if (key === 'pick' && !d.kept) return { text: 'cut', color: '#9aa3b2' };
      if (key === 'topp' && !d.kept && T >= cutAt + i * 0.12) return { text: pc(d.p) + ' · cut', color: '#9aa3b2' };
      return { text: pc(vals[i] / 100) + (key === 'pick' && d.picked ? '  ← picked' : ''), color: key === 'pick' && d.picked ? C.hi : C.ink };
    });
    const top = Math.max(tk[0].pBase, tk[0].p, tk[0].pFinal) * 100;
    Object.assign(x, { min: 0, max: Math.min(100, Math.ceil((top + 8) / 10) * 10), title: { display: true, text: key === 'pick' ? 'Probability after the top-p cut, renormalised (%)' : 'Probability (%)' } });
  }
  LBL = lbl;
  ds1.data = vals; ds1.backgroundColor = cols;
  ds1.label = raw ? 'Score' : key === 'softmax' ? 'Probability' : key === 'pick' ? 'Renormalised' : 'Temperature ' + M.temperature.toFixed(1);
  ds0.data = ghost; ds0.hidden = !(key === 'temperature' || key === 'pick');
  chart.options.plugins.legend.display = !ds0.hidden;
  chart.update('none');
}

window.lab = {
  get duration() { return M ? M.duration : 12.5; },
  get markers() { return M ? M.markers : []; },
  seek(t) { T = Math.max(0, Math.min(M.duration, t)); draw(); },
  mount(root, params) {
    M = model(params); T = 0;
    wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;gap:6px;padding:10px 16px 6px;box-sizing:border-box;background:#fff;font-family:system-ui,sans-serif';
    head = document.createElement('div');
    head.innerHTML = `<div data-t style="font-size:14px;font-weight:600;color:${C.ink}"></div>
      <div data-s style="font-size:12.5px;color:${C.muted};line-height:1.3;min-height:2.6em"></div>
      <div style="font-size:15px;color:${C.ink};margin-top:4px">“${M.context} <span data-b style="display:inline-block;min-width:4.5em;text-align:center;border:1.5px dashed;border-radius:6px;padding:0 6px;font-weight:700"></span>”</div>`;
    const box = document.createElement('div'); box.style.cssText = 'position:relative;flex:1;min-height:0';
    const canvas = document.createElement('canvas');
    canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', 'Bar chart of candidate next words and their probabilities');
    box.appendChild(canvas); wrap.append(head, box); root.appendChild(wrap);
    Chart.defaults.font.family = 'system-ui, sans-serif'; Chart.defaults.color = C.muted;
    chart = new Chart(canvas, {
      type: 'bar',
      data: { labels: M.tokens.map(d => d.text), datasets: [
        { label: 'Before temperature (T = 1)', data: [], backgroundColor: 'rgba(195,201,212,0.35)', borderColor: C.ghost, borderWidth: 1, borderRadius: 3, barPercentage: 0.9, categoryPercentage: 0.9, grouped: false, order: 2 },
        { label: '', data: [], borderRadius: 3, barPercentage: 0.55, categoryPercentage: 0.9, grouped: false, order: 1 }
      ] },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: false,
        layout: { padding: { right: 70 } },
        scales: {
          x: { grid: { color: '#eef1f5' }, ticks: { maxTicksLimit: 7 } },
          y: { grid: { display: false }, ticks: { color: C.ink, autoSkip: false, font: { size: 12.5 } } }
        },
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 14, boxHeight: 10, filter: i => i.datasetIndex === 0 } },
          tooltip: { callbacks: { label: c => c.datasetIndex === 0 ? 'Before temperature: ' + c.parsed.x.toFixed(1) + ' %' : (stepAt(T).key === 'raw' ? 'Score ' + c.parsed.x.toFixed(1) : c.parsed.x.toFixed(1) + ' %') } }
        }
      },
      plugins: [labels]
    });
    draw();
  },
  update(params) { M = model(params); T = 0; chart.data.labels = M.tokens.map(d => d.text); draw(); },
  destroy() { if (chart) chart.destroy(); if (wrap) wrap.remove(); chart = wrap = M = null; }
};

// Plotly violins with boxes: eight three-hour windows of the day, each a violin of the latency samples with the box and
// median inside, revealed as the clock completes each window. Before the change in blue, after it in orange: the shape
// moves right and grows a tail, which is what p95 means.
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d', bad: '#b42318', soft: '#f4f6f9' };
let M = null, wrap = null, head = null, plot = null, foot = null, ro = null, lastT = 0, lastKey = '', drawn = false;

function build() {
  const narrow = wrap.clientWidth < 640, hourNow = Math.min(24, lastT), done = lastT >= M.duration - 0.05;
  const traces = M.windows.map(w => {
    const complete = hourNow >= w.to - 1e-6 || done, partial = !complete && hourNow > w.from;
    const n = complete ? w.samples.length : partial ? Math.max(0, Math.floor(w.samples.length * (hourNow - w.from) / 3)) : 0;
    const col = w.after ? C.hi : w.straddles ? '#8a5a2b' : C.accent;
    // partial windows show the samples gathered so far, drawn from the window's buckets in time order
    const ys = complete ? w.samples : M.buckets.slice(w.w * 6, w.w * 6 + 6).filter(b => b.hour < hourNow - 1e-6).flatMap(b => b.samples);
    return { type: 'violin', name: w.label, x: ys.map(() => w.label), y: ys, line: { color: col, width: 1.2 }, fillcolor: col + '33', opacity: ys.length ? 1 : 0.15,
      box: { visible: true, width: 0.3, line: { color: col } }, meanline: { visible: false }, points: false, spanmode: 'soft', bandwidth: 0.12, width: 0.85, scalemode: 'width', hoverinfo: 'y+name', showlegend: false };
  });
  // Reference lines: the baseline median and the control limit, plus the change hour between windows
  const shapes = [
    { type: 'line', xref: 'paper', x0: 0, x1: 1, y0: M.limits.ucl, y1: M.limits.ucl, line: { color: C.bad, width: 1.2, dash: 'dash' } },
    { type: 'line', xref: 'paper', x0: 0, x1: 1, y0: M.limits.mean, y1: M.limits.mean, line: { color: C.muted, width: 1, dash: 'dot' } }
  ];
  const annotations = [];
  if (hourNow >= M.changeHour) { const xi = M.changeHour / 3 - 0.5; shapes.push({ type: 'line', x0: xi, x1: xi, yref: 'paper', y0: 0, y1: 1, line: { color: C.hi, width: 1.5, dash: 'dash' } });
    annotations.push({ x: xi, yref: 'paper', y: 1, xanchor: 'left', yanchor: 'top', text: ' change ' + M.changeLabel, showarrow: false, font: { size: 10.5, color: C.hi } }); }
  const ymax = Math.ceil(Math.max(...M.windows.map(w => w.p95)) * 1.6);
  const layout = { width: Math.max(200, plot.clientWidth), height: Math.max(120, plot.clientHeight), autosize: false, margin: { l: narrow ? 38 : 46, r: 8, t: 10, b: narrow ? 46 : 34 }, paper_bgcolor: '#fff', plot_bgcolor: '#fff',
    font: { family: 'system-ui, sans-serif', size: narrow ? 10 : 11.5, color: C.ink }, violinmode: 'overlay', shapes, annotations,
    xaxis: { type: 'category', categoryorder: 'array', categoryarray: M.windows.map(w => w.label), tickangle: narrow ? -40 : 0, tickfont: { size: narrow ? 9 : 10.5 }, showgrid: false, fixedrange: true },
    yaxis: { title: { text: 'latency, s', font: { size: 10.5, color: C.muted } }, range: [0, ymax], gridcolor: '#eef1f5', zeroline: false, fixedrange: true } };
  const cfg = { responsive: false, displaylogo: false, displayModeBar: false };
  if (!drawn) { Plotly.newPlot(plot, traces, layout, cfg); drawn = true; } else Plotly.react(plot, traces, layout, cfg);
  caption(hourNow, done, narrow);
}
function caption(hourNow, done, narrow) {
  let k = 0; M.steps.forEach((s, i) => { if (s.t <= lastT + 1e-6) k = i; });
  const s = M.steps[k], L = M.limits, doneW = M.windows.filter(w => hourNow >= w.to - 1e-6 || done), last = doneW[doneW.length - 1];
  head.querySelector('.sub').textContent = done ? M.summary : s.title + ': ' + s.note;
  const stats = last ? (narrow ? [['Window', last.label], ['p50 / p95', last.p50.toFixed(1) + ' / ' + last.p95.toFixed(1) + ' s']] : [['Last window', last.label], ['p50', last.p50.toFixed(2) + ' s'], ['p95', last.p95.toFixed(2) + ' s'], ['Baseline p50', L.mean.toFixed(2) + ' s'], ['Limit', L.ucl.toFixed(1) + ' s (dashed)']]) : [['Window', 'gathering…']];
  head.querySelector('.stats').innerHTML = stats.map(([kk, v]) => '<span style="display:inline-block;margin:0 0 4px 6px;padding:3px 8px;border-radius:8px;background:#f4f6f9;font-size:11.5px;color:#5b6475;white-space:nowrap">' + kk + ' <b style="color:#1d2433">' + v + '</b></span>').join('');
  foot.textContent = done ? (narrow ? 'After the change the p95 moved more than the median: the tail is what users feel first.' : 'The violins after the change are taller at the top: the p95 moved more than the median. That tail is what users feel first. The dashed red line is the control limit, the dotted one the baseline median.') : last && last.after ? 'This window is after the change: the body sits higher and the tail is longer than any morning window.' : (narrow ? 'A violin per three-hour window; the box is the middle half, the line the median.' : 'Each violin is a three-hour window of latency samples; the box inside is the middle half, the line the median. Dashed red: the control limit.');
  foot.style.background = done ? '#fbefe8' : '#fafbfc';
}

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  seek(t) { lastT = t; const key = Math.floor(t * 2) + '|' + (t >= M.duration - 0.05); if (key !== lastKey) { lastKey = key; if (drawn) build(); } },
  mount(root, params) {
    M = model(params); lastT = 0; lastKey = ''; drawn = false;
    wrap = document.createElement('div'); wrap.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;background:#fff;font-family:system-ui,sans-serif;color:#1d2433';
    head = document.createElement('div'); head.style.cssText = 'flex:none;padding:8px 14px 2px;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:flex-start';
    head.innerHTML = '<div style="flex:1 1 280px;min-width:0"><div style="font-size:14px;font-weight:600">Is the agent healthy? · the whole distribution, window by window</div><div class="sub" style="font-size:12px;line-height:1.35;color:#5b6475;min-height:32px"></div></div><div class="stats" style="flex:0 1 auto;text-align:right"></div>';
    plot = document.createElement('div'); plot.style.cssText = 'flex:1;min-height:0;width:100%';
    foot = document.createElement('div'); foot.style.cssText = 'flex:none;height:48px;box-sizing:border-box;padding:6px 14px;font:12.5px/1.4 system-ui,sans-serif;border-top:1px solid #e3e7ee;background:#fafbfc;overflow:auto';
    wrap.append(head, plot, foot); root.append(wrap);
    build();
    ro = new ResizeObserver(() => requestAnimationFrame(() => { if (plot && drawn) build(); })); ro.observe(plot);
  },
  update(params) { M = model(params); lastT = 0; lastKey = ''; build(); },
  destroy() { if (ro) ro.disconnect(); if (plot && drawn) Plotly.purge(plot); if (wrap) wrap.remove(); wrap = null; plot = null; M = null; drawn = false; }
};

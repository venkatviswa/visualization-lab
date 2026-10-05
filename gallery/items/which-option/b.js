// Plotly parallel coordinates: one axis per criterion plus the weighted score, one line per option. The clock reveals
// the axes left to right, then adds the score axis once the weights apply, then thickens the winner's line.
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d', bad: '#b42318', soft: '#f4f6f9' };
const OPT = { native: '#2b59c3', ipaas: '#0f766e', custom: '#6d4bbf', manual: '#b4530f' };
let M = null, wrap = null, head = null, plot = null, foot = null, legend = null, ro = null, lastT = 0, lastKey = '', drawn = false;
const st = id => M.steps.find(s => s.id === id).t;

function build() {
  const narrow = wrap.clientWidth < 560, t = lastT, done = t >= M.duration - 0.05;
  const phase = t >= st('verdict') ? 2 : t >= st('weights') ? 1 : 0, revealed = phase >= 1 ? 5 : Math.min(5, Math.floor(t / (st('weights') / 5)) + 1);
  const w = M.profile.w;
  const shortLabels = wrap.clientWidth < 900;
  const dims = M.criteria.slice(0, revealed).map((c, i) => ({ label: (shortLabels ? c.short : c.label) + (phase >= 1 && w[i] !== 1 ? ' ×' + w[i] : ''), range: [0, 10], tickvals: [0, 2, 4, 6, 8, 10], values: M.options.map(o => o.s[i]) }));
  if (phase >= 1) dims.push({ label: shortLabels ? 'Score' : 'Weighted score', range: [0, 100], tickvals: [0, 25, 50, 75, 100], values: M.options.map(o => o.score) });
  // Plotly parcoords colours lines by a scalar through a colourscale; map each option to its own colour stop
  const n = M.options.length, scale = M.options.map((o, k) => [n === 1 ? 0 : k / (n - 1), OPT[o.id]]);
  const colourscale = scale.flatMap(([v, c], k) => (k === 0 ? [[0, c]] : [[v - 1e-6, scale[k - 1][1]], [v, c]])).concat([[1, scale[n - 1][1]]]).sort((a, b) => a[0] - b[0]);
  const traces = [{ type: 'parcoords', line: { color: M.options.map((o, k) => (n === 1 ? 0 : k / (n - 1))), colorscale: colourscale, cmin: 0, cmax: 1 }, dimensions: dims, labelfont: { size: narrow ? 9.5 : 11, color: C.ink }, tickfont: { size: narrow ? 9 : 10, color: C.muted }, rangefont: { size: 9, color: C.muted } }];
  const layout = { width: Math.max(200, plot.clientWidth), height: Math.max(120, plot.clientHeight), autosize: false, margin: { l: narrow ? 40 : 70, r: narrow ? 40 : 70, t: 44, b: 20 }, paper_bgcolor: '#fff', plot_bgcolor: '#fff', font: { family: 'system-ui, sans-serif' } };
  const cfg = { responsive: false, displaylogo: false, displayModeBar: false };
  if (!drawn) { Plotly.newPlot(plot, traces, layout, cfg); drawn = true; } else Plotly.react(plot, traces, layout, cfg);
  legend.innerHTML = M.options.map(o => '<span style="display:inline-flex;align-items:center;gap:5px;margin:0 10px 2px 0;font-size:' + (narrow ? 10.5 : 11.5) + 'px;color:#1d2433' + (phase >= 2 && o.id === M.winner ? ';font-weight:700' : '') + '"><span style="width:14px;height:3px;background:' + OPT[o.id] + ';display:inline-block;border-radius:2px"></span>' + o.label + (phase >= 1 ? ' · ' + o.score : '') + (phase >= 2 && o.id === M.winner ? ' ✓' : '') + '</span>').join('');
  caption(phase, done, narrow);
}
function caption(phase, done, narrow) {
  let k = 0; M.steps.forEach((s, i) => { if (s.t <= lastT + 1e-6) k = i; });
  const s = M.steps[k], win = M.options.find(o => o.id === M.winner);
  head.querySelector('.sub').textContent = done ? M.summary : s.title + ': ' + s.note;
  const stats = narrow ? [['Profile', M.profile.label], ['Leader', win.label.split(' ')[0] + ' ' + win.score]] : [['Profile', M.profile.label], ['Leader', win.label + ' · ' + win.score], ['Margin', M.margin + ' pts'], ['Target', String(M.target)]];
  head.querySelector('.stats').innerHTML = stats.map(([kk, v]) => '<span style="display:inline-block;margin:0 0 4px 6px;padding:3px 8px;border-radius:8px;background:#f4f6f9;font-size:11.5px;color:#5b6475;white-space:nowrap">' + kk + ' <b style="color:#1d2433">' + v + '</b></span>').join('');
  foot.textContent = phase >= 1 ? 'The last axis is the weighted score. Follow a line: an option that is high on the heavy axes ends high, whatever it does elsewhere. Drag along an axis to filter.' : 'One line per option, one axis per criterion. Crossing lines are trade-offs: where two lines cross, the options swap places.';
}

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  seek(t) { lastT = t; const phase = t >= st('verdict') ? 2 : t >= st('weights') ? 1 : 0, key = (phase >= 1 ? 5 : Math.min(5, Math.floor(t / (st('weights') / 5)) + 1)) + '|' + phase + '|' + (t >= M.duration - 0.05); if (key !== lastKey) { lastKey = key; if (drawn) build(); } },
  mount(root, params) {
    M = model(params); lastT = 0; lastKey = ''; drawn = false;
    wrap = document.createElement('div'); wrap.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;background:#fff;font-family:system-ui,sans-serif;color:#1d2433';
    head = document.createElement('div'); head.style.cssText = 'flex:none;padding:8px 14px 2px;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:flex-start';
    head.innerHTML = '<div style="flex:1 1 280px;min-width:0"><div style="font-size:14px;font-weight:600">Which option? · every option as a line across the criteria</div><div class="sub" style="font-size:12px;line-height:1.35;color:#5b6475;min-height:32px"></div></div><div class="stats" style="flex:0 1 auto;text-align:right"></div>';
    legend = document.createElement('div'); legend.style.cssText = 'flex:none;padding:2px 14px 0';
    plot = document.createElement('div'); plot.style.cssText = 'flex:1;min-height:0;width:100%';
    foot = document.createElement('div'); foot.style.cssText = 'flex:none;height:48px;box-sizing:border-box;padding:6px 14px;font:12px/1.4 system-ui,sans-serif;color:#5b6475;border-top:1px solid #e3e7ee;background:#fafbfc;overflow:auto';
    wrap.append(head, legend, plot, foot); root.append(wrap);
    build();
    ro = new ResizeObserver(() => requestAnimationFrame(() => { if (plot && drawn) build(); })); ro.observe(plot);
  },
  update(params) { M = model(params); lastT = 0; lastKey = ''; build(); },
  destroy() { if (ro) ro.disconnect(); if (plot && drawn) Plotly.purge(plot); if (wrap) wrap.remove(); wrap = null; plot = null; M = null; drawn = false; }
};

// Plotly 3D: the planet as a sphere, the launch altitude as a faint ring, the integrated path as a line growing with the
// clock and the body as a marker, in a scene you can turn. The orbit lies in one plane, which is the point of comparing it
// with the flat view: depth is there to be turned, not to add information.
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d', bad: '#b42318' };
let M = null, wrap = null, head = null, plot = null, foot = null, ro = null, lastT = 0, lastKey = '', drawn = false, sphere = null;
const fmtKm = v => Math.round(v).toLocaleString('en-US') + ' km';
const fmtH = s => s >= 3600 ? (s / 3600).toFixed(2) + ' h' : Math.round(s / 60) + ' min';

function makeSphere(R) {
  const n = 24, x = [], y = [], z = [];
  for (let i = 0; i <= n; i++) { const th = Math.PI * i / n, rx = [], ry = [], rz = []; for (let j = 0; j <= 2 * n; j++) { const ph = Math.PI * j / n; rx.push(R * Math.sin(th) * Math.cos(ph)); ry.push(R * Math.sin(th) * Math.sin(ph)); rz.push(R * Math.cos(th)); } x.push(rx); y.push(ry); z.push(rz); }
  return { type: 'surface', x, y, z, showscale: false, colorscale: [[0, '#b7c9e2'], [1, '#dfe8f4']], opacity: 1, hoverinfo: 'skip', lighting: { ambient: 0.75, diffuse: 0.5 }, contours: { x: { show: false }, y: { show: false }, z: { show: false } } };
}
function build() {
  const narrow = wrap.clientWidth < 600, t = Math.min(lastT, M.duration), done = lastT >= M.duration - 0.05;
  let i = 0; while (i < M.path.length - 1 && M.path[i + 1].at <= t + 1e-6) i++;
  const seg = M.path.slice(0, i + 1), cur = M.path[i];
  const ring = Array.from({ length: 73 }, (_, k) => { const a = k / 72 * 2 * Math.PI; return [(M.R + M.h0) * Math.cos(a), (M.R + M.h0) * Math.sin(a)]; });
  const ext = Math.max(M.R * 1.3, ...M.path.map(q => Math.max(Math.abs(q.x), Math.abs(q.y)))), zr = Math.max(M.R * 1.1, ext * 0.4);
  const traces = [sphere,
    { type: 'scatter3d', mode: 'lines', x: ring.map(q => q[0]), y: ring.map(q => q[1]), z: ring.map(() => 0), line: { color: C.line, width: 2, dash: 'dot' }, hoverinfo: 'skip', name: 'launch altitude' },
    { type: 'scatter3d', mode: 'lines', x: seg.map(q => q.x), y: seg.map(q => q.y), z: seg.map(() => 0), line: { color: C.accent, width: 4 }, name: 'path', hovertemplate: 'altitude %{text}<extra></extra>', text: seg.map(q => fmtKm(q.r - M.R)) },
    { type: 'scatter3d', mode: 'markers', x: [cur.x], y: [cur.y], z: [0], marker: { size: 6, color: done && M.crashes ? C.bad : C.hi }, name: 'body', hoverinfo: 'skip' }];
  const layout = { width: Math.max(200, plot.clientWidth), height: Math.max(120, plot.clientHeight), autosize: false, margin: { l: 0, r: 0, t: 0, b: 0 }, paper_bgcolor: '#fff', showlegend: false,
    scene: { aspectmode: 'manual', aspectratio: { x: 1, y: 1, z: zr / ext }, xaxis: { range: [-ext, ext], visible: false }, yaxis: { range: [-ext, ext], visible: false }, zaxis: { range: [-zr, zr], visible: false }, camera: { eye: { x: 1.15, y: 0.95, z: 0.55 } }, dragmode: 'orbit' } };
  const cfg = { responsive: false, displaylogo: false, displayModeBar: false };
  if (!drawn) { Plotly.newPlot(plot, traces, layout, cfg); drawn = true; } else { delete layout.scene.camera; Plotly.react(plot, traces, layout, cfg); }
  let k = 0; M.steps.forEach((s, j) => { if (s.t <= t + 1e-6) k = j; });
  head.querySelector('.sub').textContent = done ? M.summary : M.steps[k].title + ': ' + M.steps[k].note;
  const stats = narrow ? [['t', fmtH(cur.t)], ['Altitude', fmtKm(cur.r - M.R)]] : [['Time', fmtH(cur.t)], ['Altitude', fmtKm(cur.r - M.R)], ['Speed', cur.v.toFixed(2) + ' km/s'], ['Circular / escape', M.vCirc.toFixed(2) + ' / ' + M.vEsc.toFixed(2) + ' km/s']];
  head.querySelector('.stats').innerHTML = stats.map(([kk, v]) => '<span style="display:inline-block;margin:0 0 4px 6px;padding:3px 8px;border-radius:8px;background:#f4f6f9;font-size:11.5px;color:#5b6475;white-space:nowrap">' + kk + ' <b style="color:#1d2433">' + v + '</b></span>').join('');
  foot.textContent = done ? M.verdict + ' Drag to turn the scene: the orbit stays in one plane whichever way you look.' : 'Drag to turn the scene. The dotted ring is the 300 km launch altitude; the blue line is the integrated path.';
  foot.style.background = done ? (M.crashes ? '#fdecea' : M.escapes ? '#fbefe8' : '#e6f4ec') : '#fafbfc';
}

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  seek(t) { lastT = t; let i = 0; while (i < M.path.length - 1 && M.path[i + 1].at <= t + 1e-6) i++; const key = Math.floor(i / 4) + '|' + (t >= M.duration - 0.05); if (key !== lastKey) { lastKey = key; if (drawn) build(); } },
  mount(root, params) {
    M = model(params); lastT = 0; lastKey = ''; drawn = false; sphere = makeSphere(M.R);
    wrap = document.createElement('div'); wrap.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;background:#fff;font-family:system-ui,sans-serif;color:#1d2433';
    head = document.createElement('div'); head.style.cssText = 'flex:none;padding:8px 14px 2px;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:flex-start';
    head.innerHTML = '<div style="flex:1 1 280px;min-width:0"><div style="font-size:14px;font-weight:600">Newton\'s cannon · the orbit around a globe</div><div class="sub" style="font-size:12px;line-height:1.35;color:#5b6475;min-height:32px"></div></div><div class="stats" style="flex:0 1 auto;text-align:right"></div>';
    plot = document.createElement('div'); plot.style.cssText = 'flex:1;min-height:0;width:100%';
    foot = document.createElement('div'); foot.style.cssText = 'flex:none;height:48px;box-sizing:border-box;padding:6px 14px;font:12.5px/1.4 system-ui,sans-serif;border-top:1px solid #e3e7ee;background:#fafbfc;overflow:auto';
    wrap.append(head, plot, foot); root.append(wrap);
    build();
    ro = new ResizeObserver(() => requestAnimationFrame(() => { if (plot && drawn) build(); })); ro.observe(plot);
  },
  update(params) { M = model(params); lastT = 0; lastKey = ''; sphere = makeSphere(M.R); build(); },
  destroy() { if (ro) ro.disconnect(); if (plot && drawn) Plotly.purge(plot); if (wrap) wrap.remove(); wrap = null; plot = null; M = null; drawn = false; }
};

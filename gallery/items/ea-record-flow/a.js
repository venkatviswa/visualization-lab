// Plotly Sankey: the month's records as bands whose width is the count. Nodes are the sources, the quality check,
// identity resolution and the two outcomes; seek(t) reveals the links stage by stage by fading the later ones out.
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', accent: '#2b59c3', good: '#1f7a4d', bad: '#b42318', soft: '#f4f6f9' };
const SRC = { portal: '#2b59c3', claims: '#0f766e', contact: '#6d4bbf', marketing: '#be4d8a', pharmacy: '#b4530f' };
const NODE = { passed: '#5b6475', rejected: C.bad, new: C.accent, merged: '#0f766e', mkt: C.good, svc: '#8a93a6' };
const SHORT = { portal: 'Portal', claims: 'Claims', contact: 'Contact centre', marketing: 'Marketing', pharmacy: 'Pharmacy', passed: 'Passed', rejected: 'Rejected', new: 'New profiles', merged: 'Merged', mkt: 'Marketing + service', svc: 'Service only' };
let M = null, wrap = null, head = null, plot = null, ro = null, lastScene = -1, lastT = 0, drawn = false;
const fmt = v => v.toLocaleString('en-US');
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

function sceneAt(t) { let k = 0; M.steps.forEach((s, i) => { if (s.t <= t + 1e-6) k = i; }); return k; }
function colorOf(id) { return SRC[id] || NODE[id] || C.muted; }
function linkColor(l, scene) {
  // links are revealed in column order: sources -> quality (scene 0 and 1), identity (2), consent (3, 4)
  const col = M.nodes.find(n => n.id === l.source).col, shown = col === 0 ? (l.kind === 'bad' ? scene >= 1 : true) : col === 1 ? scene >= 2 : scene >= 3;
  const base = l.kind === 'bad' ? C.bad : l.kind === 'consent' ? C.good : l.kind === 'merge' ? '#0f766e' : colorOf(l.source);
  return rgba(base, shown ? 0.42 : 0.04);
}
function labelOf(n, narrow) { const s = SHORT[n.id] || n.label; return narrow ? s : (n.kind === 'source' ? n.label : s) + ' · ' + fmt(n.value); }
function build() {
  const narrow = wrap.clientWidth < 560, scene = sceneAt(lastT);
  const nodes = M.nodes.filter(n => n.active), idx = Object.fromEntries(nodes.map((n, i) => [n.id, i]));
  const data = [{
    type: 'sankey', arrangement: 'snap', orientation: 'h',
    node: { label: nodes.map(n => labelOf(n, narrow)), color: nodes.map(n => colorOf(n.id)), pad: narrow ? 10 : 16, thickness: narrow ? 14 : 20, line: { color: '#fff', width: 1 },
      hovertemplate: '%{label}<extra></extra>' },
    link: { source: M.links.map(l => idx[l.source]), target: M.links.map(l => idx[l.target]), value: M.links.map(l => l.value), color: M.links.map(l => linkColor(l, scene)),
      hovertemplate: '%{source.label} → %{target.label}: %{value:,} records<extra></extra>' }
  }];
  const layout = { width: Math.max(200, plot.clientWidth), height: Math.max(120, plot.clientHeight), autosize: false, margin: { l: 6, r: 6, t: 8, b: 8 }, font: { family: 'system-ui, sans-serif', size: narrow ? 10.5 : 12, color: C.ink }, paper_bgcolor: '#fff', plot_bgcolor: '#fff' };
  if (!drawn) { Plotly.newPlot(plot, data, layout, { responsive: false, displaylogo: false, displayModeBar: false }); drawn = true; }
  else Plotly.react(plot, data, layout, { responsive: false, displaylogo: false, displayModeBar: false });
  lastScene = scene;
  caption();
}
function caption() {
  const scene = sceneAt(lastT), s = M.steps[scene], done = lastT >= M.duration - 0.05, narrow = wrap.clientWidth < 560, T = M.totals;
  head.querySelector('.ttl').textContent = 'Where the records go · ' + (done ? 'the month in one picture' : 'scene ' + (scene + 1) + ' of ' + M.steps.length + ' · ' + s.title);
  head.querySelector('.sub').textContent = done ? M.summary : s.note;
  const tiles = narrow ? [['In', fmt(T.ingested)], ['Marketing', fmt(T.marketing)]] : [['Records in', fmt(T.ingested)], ['Rejected', fmt(T.rejected)], ['Merged', fmt(T.merged)], ['Can be marketed to', fmt(T.marketing)]];
  head.querySelector('.stats').innerHTML = tiles.map(([k, v]) => '<span style="display:inline-block;margin:0 0 4px 6px;padding:3px 8px;border-radius:8px;background:#f4f6f9;font-size:11.5px;color:#5b6475;white-space:nowrap">' + k + ' <b style="color:#1d2433">' + v + '</b></span>').join('');
}

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  seek(t) {
    lastT = t; const scene = sceneAt(t);
    if (scene !== lastScene && plot && drawn) { Plotly.restyle(plot, { 'link.color': [M.links.map(l => linkColor(l, scene))] }); lastScene = scene; }
    caption();
  },
  mount(root, params) {
    M = model(params); lastT = 0; lastScene = -1; drawn = false;
    wrap = document.createElement('div'); wrap.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;background:#fff;font-family:system-ui,sans-serif;color:#1d2433';
    head = document.createElement('div'); head.style.cssText = 'flex:none;padding:8px 14px 2px;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:flex-start';
    head.innerHTML = '<div style="flex:1 1 280px;min-width:0"><div class="ttl" style="font-size:14px;font-weight:600"></div><div class="sub" style="font-size:12px;line-height:1.35;color:#5b6475;min-height:32px"></div></div><div class="stats" style="flex:0 1 auto;text-align:right"></div>';
    plot = document.createElement('div'); plot.style.cssText = 'flex:1;min-height:0;width:100%';
    wrap.append(head, plot); root.append(wrap);
    build();
    ro = new ResizeObserver(() => requestAnimationFrame(() => { if (plot && drawn) { build(); } })); ro.observe(plot);
  },
  update(params) { M = model(params); lastT = 0; lastScene = -1; build(); },
  destroy() { if (ro) ro.disconnect(); if (plot && drawn) Plotly.purge(plot); if (wrap) wrap.remove(); wrap = null; plot = null; M = null; drawn = false; }
};

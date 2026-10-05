// D3 + d3-sankey: the same flows laid out once per update, then revealed link by link as the playback clock passes each stage.
// Labels carry the counts; on a narrow screen they shorten and the counts move into the header.
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', accent: '#2b59c3', good: '#1f7a4d', bad: '#b42318', soft: '#f4f6f9' };
const SRC = { portal: '#2b59c3', claims: '#0f766e', contact: '#6d4bbf', marketing: '#be4d8a', pharmacy: '#b4530f' };
const NODE = { passed: '#5b6475', rejected: C.bad, new: C.accent, merged: '#0f766e', mkt: C.good, svc: '#8a93a6' };
const SHORT = { portal: 'Portal', claims: 'Claims', contact: 'Contact centre', marketing: 'Marketing', pharmacy: 'Pharmacy', passed: 'Passed', rejected: 'Rejected', new: 'New profiles', merged: 'Merged', mkt: 'Marketing + service', svc: 'Service only' };
const FONT = 'system-ui, -apple-system, sans-serif';
let M = null, wrap = null, head = null, svg = null, ro = null, G = null, lastT = 0, lastKey = '';
const fmt = v => v.toLocaleString('en-US');
const clamp01 = v => Math.max(0, Math.min(1, v));
const colorOf = id => SRC[id] || NODE[id] || C.muted;
const linkBase = l => l.kind === 'bad' ? C.bad : l.kind === 'consent' ? C.good : l.kind === 'merge' ? '#0f766e' : colorOf(l.source.id || l.source);

function layout() {
  const W = wrap.clientWidth, H = Math.max(120, svg.node().clientHeight), narrow = W < 560;
  const nodes = M.nodes.filter(n => n.active).map(n => ({ ...n })), links = M.links.map(l => ({ ...l }));
  const labelW = narrow ? 92 : 178;
  const gen = d3.sankey().nodeId(d => d.id).nodeWidth(narrow ? 12 : 16).nodePadding(narrow ? 10 : 16).nodeAlign(d3.sankeyJustify).nodeSort(null)
    .extent([[narrow ? 8 : 12, 24], [W - labelW - 12, H - 12]]);
  const g = gen({ nodes, links });
  // Reveal schedule: a link starts when its stage's scene starts, sources staggered a little
  const st = id => M.steps.find(s => s.id === id).t;
  g.links.forEach(l => {
    const col = l.source.col, j = M.sources.findIndex(s => s.id === l.source.id);
    l.at = col === 0 ? (l.kind === 'bad' ? st('quality') + 0.3 : st('arrive') + 0.4 + Math.max(0, j) * 0.5) : col === 1 ? st('identity') + 0.3 + (l.target.id === 'merged' ? 0.6 : 0) : st('consent') + 0.3 + (l.kind === 'consent' ? 0 : 0.6);
  });
  return { W, H, narrow, nodes: g.nodes, links: g.links };
}
function draw() {
  if (!G) return;
  const { W, H, narrow, nodes, links } = G, t = lastT;
  svg.attr('width', W).attr('height', H).selectAll('*').remove();
  const path = d3.sankeyLinkHorizontal();
  // Links: drawn thick, swept in with a dash offset
  const lg = svg.append('g').attr('fill', 'none');
  links.forEach(l => {
    const f = clamp01((t - l.at) / 0.9); if (f <= 0) return;
    const p = lg.append('path').attr('d', path(l)).attr('stroke', linkBase(l)).attr('stroke-opacity', 0.42).attr('stroke-width', Math.max(1, l.width));
    const len = p.node().getTotalLength();
    if (f < 1) p.attr('stroke-dasharray', len).attr('stroke-dashoffset', len * (1 - f));
    p.append('title').text(l.source.label + ' → ' + l.target.label + ': ' + fmt(l.value) + ' records');
  });
  // Nodes and labels: a node appears with its first incoming or outgoing link
  const ng = svg.append('g');
  nodes.forEach(n => {
    const first = Math.min(...links.filter(l => l.source.id === n.id || l.target.id === n.id).map(l => l.at));
    const op = clamp01((t - first + 0.2) / 0.5);
    // Before its stage a node is a faint placeholder, so the shape of the whole flow is visible from the start
    const g = ng.append('g').attr('opacity', op > 0 ? op : 0.14);
    g.append('rect').attr('x', n.x0).attr('y', n.y0).attr('width', n.x1 - n.x0).attr('height', Math.max(1, n.y1 - n.y0)).attr('rx', 2).attr('fill', colorOf(n.id));
    if (op <= 0) return;
    // Sources and outcomes are labelled beside the node; the stages in the middle above it, clear of the wide links
    const mid = n.kind === 'stage', label = (narrow || mid ? SHORT[n.id] : n.label) + (narrow ? '' : ' · ' + fmt(n.value));
    g.append('text').attr('x', mid ? n.x0 : n.x1 + 6).attr('y', mid ? n.y0 - 6 : (n.y0 + n.y1) / 2).attr('dy', mid ? 0 : '0.35em').attr('text-anchor', 'start')
      .attr('font-family', FONT).attr('font-size', narrow ? 10.5 : 12).attr('font-weight', n.kind === 'source' ? 500 : 600).attr('fill', C.ink).attr('paint-order', 'stroke').attr('stroke', '#fff').attr('stroke-width', 3).text(label);
  });
  caption();
}
function caption() {
  let k = 0; M.steps.forEach((s, i) => { if (s.t <= lastT + 1e-6) k = i; });
  const s = M.steps[k], done = lastT >= M.duration - 0.05, narrow = wrap.clientWidth < 560, T = M.totals;
  head.querySelector('.ttl').textContent = 'Where the records go · ' + (done ? 'the month in one picture' : 'scene ' + (k + 1) + ' of ' + M.steps.length + ' · ' + s.title);
  head.querySelector('.sub').textContent = done ? M.summary : s.note;
  const tiles = narrow ? [['In', fmt(T.ingested)], ['Rejected', fmt(T.rejected)], ['Merged', fmt(T.merged)], ['Marketing', fmt(T.marketing)]] : [['Records in', fmt(T.ingested)], ['Rejected', fmt(T.rejected)], ['Merged', fmt(T.merged)], ['Can be marketed to', fmt(T.marketing)]];
  head.querySelector('.stats').innerHTML = tiles.map(([kk, v]) => '<span style="display:inline-block;margin:0 0 4px 6px;padding:3px 8px;border-radius:8px;background:#f4f6f9;font-size:11.5px;color:#5b6475;white-space:nowrap">' + kk + ' <b style="color:#1d2433">' + v + '</b></span>').join('');
}

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  seek(t) { lastT = t; const key = Math.round(t * 30); if (key !== lastKey) { lastKey = key; draw(); } },
  mount(root, params) {
    M = model(params); lastT = 0; lastKey = '';
    wrap = document.createElement('div'); wrap.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;background:#fff;font-family:system-ui,sans-serif;color:#1d2433';
    head = document.createElement('div'); head.style.cssText = 'flex:none;padding:8px 14px 2px;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:flex-start';
    head.innerHTML = '<div style="flex:1 1 280px;min-width:0"><div class="ttl" style="font-size:14px;font-weight:600"></div><div class="sub" style="font-size:12px;line-height:1.35;color:#5b6475;min-height:32px"></div></div><div class="stats" style="flex:0 1 auto;text-align:right"></div>';
    const box = document.createElement('div'); box.style.cssText = 'flex:1;min-height:0;position:relative';
    svg = d3.select(box).append('svg').style('display', 'block').style('width', '100%').style('height', '100%');
    wrap.append(head, box); root.append(wrap);
    G = layout(); draw();
    ro = new ResizeObserver(() => requestAnimationFrame(() => { if (svg && M) { G = layout(); draw(); } })); ro.observe(box);
  },
  update(params) { M = model(params); lastT = 0; lastKey = ''; G = layout(); draw(); },
  destroy() { if (ro) ro.disconnect(); if (wrap) wrap.remove(); wrap = null; svg = null; M = null; G = null; }
};

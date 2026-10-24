// React Flow: the same network hand-placed like a map (London west, Mumbai east), with links drawn centre to centre.
// Follows the host timeline; click a city for its links and how it was reached.
const h = React.createElement;
const RF = ReactFlow;
const C = { ink: '#1d2433', muted: '#5b6475', line: '#c3c9d4', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d', bad: '#b42318',
  tint: '#e8eefb', goodTint: '#e6f4ec' };
let rroot = null, flowEl = null, infoEl = null, M = null, simT = 0, selected = null, lastKey = '', inst = null, ro = null;

// One invisible handle in the middle of each node, so straight edges run centre to centre at any angle.
const mid = { left: '50%', top: '50%', width: 1, height: 1, minWidth: 0, minHeight: 0, opacity: 0, border: 0, transform: 'translate(-50%, -50%)' };
function City({ data }) {
  return h('div', { style: data.box },
    h('div', { style: { fontWeight: 600, fontSize: 13 } }, data.name),
    h('div', { style: { fontSize: 12, marginTop: 2, fontWeight: 600, color: data.sub } }, data.dist),
    h(RF.Handle, { type: 'source', position: RF.Position.Top, style: mid, isConnectable: false }),
    h(RF.Handle, { type: 'target', position: RF.Position.Top, style: mid, isConnectable: false }));
}
const nodeTypes = { city: City };

const name = id => M.nodes.find(n => n.id === id).label;
const fmt = d => d === null || d === undefined ? '?' : M.algo === 'dijkstra' ? d + ' ms' : d + (d === 1 ? ' hop' : ' hops');
const stepAt = t => M.steps[Math.min(M.steps.length - 1, Math.floor(t / M.STEP + 1e-6))];

function render() {
  const s = stepAt(simT), atRoute = s.kind === 'path';
  const route = new Set(atRoute ? M.path : []), routeE = new Set(atRoute ? M.pathEdges : []);
  const tree = new Set(Object.values(s.via)), tried = new Set((s.updated || []).map(id => s.via[id]));
  const nodes = M.nodes.map(n => {
    const on = route.has(n.id), settled = s.settled.includes(n.id), front = (s.frontier || []).includes(n.id), cur = n.id === s.node && !atRoute;
    return { id: n.id, type: 'city', position: { x: n.x - 59, y: n.y - 23 }, draggable: false,
      data: { name: n.label, dist: fmt(s.dist[n.id]), sub: on ? '#ffffff' : C.muted, box: {
        width: 118, padding: '7px 6px', borderRadius: 10, textAlign: 'center', fontFamily: 'system-ui, sans-serif', color: on ? '#ffffff' : C.ink,
        border: (cur ? 4 : 2) + 'px solid ' + (cur ? C.hi : on ? C.accent : settled ? C.good : front ? C.accent : C.line),
        background: on ? C.accent : settled ? C.goodTint : front ? C.tint : '#ffffff',
        boxShadow: selected === n.id ? '0 0 0 3px rgba(43,89,195,.3)' : 'none' } } };
  });
  const edges = M.edges.map(e => {
    const col = e.down ? C.bad : routeE.has(e.id) ? C.accent : !atRoute && tried.has(e.id) ? C.hi : !atRoute && tree.has(e.id) ? C.accent : C.line;
    const w = routeE.has(e.id) ? 6 : !atRoute && tried.has(e.id) ? 4 : !atRoute && tree.has(e.id) ? 3 : 2;
    return { id: e.id, source: e.a, target: e.b, type: 'straight', label: e.down ? 'down' : e.ms + ' ms',
      style: { stroke: col, strokeWidth: w, strokeDasharray: e.down ? '6 5' : 'none' },
      labelStyle: { fill: col === C.line ? C.muted : col, fontSize: 12, fontWeight: w > 2 ? 700 : 400 },
      labelBgStyle: { fill: '#ffffff' }, labelBgPadding: [3, 2] };
  });
  rroot.render(h(RF.ReactFlow, {
    nodes, edges, nodeTypes, fitView: true, minZoom: 0.2, fitViewOptions: { padding: 0.08 }, onInit: i => { inst = i; },
    nodesDraggable: false, nodesConnectable: false, elementsSelectable: true, zoomOnScroll: false, panOnDrag: false, preventScrolling: false,
    onNodeClick: (_, n) => { selected = selected === n.id ? null : n.id; render(); }
  }, h(RF.Background, { gap: 18, color: '#e6e9ef' })));
  caption(s, atRoute);
}

function caption(s, atRoute) {
  infoEl.innerHTML = '';
  const line1 = document.createElement('div'), b = document.createElement('b'), line2 = document.createElement('div');
  line2.style.color = C.muted;
  if (selected) {
    const links = M.edges.filter(e => e.a === selected || e.b === selected)
      .map(e => name(e.a === selected ? e.b : e.a) + ' ' + (e.down ? '(down)' : e.ms + ' ms'));
    const via = s.via[selected], e = via && M.edges.find(x => x.id === via);
    b.textContent = name(selected) + ': ';
    line1.append(b, document.createTextNode(selected === M.SRC ? 'the start.' : s.dist[selected] === null ? 'not reached yet.'
      : fmt(s.dist[selected]) + ' from Mumbai, reached from ' + name(e.a === selected ? e.b : e.a) + '.'));
    line2.textContent = 'Links: ' + links.join(', ') + '. Click it again to close.';
  } else {
    const algo = M.algo === 'dijkstra' ? 'Dijkstra · lowest latency' : 'BFS · fewest hops', o = M.other;
    b.textContent = (atRoute ? 'Route' : 'Step ' + (s.i + 1) + ' of ' + (M.steps.length - 1)) + ' · ' + algo + ': ';
    line1.append(b, document.createTextNode(s.note));
    line2.textContent = atRoute ? M.summary + ' ' + (o.algo === 'bfs' ? 'BFS' : 'Dijkstra') + ' picks ' + o.hops + ' hops, ' + o.cost + ' ms.'
      : 'Green = settled · blue = waiting · orange = just updated · click a city for its links';
  }
  infoEl.append(line1, line2);
}

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  get markerLabels() { return M ? M.markerLabels : []; },
  seek(t) {
    simT = t; if (!rroot) return;
    const key = stepAt(t).i;
    if (key !== lastKey) { lastKey = key; render(); }
  },
  mount(root, params) {
    M = model(params); simT = 0; selected = null; lastKey = 0;
    flowEl = document.createElement('div');
    flowEl.style.cssText = 'position:absolute;left:0;right:0;top:0;bottom:66px';
    flowEl.setAttribute('aria-label', 'Network map from Mumbai to London with link latencies; the route found is highlighted');
    infoEl = document.createElement('div');
    infoEl.style.cssText = 'position:absolute;left:0;right:0;bottom:0;height:66px;padding:8px 14px;font:13px/1.45 system-ui,sans-serif;color:#1d2433;border-top:1px solid #e3e7ee;background:#fafbfc;overflow:auto';
    root.append(flowEl, infoEl);
    rroot = ReactDOM.createRoot(flowEl);
    render();
    // fitView only runs on the first render (and never below minZoom, 0.5 by default, hence minZoom 0.2 above);
    // refit when the visual area changes size, a frame later so React Flow has measured it.
    ro = new ResizeObserver(() => requestAnimationFrame(() => { if (inst) inst.fitView({ padding: 0.08 }); }));
    ro.observe(flowEl);
  },
  update(params) { M = model(params); simT = 0; lastKey = 0; selected = null; render(); },
  destroy() { if (ro) ro.disconnect(); if (rroot) rroot.unmount(); flowEl && flowEl.remove(); infoEl && infoEl.remove(); rroot = M = inst = ro = null; }
};

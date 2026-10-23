// Cytoscape.js: the routing network laid out by hop count from Mumbai, so "fewest hops" is a column you can see.
// The layout runs once per network; seek(t) only changes data and classes, so nothing jumps while stepping.
const C = { ink: '#1d2433', muted: '#5b6475', line: '#c3c9d4', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d', bad: '#b42318',
  tint: '#e8eefb', goodTint: '#e6f4ec', soft: '#f4f6f9' };
let cy = null, M = null, wrap = null, graphEl = null, capEl = null, gutEl = null, ro = null, simT = 0, lastKey = '', layoutKey = '';

const STYLE = [
  { selector: 'node', style: { shape: 'round-rectangle', width: 118, height: 50, 'background-color': '#ffffff', 'border-width': 2, 'border-color': C.line,
    label: 'data(label)', 'text-wrap': 'wrap', 'text-valign': 'center', 'text-halign': 'center', 'font-size': 13, 'line-height': 1.3,
    color: C.ink, 'font-family': 'system-ui, -apple-system, sans-serif', 'font-weight': 600 } },
  { selector: 'node.frontier', style: { 'border-color': C.accent, 'background-color': C.tint } },
  { selector: 'node.settled', style: { 'border-color': C.good, 'background-color': C.goodTint } },
  { selector: 'node.current', style: { 'border-color': C.hi, 'border-width': 4 } },
  { selector: 'node.route', style: { 'background-color': C.accent, 'border-color': C.accent, color: '#ffffff' } },
  { selector: 'edge', style: { width: 2, 'line-color': C.line, 'curve-style': 'straight', label: 'data(label)', 'font-size': 12, color: C.muted,
    'text-background-color': '#ffffff', 'text-background-opacity': 1, 'text-background-padding': 2, 'text-margin-x': 'data(mx)', 'text-margin-y': 'data(my)', 'font-family': 'system-ui, sans-serif' } },
  { selector: 'edge.tree', style: { width: 3, 'line-color': C.accent, color: C.accent } },
  { selector: 'edge.tried', style: { width: 4, 'line-color': C.hi, color: C.hi, 'font-weight': 700 } },
  { selector: 'edge.route', style: { width: 6, 'line-color': C.accent, color: C.accent, 'font-weight': 700 } },
  { selector: 'edge.down', style: { 'line-style': 'dashed', 'line-color': C.bad, color: C.bad, width: 2 } }
];

const name = id => M.nodes.find(n => n.id === id).label;
const fmt = d => d === null || d === undefined ? '?' : M.algo === 'dijkstra' ? d + ' ms' : d + (d === 1 ? ' hop' : ' hops');
const stepAt = t => M.steps[Math.min(M.steps.length - 1, Math.floor(t / M.STEP + 1e-6))];

function elements() {
  return [
    ...M.nodes.map(n => ({ group: 'nodes', data: { id: n.id, label: n.label } })),
    ...M.edges.map(e => ({ group: 'edges', data: { id: e.id, source: e.a, target: e.b, label: e.ms + ' ms', mx: 0, my: 0 } }))
  ];
}
function layout() {
  // Breadth-first levels from Mumbai: one row per hop, so London sits in the 2-hop row however long the fast route is.
  // A fixed boundingBox keeps the layout the same at any container size; fit() then scales it to the container.
  cy.layout({ name: 'breadthfirst', roots: '#' + M.SRC, directed: false, spacingFactor: 1, avoidOverlap: true, animate: false,
    boundingBox: { x1: 0, y1: 0, w: 780, h: 460 } }).run();
  // Two crossing links put their labels on top of each other: slide each label along its own edge, away from the other.
  const mid = e => { const a = e.source().position(), b = e.target().position(); return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, dx: b.x - a.x, dy: b.y - a.y }; };
  const es = cy.edges().toArray();
  es.forEach(e => e.data({ mx: 0, my: 0 }));
  for (let i = 0; i < es.length; i++) for (let j = i + 1; j < es.length; j++) {
    const p = mid(es[i]), q = mid(es[j]);
    if (Math.hypot(p.x - q.x, p.y - q.y) > 60) continue;
    [[es[i], p, q], [es[j], q, p]].forEach(([e, m, o]) => {
      const len = Math.hypot(m.dx, m.dy), ux = m.dx / len, uy = m.dy / len, s = Math.sign((m.x - o.x) * ux + (m.y - o.y) * uy) || 1;
      e.data({ mx: s * ux * 34, my: s * uy * 34 });
    });
  }
  fit();
}
// Fit the graph, then label each row with its hop count in the HTML gutter beside it.
function fit() {
  cy.resize(); cy.fit(undefined, 24);
  const rows = {};
  cy.nodes().forEach(n => { const y = Math.round(n.position('y')); rows[y] = rows[y] || n; });
  gutEl.innerHTML = '';
  Object.keys(rows).map(Number).sort((a, b) => a - b).forEach((y, k) => {
    const d = document.createElement('div');
    d.textContent = k + (k === 1 ? ' hop' : ' hops');
    d.style.cssText = 'position:absolute;left:8px;right:4px;font:600 12px system-ui,sans-serif;color:#5b6475;transform:translateY(-50%);top:' + rows[y].renderedPosition('y') + 'px';
    gutEl.appendChild(d);
  });
}

function draw() {
  const s = stepAt(simT), atRoute = s.kind === 'path';
  const route = new Set(atRoute ? M.path : []), routeE = new Set(atRoute ? M.pathEdges : []);
  const tree = new Set(Object.values(s.via)), tried = new Set((s.updated || []).map(id => s.via[id]));
  cy.batch(() => {
    cy.nodes().forEach(n => {
      const id = n.id(), d = s.dist[id];
      n.data('label', name(id) + '\n' + fmt(d));
      n.toggleClass('settled', s.settled.includes(id) && !route.has(id));
      n.toggleClass('frontier', (s.frontier || []).includes(id));
      n.toggleClass('current', id === s.node && !atRoute);
      n.toggleClass('route', route.has(id));
    });
    cy.edges().forEach(e => {
      const m = M.edges.find(x => x.id === e.id());
      e.data('label', m.down ? 'down' : m.ms + ' ms');
      e.toggleClass('down', m.down);
      e.toggleClass('route', routeE.has(e.id()));
      e.toggleClass('tried', !atRoute && tried.has(e.id()));
      e.toggleClass('tree', !atRoute && !m.down && tree.has(e.id()) && !tried.has(e.id()));
    });
  });
  const o = M.other, algo = M.algo === 'dijkstra' ? 'Dijkstra · lowest latency' : 'BFS · fewest hops';
  capEl.innerHTML = '';
  const line1 = document.createElement('div'), b = document.createElement('b');
  b.textContent = (atRoute ? 'Route' : 'Step ' + (s.i + 1) + ' of ' + (M.steps.length - 1)) + ' · ' + algo + ': ';
  line1.append(b, document.createTextNode(s.note));
  const line2 = document.createElement('div');
  line2.style.color = C.muted;
  line2.textContent = atRoute
    ? M.summary + ' ' + (o.algo === 'bfs' ? 'BFS' : 'Dijkstra') + ' picks ' + o.hops + ' hops, ' + o.cost + ' ms.'
    : 'Green = settled · blue = waiting with a tentative ' + (M.algo === 'dijkstra' ? 'latency' : 'hop count') + ' · orange = just updated';
  capEl.append(line1, line2);
}

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  get markerLabels() { return M ? M.markerLabels : []; },
  seek(t) {
    simT = t; if (!cy) return;
    const key = stepAt(t).i;
    if (key !== lastKey) { lastKey = key; draw(); }
  },
  mount(root, params) {
    M = model(params); simT = 0; lastKey = '';
    wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;background:#ffffff';
    const row = document.createElement('div');
    row.style.cssText = 'flex:1;min-height:0;display:flex';
    gutEl = document.createElement('div');
    gutEl.style.cssText = 'flex:none;width:56px;position:relative;border-right:1px dashed #dbe0e8';
    graphEl = document.createElement('div');
    graphEl.style.cssText = 'flex:1;min-width:0;position:relative';
    row.append(gutEl, graphEl);
    graphEl.setAttribute('role', 'img');
    graphEl.setAttribute('aria-label', 'Network from Mumbai to London with link latencies; the route found is highlighted');
    capEl = document.createElement('div');
    capEl.style.cssText = 'flex:none;min-height:58px;padding:8px 14px;font:13px/1.45 system-ui,sans-serif;color:#1d2433;border-top:1px solid #e3e7ee;background:#fafbfc';
    wrap.append(row, capEl); root.appendChild(wrap);
    cy = cytoscape({ container: graphEl, elements: elements(), style: STYLE, autoungrabify: true, userZoomingEnabled: false,
      userPanningEnabled: false, boxSelectionEnabled: false, autounselectify: true });
    layout(); layoutKey = M.nodes.map(n => n.id).join() + '|' + M.edges.map(e => e.id).join();
    draw(); lastKey = 0;
    ro = new ResizeObserver(() => requestAnimationFrame(() => { if (cy) fit(); }));
    ro.observe(graphEl);
  },
  update(params) {
    M = model(params); simT = 0; lastKey = '';
    // Same nodes and links (a downed link is only restyled), so keep the layout; re-run it only if the network itself changed.
    const k = M.nodes.map(n => n.id).join() + '|' + M.edges.map(e => e.id).join();
    if (k !== layoutKey) { cy.elements().remove(); cy.add(elements()); layout(); layoutKey = k; }
    draw(); lastKey = 0;
  },
  destroy() { if (ro) ro.disconnect(); if (cy) cy.destroy(); if (wrap) wrap.remove(); cy = M = wrap = graphEl = capEl = gutEl = ro = null; }
};

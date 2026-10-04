// React Flow: the same pipeline as an interactive diagram. Follows the host timeline; click a step for details.
const h = React.createElement;
const RF = ReactFlow;
const C = { ink: '#1d2433', muted: '#5b6475', line: '#c9d0db', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d', tint: '#e8eefb', goodTint: '#e6f4ec' };
const POS = [[0, 0], [250, 0], [500, 0], [500, 160], [250, 160], [0, 160], [0, 320], [250, 320], [500, 320]];
let rroot = null, flowEl = null, infoEl = null, M = null, simT = 0, selected = null, lastKey = '';

function shortLine(id) {
  return {
    jira: 'Read-only Atlassian MCP', plan: 'Confluence + Sourceprimary metadata', build: 'Apex/LWC: RED, GREEN, REFACTOR',
    review: 'Quality, security, governor limits', deploy: 'deploytarget sandbox only', document: 'Requirement-to-code trace',
    govern: M.governanceMode === 'shadow' ? 'Shadow mode: observe and log' : 'Enforce mode: gate must approve',
    score: 'ScoreCardV2 + BoardPacket v2', improve: M.improvement === 'applied' ? 'Human approved: fix applied' : 'Held at the human gate'
  }[id];
}
function currentEvent() {
  let e = M.events[0];
  for (const ev of M.events) if (ev.start <= simT + 1e-6) e = ev;
  return e;
}
function render() {
  const e = currentEvent(), done = simT >= M.duration - 0.05;
  const seen = new Set(M.events.filter(ev => ev.start < e.start).map(ev => ev.station));
  if (done) M.events.forEach(ev => seen.add(ev.station));
  const row = i => Math.floor(i / 3);
  const nodes = M.stations.map((st, i) => {
    const active = st.id === e.station && !done, visited = seen.has(st.id) && !active;
    const ltr = row(i) !== 1;
    return {
      id: st.id, position: { x: POS[i][0], y: POS[i][1] },
      sourcePosition: ltr ? RF.Position.Right : RF.Position.Left,
      targetPosition: ltr ? RF.Position.Left : RF.Position.Right,
      data: { label: h('div', { style: { textAlign: 'left' } },
        h('div', { style: { fontWeight: 600, fontSize: 13 } }, st.n + ' · ' + st.label),
        h('div', { style: { fontSize: 11, color: C.muted, marginTop: 3 } }, shortLine(st.id))) },
      style: { width: 200, padding: 10, borderRadius: 10, color: C.ink, fontFamily: 'system-ui, sans-serif',
        border: '2px solid ' + (active ? C.accent : visited ? C.good : C.line),
        background: active ? C.tint : visited ? C.goodTint : '#fff',
        boxShadow: selected === st.id ? '0 0 0 3px rgba(43,89,195,.25)' : 'none' }
    };
  });
  const edges = [];
  for (let i = 0; i < 8; i++) {
    const a = M.stations[i].id, b = M.stations[i + 1].id;
    const lit = seen.has(b) || b === e.station;
    edges.push({ id: a + '-' + b, source: a, target: b, type: 'smoothstep',
      style: { stroke: lit ? C.accent : C.line, strokeWidth: 2 },
      markerEnd: { type: RF.MarkerType.ArrowClosed, color: lit ? C.accent : C.line } });
  }
  if (M.findings) {
    const hot = e.kind === 'findings' || e.kind === 'rework';
    edges.push({ id: 'rework', source: 'review', target: 'build', type: 'smoothstep', animated: hot,
      label: 'rework ×' + M.findings, labelStyle: { fill: C.hi, fontWeight: 600, fontSize: 11 },
      style: { stroke: C.hi, strokeWidth: 2, strokeDasharray: '5 4', opacity: hot ? 1 : 0.5 },
      markerEnd: { type: RF.MarkerType.ArrowClosed, color: C.hi } });
  }
  rroot.render(h(RF.ReactFlow, {
    nodes, edges, fitView: true, fitViewOptions: { padding: 0.12 },
    nodesDraggable: false, nodesConnectable: false, elementsSelectable: true,
    onNodeClick: (_, n) => { selected = selected === n.id ? null : n.id; render(); }
  }, h(RF.Background, { gap: 18, color: '#e6e9ef' }), h(RF.Controls, { showInteractive: false })));
  const st = selected ? M.stations.find(x => x.id === selected) : null;
  infoEl.innerHTML = '';
  const b = document.createElement('b');
  b.textContent = st ? st.n + ' · ' + st.label + ': ' : (done ? 'Result: ' : 'Now: ');
  infoEl.append(b, document.createTextNode(st ? st.detail : (done ? M.summary : e.note)));
  if (!st) { const hint = document.createElement('span'); hint.style.color = C.muted; hint.textContent = '  Click a step for details.'; infoEl.append(hint); }
}

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.events.map(e => e.start) : []; },
  seek(t) {
    simT = t;
    const e = currentEvent(), key = e.i + '|' + (t >= M.duration - 0.05);
    if (key !== lastKey) { lastKey = key; render(); }
  },
  mount(root, params) {
    M = model(params); simT = 0; selected = null; lastKey = '';
    flowEl = document.createElement('div');
    flowEl.style.cssText = 'position:absolute;left:0;right:0;top:0;bottom:58px';
    infoEl = document.createElement('div');
    infoEl.style.cssText = 'position:absolute;left:0;right:0;bottom:0;height:58px;padding:8px 14px;font:13px/1.45 system-ui,sans-serif;color:#1d2433;border-top:1px solid #e3e7ee;background:#fafbfc;overflow:auto';
    root.append(flowEl, infoEl);
    rroot = ReactDOM.createRoot(flowEl);
    render();
  },
  update(params) { M = model(params); simT = 0; lastKey = ''; render(); },
  destroy() { if (rroot) rroot.unmount(); flowEl && flowEl.remove(); infoEl && infoEl.remove(); rroot = null; M = null; }
};

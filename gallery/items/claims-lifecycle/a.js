// React Flow: every route a claim can take, with the one this claim takes lit up as the host timeline plays.
// Click a step for its rule. Layout switches to a vertical flow on narrow screens.
const h = React.createElement;
const RF = ReactFlow;
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', edge: '#c3cad6', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d',
  tint: '#e8eefb', goodTint: '#e9f5ee', hiTint: '#fbefe8' };
// Grid positions [col, row] and edge sides per layout: wide (left to right) and narrow (top to bottom).
const POS = {
  wide: { pend: [3, 0], intake: [0, 1], eligibility: [1, 1], auth: [2, 1], adjudicate: [3, 1], pay: [4, 1], notify: [5, 1], deny: [3, 2], appeal: [4, 2] },
  narrow: { intake: [1, 0], eligibility: [1, 1], auth: [1, 2], adjudicate: [1, 3], pend: [0, 3], deny: [2, 3.9], appeal: [2, 5.1], pay: [1, 4.6], notify: [1, 6] }
};
const SIDES_EDGE = {
  wide: { 'intake-eligibility': 'rl', 'eligibility-auth': 'rl', 'auth-adjudicate': 'rl', 'adjudicate-pend': 'tb', 'pend-adjudicate': 'bt',
    'adjudicate-pay': 'rl', 'adjudicate-deny': 'bt', 'deny-appeal': 'rl', 'deny-notify': 'bb', 'appeal-pay': 'tb', 'appeal-notify': 'rb', 'pay-notify': 'rl' },
  narrow: { 'intake-eligibility': 'bt', 'eligibility-auth': 'bt', 'auth-adjudicate': 'bt', 'adjudicate-pend': 'lr', 'pend-adjudicate': 'rl',
    'adjudicate-pay': 'bt', 'adjudicate-deny': 'rt', 'deny-appeal': 'bt', 'deny-notify': 'rr', 'appeal-pay': 'lr', 'appeal-notify': 'br', 'pay-notify': 'bt' }
};
const NARROW_NOLABEL = ['adjudicate-pend', 'pend-adjudicate', 'appeal-pay'];
const SIDE = { t: RF.Position.Top, r: RF.Position.Right, b: RF.Position.Bottom, l: RF.Position.Left };
let rroot = null, flowEl = null, infoEl = null, headEl = null, ro = null, inst = null, M = null, simT = 0, selected = null, lastKey = '', mode = 'wide';

// One node type with a hidden source and target handle on every side (offset so two-way edges do not overlap).
function Step({ data }) {
  const hs = [];
  for (const k of ['t', 'r', 'b', 'l']) {
    const vert = k === 't' || k === 'b', first = k === 't' || k === 'l';
    const at = (s) => Object.assign({ opacity: 0, width: 6, height: 6, minWidth: 0, minHeight: 0, border: 0 }, vert ? { left: s } : { top: s });
    hs.push(h(RF.Handle, { key: k + 's', id: k + 's', type: 'source', position: SIDE[k], style: at(first ? '25%' : '75%'), isConnectable: false }));
    hs.push(h(RF.Handle, { key: k + 't', id: k + 't', type: 'target', position: SIDE[k], style: at(first ? '75%' : '25%'), isConnectable: false }));
  }
  return h('div', { style: data.box }, hs,
    h('div', { style: { fontWeight: 600, fontSize: data.narrow ? 14 : 15, lineHeight: 1.2 } }, data.title),
    h('div', { style: { fontSize: data.narrow ? 12.5 : 13, color: data.subColor, marginTop: 3, lineHeight: 1.25 } }, data.sub));
}
const nodeTypes = { step: Step };

function shortLine(id) {
  const m = M.money;
  return {
    intake: '$' + m.billed + ' billed', eligibility: M.eligible ? 'Coverage active' : 'Not covered',
    auth: M.authStatus === 'not required' ? 'Not required' : M.authStatus === 'approved' ? 'Approved, on file' : 'Required, missing',
    adjudicate: 'Pay, pend or deny', pend: 'Ask for records', deny: 'Reason + appeal rights', appeal: M.appealFiled ? (M.appealWon ? 'Overturned' : 'Upheld') : 'Only after a denial',
    pay: '$' + m.planPays + ' to provider', notify: M.finalState === 'paid' ? 'Member owes $' + m.memberShare : 'Plan paid $0'
  }[id];
}
function currentEvent() { let e = M.events[0]; for (const ev of M.events) if (ev.start <= simT + 1e-6) e = ev; return e; }

function render() {
  const e = currentEvent(), done = simT >= M.duration - 0.05, narrow = mode === 'narrow';
  const past = M.events.filter(ev => ev.i < e.i || done);
  const seen = new Set(past.map(ev => ev.station));
  const onPath = new Set(M.events.map(ev => ev.station));
  const taken = new Set();
  const upto = done ? M.events.length : e.i + 1;
  for (let i = 1; i < upto; i++) taken.add(M.events[i - 1].station + '-' + M.events[i].station);
  const W = narrow ? 126 : 148, GX = narrow ? 146 : 194, GY = narrow ? 80 : 120;
  const nodes = M.stations.map(st => {
    const active = !done && st.id === e.station, visited = seen.has(st.id) && !active, off = !onPath.has(st.id);
    const trouble = st.id === 'deny' || st.id === 'pend' || (st.id === 'auth' && M.authStatus === 'missing') || (st.id === 'appeal' && !M.appealWon) || (st.id === 'notify' && M.finalState !== 'paid');
    const border = active ? C.accent : visited ? (trouble ? C.hi : C.good) : C.line;
    const fill = active ? C.tint : visited ? (trouble ? C.hiTint : C.goodTint) : '#fff';
    const [cx, cy] = POS[mode][st.id];
    return {
      id: st.id, type: 'step', position: { x: cx * GX, y: cy * GY },
      data: { narrow, title: st.n + ' · ' + st.label, sub: shortLine(st.id), subColor: visited && trouble ? C.hi : C.muted,
        box: { width: W, boxSizing: 'border-box', padding: '8px 10px', borderRadius: 10, color: C.ink, background: fill, fontFamily: 'system-ui, sans-serif',
          border: (active ? 3 : 2) + 'px ' + (off ? 'dashed ' : 'solid ') + border, opacity: off ? 0.55 : 1, cursor: 'pointer',
          boxShadow: selected === st.id ? '0 0 0 4px rgba(43,89,195,.22)' : active ? '0 4px 14px rgba(43,89,195,.18)' : 'none' } }
    };
  });
  const edges = M.edges.map(g => {
    const sd = SIDES_EDGE[mode][g.id], lit = taken.has(g.id);
    const bad = g.to === 'deny' || g.to === 'pend' || g.label === 'upheld' || g.label === 'no appeal';
    const col = lit ? (bad ? C.hi : C.accent) : C.edge;
    return { id: g.id, source: g.from, target: g.to, sourceHandle: sd[0] + 's', targetHandle: sd[1] + 't', type: 'smoothstep',
      label: g.label && (narrow ? lit && !NARROW_NOLABEL.includes(g.id) : true) ? g.label : undefined, labelStyle: { fill: lit ? col : C.muted, fontWeight: lit ? 600 : 400, fontSize: 12 },
      labelBgStyle: { fill: '#fff' }, labelBgPadding: [3, 2],
      style: { stroke: col, strokeWidth: lit ? 3 : 1.5, strokeDasharray: lit ? undefined : '5 4' },
      markerEnd: { type: RF.MarkerType.ArrowClosed, color: col, width: 16, height: 16 } };
  });
  rroot.render(h(RF.ReactFlow, {
    key: mode, nodes, edges, nodeTypes, fitView: true, fitViewOptions: { padding: 0.03, maxZoom: 1 }, minZoom: 0.3,
    nodesDraggable: false, nodesConnectable: false, elementsSelectable: false, proOptions: { hideAttribution: true },
    onInit: i => { inst = i; }, onNodeClick: (_, n) => { selected = selected === n.id ? null : n.id; render(); }
  }, h(RF.Background, { gap: 18, color: '#eef1f5' }), h(RF.Controls, { showInteractive: false, position: 'top-right' })));

  const paid = M.finalState === 'paid';
  headEl.querySelector('.sub').textContent = done ? M.summary : 'Step ' + (e.i + 1) + ' of ' + M.events.length + ' · ' + M.stations.find(s => s.id === e.station).label;
  const pill = headEl.querySelector('.pill');
  pill.textContent = done ? (paid ? 'Paid $' + M.paidAmount : 'Denied') : 'In process';
  pill.style.cssText = 'flex:none;font:600 12px system-ui,sans-serif;padding:3px 10px;border-radius:999px;border:1px solid ' +
    (done ? (paid ? C.good : C.hi) : C.line) + ';color:' + (done ? '#fff' : C.muted) + ';background:' + (done ? (paid ? C.good : C.hi) : '#fff');
  const st = selected ? M.stations.find(x => x.id === selected) : null;
  infoEl.innerHTML = '';
  const b = document.createElement('b');
  b.textContent = st ? st.n + ' · ' + st.label + ': ' : (done ? 'Last step: ' : 'Now: ');
  infoEl.append(b, document.createTextNode(st ? st.detail : e.note));
  if (!st) { const hint = document.createElement('span'); hint.style.color = C.muted; hint.textContent = '  Click a step for its rule.'; infoEl.append(hint); }
}

function layout(root) {
  const next = root.clientWidth < 640 ? 'narrow' : 'wide';
  if (next !== mode) { mode = next; render(); } else if (inst) inst.fitView({ padding: 0.03, maxZoom: 1 });
}

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  seek(t) {
    simT = t;
    const e = currentEvent(), key = e.i + '|' + (t >= M.duration - 0.05);
    if (key !== lastKey) { lastKey = key; render(); }
  },
  mount(root, params) {
    M = model(params); simT = 0; selected = null; lastKey = '';
    mode = root.clientWidth < 640 ? 'narrow' : 'wide';
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column';
    headEl = document.createElement('div');
    headEl.style.cssText = 'flex:none;min-height:56px;padding:8px 14px 4px;box-sizing:border-box;display:flex;gap:10px;align-items:flex-start;font-family:system-ui,sans-serif;background:#fff';
    headEl.innerHTML = '<div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:600;color:#1d2433">Health claim lifecycle</div>' +
      '<div class="sub" style="font-size:12px;color:#5b6475;line-height:1.3"></div></div><div class="pill"></div>';
    flowEl = document.createElement('div');
    flowEl.style.cssText = 'position:relative;flex:1;min-height:0';
    infoEl = document.createElement('div');
    infoEl.style.cssText = 'flex:none;height:64px;box-sizing:border-box;padding:8px 14px;font:13px/1.45 system-ui,sans-serif;color:#1d2433;border-top:1px solid #e3e7ee;background:#fafbfc;overflow:auto';
    wrap.append(headEl, flowEl, infoEl); root.append(wrap);
    rroot = ReactDOM.createRoot(flowEl);
    render();
    ro = new ResizeObserver(() => layout(root)); ro.observe(flowEl);
  },
  update(params) { M = model(params); simT = 0; lastKey = ''; selected = null; render(); },
  destroy() { if (ro) ro.disconnect(); if (rroot) rroot.unmount(); if (headEl) headEl.parentNode.remove(); rroot = null; M = null; inst = null; }
};

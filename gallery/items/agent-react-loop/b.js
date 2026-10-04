// React Flow: the ReAct loop as a diagram (Reason -> Act -> Observe -> Reason) with the five tools and a human
// approval gate. The host timeline moves the current step through the diagram; click a node or a step chip for details.
const h = React.createElement;
const RF = ReactFlow;
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', edge: '#c3cad6', accent: '#2b59c3', good: '#1f7a4d', bad: '#b42318',
  teal: '#0f766e', amber: '#b4530f', rose: '#9d174d', tint: '#e8eefb', goodTint: '#e9f5ee', badTint: '#fdecea', tealTint: '#e6f4f2', amberTint: '#fdf3e8', roseTint: '#fbecf2' };
const KIND = { thought: ['Thought', C.accent], action: ['Action', C.amber], observation: ['Observation', C.teal], human: ['Human approval', C.rose], final: ['Answer', C.good] };
const SIDE = { t: RF.Position.Top, r: RF.Position.Right, b: RF.Position.Bottom, l: RF.Position.Left };
// Node positions [x, y, width] for the two layouts.
const POS = {
  wide: { customer: [-20, 0, 170], reason: [250, 0, 190], final: [600, 0, 190], gate: [600, 120, 190], observe: [100, 210, 190], act: [400, 210, 190],
    crm: [-40, 370, 150], billing: [130, 370, 150], policy: [300, 370, 150], refund: [470, 370, 150], case: [640, 370, 150] },
  narrow: { customer: [0, 0, 104], final: [205, 0, 165], reason: [0, 96, 165], gate: [205, 96, 165], observe: [0, 206, 165], act: [205, 206, 165],
    crm: [0, 322, 116], billing: [127, 322, 116], policy: [254, 322, 116], refund: [63, 398, 116], case: [190, 398, 116] }
};
// [id, source, target, sourceHandle, targetHandle] per layout; handles are side + percent.
const LOOP = {
  wide: [['ask', 'customer', 'reason', 'r50', 'l50'], ['answer', 'reason', 'final', 'r30', 'l50'], ['decide', 'reason', 'act', 'b75', 't30'],
    ['gateIn', 'reason', 'gate', 'r75', 'l50'], ['gateOut', 'gate', 'act', 'b50', 'r50'], ['result', 'act', 'observe', 'l50', 'r50'], ['again', 'observe', 'reason', 't50', 'b25']],
  narrow: [['ask', 'customer', 'reason', 'b50', 't30'], ['answer', 'reason', 'final', 't75', 'l50'], ['decide', 'reason', 'act', 'b75', 't30'],
    ['gateIn', 'reason', 'gate', 'r30', 'l30'], ['gateOut', 'gate', 'act', 'b70', 't70'], ['result', 'act', 'observe', 'l50', 'r50'], ['again', 'observe', 'reason', 't30', 'b25']]
};
const TRANS = { 'request>thought': ['ask'], 'thought>action': ['decide'], 'action>observation': ['result'], 'observation>thought': ['again'],
  'thought>human': ['gateIn'], 'human>action': ['gateOut'], 'observation>final': ['again', 'answer'] };
let rroot = null, wrap = null, flowEl = null, infoEl = null, headEl = null, stripEl = null, ro = null, inst = null;
let M = null, simT = 0, selected = null, lastKey = '', mode = 'wide';

function Card({ data }) {
  const hs = [];
  for (const k of ['t', 'r', 'b', 'l']) for (const at of [25, 30, 50, 70, 75]) for (const ty of ['source', 'target']) {
    const vert = k === 't' || k === 'b';
    hs.push(h(RF.Handle, { key: k + at + ty, id: k + at + ty[0], type: ty, position: SIDE[k], isConnectable: false,
      style: Object.assign({ opacity: 0, width: 4, height: 4, minWidth: 0, minHeight: 0, border: 0 }, vert ? { left: at + '%' } : { top: at + '%' }) }));
  }
  return h('div', { style: data.box }, hs,
    h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 6, alignItems: 'baseline' } },
      h('span', { style: { fontWeight: 600, fontSize: data.small ? 12.5 : 14, color: data.titleColor || C.ink } }, data.title),
      data.badge ? h('span', { style: { fontSize: 11, fontWeight: 600, color: C.muted, whiteSpace: 'nowrap' } }, data.badge) : null),
    h('div', { style: { fontSize: data.small ? 11.5 : 12, color: data.subColor || C.muted, marginTop: 3, lineHeight: 1.3,
      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontFamily: data.mono ? 'ui-monospace, Menlo, monospace' : 'inherit' } }, data.sub));
}
const nodeTypes = { card: Card };

function stepIndex() { let k = -1; M.steps.forEach((s, i) => { if (s.start <= simT + 1e-6) k = i; }); return k; }
function approvedAt() { const s = M.steps.find(x => x.kind === 'human'); return s ? s.start + s.dur * 0.62 : Infinity; }

function render() {
  const k = stepIndex(), done = simT >= M.duration - 0.05, cur = M.steps[k], past = M.steps.slice(0, k + 1), narrow = mode === 'narrow';
  const kind = done ? 'done' : cur ? cur.kind : 'request', approved = simT >= approvedAt();
  const acts = past.filter(s => s.kind === 'action'), thoughts = past.filter(s => s.kind === 'thought'), lastObs = [...past].reverse().find(s => s.kind === 'observation');
  const lastThought = thoughts[thoughts.length - 1], lastAct = acts[acts.length - 1];
  const st = {
    customer: { title: 'Customer', sub: mode === 'narrow' ? '“Charged twice!”' : '“Charged twice this month. Can you fix it?”', on: kind === 'request', col: C.ink, seen: true },
    reason: { title: 'Reason', badge: thoughts.length ? 'thought ' + thoughts.length : '', on: kind === 'thought', col: C.accent, seen: !!thoughts.length,
      sub: !M.showThoughts ? (thoughts.length ? 'Hidden from the customer' : 'Plans the next step') : lastThought ? lastThought.text : 'Plans the next step', dashed: !M.showThoughts },
    act: { title: 'Act', badge: acts.length ? acts.length + ' call' + (acts.length > 1 ? 's' : '') : '', on: kind === 'action', col: C.amber, seen: !!acts.length,
      sub: lastAct ? lastAct.call.replace(/\(.*\)/, '(…)') + (lastAct.retry ? ' retry' : '') : 'Calls one tool', mono: !!lastAct },
    observe: { title: 'Observe', on: kind === 'observation', col: lastObs && lastObs.status === 'error' && kind === 'observation' ? C.bad : C.teal, seen: !!lastObs,
      sub: lastObs ? lastObs.text : 'Reads what the tool returned', subColor: lastObs && lastObs.status === 'error' ? C.bad : null },
    gate: { title: 'Human approval', on: kind === 'human', col: approved ? C.good : C.rose, seen: approved, dashed: !M.needsApproval, faded: !M.needsApproval,
      sub: !M.needsApproval ? 'Not needed: ' + M.amountText + ' is under $' + M.limit : approved ? 'Approved by Sam Okafor (APR-311)' : kind === 'human' ? 'Agent paused: waiting for Sam Okafor' : 'Refunds over $' + M.limit + ' need a supervisor' },
    final: { title: 'Answer', on: kind === 'final', col: C.good, seen: kind === 'final' || done, sub: kind === 'final' || done ? 'Reply sent: ' + M.amountText + ' refunded' : 'Reply to the customer' }
  };
  M.tools.forEach(t => {
    const mine = past.filter(s => s.tool === t.id), last = mine[mine.length - 1], n = mine.filter(s => s.kind === 'action').length;
    const on = !done && cur && cur.tool === t.id, err = last && last.status === 'error';
    st[t.id] = { title: t.label, small: true, badge: n ? '×' + n : '', on, seen: !!last, col: on && cur.kind === 'action' ? C.amber : err ? C.bad : C.teal,
      sub: on && cur.kind === 'action' ? (cur.retry ? 'Retrying…' : 'Calling…') : last && last.kind === 'observation' ? last.short : 'Idle', subColor: err ? C.bad : last && last.kind === 'observation' ? C.good : null };
  });
  const P = POS[mode];
  const nodes = Object.keys(P).map(id => {
    const s = st[id], [x, y, w] = P[id], tint = { [C.accent]: C.tint, [C.amber]: C.amberTint, [C.teal]: C.tealTint, [C.bad]: C.badTint, [C.rose]: C.roseTint, [C.good]: C.goodTint, [C.ink]: C.tint }[s.col];
    const border = s.on ? s.col : s.seen ? (s.col === C.bad ? C.bad : '#9fb3dc') : C.line;
    return { id, type: 'card', position: { x, y }, data: Object.assign({}, s, { titleColor: s.on ? s.col : C.ink,
      box: { width: w, boxSizing: 'border-box', padding: s.small ? '7px 9px' : '8px 11px', borderRadius: 10, fontFamily: 'system-ui, sans-serif', cursor: 'pointer', color: C.ink,
        background: s.on ? tint : '#fff', opacity: s.faded ? 0.6 : 1, border: (s.on ? 3 : 2) + 'px ' + (s.dashed ? 'dashed ' : 'solid ') + border,
        boxShadow: selected === id ? '0 0 0 4px rgba(43,89,195,.22)' : s.on ? '0 4px 14px rgba(29,36,51,.12)' : 'none' } }) };
  });
  // Which loop edges have been travelled, and which one is travelled right now.
  const used = {}, prevKind = j => j <= 0 ? 'request' : M.steps[j - 1].kind;
  past.forEach((s, j) => (TRANS[prevKind(j) + '>' + s.kind] || []).forEach(e => { used[e] = (used[e] || 0) + 1; }));
  const now = new Set(cur && !done ? TRANS[prevKind(k) + '>' + cur.kind] || [] : []);
  const edges = LOOP[mode].map(([id, a, b, sh, th]) => {
    const hot = now.has(id), lit = !!used[id], gateEdge = id.startsWith('gate'), col = hot ? (gateEdge ? C.rose : C.accent) : lit ? '#7f98d0' : C.edge;
    const label = id === 'again' ? (used.again ? 'loop ×' + used.again : 'loop') : id === 'gateIn' ? (narrow ? undefined : 'refund > $' + M.limit) : id === 'result' && !narrow ? 'result' : id === 'answer' ? 'done' : undefined;
    return { id, source: a, target: b, sourceHandle: sh + 's', targetHandle: th + 't', type: 'smoothstep', animated: hot, label,
      labelStyle: { fill: hot ? col : C.muted, fontWeight: 600, fontSize: 11.5 }, labelBgStyle: { fill: '#fff' }, labelBgPadding: [3, 2],
      style: { stroke: col, strokeWidth: hot ? 3 : lit ? 2 : 1.5, strokeDasharray: lit || hot ? undefined : '5 4', opacity: gateEdge && !M.needsApproval ? 0.45 : 1 },
      markerEnd: { type: RF.MarkerType.ArrowClosed, color: col, width: 16, height: 16 } };
  });
  M.tools.forEach(t => {
    const on = cur && !done && cur.tool === t.id, err = on && cur.status === 'error', call = on && cur.kind === 'action', back = on && cur.kind === 'observation';
    edges.push({ id: 'to-' + t.id, source: 'act', target: t.id, sourceHandle: 'b50s', targetHandle: 't50t', type: narrow ? 'default' : 'smoothstep', animated: call,
      style: { stroke: call ? C.amber : C.line, strokeWidth: call ? 3 : 1.2 }, markerEnd: { type: RF.MarkerType.ArrowClosed, color: call ? C.amber : C.line, width: 14, height: 14 } });
    if (back) edges.push({ id: 'from-' + t.id, source: t.id, target: 'observe', sourceHandle: 't30s', targetHandle: 'b50t', type: 'default', animated: true,
      style: { stroke: err ? C.bad : C.teal, strokeWidth: 3 }, markerEnd: { type: RF.MarkerType.ArrowClosed, color: err ? C.bad : C.teal, width: 16, height: 16 } });
  });
  rroot.render(h(RF.ReactFlow, {
    key: mode, nodes, edges, nodeTypes, fitView: true, fitViewOptions: { padding: narrow ? 0.06 : 0.05, maxZoom: 1.05 }, minZoom: 0.3,
    nodesDraggable: false, nodesConnectable: false, elementsSelectable: false, proOptions: { hideAttribution: true },
    onInit: i => { inst = i; }, onNodeClick: (_, n) => { selected = selected === n.id ? null : n.id; render(); }
  }, h(RF.Background, { gap: 18, color: '#eef1f5' }), h(RF.Controls, { showInteractive: false, position: 'top-right' })));
  renderHead(k, done, approved);
}

function nodeDetail(id, k, approved) {
  const past = M.steps.slice(0, k + 1), list = arr => arr.length ? arr.join('  ·  ') : 'Nothing yet.';
  if (id === 'reason') return M.showThoughts ? list(past.filter(s => s.kind === 'thought').map(s => s.loop + '. ' + s.text)) : 'Thoughts are hidden, as in a customer-facing view. The agent still reasons before every tool call.';
  if (id === 'act') return list(past.filter(s => s.kind === 'action').map(s => s.call));
  if (id === 'observe') return list(past.filter(s => s.kind === 'observation').map(s => s.text));
  if (id === 'gate') return M.needsApproval ? 'Policy: refunds over $' + M.limit + ' need a billing supervisor. ' + (approved ? 'Sam Okafor approved ' + M.amountText + ' (APR-311); only then did the agent call the Refund API.' : 'Not reached yet.') : M.amountText + ' is under the $' + M.limit + ' limit, so the agent may refund on its own.';
  if (id === 'customer') return 'Dana Reyes: "' + M.request + '"';
  if (id === 'final') return k === M.steps.length - 1 ? M.reply : 'The agent replies only after the refund and the case update.';
  const t = M.tools.find(x => x.id === id), mine = past.filter(s => s.tool === id);
  return t.detail + ' ' + (mine.length ? mine.map(s => s.kind === 'action' ? (s.retry ? 'Retry: ' : 'Call: ') + s.call : 'Result: ' + s.text).join('  ·  ') : 'Not called yet.');
}

function renderHead(k, done, approved) {
  const past = M.steps.slice(0, k + 1), acts = past.filter(s => s.kind === 'action'), cur = M.steps[k];
  headEl.querySelector('.sub').textContent = done ? M.summary : 'The ReAct loop: reason, act, observe, repeat until the agent can answer.';
  headEl.querySelector('.pill').textContent = 'Loop ' + (cur ? cur.loop : 0) + ' · ' + acts.length + ' tool call' + (acts.length === 1 ? '' : 's') + (acts.some(s => s.retry) ? ' · 1 retry' : ' · 0 retries') + ' · ' + (approved ? '1 approval' : '0 approvals');
  stripEl.innerHTML = '<span style="flex:none;font:600 11px/16px system-ui,sans-serif;color:#5b6475;margin-right:4px">Steps</span>';
  M.steps.forEach((s, j) => {
    const d = document.createElement('button'), col = s.status === 'error' ? C.bad : KIND[s.kind][1], hidden = !s.visible;
    d.title = KIND[s.kind][0] + ': ' + (s.kind === 'action' ? s.call : s.text);
    d.style.cssText = 'flex:1 1 0;min-width:0;max-width:30px;height:16px;padding:0;border-radius:4px;cursor:pointer;border:2px solid ' + (j === k && !done ? C.ink : 'transparent') +
      ';background:' + (j <= k ? (hidden ? '#c9ced8' : col) : '#eef1f5') + ';box-sizing:border-box';
    d.onclick = () => { selected = 'step:' + j; renderHead(stepIndex(), simT >= M.duration - 0.05, simT >= approvedAt()); };
    stripEl.append(d);
  });
  infoEl.innerHTML = '';
  const b = document.createElement('b'), add = (el, s, col) => { const n = document.createElement(el); n.textContent = s; if (col) n.style.color = col; infoEl.append(n); };
  if (selected && selected.startsWith('step:')) {
    const s = M.steps[+selected.slice(5)], [lab, col] = KIND[s.kind];
    add('b', 'Step ' + (s.i + 1) + ' · ' + (s.retry ? 'Retry' : lab) + (s.tool ? ' (' + M.tools.find(x => x.id === s.tool).label + ')' : '') + ': ', s.status === 'error' ? C.bad : col);
    add('span', s.kind === 'thought' && !s.visible ? 'Hidden in the customer view. ' + s.text : s.kind === 'action' ? s.call : s.text);
  } else if (selected) {
    add('b', (selected === 'gate' ? 'Human approval' : selected[0].toUpperCase() + selected.slice(1).replace('crm', 'CRM')) + ': ');
    add('span', nodeDetail(selected, k, approved));
  } else if (!cur) { add('b', 'Start: '); add('span', 'Dana reports a double charge. The agent begins to reason.'); }
  else {
    const [lab, col] = KIND[cur.kind];
    add('b', (done ? 'Final' : 'Now') + ' · ' + (cur.retry ? 'Retry' : cur.status === 'error' ? 'Error' : lab) + ': ', cur.status === 'error' ? C.bad : col);
    add('span', cur.kind === 'thought' && !cur.visible ? 'Thinking (hidden from the customer).' : cur.kind === 'action' ? cur.call : cur.kind === 'human' && !approved ? 'Asks Sam Okafor (billing supervisor) to approve a ' + M.amountText + ' refund. The agent waits.' : cur.text);
  }
  if (!selected) add('span', '  Click a node or a step for details.', C.muted);
}

function layout(root) {
  const next = root.clientWidth < 640 ? 'narrow' : 'wide';
  if (next !== mode) { mode = next; render(); } else if (inst) inst.fitView({ padding: mode === 'narrow' ? 0.06 : 0.05, maxZoom: 1.05 });
}

window.lab = {
  get duration() { return M ? M.duration : 20; },
  get markers() { return M ? M.markers : []; },
  seek(t) {
    simT = t;
    const key = stepIndex() + '|' + (t >= M.duration - 0.05) + '|' + (t >= approvedAt());
    if (key !== lastKey) { lastKey = key; render(); }
  },
  mount(root, params) {
    M = model(params); simT = 0; selected = null; lastKey = '';
    mode = root.clientWidth < 640 ? 'narrow' : 'wide';
    wrap = document.createElement('div'); wrap.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;background:#fff';
    headEl = document.createElement('div');
    headEl.style.cssText = 'flex:none;padding:8px 14px 2px;box-sizing:border-box;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:flex-start;font-family:system-ui,sans-serif';
    headEl.innerHTML = '<div style="flex:1 1 260px;min-width:0"><div style="font-size:14px;font-weight:600;color:#1d2433">Watch an agent resolve a billing dispute</div>' +
      '<div class="sub" style="font-size:12px;line-height:1.3;color:#5b6475"></div></div>' +
      '<div class="pill" style="flex:none;font:600 11.5px system-ui,sans-serif;padding:3px 10px;border-radius:999px;border:1px solid #dbe0e8;color:#1d2433;background:#fff"></div>';
    stripEl = document.createElement('div');
    stripEl.style.cssText = 'flex:none;display:flex;gap:3px;margin:6px 14px 2px';
    flowEl = document.createElement('div'); flowEl.style.cssText = 'position:relative;flex:1;min-height:0';
    infoEl = document.createElement('div');
    infoEl.style.cssText = 'flex:none;height:66px;box-sizing:border-box;padding:7px 14px;font:12.5px/1.45 system-ui,sans-serif;color:#1d2433;border-top:1px solid #e3e7ee;background:#fafbfc;overflow:auto;overflow-wrap:anywhere';
    wrap.append(headEl, stripEl, flowEl, infoEl); root.append(wrap);
    rroot = ReactDOM.createRoot(flowEl);
    render();
    ro = new ResizeObserver(() => requestAnimationFrame(() => { if (rroot) layout(root); })); ro.observe(flowEl);   // deferred: a synchronous re-render inside the observer trips "ResizeObserver loop completed"
  },
  update(params) { M = model(params); simT = 0; lastKey = ''; selected = null; render(); },
  destroy() { if (ro) ro.disconnect(); if (rroot) rroot.unmount(); if (wrap) wrap.remove(); rroot = null; M = null; inst = null; }
};

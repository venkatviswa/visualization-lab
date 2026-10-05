// React Flow swimlanes: one lane per desk, one node per piece of work in the lane of whoever does it, and the waits
// as labelled dashed edges between them. The host clock lights the current step or wait; done steps turn green.
// Wide: lanes are rows and time runs left to right. Narrow: lanes are columns and time runs down.
const h = React.createElement, RF = ReactFlow;
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', edge: '#c3cad6', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d', bad: '#b42318', tint: '#e8eefb', goodTint: '#e9f5ee', hiTint: '#fbefe8', badTint: '#fdecea', soft: '#f4f6f9', lane: '#f7f9fc' };
const HS = { opacity: 0, width: 6, height: 6, minWidth: 0, minHeight: 0, border: 0 };
let rroot = null, wrap = null, flowEl = null, infoEl = null, headEl = null, ro = null, inst = null, M = null, simT = 0, lastKey = '', mode = 'wide', selected = null;
const fmtD = d => (Math.round(d * 10) / 10) + ' d';

function Step({ data }) {
  return h('div', { style: data.box },
    h(RF.Handle, { id: 'in', type: 'target', position: data.vertical ? RF.Position.Top : RF.Position.Left, style: HS, isConnectable: false }),
    h(RF.Handle, { id: 'out', type: 'source', position: data.vertical ? RF.Position.Bottom : RF.Position.Right, style: HS, isConnectable: false }),
    h('div', { style: { fontWeight: 600, fontSize: data.small ? 10.5 : 12.5, lineHeight: 1.2 } }, data.title),
    h('div', { style: { fontSize: data.small ? 10 : 11, color: data.sub === 'now' ? C.accent : C.muted, marginTop: 2, fontWeight: data.sub === 'now' ? 600 : 400 } }, data.subText));
}
function Lane({ data }) {
  return h('div', { style: { width: data.w, height: data.h, borderRadius: 10, background: data.used ? C.lane : '#fff', border: '1px ' + (data.used ? 'solid' : 'dashed') + ' ' + C.line, boxSizing: 'border-box', padding: data.vertical ? '6px 4px' : '6px 10px', fontSize: data.small ? 10 : 11.5, fontWeight: 600, color: data.used ? C.muted : '#b8bfcc', textAlign: data.vertical ? 'center' : 'left', letterSpacing: '.04em', textTransform: 'uppercase' } }, data.label);
}
const nodeTypes = { step: Step, lane: Lane };
function currentEvent() { let e = M.events[0]; for (const ev of M.events) if (ev.at <= simT + 1e-6) e = ev; return e; }

function render() {
  const narrow = mode === 'narrow', e = currentEvent(), done = simT >= M.duration - 0.05;
  const works = M.events.filter(ev => ev.kind === 'work');
  const colW = narrow ? 76 : 150, rowH = narrow ? 64 : 74, boxW = narrow ? 68 : 134, boxH = narrow ? 44 : 48, laneHead = narrow ? 26 : 92;
  const nodes = [], edges = [];
  M.lanes.forEach((ln, li) => {
    const used = M.lanesUsed.includes(ln.id);
    nodes.push({ id: 'lane:' + ln.id, type: 'lane', selectable: false, zIndex: -1, data: { label: narrow && ln.id === 'adjud' ? 'Adjud.' : ln.label, used, vertical: narrow, small: narrow, w: narrow ? colW - 6 : laneHead + works.length * colW + 10, h: narrow ? laneHead + works.length * rowH + 10 : rowH - 8 },
      position: narrow ? { x: li * colW, y: 0 } : { x: 0, y: li * rowH } });
  });
  works.forEach((w, k) => {
    const li = M.lanes.findIndex(l => l.id === w.lane), isNow = !done && e.i === w.i, isDone = done || e.i > w.i;
    const col = isNow ? C.accent : isDone ? (w.bad ? C.bad : C.good) : C.line, bg = isNow ? C.tint : isDone ? (w.bad ? C.badTint : C.goodTint) : '#fff';
    nodes.push({ id: 'w' + w.i, type: 'step', data: { title: w.label, subText: isNow ? 'now · ' + fmtD(w.dur) : fmtD(w.dur) + (w.auto ? ' · rules engine' : ''), sub: isNow ? 'now' : '', small: narrow, vertical: narrow,
      box: { width: boxW, minHeight: boxH, boxSizing: 'border-box', padding: narrow ? '4px 5px' : '6px 9px', borderRadius: 8, background: bg, border: '1.5px solid ' + col, color: C.ink, fontFamily: 'system-ui, sans-serif', boxShadow: isNow ? '0 0 0 3px rgba(43,89,195,.18)' : 'none' } },
      position: narrow ? { x: li * colW + (colW - 6 - boxW) / 2, y: laneHead + k * rowH } : { x: laneHead + k * colW, y: li * rowH + (rowH - 8 - boxH) / 2 } });
  });
  // Edges between consecutive pieces of work; the waits between them are the edge labels
  for (let k = 1; k < works.length; k++) {
    const a = works[k - 1], b = works[k], waits = M.events.filter(ev => ev.kind === 'wait' && ev.i > a.i && ev.i < b.i), wt = waits.reduce((s, ev) => s + ev.dur, 0);
    const waitingNow = !done && waits.some(ev => ev.i === e.i), passed = done || e.i >= b.i;
    const col = waitingNow ? C.hi : passed ? C.good : C.edge;
    edges.push({ id: 'e' + k, source: 'w' + a.i, target: 'w' + b.i, sourceHandle: 'out', targetHandle: 'in', type: 'smoothstep', pathOptions: { borderRadius: 10 }, animated: waitingNow,
      label: wt > 0 ? (waitingNow ? 'waiting · ' : 'waits ') + fmtD(wt) + (narrow ? '' : ' · ' + waits.map(x => x.label.toLowerCase()).join(', ')) : (narrow ? '' : 'hand-off'),
      labelStyle: { fontSize: narrow ? 9 : 10.5, fill: waitingNow ? C.hi : wt > 0 ? C.ink : C.muted, fontWeight: waitingNow ? 700 : 500, fontFamily: 'system-ui, sans-serif' }, labelBgPadding: [4, 2], labelBgBorderRadius: 4, labelBgStyle: { fill: '#fff', fillOpacity: 0.92 },
      style: { stroke: col, strokeWidth: waitingNow ? 2.5 : 1.6, strokeDasharray: wt > 0 ? '6 4' : undefined }, markerEnd: { type: RF.MarkerType.ArrowClosed, color: col, width: 14, height: 14 } });
  }
  rroot.render(h(RF.ReactFlow, {
    key: mode + '|' + works.length + '|' + M.lanesUsed.length, nodes, edges, nodeTypes, fitView: true, fitViewOptions: { padding: 0.04, maxZoom: 1.1 }, minZoom: 0.25,
    nodesDraggable: false, nodesConnectable: false, elementsSelectable: false, proOptions: { hideAttribution: true },
    onInit: i => { inst = i; }, onNodeClick: (_, n) => { if (n.id.startsWith('lane:')) return; selected = selected === n.id ? null : n.id; render(); }
  }, h(RF.Background, { gap: 18, color: '#eef1f5' }), h(RF.Controls, { showInteractive: false, position: narrow ? 'bottom-right' : 'top-right' })));
  renderHead(e, done);
}
function renderHead(e, done) {
  const narrow = mode === 'narrow', T = M.totals;
  const dayNow = done ? T.elapsed : Math.min(T.elapsed, e.start + Math.max(0, Math.min(1, (simT - e.at) / Math.max(e.len, 1e-6))) * e.dur);
  const workSoFar = M.events.filter(ev => ev.kind === 'work').reduce((s, ev) => s + Math.max(0, Math.min(ev.dur, dayNow - ev.start)), 0);
  headEl.querySelector('.sub').textContent = done ? M.summary : 'Step ' + (e.i + 1) + ' of ' + M.events.length + ' · ' + (e.kind === 'wait' ? 'waiting: ' : '') + e.label + ' (' + M.lanes.find(l => l.id === e.lane).label + ')';
  const stats = narrow ? [['Day', (Math.round(dayNow * 10) / 10)], ['Working', fmtD(workSoFar)]] : [['Day', (Math.round(dayNow * 10) / 10) + ' of ' + T.elapsed], ['Work so far', fmtD(workSoFar)], ['Waiting so far', fmtD(Math.max(0, dayNow - workSoFar))], ['Hand-offs', T.handoffs]];
  headEl.querySelector('.stats').innerHTML = stats.map(([k, v]) => '<span style="display:inline-block;margin:0 0 4px 6px;padding:3px 8px;border-radius:8px;background:#f4f6f9;font-size:11.5px;color:#5b6475;white-space:nowrap">' + k + ' <b style="color:#1d2433">' + v + '</b></span>').join('');
  const sel = selected ? M.events.find(ev => 'w' + ev.i === selected) : null;
  infoEl.innerHTML = '';
  const b = document.createElement('b'); b.textContent = sel ? sel.label + ': ' : done ? 'Outcome: ' : 'Now: ';
  infoEl.append(b, document.createTextNode(sel ? sel.note : done ? M.summary + ' ' : e.note));
  if (!sel && done) { const w = document.createElement('b'); w.textContent = ' Only ' + T.touchShare + ' % of the elapsed time was anyone working on the claim.'; infoEl.append(w); }
  if (!sel && !done && !narrow) { const hint = document.createElement('span'); hint.style.color = C.muted; hint.textContent = '  Click a step for its detail.'; infoEl.append(hint); }
  infoEl.style.background = done && !sel ? (M.paid ? C.goodTint : C.hiTint) : '#fafbfc';
}
function layout(root) {
  const next = root.clientWidth < 640 ? 'narrow' : 'wide';
  if (next !== mode) { mode = next; infoEl.style.height = (mode === 'narrow' ? 74 : 66) + 'px'; render(); } else if (inst) inst.fitView({ padding: 0.04, maxZoom: 1.1 });
}

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  seek(t) { simT = t; const e = currentEvent(), key = e.i + '|' + Math.round(t * 4) + '|' + (t >= M.duration - 0.05); if (key !== lastKey) { lastKey = key; render(); } },
  mount(root, params) {
    M = model(params); simT = 0; selected = null; lastKey = '';
    mode = root.clientWidth < 640 ? 'narrow' : 'wide';
    wrap = document.createElement('div'); wrap.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;background:#fff';
    headEl = document.createElement('div');
    headEl.style.cssText = 'flex:none;padding:8px 14px 2px;box-sizing:border-box;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:flex-start;font-family:system-ui,sans-serif';
    headEl.innerHTML = '<div style="flex:1 1 300px;min-width:0"><div style="font-size:14px;font-weight:600;color:#1d2433">One claim, four desks · who does what, and the waiting in between</div>' +
      '<div class="sub" style="font-size:12px;line-height:1.35;color:#5b6475;min-height:16px"></div></div><div class="stats" style="flex:0 1 auto;text-align:right"></div>';
    flowEl = document.createElement('div'); flowEl.style.cssText = 'position:relative;flex:1;min-height:0';
    infoEl = document.createElement('div');
    infoEl.style.cssText = 'flex:none;height:' + (mode === 'narrow' ? 74 : 66) + 'px;box-sizing:border-box;padding:7px 14px;font:13px/1.4 system-ui,sans-serif;color:#1d2433;border-top:1px solid #e3e7ee;background:#fafbfc;overflow:auto';
    wrap.append(headEl, flowEl, infoEl); root.append(wrap);
    rroot = ReactDOM.createRoot(flowEl);
    render();
    ro = new ResizeObserver(() => requestAnimationFrame(() => { if (rroot) layout(root); })); ro.observe(flowEl);
  },
  update(params) { M = model(params); simT = 0; lastKey = ''; selected = null; render(); requestAnimationFrame(() => { if (inst) inst.fitView({ padding: 0.04, maxZoom: 1.1 }); }); },
  destroy() { if (ro) ro.disconnect(); if (rroot) rroot.unmount(); if (wrap) wrap.remove(); rroot = null; M = null; inst = null; }
};

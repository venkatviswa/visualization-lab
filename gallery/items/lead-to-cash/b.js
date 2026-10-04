// React Flow: all ten lead-to-cash stages as a snake diagram with the two optional detours (discount approval,
// credit hold). The deal's path lights up with the host timeline; a day strip shows where the time goes. Click a stage for details.
const h = React.createElement;
const RF = ReactFlow;
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', edge: '#c3cad6', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d',
  tint: '#e8eefb', goodTint: '#e9f5ee', hiTint: '#fbefe8', seg: ['#2b59c3', '#0f766e', '#b4530f'] };
// [track, step]: track 0 runs lead -> contract, track 1 runs back credit -> payment (a snake).
const SLOT = { lead: [0, 0], qualify: [0, 1], quote: [0, 2], approval: [0, 3], contract: [0, 4], credit: [1, 4], hold: [1, 3], order: [1, 2], invoice: [1, 1], payment: [1, 0] };
const EDGES = [
  ['lead', 'qualify', 'rl', 'bt'], ['qualify', 'quote', 'rl', 'bt'], ['quote', 'approval', 'rl', 'bt', '> 15%'], ['approval', 'contract', 'rl', 'bt'],
  ['quote', 'contract', 'tt', 'll', '≤ 15%'], ['contract', 'credit', 'bt', 'rl'], ['credit', 'hold', 'lr', 'tb', 'hold'], ['hold', 'order', 'lr', 'tb'],
  ['credit', 'order', 'bb', 'rr', 'pass'], ['order', 'invoice', 'lr', 'tb'], ['invoice', 'payment', 'lr', 'tb']
];
const SIDE = { t: RF.Position.Top, r: RF.Position.Right, b: RF.Position.Bottom, l: RF.Position.Left };
let rroot = null, wrap = null, flowEl = null, infoEl = null, headEl = null, stripEl = null, ro = null, inst = null;
let M = null, simT = 0, selected = null, lastKey = '', mode = 'wide';

function Step({ data }) {
  const hs = [];
  for (const k of ['t', 'r', 'b', 'l']) {
    const vert = k === 't' || k === 'b', first = k === 't' || k === 'l';
    const at = s => Object.assign({ opacity: 0, width: 6, height: 6, minWidth: 0, minHeight: 0, border: 0 }, vert ? { left: s } : { top: s });
    hs.push(h(RF.Handle, { key: k + 's', id: k + 's', type: 'source', position: SIDE[k], style: at(first ? '25%' : '75%'), isConnectable: false }));
    hs.push(h(RF.Handle, { key: k + 't', id: k + 't', type: 'target', position: SIDE[k], style: at(first ? '75%' : '25%'), isConnectable: false }));
  }
  return h('div', { style: data.box }, hs,
    h('div', { style: { fontWeight: 600, fontSize: 14.5, lineHeight: 1.2 } }, data.title),
    h('div', { style: { fontSize: 12.5, color: data.subColor, marginTop: 3, lineHeight: 1.25 } }, data.sub));
}
const nodeTypes = { step: Step };
const dayText = d => d + (d === 1 ? ' day' : ' days');
function currentEvent() { let e = M.events[0]; for (const ev of M.events) if (ev.start <= simT + 1e-6) e = ev; return e; }
function subLine(st, reached) {
  if (!st.onPath) return st.id === 'approval' ? 'Skipped: ' + M.discountPct + '% ≤ ' + M.approvalLimit + '%' : 'Skipped: credit passed';
  const evs = M.events.filter(e => e.station === st.id);
  return dayText(st.days) + (reached ? ' · to day ' + evs[evs.length - 1].dayEnd : '');
}

function render() {
  const e = currentEvent(), done = simT >= M.duration - 0.05, narrow = mode === 'narrow';
  const seen = new Set(M.events.filter(ev => ev.i < e.i || done).map(ev => ev.station));
  const taken = new Set(), upto = done ? M.events.length : e.i + 1;
  for (let i = 1; i < upto; i++) taken.add(M.events[i - 1].station + '-' + M.events[i].station);
  const route = new Set(M.events.slice(1).map((ev, i) => M.events[i].station + '-' + ev.station));
  const W = narrow ? 150 : 158, GA = narrow ? 82 : 196, GB = narrow ? 196 : 150;
  const nodes = M.stations.map(st => {
    const active = !done && st.id === e.station, visited = seen.has(st.id) && !active, off = !st.onPath, stall = st.id === 'approval' || st.id === 'hold';
    const [track, step] = SLOT[st.id], x = narrow ? track * GB : step * GA, y = narrow ? step * GA : track * GB;
    const border = active ? C.accent : visited ? (stall ? C.hi : C.good) : C.line;
    return {
      id: st.id, type: 'step', position: { x, y },
      data: { title: st.label, sub: subLine(st, seen.has(st.id) || active), subColor: visited && stall ? C.hi : C.muted,
        box: { width: W, boxSizing: 'border-box', padding: '8px 10px', borderRadius: 10, color: C.ink, fontFamily: 'system-ui, sans-serif', cursor: 'pointer',
          background: active ? C.tint : visited ? (stall ? C.hiTint : C.goodTint) : '#fff', opacity: off ? 0.55 : 1,
          border: (active ? 3 : 2) + 'px ' + (off ? 'dashed ' : 'solid ') + border,
          boxShadow: selected === st.id ? '0 0 0 4px rgba(43,89,195,.22)' : active ? '0 4px 14px rgba(43,89,195,.18)' : 'none' } }
    };
  });
  const edges = EDGES.map(([from, to, sw, sn, label]) => {
    const id = from + '-' + to, sd = narrow ? sn : sw, lit = taken.has(id);
    const possible = route.has(id);
    const bad = to === 'approval' || to === 'hold', col = lit ? (bad ? C.hi : C.accent) : C.edge;
    return { id, source: from, target: to, sourceHandle: sd[0] + 's', targetHandle: sd[1] + 't', type: 'smoothstep',
      label: narrow && sd[0] === sd[1] ? undefined : label, labelStyle: { fill: lit ? col : C.muted, fontWeight: lit ? 600 : 400, fontSize: 12 }, labelBgStyle: { fill: '#fff' }, labelBgPadding: [3, 2],
      style: { stroke: col, strokeWidth: lit ? 3 : 1.5, strokeDasharray: lit ? undefined : '5 4', opacity: possible || lit ? 1 : 0.6 },
      markerEnd: { type: RF.MarkerType.ArrowClosed, color: col, width: 16, height: 16 } };
  });
  rroot.render(h(RF.ReactFlow, {
    key: mode, nodes, edges, nodeTypes, fitView: true, fitViewOptions: { padding: narrow ? 0.14 : 0.04, maxZoom: 1.1 }, minZoom: 0.3,
    nodesDraggable: false, nodesConnectable: false, elementsSelectable: false, proOptions: { hideAttribution: true },
    onInit: i => { inst = i; }, onNodeClick: (_, n) => { selected = selected === n.id ? null : n.id; render(); }
  }, h(RF.Background, { gap: 18, color: '#eef1f5' }), h(RF.Controls, { showInteractive: false, position: 'top-right' })));
  renderHead(e, done);
}

function renderHead(e, done) {
  // Day counter: whole days elapsed inside the current stage, from the model's day boundaries.
  const u = Math.max(0, Math.min(1, (simT - e.start) / e.dur)), day = done ? M.totalDays : Math.round(e.dayStart + u * e.days);
  headEl.querySelector('.sub').textContent = done ? M.summary : 'Stage ' + (e.i + 1) + ' of ' + M.events.length + ' · ' + M.stations.find(s => s.id === e.station).label;
  const pill = headEl.querySelector('.pill');
  pill.textContent = done ? 'Paid · day ' + M.totalDays : 'Day ' + day;
  pill.style.cssText = 'flex:none;font:600 12px system-ui,sans-serif;padding:3px 10px;border-radius:999px;border:1px solid ' + (done ? C.good : C.line) +
    ';color:' + (done ? '#fff' : C.ink) + ';background:' + (done ? C.good : '#fff');
  // Day strip: one segment per stage on the path, width proportional to its days; stalls in orange.
  stripEl.innerHTML = '';
  const path = M.stations.filter(s => s.onPath && s.days > 0), total = M.totalDays, stripW = stripEl.clientWidth || 300;
  path.forEach((s, k) => {
    const reached = M.events.some(ev => ev.station === s.id && (ev.i <= e.i || done)), stall = s.id === 'approval' || s.id === 'hold';
    const d = document.createElement('div');
    d.title = s.label + ': ' + dayText(s.days);
    d.style.cssText = 'flex:' + s.days + ' 1 0;min-width:0;height:100%;overflow:hidden;white-space:nowrap;text-overflow:clip;font:600 11px/20px system-ui,sans-serif;padding:0 4px;box-sizing:border-box;' +
      'border-right:2px solid #fff;color:' + (reached ? '#fff' : C.muted) + ';background:' + (reached ? (stall ? C.hi : C.seg[k % 2]) : '#eef1f5');
    const px = stripW * s.days / total, full = s.label + ' ' + s.days + 'd';
    d.textContent = px > full.length * 6.6 + 10 ? full : px > String(s.days).length * 7 + 9 ? s.days : '';
    stripEl.append(d);
  });
  const st = selected ? M.stations.find(x => x.id === selected) : null;
  infoEl.innerHTML = '';
  const b = document.createElement('b');
  b.textContent = st ? st.label + ': ' : (done ? 'Last stage: ' : 'Now: ');
  infoEl.append(b, document.createTextNode(st ? st.detail : e.note));
  if (!st) { const hint = document.createElement('span'); hint.style.color = C.muted; hint.textContent = '  Click a stage for details.'; infoEl.append(hint); }
}

function layout(root) {
  const next = root.clientWidth < 640 ? 'narrow' : 'wide';
  if (next !== mode) { mode = next; render(); } else if (inst) inst.fitView({ padding: mode === 'narrow' ? 0.14 : 0.04, maxZoom: 1.1 });
}

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  seek(t) {
    simT = t;
    const e = currentEvent(), key = e.i + '|' + (t >= M.duration - 0.05);
    if (key !== lastKey) { lastKey = key; render(); } else renderHead(e, false);
  },
  mount(root, params) {
    M = model(params); simT = 0; selected = null; lastKey = '';
    mode = root.clientWidth < 640 ? 'narrow' : 'wide';
    wrap = document.createElement('div'); wrap.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;background:#fff';
    headEl = document.createElement('div');
    headEl.style.cssText = 'flex:none;min-height:52px;padding:8px 14px 4px;box-sizing:border-box;display:flex;gap:10px;align-items:flex-start;font-family:system-ui,sans-serif';
    headEl.innerHTML = '<div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:600;color:#1d2433">Lead to cash: where deals stall</div>' +
      '<div class="sub" style="font-size:12px;line-height:1.3;color:#5b6475"></div></div><div class="pill"></div>';
    stripEl = document.createElement('div');
    stripEl.style.cssText = 'flex:none;display:flex;height:20px;margin:2px 14px 4px;border-radius:5px;overflow:hidden';
    flowEl = document.createElement('div'); flowEl.style.cssText = 'position:relative;flex:1;min-height:0';
    infoEl = document.createElement('div');
    infoEl.style.cssText = 'flex:none;height:64px;box-sizing:border-box;padding:8px 14px;font:13px/1.45 system-ui,sans-serif;color:#1d2433;border-top:1px solid #e3e7ee;background:#fafbfc;overflow:auto';
    wrap.append(headEl, stripEl, flowEl, infoEl); root.append(wrap);
    rroot = ReactDOM.createRoot(flowEl);
    render();
    ro = new ResizeObserver(() => layout(root)); ro.observe(flowEl);
  },
  update(params) { M = model(params); simT = 0; lastKey = ''; selected = null; render(); },
  destroy() { if (ro) ro.disconnect(); if (rroot) rroot.unmount(); if (wrap) wrap.remove(); rroot = null; M = null; inst = null; }
};

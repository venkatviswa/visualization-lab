// React Flow: the reference architecture as a design-review diagram. It follows the host timeline: the active system,
// edges lit as the change flows, billing marked down, the retry queue for event-driven. Click a system for its role.
const h = React.createElement;
const RF = ReactFlow;
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', edge: '#c3cad6', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d', bad: '#b42318',
  tint: '#e8eefb', goodTint: '#e9f5ee', hiTint: '#fbefe8', badTint: '#fdecea', soft: '#f4f6f9' };
const SIDE = { t: RF.Position.Top, r: RF.Position.Right, b: RF.Position.Bottom, l: RF.Position.Left };
const DOWN = ['mdm', 'claims', 'billing', 'analytics'];
let rroot = null, wrap = null, flowEl = null, infoEl = null, headEl = null, ro = null, inst = null;
let M = null, simT = 0, selected = null, lastKey = '', mode = 'wide';

// Geometry per layout: node boxes and which side each edge leaves/enters.
function geo(narrow) {
  if (!narrow) {
    const col = i => i * 220, W = 170;
    return { W, busW: 830, pos: { maria: [col(0), 0], portal: [col(1), 0], gateway: [col(2), 0], crm: [col(3), 0], bus: [0, 140],
      queue: [col(2), 222], mdm: [col(0), 336], claims: [col(1), 336], billing: [col(2), 336], analytics: [col(3), 336] },
      top: [['maria', 'portal', 'r', 'l'], ['portal', 'gateway', 'r', 'l'], ['gateway', 'crm', 'r', 'l']], crmX: col(3) + W / 2, dx: i => col(i) + W / 2 };
  }
  const W = 170, dw = 84;
  return { W, dw, busW: 360, pos: { maria: [0, 0], portal: [190, 0], gateway: [190, 104], crm: [0, 104], bus: [0, 222],
    queue: [184, 288], mdm: [0, 362], claims: [92, 362], billing: [184, 362], analytics: [276, 362] },
    top: [['maria', 'portal', 'r', 'l'], ['portal', 'gateway', 'b', 't'], ['gateway', 'crm', 'l', 'r']], crmX: W / 2, dx: i => i * 92 + dw / 2 };
}
function Sys({ data }) {
  const hs = [];
  if (data.bus) {
    hs.push(h(RF.Handle, { key: 'in', id: 'in', type: 'target', position: SIDE.t, style: Object.assign({ left: data.inPct + '%' }, HS), isConnectable: false }));
    DOWN.forEach(d => hs.push(h(RF.Handle, { key: d, id: 'o-' + d, type: 'source', position: SIDE.b, style: Object.assign({ left: data.outPct[d] + '%' }, HS), isConnectable: false })));
  } else for (const k of ['t', 'r', 'b', 'l']) {
    hs.push(h(RF.Handle, { key: 's' + k, id: 's' + k, type: 'source', position: SIDE[k], style: HS, isConnectable: false }));
    hs.push(h(RF.Handle, { key: 't' + k, id: 't' + k, type: 'target', position: SIDE[k], style: HS, isConnectable: false }));
  }
  return h('div', { style: data.box }, hs,
    h('div', { style: { fontWeight: 600, fontSize: data.small ? 11.5 : 13.5, lineHeight: 1.2 } }, data.title),
    data.sub ? h('div', { style: { fontSize: data.small ? 10.5 : 11.5, color: C.muted, marginTop: 2, lineHeight: 1.2 } }, data.sub) : null,
    data.chip ? h('div', { style: Object.assign({ display: 'inline-block', marginTop: 5, padding: data.small ? '1px 5px' : '1px 8px', borderRadius: 999, fontSize: data.small ? 10 : 11.5, fontWeight: 600, whiteSpace: 'nowrap' }, data.chip.style) }, data.chip.text) : null,
    data.tag ? h('div', { style: { position: 'absolute', top: -10, right: 6, background: C.hi, color: '#fff', fontSize: 10.5, fontWeight: 700, padding: '1px 7px', borderRadius: 999 } }, data.tag) : null);
}
const HS = { opacity: 0, width: 6, height: 6, minWidth: 0, minHeight: 0, border: 0 };
const nodeTypes = { sys: Sys };
const ed = () => M.style === 'event';
const SUB = { maria: 'Plan member', portal: 'Experience', gateway: 'API layer', crm: 'System of record', mdm: 'Golden profile',
  claims: 'Claims letters', billing: 'Premium bills', analytics: 'Reporting', queue: 'Holds missed events' };
function currentEvent() { let e = M.events[0]; for (const ev of M.events) if (ev.start <= simT + 1e-6) e = ev; return e; }
function hops(path) {
  const out = [];
  for (let k = 1; k < path.length; k++) {
    const a = path[k - 1], b = path[k];
    if (ed() && a === 'bus' && b === 'billing') out.push('bus>queue', 'queue>billing'); else out.push(a + '>' + b);
  }
  return out;
}
const chip = (text, col, bg) => ({ text, style: { color: col, background: bg } });

function render() {
  const narrow = mode === 'narrow', G = geo(narrow), e = currentEvent(), done = simT >= M.duration - 0.05, snap = e.snap;
  const lit = new Set(), now = new Set(done ? [] : hops(e.path));
  M.events.forEach(ev => { if (ev.i <= e.i) hops(ev.path).forEach(k => lit.add(k)); });
  const reply = M.events.find(ev => (ev.kind === 'saved' || ev.kind === 'error') && ev.i <= e.i);
  const rolled = snap.status.crm === 'rolledback';
  const ids = ['maria'].concat(M.systems.map(s => s.id));
  const nodes = ids.map(id => {
    const s = M.systems.find(x => x.id === id), stt = snap.status[id], active = !done && e.station === id;
    const small = narrow && (DOWN.includes(id) || id === 'queue'), isBus = id === 'bus';
    let border = active ? C.accent : C.line, bg = active ? C.tint : '#fff', dash = 'solid', ch = null, tag = null;
    if (id === 'maria') ch = { typing: chip('Typing', C.accent, C.tint), saving: chip('Waiting…', C.accent, C.tint), saved: chip('Saw "Saved"', C.good, C.goodTint), error: chip('Saw an error', '#fff', C.bad) }[snap.member] || null;
    else if (id === 'queue') { ch = snap.queue ? chip(snap.queue + ' waiting', '#fff', C.hi) : chip('Empty', C.muted, C.soft); if (snap.queue) { border = C.hi; bg = C.hiTint; } }
    else if (s.holdsAddress) {
      const isNew = snap.addr[id] === 'new';
      if (stt === 'down') { ch = chip('Down', '#fff', C.bad); border = C.bad; bg = C.badTint; dash = 'dashed'; }
      else if (stt === 'rolledback') { ch = chip('Rolled back', C.hi, C.hiTint); border = C.hi; }
      else if (stt === 'skipped') ch = chip('Never called', C.muted, C.soft);
      else ch = chip(isNew ? M.newAddress : M.oldAddress, isNew ? C.good : C.muted, isNew ? C.goodTint : C.soft);
      if (rolled && snap.addr[id] !== snap.addr.crm) { tag = 'Out of step'; border = C.hi; bg = C.hiTint; ch = chip(M.newAddress, C.hi, '#fff'); }
    } else {
      const lab = { portal: { pass: 'Change sent' }, gateway: { pass: 'Checked: it is Maria' },
        bus: ed() ? { pass: 'Published: AddressChanged' } : { busy: 'Waiting for answers…', failed: 'Timed out', pass: 'All 4 answered' } }[id][stt];
      ch = lab ? (stt === 'failed' ? chip(lab, '#fff', C.bad) : chip(lab, C.accent, C.tint)) : chip('Idle', C.muted, C.soft);
    }
    const w = isBus ? G.busW : small ? G.dw : G.W;
    const box = { width: w, boxSizing: 'border-box', padding: small ? '6px 6px' : '8px 10px', borderRadius: 10, color: C.ink, fontFamily: 'system-ui, sans-serif', cursor: 'pointer',
      background: bg, border: (active ? 3 : 2) + 'px ' + dash + ' ' + border, position: 'relative', textAlign: small ? 'center' : 'left',
      minHeight: small ? (id === 'queue' ? 0 : 84) : 0, boxShadow: selected === id ? '0 0 0 4px rgba(43,89,195,.22)' : active ? '0 4px 14px rgba(43,89,195,.18)' : 'none' };
    if (isBus) Object.assign(box, { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: active ? C.tint : '#f7f9fc' });
    const pct = x => +(100 * x / G.busW).toFixed(2);
    return { id, type: 'sys', position: { x: G.pos[id][0], y: G.pos[id][1] },
      data: { box, small, bus: isBus, inPct: pct(G.crmX), outPct: Object.fromEntries(DOWN.map((d, i) => [d, pct(G.dx(i))])),
        title: id === 'maria' ? 'Maria' : s.name, sub: isBus ? (narrow ? null : ed() ? 'Topic: AddressChanged · 1 publish, ' + M.integrations.eventSubscriptions + ' subscriptions' : M.integrations.p2pFromCrm + ' synchronous calls, one at a time') : (small ? null : SUB[id]), chip: ch, tag } };
  });
  const edges = [];
  const mk = (id, source, target, sh, th, label) => {
    const on = lit.has(id), act = now.has(id);
    let col = on ? C.accent : C.edge;
    if (id === 'bus>billing' && (snap.status.bus === 'failed')) col = C.bad;
    edges.push({ id, source, target, sourceHandle: sh, targetHandle: th, type: 'smoothstep', animated: act,
      label: narrow ? undefined : label, labelStyle: { fill: on ? col : C.muted, fontSize: 11.5, fontWeight: on ? 600 : 400 }, labelBgStyle: { fill: '#fff' }, labelBgPadding: [3, 2],
      style: { stroke: col, strokeWidth: on ? 3 : 1.5, strokeDasharray: col === C.bad ? '6 4' : on ? undefined : '5 4' },
      markerEnd: { type: RF.MarkerType.ArrowClosed, color: col, width: 16, height: 16 } });
  };
  G.top.forEach(([a, b, s1, s2]) => mk(a + '>' + b, a, b, 's' + s1, 't' + s2));
  mk('crm>bus', 'crm', 'bus', 'sb', 'in', ed() ? 'publish' : 'call');
  DOWN.forEach((d, i) => {
    if (ed() && d === 'billing') { mk('bus>queue', 'bus', 'queue', 'o-billing', 'tt', undefined); mk('queue>billing', 'queue', 'billing', 'sb', 'tt'); }
    else mk('bus>' + d, 'bus', d, 'o-' + d, 'tt', ed() ? 'subscribe' : 'sync ' + (i + 1));
  });
  if (reply) {
    // the answer travels back to Maria along the request path: green for Saved, red for the error
    const col = reply.kind === 'saved' ? C.good : C.bad;
    G.top.forEach(([a, b]) => { const ed2 = edges.find(x => x.id === a + '>' + b); ed2.style = Object.assign({}, ed2.style, { stroke: col }); ed2.markerEnd = Object.assign({}, ed2.markerEnd, { color: col }); ed2.animated = !done && e === reply; });
    const cb = edges.find(x => x.id === 'crm>bus'); if (!ed()) { cb.style = Object.assign({}, cb.style, { stroke: col }); cb.markerEnd = Object.assign({}, cb.markerEnd, { color: col }); }
  }
  rroot.render(h(RF.ReactFlow, {
    key: mode, nodes, edges, nodeTypes, fitView: true, fitViewOptions: { padding: narrow ? 0.08 : 0.06, maxZoom: 1.15 }, minZoom: 0.3,
    nodesDraggable: false, nodesConnectable: false, elementsSelectable: false, proOptions: { hideAttribution: true },
    onInit: i => { inst = i; }, onNodeClick: (_, n) => { selected = selected === n.id ? null : n.id; render(); }
  }, h(RF.Background, { gap: 18, color: '#eef1f5' }), h(RF.Controls, { showInteractive: false, position: 'top-right' })));
  renderHead(e, done, snap);
}

function renderHead(e, done, snap) {
  const sc = M.scenes[e.scene], ig = M.integrations, narrow = mode === 'narrow';
  headEl.querySelector('.sub').textContent = done ? M.summary : 'Scene ' + (sc.i + 1) + ' of ' + M.scenes.length + ' · ' + sc.title + ': ' + sc.caption;
  const n = M.holders.filter(x => snap.addr[x] === 'new').length, waited = snap.member === 'saved' || snap.member === 'error';
  const stats = [['Maria waited', waited ? M.responseText : snap.member === 'saving' ? '…' : '0 s', snap.member === 'error'],
    [ed() ? 'Connections' : 'P2P links', ed() ? '1 + ' + ig.eventSubscriptions : ig.p2pFromCrm + ' (mesh ' + ig.p2pMesh + ')', false], ['New address', n + ' of ' + M.holders.length, false]];
  headEl.querySelector('.stats').innerHTML = stats.map(([k, v, bad]) => '<span style="display:inline-block;margin:0 0 4px 6px;padding:3px 8px;border-radius:8px;background:#f4f6f9;font-size:11.5px;color:#5b6475;white-space:nowrap">' + k +
    ' <b style="color:' + (bad ? C.bad : C.ink) + '">' + v + '</b></span>').join('');
  const s = selected ? (selected === 'maria' ? { name: 'Maria', role: 'A health plan member who has just moved house. She only sees the portal.' } : M.systems.find(x => x.id === selected)) : null;
  const last = e.scene === M.scenes.length - 1;
  infoEl.innerHTML = '';
  const b = document.createElement('b');
  b.textContent = s ? s.name + ': ' : last ? 'Outcome: ' : 'Now: ';
  infoEl.append(b, document.createTextNode(s ? s.role : last ? M.outcome + ' ' : e.note));
  if (!s && last) { const w = document.createElement('b'); w.textContent = M.soWhat; infoEl.append(w); }
  if (!s && !(last && mode === 'narrow')) { const hint = document.createElement('span'); hint.style.color = C.muted; hint.textContent = '  Click a system for its role.'; infoEl.append(hint); }
  infoEl.style.background = last && !s ? (M.consistent ? C.goodTint : C.hiTint) : '#fafbfc';
}

function layout(root) {
  const next = root.clientWidth < 640 ? 'narrow' : 'wide';
  if (next !== mode) { mode = next; infoEl.style.height = (mode === 'narrow' ? 92 : 62) + 'px'; render(); } else if (inst) inst.fitView({ padding: mode === 'narrow' ? 0.08 : 0.06, maxZoom: 1.15 });
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
    wrap = document.createElement('div'); wrap.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;background:#fff';
    headEl = document.createElement('div');
    headEl.style.cssText = 'flex:none;padding:8px 14px 2px;box-sizing:border-box;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:flex-start;font-family:system-ui,sans-serif';
    headEl.innerHTML = '<div style="flex:1 1 300px;min-width:0"><div style="font-size:14px;font-weight:600;color:#1d2433">One address change, eight systems</div>' +
      '<div class="sub" style="font-size:12px;line-height:1.35;color:#5b6475;min-height:32px"></div></div><div class="stats" style="flex:0 1 auto;text-align:right"></div>';
    flowEl = document.createElement('div'); flowEl.style.cssText = 'position:relative;flex:1;min-height:0';
    infoEl = document.createElement('div');
    infoEl.style.cssText = 'flex:none;height:' + (mode === 'narrow' ? 92 : 62) + 'px;box-sizing:border-box;padding:7px 14px;font:13px/1.4 system-ui,sans-serif;color:#1d2433;border-top:1px solid #e3e7ee;background:#fafbfc;overflow:auto';
    wrap.append(headEl, flowEl, infoEl); root.append(wrap);
    rroot = ReactDOM.createRoot(flowEl);
    render();
    ro = new ResizeObserver(() => layout(root)); ro.observe(flowEl);
  },
  update(params) { M = model(params); simT = 0; lastKey = ''; selected = null; render(); },
  destroy() { if (ro) ro.disconnect(); if (rroot) rroot.unmount(); if (wrap) wrap.remove(); rroot = null; M = null; inst = null; }
};

// React Flow entity diagram: ten objects as entity boxes with their key fields and the relations as labelled lines.
// The host clock walks the chosen process: the object being created or updated lights up, the relation it arrives along
// animates, touched objects keep a tint (their owning team's colour when ownership is on) and the rest fade.
const h = React.createElement, RF = ReactFlow;
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', edge: '#c3cad6', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d', bad: '#b42318', tint: '#e8eefb', goodTint: '#e9f5ee', soft: '#f4f6f9' };
const TEAM = { membership: '#2b59c3', network: '#0f766e', claims: '#6d4bbf', service: '#be4d8a', finance: '#b4530f' };
const HS = { opacity: 0, width: 6, height: 6, minWidth: 0, minHeight: 0, border: 0 };
const POS = { wide: { policy: [1, 0], provider: [3, 0], auth: [4, 0], case: [0, 1], letter: [1, 1], member: [2, 1], appeal: [0, 2], claim: [2, 2], line: [3, 2], payment: [4, 2] },
  narrow: { policy: [0, 0], provider: [1, 0], member: [0, 1], auth: [1, 1], claim: [0, 2], line: [1, 2], letter: [0, 3], payment: [1, 3], case: [0, 4], appeal: [1, 4] } };
let rroot = null, wrap = null, flowEl = null, infoEl = null, headEl = null, ro = null, inst = null, M = null, simT = 0, lastKey = '', mode = 'wide', selected = null;

function Entity({ data }) {
  const hs = [];
  for (const k of ['Top', 'Right', 'Bottom', 'Left']) { hs.push(h(RF.Handle, { key: 's' + k, id: 's' + k, type: 'source', position: RF.Position[k], style: HS, isConnectable: false })); hs.push(h(RF.Handle, { key: 't' + k, id: 't' + k, type: 'target', position: RF.Position[k], style: HS, isConnectable: false })); }
  return h('div', { style: data.box }, hs,
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, padding: data.small ? '4px 6px' : '5px 9px', borderBottom: '1px solid ' + data.border, background: data.headBg, borderRadius: '7px 7px 0 0' } },
      h('div', { style: { fontWeight: 600, fontSize: data.small ? 10.5 : 12.5, lineHeight: 1.2, flex: 1, color: data.headInk } }, data.title),
      data.chip ? h('span', { style: { fontSize: 9.5, fontWeight: 600, color: '#fff', background: data.chipBg, borderRadius: 999, padding: '1px 6px', whiteSpace: 'nowrap' } }, data.chip) : null),
    data.small ? null : h('div', { style: { padding: '4px 9px 6px', fontSize: 10.5, color: C.muted, lineHeight: 1.35 } }, data.fields.map((f, i) => h('div', { key: i }, f))),
    data.badge ? h('div', { style: { position: 'absolute', top: -9, right: -8, fontSize: 10, fontWeight: 700, color: '#fff', background: data.badgeBg, borderRadius: 999, padding: '1px 7px', boxShadow: '0 1px 3px rgba(0,0,0,.2)' } }, data.badge) : null);
}
const nodeTypes = { entity: Entity };
function currentEvent() { let e = M.events[0]; for (const ev of M.events) if (ev.start <= simT + 1e-6) e = ev; return e; }
function side(a, b) { const [ax, ay] = a, [bx, by] = b; if (ay === by) return ax < bx ? ['sRight', 'tLeft'] : ['sLeft', 'tRight']; if (ax === bx || Math.abs(ay - by) >= Math.abs(ax - bx)) return ay < by ? ['sBottom', 'tTop'] : ['sTop', 'tBottom']; return ax < bx ? ['sRight', 'tLeft'] : ['sLeft', 'tRight']; }

function render() {
  const narrow = mode === 'narrow', e = currentEvent(), done = simT >= M.duration - 0.05, pos = POS[narrow ? 'narrow' : 'wide'];
  const colW = narrow ? 180 : 236, rowH = narrow ? 84 : 150, W = narrow ? 150 : 196;
  const seen = new Set(M.events.filter(ev => ev.i <= e.i).map(ev => ev.object)), referenced = new Set(M.events.filter(ev => ev.i <= e.i && ev.via).map(ev => ev.via)), order = {}; M.events.forEach(ev => { if (ev.i <= e.i && order[ev.object] === undefined) order[ev.object] = Object.keys(order).length + 1; });
  const nodes = M.objects.map(o => {
    const active = !done && e.object === o.id, touched = seen.has(o.id), col = M.ownership ? TEAM[o.team] : C.accent;
    const border = active ? C.hi : touched ? col : referenced.has(o.id) ? col + '88' : C.line, bg = active ? '#fff7f2' : touched ? '#fff' : '#fbfcfd', headBg = active ? '#fde7da' : touched ? col + '1f' : C.soft;
    return { id: o.id, type: 'entity', position: { x: pos[o.id][0] * colW, y: pos[o.id][1] * rowH },
      data: { title: o.label, fields: o.fields, small: narrow, border, headBg, headInk: touched || active ? C.ink : C.muted, chip: M.ownership && !narrow ? o.teamLabel : null, chipBg: col,
        badge: order[o.id] ? String(order[o.id]) : null, badgeBg: active ? C.hi : col,
        box: { width: W, boxSizing: 'border-box', borderRadius: 8, background: bg, border: (active ? 2 : 1.5) + 'px solid ' + border, color: C.ink, fontFamily: 'system-ui, sans-serif', opacity: touched || active || M.path.includes(o.id) || referenced.has(o.id) ? 1 : 0.45, boxShadow: active ? '0 0 0 4px rgba(194,65,12,.18)' : 'none', position: 'relative' } } };
  });
  const travelledNow = M.events.filter(ev => ev.i <= e.i && ev.via).map(ev => M.relations.find(r => (r.from === ev.via && r.to === ev.object) || (r.from === ev.object && r.to === ev.via))).filter(Boolean);
  const nowRel = !done && e.via ? travelledNow[travelledNow.length - 1] : null;
  const edges = M.relations.map(r => {
    const used = travelledNow.some(x => x.i === r.i), now = nowRel && nowRel.i === r.i, [sh, th] = side(pos[r.from], pos[r.to]);
    const col = now ? C.hi : used ? (M.ownership ? '#5b6475' : C.accent) : C.edge;
    return { id: 'r' + r.i, source: r.from, target: r.to, sourceHandle: sh, targetHandle: th, type: 'default', animated: !!now,
      label: used || now ? r.label + ' · ' + r.card : '', labelStyle: { fontSize: narrow ? 9 : 10, fill: now ? C.hi : C.ink, fontWeight: 600, fontFamily: 'system-ui, sans-serif' },
      labelBgPadding: [3, 2], labelBgBorderRadius: 3, labelBgStyle: { fill: '#fff', fillOpacity: 0.9 }, style: { stroke: col, strokeWidth: now ? 2.5 : used ? 2 : 1.2, opacity: used || now ? 1 : 0.7 }, zIndex: used || now ? 2 : 0 };
  });
  rroot.render(h(RF.ReactFlow, {
    key: mode, nodes, edges, nodeTypes, fitView: true, fitViewOptions: { padding: 0.04, maxZoom: 1.1 }, minZoom: 0.25,
    nodesDraggable: false, nodesConnectable: false, elementsSelectable: false, proOptions: { hideAttribution: true },
    onInit: i => { inst = i; }, onNodeClick: (_, n) => { selected = selected === n.id ? null : n.id; render(); }
  }, h(RF.Background, { gap: 18, color: '#eef1f5' }), h(RF.Controls, { showInteractive: false, position: narrow ? 'bottom-right' : 'top-right' })));
  renderHead(e, done);
}
function renderHead(e, done) {
  const narrow = mode === 'narrow', o = M.objects.find(x => x.id === e.object);
  headEl.querySelector('.ttl').textContent = 'The data model comes alive · ' + M.processTitle.toLowerCase() + ' walks the entity diagram';
  headEl.querySelector('.sub').textContent = done ? M.summary : 'Step ' + (e.i + 1) + ' of ' + M.events.length + ' · ' + M.steps[e.i].title + (o && M.ownership ? ' (' + o.teamLabel + ')' : '');
  const touchedSoFar = new Set(M.events.filter(ev => ev.i <= e.i).map(ev => ev.object)).size;
  const stats = narrow ? [['Objects', touchedSoFar + '/' + M.objects.length], ['Teams', String(M.teamsInvolved.length)]] : [['Objects touched', touchedSoFar + ' of ' + M.objects.length], ['Teams involved', String(M.teamsInvolved.length)], ['Hand-offs', String(M.handoffs)], ['Relations', String(M.relations.length)]];
  headEl.querySelector('.stats').innerHTML = stats.map(([k, v]) => '<span style="display:inline-block;margin:0 0 4px 6px;padding:3px 8px;border-radius:8px;background:#f4f6f9;font-size:11.5px;color:#5b6475;white-space:nowrap">' + k + ' <b style="color:#1d2433">' + v + '</b></span>').join('');
  const sel = selected ? M.objects.find(x => x.id === selected) : null;
  infoEl.innerHTML = '';
  const b = document.createElement('b'); b.textContent = sel ? sel.label + ': ' : done ? 'Outcome: ' : 'Now: ';
  infoEl.append(b, document.createTextNode(sel ? 'owned by ' + sel.teamLabel + ' · fields ' + sel.fields.join(', ') + ' · relations: ' + M.relations.filter(r => r.from === sel.id || r.to === sel.id).map(r => (r.from === sel.id ? r.label + ' → ' + M.objects.find(x => x.id === r.to).label : M.objects.find(x => x.id === r.from).label + ' ' + r.label + ' →')).join('; ') : done ? M.summary : e.note));
  if (!sel && !done && !narrow) { const hint = document.createElement('span'); hint.style.color = C.muted; hint.textContent = '  Click an object for its fields and relations.'; infoEl.append(hint); }
  infoEl.style.background = done && !sel ? C.goodTint : '#fafbfc';
}
function layout(root) {
  const next = root.clientWidth < 640 ? 'narrow' : 'wide';
  if (next !== mode) { mode = next; infoEl.style.height = (mode === 'narrow' ? 74 : 66) + 'px'; render(); } else if (inst) inst.fitView({ padding: 0.04, maxZoom: 1.1 });
}

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  seek(t) { simT = t; const e = currentEvent(), key = e.i + '|' + (t >= M.duration - 0.05); if (key !== lastKey) { lastKey = key; render(); } },
  mount(root, params) {
    M = model(params); simT = 0; selected = null; lastKey = '';
    mode = root.clientWidth < 640 ? 'narrow' : 'wide';
    wrap = document.createElement('div'); wrap.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;background:#fff';
    headEl = document.createElement('div');
    headEl.style.cssText = 'flex:none;padding:8px 14px 2px;box-sizing:border-box;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:flex-start;font-family:system-ui,sans-serif';
    headEl.innerHTML = '<div style="flex:1 1 300px;min-width:0"><div class="ttl" style="font-size:14px;font-weight:600;color:#1d2433"></div><div class="sub" style="font-size:12px;line-height:1.35;color:#5b6475;min-height:16px"></div></div><div class="stats" style="flex:0 1 auto;text-align:right"></div>';
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

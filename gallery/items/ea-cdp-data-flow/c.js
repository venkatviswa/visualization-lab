// React Flow: the platform as a design-review diagram. Sources on top, the platform's stages as a band in the middle,
// the unified profile and the two activation targets below. Follows the host timeline: the active node, edges lit as
// records flow, a connected/not-connected state per source, the profile's fields filling in. Click a node for its role.
const h = React.createElement;
const RF = ReactFlow;
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', edge: '#c3cad6', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d', bad: '#b42318',
  tint: '#e8eefb', goodTint: '#e9f5ee', hiTint: '#fbefe8', badTint: '#fdecea', soft: '#f4f6f9', band: '#f7f9fc' };
const SIDE = { t: RF.Position.Top, r: RF.Position.Right, b: RF.Position.Bottom, l: RF.Position.Left };
const SRC = ['portal', 'crm', 'claims', 'marketing', 'callcenter'], STAGES = ['ingest', 'harmonize', 'unify', 'insight'];
const HS = { opacity: 0, width: 6, height: 6, minWidth: 0, minHeight: 0, border: 0 };
let rroot = null, wrap = null, flowEl = null, infoEl = null, headEl = null, ro = null, inst = null;
let M = null, simT = 0, selected = null, lastKey = '', mode = 'wide';

function geo(narrow) {
  if (!narrow) return { W: 172, pos: Object.assign(Object.fromEntries(SRC.map((id, i) => [id, [i * 196, 0]])), Object.fromEntries(STAGES.map((id, i) => [id, [i * 262, 150]])),
    { band: [-16, 118], profile: [0, 300], agent: [440, 300], journey: [720, 300] }), bandW: 1042, bandH: 112, profileW: 330 };
  return { W: 70, pos: Object.assign(Object.fromEntries(SRC.map((id, i) => [id, [i * 78, 0]])), Object.fromEntries(STAGES.map((id, i) => [id, [i * 98, 150]])),
    { band: [-8, 122], profile: [0, 300], agent: [214, 300], journey: [300, 300] }), bandW: 400, bandH: 118, profileW: 200 };
}
function Sys({ data }) {
  const hs = [];
  for (const k of ['t', 'r', 'b', 'l']) {
    hs.push(h(RF.Handle, { key: 's' + k, id: 's' + k, type: 'source', position: SIDE[k], style: HS, isConnectable: false }));
    hs.push(h(RF.Handle, { key: 't' + k, id: 't' + k, type: 'target', position: SIDE[k], style: HS, isConnectable: false }));
  }
  return h('div', { style: data.box }, hs,
    h('div', { style: { fontWeight: 600, fontSize: data.small ? 10.5 : 13, lineHeight: 1.2 } }, data.title),
    data.sub ? h('div', { style: { fontSize: data.small ? 10 : 11.5, color: C.muted, marginTop: 2, lineHeight: 1.25 } }, data.sub) : null,
    data.rows ? h('div', { style: { display: 'grid', gridTemplateColumns: data.small ? '1fr' : '1fr 1fr', gap: '1px 10px', marginTop: 6, fontSize: data.small ? 10 : 11.5 } },
      data.rows.map((r, i) => h('div', { key: i, style: { color: r[2] || C.ink, fontWeight: r[3] ? 700 : 400 } }, r[0] + ': ' + r[1]))) : null,
    data.chip ? h('div', { style: Object.assign({ display: 'inline-block', marginTop: 5, padding: data.small ? '1px 5px' : '1px 8px', borderRadius: 999, fontSize: data.small ? 9.5 : 11.5, fontWeight: 600, whiteSpace: 'nowrap' }, data.chip.style) }, data.chip.text) : null);
}
function Band({ data }) { return h('div', { style: { width: data.w, height: data.h, borderRadius: 14, border: '1px dashed ' + C.line, background: C.band, boxSizing: 'border-box', padding: '4px 10px', fontSize: 9.5, fontWeight: 700, color: C.muted, fontFamily: 'system-ui, sans-serif', letterSpacing: '.04em' } }, data.label); }
const nodeTypes = { sys: Sys, band: Band };
const chip = (text, col, bg) => ({ text, style: { color: col, background: bg } });
function currentEvent() { let e = M.events[0]; for (const ev of M.events) if (ev.start <= simT + 1e-6) e = ev; return e; }
const SUB = { portal: 'Page views', crm: 'System of record', claims: 'Adjudication', marketing: 'Email engagement', callcenter: 'Calls, sentiment',
  ingest: 'One stream per source', harmonize: 'Shared model', unify: 'One profile', insight: 'Calculated, kept fresh', agent: 'In the CRM', journey: 'Needs consent' };

function render() {
  const narrow = mode === 'narrow', G = geo(narrow), e = currentEvent(), done = simT >= M.duration - 0.05, snap = e.snap, pf = snap.profile;
  const lit = new Set(), now = new Set();
  M.events.forEach(ev => { if (ev.i <= e.i) for (let k = 1; k < ev.path.length; k++) { const key = ev.path[k - 1] + '>' + ev.path[k]; lit.add(key); if (ev.i === e.i && !done) now.add(key); } });
  const nodes = [{ id: 'band', type: 'band', position: { x: G.pos.band[0], y: G.pos.band[1] }, selectable: false, data: { w: G.bandW, h: G.bandH, label: (M.names === 'salesforce' ? 'DATA 360' : 'CUSTOMER DATA PLATFORM') + (narrow ? '' : ' · INGEST → HARMONISE → UNIFY → CALCULATE → ACTIVATE') } }];
  M.systems.forEach(s => {
    const id = s.id, stt = snap.status[id], active = !done && (e.station === id || (e.path.includes(id) && e.i === currentEvent().i && now.size > 0 && e.path[e.path.length - 1] !== id && false));
    const isActive = !done && e.station === id;
    let border = isActive ? C.accent : C.line, bg = isActive ? C.tint : '#fff', dash = 'solid', ch = null, rows = null, sub = narrow ? null : SUB[id];
    if (s.kind === 'source') {
      if (!s.connected) { ch = chip(narrow ? 'Off' : 'Not connected', C.muted, C.soft); dash = 'dashed'; bg = C.soft; }
      else { const sent = pf.sources.includes(id) && id !== 'crm' || (id === 'crm' && pf.caseOpen); ch = sent ? chip(narrow ? 'Sent' : 'Record sent', C.good, C.goodTint) : stt === 'new' ? chip('Pending', C.hi, C.hiTint) : chip(s.feed, C.muted, C.soft); }
    } else if (s.kind === 'stage') {
      const on = stt === 'busy' || stt === 'new';
      if (id === 'insight') ch = snap.insight ? chip(narrow ? 'At risk' : 'At risk: in segment', C.hi, C.hiTint) : e.kind === 'none' ? chip('Nothing fires', C.hi, C.hiTint) : chip('No match', C.muted, C.soft);
      else ch = chip(isActive ? ['Receiving', 'Mapping', 'Matching'][STAGES.indexOf(id)] : on ? ['Streams open', 'Mapped', 'Matched'][STAGES.indexOf(id)] : 'Waiting', isActive ? C.accent : on ? C.good : C.muted, isActive ? C.tint : on ? C.goodTint : C.soft);
      if (id === 'insight' && snap.insight) border = C.hi;
    } else if (id === 'profile') {
      ch = chip(pf.sources.length + ' of 5 sources', pf.sources.length >= 3 ? C.good : C.muted, pf.sources.length >= 3 ? C.goodTint : C.soft);
      rows = [['Member', '#48812'], ['Claim', pf.claim ? 'DENIED' : '—', pf.claim ? C.bad : C.muted, !!pf.claim], ['Visits', pf.visits || '—', pf.visits ? C.ink : C.muted], ['Call', pf.call || '—', pf.call === 'negative' ? C.bad : pf.call ? C.ink : C.muted], ['Case', pf.caseOpen ? 'open' : '—', pf.caseOpen ? C.ink : C.muted], ['Email', pf.engagement ? 'engaged' : '—', pf.engagement ? C.ink : C.muted]];
      sub = null;
    } else if (id === 'agent') {
      ch = { idle: chip('No task', C.muted, C.soft), new: chip('Follow-up task', C.good, C.goodTint), good: chip('Sees the denial', C.good, C.goodTint), bad: chip('Cannot see claim', '#fff', C.bad) }[stt];
      if (stt === 'bad') { border = C.bad; bg = C.badTint; }
    } else if (id === 'journey') {
      ch = { idle: chip('Waiting', C.muted, C.soft), good: chip('Email sent', C.good, C.goodTint), blocked: chip('Opted out', C.hi, C.hiTint), off: chip(narrow ? 'Off' : 'Not connected', C.muted, C.soft) }[stt];
      if (stt === 'blocked') { border = C.hi; bg = C.hiTint; } if (stt === 'off') { dash = 'dashed'; bg = C.soft; }
    }
    const small = narrow && id !== 'profile', w = id === 'profile' ? G.profileW : narrow ? (s.kind === 'stage' ? 90 : s.kind === 'target' ? 80 : G.W) : s.kind === 'stage' ? 224 : s.kind === 'target' ? 220 : G.W;
    const box = { width: w, boxSizing: 'border-box', padding: small ? '5px 5px' : '8px 10px', borderRadius: 10, color: C.ink, fontFamily: 'system-ui, sans-serif', cursor: 'pointer',
      background: bg, border: (isActive ? 3 : 2) + 'px ' + dash + ' ' + border, position: 'relative', textAlign: small ? 'center' : 'left', minHeight: small ? 78 : 0,
      boxShadow: selected === id ? '0 0 0 4px rgba(43,89,195,.22)' : isActive ? '0 4px 14px rgba(43,89,195,.18)' : 'none' };
    nodes.push({ id, type: 'sys', position: { x: G.pos[id][0], y: G.pos[id][1] }, data: { box, small, title: narrow ? s.name.replace(/\s*\(.*\)/, '') : s.name, sub, chip: ch, rows } });
  });
  const edges = [];
  const mk = (a, b, sh, th, label) => {
    const id = a + '>' + b, on = lit.has(id), act = now.has(id), src = M.systems.find(s => s.id === a), off = src && !src.connected;
    const col = on ? C.accent : C.edge;
    edges.push({ id, source: a, target: b, sourceHandle: sh, targetHandle: th, type: 'smoothstep', animated: act,
      label: narrow ? undefined : label, labelStyle: { fill: on ? col : C.muted, fontSize: 11, fontWeight: on ? 600 : 400 }, labelBgStyle: { fill: '#fff' }, labelBgPadding: [3, 2],
      style: { stroke: col, strokeWidth: on ? 3 : 1.5, strokeDasharray: on ? undefined : '5 4', opacity: off ? 0.45 : 1 },
      markerEnd: { type: RF.MarkerType.ArrowClosed, color: col, width: 16, height: 16 } });
  };
  SRC.forEach(sid => mk(sid, 'ingest', 'sb', 'tt'));
  mk('ingest', 'harmonize', 'sr', 'tl', 'map'); mk('harmonize', 'unify', 'sr', 'tl', 'match'); mk('unify', 'profile', 'sb', 'tt', 'update');
  mk('profile', 'insight', 'sr', 'tb', 'calculate'); mk('insight', 'agent', 'sb', 'tt', 'task'); mk('insight', 'journey', 'sb', 'tt', 'segment');
  rroot.render(h(RF.ReactFlow, {
    key: mode, nodes, edges, nodeTypes, fitView: true, fitViewOptions: { padding: narrow ? 0.06 : 0.05, maxZoom: 1.15 }, minZoom: 0.3,
    nodesDraggable: false, nodesConnectable: false, elementsSelectable: false, proOptions: { hideAttribution: true },
    onInit: i => { inst = i; }, onNodeClick: (_, n) => { if (n.id === 'band') return; selected = selected === n.id ? null : n.id; render(); }
  }, h(RF.Background, { gap: 18, color: '#eef1f5' }), h(RF.Controls, { showInteractive: false, position: 'top-right' })));
  renderHead(e, done, snap);
}
function clockText(ms) { const d = new Date(2026, 0, 1, 9, 0); d.setTime(d.getTime() + ms); return (ms >= 15 * 3600000 ? 'next day ' : '') + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
function renderHead(e, done, snap) {
  const sc = M.scenes[e.scene], pf = snap.profile;
  headEl.querySelector('.sub').textContent = done ? M.summary : 'Scene ' + (sc.i + 1) + ' of ' + M.scenes.length + ' · ' + sc.title + ': ' + sc.caption;
  const stats = [['Clock', clockText(e.realMs), false], ['Sources in profile', pf.sources.length + ' of 5', false], ['Insight', snap.insight ? 'fired' : 'not yet', false], ['Maria called', snap.calls + (snap.calls === 1 ? ' time' : ' times'), snap.calls > 1]];
  headEl.querySelector('.stats').innerHTML = stats.map(([k, v, bad]) => '<span style="display:inline-block;margin:0 0 4px 6px;padding:3px 8px;border-radius:8px;background:#f4f6f9;font-size:11.5px;color:#5b6475;white-space:nowrap">' + k +
    ' <b style="color:' + (bad ? C.bad : C.ink) + '">' + v + '</b></span>').join('');
  const s = selected ? M.systems.find(x => x.id === selected) : null, last = e.scene === M.scenes.length - 1;
  infoEl.innerHTML = '';
  const b = document.createElement('b'); b.textContent = s ? s.name + ': ' : last ? 'Outcome: ' : 'Now: ';
  infoEl.append(b, document.createTextNode(s ? s.role : last ? M.outcome + ' ' : e.note));
  if (!s && last) { const w = document.createElement('b'); w.textContent = M.soWhat; infoEl.append(w); }
  if (!s && !(last && mode === 'narrow')) { const hint = document.createElement('span'); hint.style.color = C.muted; hint.textContent = '  Click a box for its role.'; infoEl.append(hint); }
  infoEl.style.background = last && !s ? (M.proactive ? C.goodTint : C.hiTint) : '#fafbfc';
}
function layout(root) {
  const next = root.clientWidth < 640 ? 'narrow' : 'wide';
  if (next !== mode) { mode = next; infoEl.style.height = (mode === 'narrow' ? 96 : 66) + 'px'; render(); } else if (inst) inst.fitView({ padding: mode === 'narrow' ? 0.06 : 0.05, maxZoom: 1.15 });
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
    headEl.innerHTML = '<div style="flex:1 1 300px;min-width:0"><div style="font-size:14px;font-weight:600;color:#1d2433">One member, five sources, one profile</div>' +
      '<div class="sub" style="font-size:12px;line-height:1.35;color:#5b6475;min-height:32px"></div></div><div class="stats" style="flex:0 1 auto;text-align:right"></div>';
    flowEl = document.createElement('div'); flowEl.style.cssText = 'position:relative;flex:1;min-height:0';
    infoEl = document.createElement('div');
    infoEl.style.cssText = 'flex:none;height:' + (mode === 'narrow' ? 96 : 66) + 'px;box-sizing:border-box;padding:7px 14px;font:13px/1.4 system-ui,sans-serif;color:#1d2433;border-top:1px solid #e3e7ee;background:#fafbfc;overflow:auto';
    wrap.append(headEl, flowEl, infoEl); root.append(wrap);
    rroot = ReactDOM.createRoot(flowEl);
    render();
    ro = new ResizeObserver(() => requestAnimationFrame(() => { if (rroot) layout(root); })); ro.observe(flowEl);
  },
  update(params) { M = model(params); simT = 0; lastKey = ''; selected = null; render(); },
  destroy() { if (ro) ro.disconnect(); if (rroot) rroot.unmount(); if (wrap) wrap.remove(); rroot = null; M = null; inst = null; }
};

// React Flow decision diagram: the four shared steps lead to Export lesson, which branches into Import (temporary, one
// browser) and Publish (permanent, everyone); each branch ends in the three people who might open the site. The taken
// branch lights up on the host clock and the reached outcomes say who sees the lesson. Click a node for its detail.
// Wide: left to right. Narrow: top to bottom.
const h = React.createElement, RF = ReactFlow;
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', faint: '#c9cfda', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d', bad: '#b42318', tint: '#e8eefb', goodTint: '#e9f5ee', badTint: '#fdecea', temp: '#fbefe8', perm: '#eef4fb' };
const HS = { opacity: 0, width: 6, height: 6, minWidth: 0, minHeight: 0, border: 0 };
let rroot = null, wrap = null, flowEl = null, infoEl = null, headEl = null, ro = null, inst = null, M = null, simT = 0, lastKey = '', mode = 'wide', selected = null;
const fmtMin = v => v == null ? '—' : v < 10 ? v.toFixed(1) + ' min' : Math.round(v) + ' min';

function Box({ data }) {
  return h('div', { style: data.box },
    h(RF.Handle, { id: 'in', type: 'target', position: data.vertical ? RF.Position.Top : RF.Position.Left, style: HS, isConnectable: false }),
    h(RF.Handle, { id: 'out', type: 'source', position: data.vertical ? RF.Position.Bottom : RF.Position.Right, style: HS, isConnectable: false }),
    h('div', { style: { fontWeight: 600, fontSize: data.small ? 10.5 : 12, lineHeight: 1.2 } }, data.title),
    data.sub ? h('div', { style: { fontSize: data.small ? 9.5 : 10.5, color: data.subColor || C.muted, marginTop: 2, fontWeight: data.subColor ? 600 : 400 } }, data.sub) : null);
}
const nodeTypes = { box: Box };
function current() { let i = 0; M.steps.forEach((s, j) => { if (s.t <= simT + 1e-6) i = j; }); return i; }

function render() {
  const narrow = mode === 'narrow', k = current(), done = simT >= M.duration - 0.05, reached = done || k === M.steps.length - 1;
  const W = narrow ? 112 : 132, H = narrow ? 50 : 56, gx = narrow ? 128 : 166, gy = narrow ? 72 : 76;
  const at = (col, row) => narrow ? { x: row * gx, y: col * gy } : { x: col * gx, y: row * gy };
  const taken = id => M.steps.findIndex(s => s.id === id);
  const nodes = [], edges = [];
  const style = (state, extra) => Object.assign({ width: W, height: H, overflow: 'hidden', boxSizing: 'border-box', padding: narrow ? '4px 6px' : '6px 9px', borderRadius: 8, fontFamily: 'system-ui, sans-serif', color: C.ink,
    background: { now: C.tint, done: C.goodTint, bad: C.badTint, todo: '#fff', faint: '#fff' }[state], border: (state === 'faint' ? '1.2px dashed ' : '1.5px solid ') + { now: C.accent, done: C.good, bad: C.bad, todo: C.line, faint: C.faint }[state],
    opacity: state === 'faint' ? 0.75 : 1, boxShadow: state === 'now' ? '0 0 0 3px rgba(43,89,195,.18)' : 'none' }, extra || {});
  const stateOf = id => { const i = taken(id); if (i < 0) return 'faint'; const s = M.steps[i]; return i === k && !done ? 'now' : i < k || done ? (s.bad ? 'bad' : 'done') : 'todo'; };
  const add = (id, col, row, title, sub, st, extra) => nodes.push({ id, type: 'box', position: at(col, row), data: { title, sub: sub && sub.text, subColor: sub && sub.color, vertical: narrow, small: narrow, box: style(st, extra) } });
  const steps = { describe: 'Describe the goal', spec: 'Draft the spec', generate: 'Generate versions', export: 'Export lesson', import: 'Import lesson', add: 'add-lesson script', push: 'Commit and push', ci: 'Tests and gallery build', deploy: 'Deploy to Pages', fail: 'Run fails' };
  const min = id => { const s = M.steps.find(x => x.id === id) || M.other.steps.find(x => x.id === id); return s ? { text: fmtMin(s.min) } : null; };
  ['describe', 'spec', 'generate', 'export'].forEach((id, i) => add(id, i, 1.5, steps[id], min(id), stateOf(id)));
  add('import', 4, 0, steps.import, { text: 'temporary · one browser', color: C.hi }, stateOf('import'), { background: stateOf('import') === 'faint' ? C.temp : undefined });
  ['add', 'push', 'ci'].forEach((id, i) => add(id, 4 + i, 3, steps[id], i === 0 ? { text: 'permanent · the gallery', color: C.accent } : min(id), stateOf(id)));
  const endId = M.route === 'publish' && !M.ciPass ? 'fail' : 'deploy';
  add(endId, 7, 3, steps[endId], endId === 'fail' ? { text: 'site unchanged', color: C.bad } : min('deploy'), stateOf(endId));
  // who sees it: three viewers after each branch
  const vRows = [[-0.6, 0.3, 1.2], [2.4, 3.3, 4.2]];
  ['import', 'publish'].forEach((route, b) => M.viewers.forEach((v, i) => {
    const mine = route === M.route, sees = route === 'publish' ? (mine ? M.ciPass : true) : i === 0, show = mine && reached, sel = mine && i === M.viewer;
    const st = !mine ? 'faint' : !show ? 'todo' : sees ? 'done' : 'bad';
    add('v-' + route + '-' + v.id, route === 'import' ? 5.4 : 8.2, vRows[b][i], v.label, { text: show || !mine ? (sees ? '✓ sees it' : '✗ does not see it') : '…', color: show ? (sees ? C.good : C.bad) : C.muted }, st, sel ? { border: '2.5px solid ' + (show ? (sees ? C.good : C.bad) : C.accent) } : null);
  }));
  const edge = (a, b, lit, label, colour) => edges.push({ id: a + '>' + b, source: a, target: b, sourceHandle: 'out', targetHandle: 'in', type: 'smoothstep', pathOptions: { borderRadius: 10 },
    label, labelStyle: { fontSize: narrow ? 9 : 10.5, fill: colour || C.muted, fontWeight: 600, fontFamily: 'system-ui, sans-serif' }, labelBgPadding: [4, 2], labelBgBorderRadius: 4, labelBgStyle: { fill: '#fff', fillOpacity: 0.92 },
    style: { stroke: lit ? (colour || C.good) : C.faint, strokeWidth: lit ? 2 : 1.2, strokeDasharray: lit ? undefined : '4 3' }, markerEnd: { type: RF.MarkerType.ArrowClosed, color: lit ? (colour || C.good) : C.faint, width: 14, height: 14 } });
  const litTo = id => { const i = taken(id); return i >= 0 && (i <= k || done); };
  edge('describe', 'spec', litTo('spec')); edge('spec', 'generate', litTo('generate')); edge('generate', 'export', litTo('export'));
  edge('export', 'import', litTo('import'), narrow ? 'temporary' : 'temporary', C.hi);
  edge('export', 'add', litTo('add'), narrow ? 'permanent' : 'permanent', C.accent);
  edge('add', 'push', litTo('push')); edge('push', 'ci', litTo('ci')); edge('ci', endId, litTo(endId), null, endId === 'fail' ? C.bad : null);
  M.viewers.forEach(v => { edge('import', 'v-import-' + v.id, M.route === 'import' && reached); edge(endId, 'v-publish-' + v.id, M.route === 'publish' && reached, null, endId === 'fail' ? C.bad : null); });
  rroot.render(h(RF.ReactFlow, {
    key: mode + '|' + M.route + '|' + M.ciPass, nodes, edges, nodeTypes, fitView: true, fitViewOptions: { padding: 0.05, maxZoom: 1.15 }, minZoom: 0.2,
    nodesDraggable: false, nodesConnectable: false, elementsSelectable: false, proOptions: { hideAttribution: true },
    onInit: i => { inst = i; }, onNodeClick: (_, n) => { selected = selected === n.id ? null : n.id; renderInfo(); }
  }, h(RF.Background, { gap: 18, color: '#eef1f5' }), h(RF.Controls, { showInteractive: false, position: 'top-right' })));
  renderHead(k, done); renderInfo();
}
function renderHead(k, done) {
  const st = M.steps[k], narrow = mode === 'narrow';
  headEl.querySelector('.sub').textContent = done ? M.summary : st.title + ': ' + st.note;
  const stats = narrow ? [['Who', M.audience]] : [['Shows after', fmtMin(M.shownAtMin)], ['Seen by', M.audience]];
  headEl.querySelector('.stats').innerHTML = stats.map(([kk, v]) => '<span style="display:inline-block;margin:0 0 4px 6px;padding:3px 8px;border-radius:8px;background:#f4f6f9;font-size:11.5px;color:#5b6475;white-space:nowrap">' + kk + ' <b style="color:#1d2433">' + v + '</b></span>').join('');
}
function renderInfo() {
  const k = current(), done = simT >= M.duration - 0.05, all = M.steps.concat(M.other.steps);
  const selStep = selected && all.find(s => s.id === selected), selViewer = selected && selected.startsWith('v-') ? selected.split('-') : null;
  infoEl.innerHTML = '';
  const b = document.createElement('b');
  if (selStep) { b.textContent = selStep.title + ': '; infoEl.append(b, document.createTextNode(selStep.note)); }
  else if (selViewer) {
    const route = selViewer[1], v = M.viewers.find(x => x.id === selViewer[2]), i = M.viewers.indexOf(v), sees = route === 'publish' ? (route === M.route ? M.ciPass : true) : i === 0;
    b.textContent = v.label + (route === M.route ? '' : ' (the other way)') + ': ';
    infoEl.append(b, document.createTextNode(route === 'import' ? (sees ? 'sees it in the browser that imported it, until its site data is cleared.' : i === 1 ? 'clearing the browser erased it; an import lives only in that browser\'s storage.' : 'does not see it; they would need the file and their own Import.') : sees ? 'sees it under Get inspired on the site, and so does everyone else.' : 'nothing new on the site: the failed run published nothing.'));
  } else { b.textContent = done ? 'Outcome: ' : 'Now: '; infoEl.append(b, document.createTextNode(done ? M.steps[M.steps.length - 1].note : M.steps[k].note)); }
  if (!selected && mode !== 'narrow') { const hint = document.createElement('span'); hint.style.color = C.muted; hint.textContent = '  Click a box for its detail.'; infoEl.append(hint); }
  infoEl.style.background = done && !selected ? (M.visible ? C.goodTint : C.badTint) : '#fafbfc';
}
function layout(root) {
  const next = root.clientWidth < 640 ? 'narrow' : 'wide';
  if (next !== mode) { mode = next; render(); } else if (inst) inst.fitView({ padding: 0.05, maxZoom: 1.15 });
}

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  seek(t) { simT = t; const key = current() + '|' + (t >= M.duration - 0.05); if (key !== lastKey) { lastKey = key; render(); } },
  mount(root, params) {
    M = model(params); simT = 0; selected = null; lastKey = '';
    mode = root.clientWidth < 640 ? 'narrow' : 'wide';
    wrap = document.createElement('div'); wrap.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;background:#fff';
    headEl = document.createElement('div');
    headEl.style.cssText = 'flex:none;padding:8px 14px 2px;box-sizing:border-box;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:flex-start;font-family:system-ui,sans-serif';
    headEl.innerHTML = '<div style="flex:1 1 300px;min-width:0"><div style="font-size:14px;font-weight:600;color:#1d2433">From the lab to the gallery · who will see it?</div>' +
      '<div class="sub" style="font-size:12px;line-height:1.35;color:#5b6475;min-height:32px"></div></div><div class="stats" style="flex:0 1 auto;text-align:right"></div>';
    flowEl = document.createElement('div'); flowEl.style.cssText = 'position:relative;flex:1;min-height:0';
    infoEl = document.createElement('div');
    infoEl.style.cssText = 'flex:none;height:62px;box-sizing:border-box;padding:7px 14px;font:13px/1.4 system-ui,sans-serif;color:#1d2433;border-top:1px solid #e3e7ee;background:#fafbfc;overflow:auto';
    wrap.append(headEl, flowEl, infoEl); root.append(wrap);
    rroot = ReactDOM.createRoot(flowEl);
    render();
    ro = new ResizeObserver(() => requestAnimationFrame(() => { if (rroot) layout(root); })); ro.observe(flowEl);
  },
  update(params) { M = model(params); simT = 0; lastKey = ''; selected = null; render(); requestAnimationFrame(() => { if (inst) inst.fitView({ padding: 0.05, maxZoom: 1.15 }); }); },
  destroy() { if (ro) ro.disconnect(); if (rroot) rroot.unmount(); if (wrap) wrap.remove(); rroot = null; M = null; inst = null; }
};

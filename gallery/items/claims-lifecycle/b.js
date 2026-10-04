// Plain SVG swimlane: four lanes (who acts), one box per step, every possible route drawn faintly,
// and a claim token that travels the route this claim takes. Lanes become columns on narrow screens.
const NS = 'http://www.w3.org/2000/svg';
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', faint: '#c3cad6', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d',
  tint: '#e8eefb', goodTint: '#e9f5ee', hiTint: '#fbefe8', band: '#f6f8fb' };
const SLOT = { intake: [0, 'provider'], eligibility: [1, 'payer'], auth: [2, 'payer'], adjudicate: [3, 'processor'], pend: [3, 'provider'],
  pay: [4, 'payer'], deny: [4, 'processor'], appeal: [5, 'member'], notify: [6, 'member'] };
const BAD = ['adjudicate-pend', 'adjudicate-deny', 'deny-notify', 'appeal-notify'];
let root, wrap, headEl, infoEl, svg, ro, M = null, G = null, simT = 0;

const el = (tag, attrs, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; };
const ease = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
function shortLine(id) {
  const m = M.money;
  return { intake: '$' + m.billed + ' billed', eligibility: 'Coverage active', auth: M.authStatus === 'not required' ? 'Not required' : M.authStatus === 'approved' ? 'Approved' : 'Missing',
    adjudicate: 'Pay, pend or deny', pend: 'Ask for records', deny: 'No auth on file', appeal: M.appealFiled ? (M.appealWon ? 'Overturned' : 'Upheld') : 'Only if denied',
    pay: '$' + m.planPays + ' to provider', notify: M.finalState === 'paid' ? 'Owes $' + m.memberShare : 'Plan paid $0' }[id];
}
// Writes text into a box: wraps to two lines at a space, then shrinks (never below 11px) to fit maxW.
function fitText(t, str, maxW, size, weight) {
  t.textContent = str; t.setAttribute('font-size', size); t.setAttribute('font-weight', weight);
  if (t.getComputedTextLength() <= maxW) return 1;
  const words = str.split(' ');
  if (words.length > 1) {
    let best = null;
    for (let i = 1; i < words.length; i++) { const a = words.slice(0, i).join(' '), b = words.slice(i).join(' '); const d = Math.abs(a.length - b.length); if (!best || d < best.d) best = { a, b, d }; }
    t.textContent = '';
    const x = t.getAttribute('x');
    el('tspan', { x, dy: '-0.55em' }, t).textContent = best.a; el('tspan', { x, dy: '1.15em' }, t).textContent = best.b;
    if (t.getBBox().width <= maxW) return 2;
    t.textContent = str;
  }
  let s = size; while (s > 11 && t.getComputedTextLength() > maxW) { s -= 0.5; t.setAttribute('font-size', s); }
  return 1;
}

function build() {
  svg.innerHTML = '';
  const W = svg.clientWidth || root.clientWidth, H = svg.clientHeight || 300, wide = W >= 640;
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  const lanes = M.lanes, nCol = 7, LW = wide ? 96 : 0, LH = wide ? 0 : 36;
  const colW = wide ? (W - LW - 12) / nCol : (H - LH - 6) / nCol, laneS = wide ? (H - 8) / lanes.length : (W - 8) / lanes.length;
  const A = c => (wide ? LW : LH) + colW * (c + 0.5), B = li => 4 + laneS * (li + 0.5);
  const ha = wide ? Math.min(colW * 0.39, 66) : Math.min(colW * 0.37, 25), hb = wide ? Math.min(laneS * 0.3, 27) : Math.min(laneS * 0.46, 52);
  const xy = (a, b) => wide ? [a, b] : [b, a];
  const defs = el('defs', {}, svg);
  for (const [id, col, sz] of [['g', C.faint, 8], ['a', C.accent, 11], ['h', C.hi, 11]]) {
    const mk = el('marker', { id: 'cl-' + id, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: sz, markerHeight: sz, markerUnits: 'userSpaceOnUse', orient: 'auto-start-reverse' }, defs);
    el('path', { d: 'M0,0 L10,5 L0,10 z', fill: col }, mk);
  }
  // Lanes
  lanes.forEach((ln, li) => {
    const [x, y] = xy(wide ? 0 : 0, B(li) - laneS / 2);
    el('rect', wide ? { x: 0, y, width: W, height: laneS, fill: li % 2 ? '#fff' : C.band } : { x, y: 0, width: laneS, height: H, fill: li % 2 ? '#fff' : C.band }, svg);
    const t = el('text', wide ? { x: 12, y: B(li) + 4, fill: C.muted, 'font-family': 'system-ui, sans-serif' } : { x: B(li), y: 20, 'text-anchor': 'middle', fill: C.muted, 'font-family': 'system-ui, sans-serif' }, svg);
    fitText(t, ln.label, (wide ? LW - 18 : laneS - 6), 12, 600);
  });
  if (wide) el('line', { x1: LW - 6, y1: 4, x2: LW - 6, y2: H - 4, stroke: C.line }, svg);
  else el('line', { x1: 4, y1: LH - 2, x2: W - 4, y2: LH - 2, stroke: C.line }, svg);
  // Station geometry in (along, across) coordinates
  const P = {};
  M.stations.forEach(st => { const [c, lane] = SLOT[st.id]; P[st.id] = { a: A(c), b: B(lanes.findIndex(l => l.id === lane)) }; });
  const R = (id, o = 0) => [P[id].a + ha, P[id].b + o], L = (id, o = 0) => [P[id].a - ha, P[id].b + o];
  const T = (id, o = 0) => [P[id].a + o, P[id].b - hb], Bt = (id, o = 0) => [P[id].a + o, P[id].b + hb];
  const gap = (P.adjudicate.a + P.pay.a) / 2, o = Math.min(10, ha * 0.4);
  const ROUTE = {
    'intake-eligibility': [R('intake'), [P.eligibility.a, P.intake.b], T('eligibility')],
    'eligibility-auth': [R('eligibility'), L('auth')],
    'auth-adjudicate': [Bt('auth'), [P.auth.a, P.adjudicate.b], L('adjudicate')],
    'adjudicate-pend': [T('adjudicate', -o), Bt('pend', -o)],
    'pend-adjudicate': [Bt('pend', o), T('adjudicate', o)],
    'adjudicate-pay': [R('adjudicate', -7), [gap, P.adjudicate.b - 7], [gap, P.pay.b], L('pay')],
    'adjudicate-deny': [R('adjudicate', 7), L('deny', 7)],
    'deny-appeal': [Bt('deny'), [P.deny.a, P.appeal.b], L('appeal')],
    'deny-notify': [R('deny'), [P.notify.a + o, P.deny.b], T('notify', o)],
    'appeal-pay': [T('appeal'), [P.appeal.a, P.pay.b + 8], R('pay', 8)],
    'appeal-notify': [R('appeal'), L('notify')],
    'pay-notify': [R('pay', -8), [P.notify.a - o, P.pay.b - 8], T('notify', -o)]
  };
  const edges = {}, gEdges = el('g', {}, svg);
  M.edges.forEach(g => {
    const pts = ROUTE[g.id].map(p => xy(p[0], p[1]));
    let len = 0; const segs = [];
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(d); len += d; }
    const d = 'M' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' L');
    const base = el('path', { d, fill: 'none', stroke: C.faint, 'stroke-width': 1.5, 'stroke-dasharray': '5 4', 'marker-end': 'url(#cl-g)' }, gEdges);
    const col = BAD.includes(g.id) ? C.hi : C.accent;
    const lit = el('path', { d, fill: 'none', stroke: col, 'stroke-width': 3, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, gEdges);
    edges[g.id] = { pts, segs, len, base, lit, mk: 'url(#cl-' + (col === C.hi ? 'h' : 'a') + ')' };
  });
  const boxes = {};
  M.stations.forEach(st => {
    const [x, y] = xy(P[st.id].a, P[st.id].b), bw = wide ? 2 * ha : 2 * hb, bh = wide ? 2 * hb : 2 * ha;
    const g = el('g', { transform: 'translate(' + x + ',' + y + ')' }, svg);
    el('title', {}, g).textContent = st.label + ': ' + st.detail;
    const rect = el('rect', { x: -bw / 2, y: -bh / 2, width: bw, height: bh, rx: 9, 'stroke-width': 2 }, g);
    const title = el('text', { x: 0, y: -2, 'text-anchor': 'middle', fill: C.ink, 'font-family': 'system-ui, sans-serif' }, g);
    const lines = fitText(title, st.label.split(':')[0], bw - 10, wide ? 13 : 12, 600);
    const sub = el('text', { x: 0, y: lines === 2 ? bh / 2 - 5 : 14, 'text-anchor': 'middle', 'font-family': 'system-ui, sans-serif' }, g);
    if (lines === 2) title.setAttribute('y', -6);
    fitText(sub, shortLine(st.id), bw - 8, 11.5, 400);
    if (sub.querySelector('tspan') || lines === 2 && bh < 50) sub.textContent = '';
    if (!sub.textContent) title.setAttribute('y', lines === 2 ? 2 : 4);
    boxes[st.id] = { rect, sub };
  });
  const token = el('g', { 'pointer-events': 'none' }, svg);
  const disc = el('circle', { r: 11, fill: C.accent, stroke: '#fff', 'stroke-width': 2.5 }, token);
  el('rect', { x: -4.5, y: -6, width: 9, height: 12, rx: 1.5, fill: '#fff' }, token);
  el('path', { d: 'M-2.5,-2 h5 M-2.5,1 h5 M-2.5,4 h3', stroke: C.accent, 'stroke-width': 1.2 }, token);
  G = { P, xy, edges, boxes, token, disc, start: xy(...L('intake')) };
}
function pointAt(E, k) {
  let d = E.len * k;
  for (let i = 0; i < E.segs.length; i++) {
    if (d <= E.segs[i] || i === E.segs.length - 1) { const f = E.segs[i] ? Math.min(1, d / E.segs[i]) : 1, a = E.pts[i], b = E.pts[i + 1]; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; }
    d -= E.segs[i];
  }
}
function draw() {
  if (!G) return;
  let e = M.events[0]; for (const ev of M.events) if (ev.start <= simT + 1e-6) e = ev;
  const done = simT >= M.duration - 0.05, u = Math.max(0, (simT - e.start) / e.dur), k = done ? 1 : ease(u / 0.35);
  const onPath = new Set(M.events.map(ev => ev.station)), seen = new Set(M.events.filter(ev => ev.i < e.i).map(ev => ev.station));
  if (done) onPath.forEach(s => seen.add(s));
  M.stations.forEach(st => {
    const bx = G.boxes[st.id], active = !done && st.id === e.station, visited = seen.has(st.id) && !active, off = !onPath.has(st.id);
    const trouble = st.id === 'deny' || st.id === 'pend' || (st.id === 'auth' && M.authStatus === 'missing') || (st.id === 'appeal' && !M.appealWon) || (st.id === 'notify' && M.finalState !== 'paid');
    bx.rect.setAttribute('fill', active ? C.tint : visited ? (trouble ? C.hiTint : C.goodTint) : '#fff');
    bx.rect.setAttribute('stroke', active ? C.accent : visited ? (trouble ? C.hi : C.good) : off ? C.faint : C.line);
    bx.rect.setAttribute('stroke-width', active ? 3 : 2);
    bx.rect.setAttribute('stroke-dasharray', off ? '5 4' : '');
    bx.rect.parentNode.setAttribute('opacity', off ? 0.55 : 1);
    bx.sub.setAttribute('fill', visited && trouble ? C.hi : C.muted);
  });
  for (const id in G.edges) { const E = G.edges[id]; E.lit.style.display = 'none'; E.lit.removeAttribute('marker-end'); }
  const last = done ? M.events.length - 1 : e.i;
  for (let i = 1; i <= last; i++) {
    const E = G.edges[M.events[i - 1].station + '-' + M.events[i].station], f = i === last ? k : 1;
    E.lit.style.display = f > 0.01 ? '' : 'none';
    E.lit.setAttribute('stroke-dasharray', (E.len * f).toFixed(1) + ' ' + (E.len + 1));
    if (f >= 1) E.lit.setAttribute('marker-end', E.mk);
  }
  // The token rides the edge into the current step and waits at the arrow tip.
  const E = e.i === 0 ? null : G.edges[M.events[e.i - 1].station + '-' + e.station];
  const pos = E ? pointAt(E, Math.min(k, 1 - 14 / E.len)) : G.start;
  G.token.setAttribute('transform', 'translate(' + pos[0].toFixed(1) + ',' + pos[1].toFixed(1) + ')');
  G.disc.setAttribute('fill', done ? (M.finalState === 'paid' ? C.good : C.hi) : C.accent);
  const paid = M.finalState === 'paid', pill = headEl.querySelector('.pill');
  headEl.querySelector('.sub').textContent = done ? M.summary : 'Step ' + (e.i + 1) + ' of ' + M.events.length + ' · ' + M.stations.find(s => s.id === e.station).label;
  pill.textContent = done ? (paid ? 'Paid $' + M.paidAmount : 'Denied') : 'In process';
  pill.style.cssText = 'flex:none;font:600 12px system-ui,sans-serif;padding:3px 10px;border-radius:999px;border:1px solid ' + (done ? (paid ? C.good : C.hi) : C.line) +
    ';color:' + (done ? '#fff' : C.muted) + ';background:' + (done ? (paid ? C.good : C.hi) : '#fff');
  infoEl.innerHTML = '';
  const b = document.createElement('b'); b.textContent = (done ? 'Last step: ' : 'Now: ');
  infoEl.append(b, document.createTextNode(e.note));
}

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  seek(t) { simT = t; draw(); },
  mount(r, params) {
    root = r; M = model(params); simT = 0;
    wrap = document.createElement('div'); wrap.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;font-family:system-ui,sans-serif;background:#fff';
    headEl = document.createElement('div');
    headEl.style.cssText = 'flex:none;min-height:56px;padding:8px 14px 4px;box-sizing:border-box;display:flex;gap:10px;align-items:flex-start';
    headEl.innerHTML = '<div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:600;color:#1d2433">Health claim lifecycle: who does what</div>' +
      '<div class="sub" style="font-size:12px;line-height:1.3;color:#5b6475"></div></div><div class="pill"></div>';
    svg = el('svg', { width: '100%', height: '100%' }); svg.style.cssText = 'flex:1;min-height:0;display:block';
    infoEl = document.createElement('div');
    infoEl.style.cssText = 'flex:none;height:64px;box-sizing:border-box;padding:8px 14px;font:13px/1.45 system-ui,sans-serif;color:#1d2433;border-top:1px solid #e3e7ee;background:#fafbfc;overflow:auto';
    wrap.append(headEl, svg, infoEl); root.append(wrap);
    build(); draw();
    let lastW = 0, lastH = 0;
    ro = new ResizeObserver(() => { const w = svg.clientWidth, h = svg.clientHeight; if (w === lastW && h === lastH) return; lastW = w; lastH = h; build(); draw(); });
    ro.observe(svg);
  },
  update(params) { M = model(params); simT = 0; build(); draw(); },
  destroy() { if (ro) ro.disconnect(); if (wrap) wrap.remove(); G = null; M = null; }
};

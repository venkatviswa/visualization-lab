// Story: Maria's address change travels through the enterprise. One SVG, one paused GSAP timeline for the moving
// envelopes; every state (cards, phone, captions, counters) is set directly from model() in setState(t).
const NS = 'http://www.w3.org/2000/svg';
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d', bad: '#b42318',
  soft: '#f4f6f9', tint: '#e8eefb', goodTint: '#e6f4ec', badTint: '#fdecea', hiTint: '#fbefe8' };
const FONT = 'system-ui, -apple-system, sans-serif', TRAVEL = 0.55;
let root = null, svg = null, world = null, tl = null, M = null, P = null, L = null, R = {}, ro = null, T = 0, mode = '';

function el(tag, a, parent) { const n = document.createElementNS(NS, tag); for (const k in a) n.setAttribute(k, a[k]); if (parent) parent.appendChild(n); return n; }
function wrap(s, max) { const out = []; let cur = ''; String(s).split(' ').forEach(w => { if (cur && (cur + ' ' + w).length > max) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; }); if (cur) out.push(cur); return out; }
function txt(parent, x, y, s, o) {
  o = o || {};
  const n = el('text', { x, y, 'font-size': o.size || 13, 'font-weight': o.weight || 400, fill: o.fill || C.ink, 'text-anchor': o.anchor || 'start', 'font-family': FONT }, parent);
  setText(n, s, o.max, o.lh); return n;
}
function setText(n, s, max, lh) {
  while (n.firstChild) n.removeChild(n.firstChild);
  const lines = max ? wrap(s, max) : [String(s)], x = n.getAttribute('x');
  lines.forEach((ln, k) => { const t = el('tspan', { x, dy: k ? (lh || 16) : 0 }, n); t.textContent = ln; });
  return lines.length;
}
function icon(parent, name, x, y, size, color) { const n = labIcon(name, { x, y, width: size, height: size, stroke: color || C.ink }); parent.appendChild(n); return n; }

function layout(w, h) {
  if (w >= 640) {
    const top = (i, id) => [id, { x: 220 + i * 262, y: 78, w: 236, h: 70 }], dn = (i, id) => [id, { x: 220 + i * 195, y: 318, w: 175, h: 84 }];
    return { W: 1000, H: 600, narrow: false, maria: { cx: 70, cy: 102, r: 26 }, phone: { x: 40, y: 150, w: 140, h: 236 },
      box: Object.fromEntries([top(0, 'portal'), top(1, 'gateway'), top(2, 'crm'), ['bus', { x: 220, y: 192, w: 760, h: 52 }],
        dn(0, 'mdm'), dn(1, 'claims'), dn(2, 'billing'), dn(3, 'analytics'), ['queue', { x: 640, y: 258, w: 115, h: 40 }]]),
      cap: { x: 20, y: 418, w: 960, h: 114, chars: 114, nchars: 126, size: 16 }, stats: { y: 544, h: 42 }, nameMax: 22, sub: 120 };
  }
  const W = 420, avail = Math.round(W * h / Math.max(1, w)), cw = (W - 20 - 18) / 4;
  if (avail < 700) {
    // compact: a short phone-height root (an embed, a landscape phone). Smaller cards, no note line, one stats line.
    const H = Math.max(600, avail);
    const top = (i, id) => [id, { x: 150, y: 60 + i * 58, w: 260, h: 52 }], dn = (i, id) => [id, { x: 10 + i * (cw + 6), y: 314, w: cw, h: 90 }];
    return { W, H, narrow: true, compact: true, maria: { cx: 28, cy: 76, r: 16 }, phone: { x: 12, y: 100, w: 124, h: 128 },
      box: Object.fromEntries([top(0, 'portal'), top(1, 'gateway'), top(2, 'crm'), ['bus', { x: 10, y: 240, w: 400, h: 36 }],
        dn(0, 'mdm'), dn(1, 'claims'), dn(2, 'billing'), dn(3, 'analytics'), ['queue', { x: 10 + 2 * (cw + 6), y: 280, w: cw, h: 30 }]]),
      cap: { x: 10, y: 412, w: 400, h: H - 412 - 40, chars: 56, nchars: 60, size: 13 }, stats: { y: H - 32, h: 26 }, nameMax: 13, sub: 64 };
  }
  const H = Math.max(724, avail);
  const top = (i, id) => [id, { x: 150, y: 74 + i * 66, w: 260, h: 60 }], dn = (i, id) => [id, { x: 10 + i * (cw + 6), y: 402, w: cw, h: 104 }];
  return { W, H, narrow: true, maria: { cx: 30, cy: 92, r: 18 }, phone: { x: 12, y: 120, w: 124, h: 184 },
    box: Object.fromEntries([top(0, 'portal'), top(1, 'gateway'), top(2, 'crm'), ['bus', { x: 10, y: 314, w: 400, h: 42 }],
      dn(0, 'mdm'), dn(1, 'claims'), dn(2, 'billing'), dn(3, 'analytics'), ['queue', { x: 10 + 2 * (cw + 6), y: 361, w: cw, h: 34 }]]),
    cap: { x: 10, y: 516, w: 400, h: H - 516 - 58, chars: 56, nchars: 60, size: 13 }, stats: { y: H - 50, h: 42 }, nameMax: 13, sub: 64 };
}
const isEd = () => M.style === 'event';
function anchor(id, side) {
  if (id === 'maria') return { x: L.phone.x + L.phone.w, y: L.phone.y + 60 };
  const b = L.box[id];
  if (id === 'bus' && side) return { x: side.x, y: b.y + b.h / 2 };
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}
function hops(path) {
  const out = [];
  for (let k = 1; k < path.length; k++) {
    const a = path[k - 1], b = path[k];
    if (isEd() && ((a === 'bus' && b === 'billing') || (a === 'billing' && b === 'bus'))) { out.push([a, 'queue'], ['queue', b]); continue; }
    out.push([a, b]);
  }
  return out;
}
const eKey = (a, b) => [a, b].sort().join('-');

function card(id) {
  const b = L.box[id], s = M.systems.find(x => x.id === id), g = el('g', {}, world), n = L.narrow && b.h > 60;
  const r = { g, rect: el('rect', { x: b.x, y: b.y, width: b.w, height: b.h, rx: 10, fill: '#fff', stroke: C.line, 'stroke-width': 2 }, g) };
  if (id === 'queue') {
    icon(g, 'inbox', b.x + 8, b.y + (b.h - 18) / 2, 18, C.accent);
    r.name = txt(g, b.x + 32, b.y + b.h / 2 - 2, s.name, { size: L.narrow ? 10.5 : 12, weight: 600 });
    r.pill = txt(g, b.x + 32, b.y + b.h / 2 + 12, '', { size: L.narrow ? 10 : 11, fill: C.muted });
    return r;
  }
  if (n) {
    icon(g, s.icon, b.x + b.w / 2 - 11, b.y + 8, 22, C.ink);
    r.name = txt(g, b.x + b.w / 2, b.y + 45, s.name, { size: 11.5, weight: 600, anchor: 'middle', max: L.nameMax, lh: 13 });
  } else {
    icon(g, s.icon, b.x + 12, b.y + 12, 22, C.ink);
    const mx = id === 'bus' || L.narrow ? 60 : L.nameMax, lines = wrap(s.name, mx).length;
    r.name = txt(g, b.x + 42, b.y + (L.narrow ? 23 : lines > 1 ? 22 : 28), s.name, { size: L.narrow ? 12.5 : 13.5, weight: 600, max: mx, lh: 15 });
  }
  const pw = n ? b.w - 12 : Math.min(b.w - 54, L.narrow ? (id === 'bus' ? 124 : 170) : 150), px = n ? b.x + 6 : (id === 'bus' ? b.x + b.w - pw - 12 : b.x + 42), py = n ? b.y + b.h - 24 : (id === 'bus' ? b.y + (b.h - 20) / 2 : b.y + b.h - (L.narrow ? 25 : 26));
  r.pillBg = el('rect', { x: px, y: py, width: pw, height: 20, rx: 10, fill: C.soft }, g);
  r.pill = txt(g, px + pw / 2, py + 14, '', { size: L.narrow ? 10.5 : 11.5, anchor: 'middle', weight: 600 });
  if (s.holdsAddress) { const tw = 78; r.tag = el('g', { opacity: 0 }, g); el('rect', { x: b.x + b.w - tw - 6, y: b.y - 9, width: tw, height: 18, rx: 9, fill: C.hi }, r.tag); txt(r.tag, b.x + b.w - 6 - tw / 2, b.y + 4, 'Out of step', { size: 10.5, weight: 700, fill: '#fff', anchor: 'middle' }); }
  r.down = el('g', { opacity: 0 }, g); el('circle', { cx: b.x + b.w - 14, cy: b.y + 14, r: 11, fill: C.bad }, r.down); icon(r.down, 'power-off', b.x + b.w - 21, b.y + 7, 14, '#ffffff');
  return r;
}
function stat(i) {
  const w = (L.W - 40 - 2 * 12) / 3, x = 20 + i * (w + 12), g = el('g', {}, world);
  if (L.compact) { const w2 = (L.W - 20) / 3, x2 = 10 + i * w2; return { k: txt(g, x2, L.stats.y + 10, '', { size: 9.5, fill: C.muted }), v: txt(g, x2, L.stats.y + 23, '', { size: 11.5, weight: 700 }) }; }
  if (L.narrow) { const w2 = (L.W - 20 - 12) / 3, x2 = 10 + i * (w2 + 6); el('rect', { x: x2, y: L.stats.y, width: w2, height: L.stats.h, rx: 8, fill: C.soft }, g);
    return { k: txt(g, x2 + 8, L.stats.y + 15, '', { size: 10.5, fill: C.muted }), v: txt(g, x2 + 8, L.stats.y + 33, '', { size: 12.5, weight: 700 }) }; }
  el('rect', { x, y: L.stats.y, width: w, height: L.stats.h, rx: 8, fill: C.soft }, g);
  return { k: txt(g, x + 12, L.stats.y + 26, '', { size: 12, fill: C.muted }), v: txt(g, x + w - 12, L.stats.y + 27, '', { size: 14, weight: 700, anchor: 'end' }) };
}

function build() {
  if (tl) tl.kill();
  if (svg) svg.remove();
  L = layout(root.clientWidth || 1000, root.clientHeight || 600); mode = L.narrow ? 'narrow' : 'wide';
  svg = el('svg', { viewBox: '0 0 ' + L.W + ' ' + L.H, width: '100%', height: '100%', preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': 'Animated story: one address change through eight systems' });
  root.appendChild(svg);
  el('rect', { x: 0, y: 0, width: L.W, height: L.H, fill: '#ffffff' }, svg);
  world = el('g', {}, svg); R = { cards: {}, edges: {} };
  R.title = txt(world, L.narrow ? 10 : 20, 26, 'One address change, eight systems', { size: 14, weight: 600 });
  R.sub = txt(world, L.narrow ? 10 : 20, 46, '', { size: L.narrow ? 11.5 : 13, fill: C.muted, max: L.sub, lh: 14 });
  R.clock = txt(world, L.W - (L.narrow ? 10 : 20), 26, '', { size: L.narrow ? 11 : 12, fill: C.muted, anchor: 'end' });
  // edges first, under the cards
  const edgeG = el('g', {}, world), pairs = [['maria', 'portal'], ['portal', 'gateway'], ['gateway', 'crm'], ['crm', 'bus']]
    .concat(['mdm', 'claims', 'analytics'].map(d => ['bus', d])).concat(isEd() ? [['bus', 'queue'], ['queue', 'billing']] : [['bus', 'billing']]);
  pairs.forEach(([a, b]) => {
    let p1 = anchor(a), p2 = anchor(b);
    if (a === 'crm') p2 = anchor('bus', p1); if (a === 'bus') p1 = anchor('bus', p2); if (a === 'queue') p1 = anchor('queue');
    if (L.narrow && a === 'maria') { p1 = { x: L.phone.x + L.phone.w, y: L.box.portal.y + 26 }; }
    R.edges[eKey(a, b)] = el('line', { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, stroke: C.line, 'stroke-width': 3, 'stroke-linecap': 'round' }, edgeG);
  });
  M.systems.forEach(s => { R.cards[s.id] = card(s.id); });
  // Maria and her phone
  const m = L.maria, ph = L.phone;
  R.avatar = el('circle', { cx: m.cx, cy: m.cy, r: m.r, fill: C.tint, stroke: C.accent, 'stroke-width': 2 }, world);
  icon(world, 'user', m.cx - m.r * 0.6, m.cy - m.r * 0.6, m.r * 1.2, C.accent);
  txt(world, m.cx + m.r + 10, m.cy - 2, 'Maria', { size: L.narrow ? 13 : 15, weight: 700 });
  txt(world, m.cx + m.r + 10, m.cy + 14, 'plan member', { size: L.narrow ? 10.5 : 12, fill: C.muted });
  el('rect', { x: ph.x, y: ph.y, width: ph.w, height: ph.h, rx: 18, fill: C.ink }, world);
  el('rect', { x: ph.x + 6, y: ph.y + 14, width: ph.w - 12, height: ph.h - 28, rx: 10, fill: '#fff' }, world);
  const sx = ph.x + 14, fs = L.narrow ? 10.5 : 11.5;
  txt(world, sx, ph.y + 36, 'My profile', { size: fs + 1, weight: 700 });
  txt(world, sx, ph.y + 56, 'Home address', { size: fs - 0.5, fill: C.muted });
  el('rect', { x: sx - 2, y: ph.y + 62, width: ph.w - 24, height: 24, rx: 5, fill: '#fff', stroke: C.line }, world);
  R.field = txt(world, sx + 4, ph.y + 78, '', { size: fs });
  R.btn = el('rect', { x: sx - 2, y: ph.y + 96, width: ph.w - 24, height: 26, rx: 6, fill: C.accent, opacity: L.compact ? 0 : 1 }, world);
  R.btnT = txt(world, ph.x + ph.w / 2, ph.y + 113, 'Save', { size: fs, weight: 600, fill: '#fff', anchor: 'middle', ...(L.compact ? { fill: 'none' } : {}) });
  const my = L.compact ? ph.y + 96 : ph.y + 132;
  R.msgBg = el('rect', { x: sx - 2, y: my, width: ph.w - 24, height: L.compact ? 26 : ph.h - 132 - 20, rx: 6, fill: '#fff' }, world);
  R.msg = txt(world, ph.x + ph.w / 2, my + 19, '', { size: fs, weight: 700, anchor: 'middle', max: L.narrow ? 14 : 15, lh: 14 });
  R.spin = el('circle', { cx: ph.x + ph.w / 2, cy: my + 18, r: 9, fill: 'none', stroke: C.accent, 'stroke-width': 3, 'stroke-dasharray': '20 40' }, world);
  // caption box and stats
  const c = L.cap;
  R.capBox = el('rect', { x: c.x, y: c.y, width: c.w, height: c.h, rx: 12, fill: C.soft, stroke: C.soft, 'stroke-width': 2 }, world);
  R.capIcon = el('g', {}, world);
  R.scene = txt(world, c.x + 18, c.y + 23, '', { size: L.narrow ? 11.5 : 12.5, weight: 700, fill: C.accent });
  R.cap = txt(world, c.x + 18, c.y + 46, '', { size: c.size, max: c.chars, lh: c.size + 4 });
  R.note = txt(world, c.x + 18, c.y + 88, '', { size: c.size - 1.5, fill: C.muted, max: c.nchars, lh: c.size + 2 });
  R.stats = [0, 1, 2].map(stat);
  // envelopes: one per travelling event, moved by the paused timeline
  tl = gsap.timeline({ paused: true });
  const fan = {};
  M.events.forEach(e => { if (e.kind === 'deliver' || e.kind === 'queued') fan[e.scene] = fan[e.scene] == null ? e.start : fan[e.scene]; });
  M.events.forEach(e => {
    const hs = hops(e.path); if (!hs.length) return;
    const col = e.kind === 'error' ? C.bad : e.kind === 'saved' ? C.good : C.accent;
    const tok = el('g', { opacity: 0 }, world);
    el('rect', { x: -15, y: -11, width: 30, height: 22, rx: 5, fill: col, stroke: '#fff', 'stroke-width': 2 }, tok);
    icon(tok, e.kind === 'error' ? 'x' : e.kind === 'saved' ? 'check' : 'mail', -8, -8, 16, '#ffffff');
    const t0 = fan[e.scene] != null && (e.kind === 'deliver' || e.kind === 'queued') ? fan[e.scene] : e.start;
    const total = Math.max(TRAVEL, e.start + TRAVEL - t0), pts = route(hs);
    const segs = pts.slice(1).map((q, k) => Math.hypot(q.x - pts[k].x, q.y - pts[k].y) + 1), sum = segs.reduce((a, b) => a + b, 0);
    gsap.set(tok, { x: pts[0].x, y: pts[0].y });
    tl.set(tok, { opacity: 1 }, t0);
    let at = t0;
    pts.slice(1).forEach((q, k) => { const d = total * segs[k] / sum; tl.to(tok, { x: q.x, y: q.y, duration: d, ease: 'none' }, at); at += d; });
    tl.to(tok, { opacity: 0, duration: 0.25 }, t0 + total + (e.kind === 'call' && e.station === 'billing' ? 2.2 : 0.15));
    e._arrive = t0 + total;
  });
  tl.set({}, {}, M.duration);
}
function side(id, nb) {
  // the point on id's border that faces its neighbour nb, so envelopes never sit on a label
  if (id === 'maria') return anchor('maria');
  const b = L.box[id], crmX = L.box.crm.x + L.box.crm.w / 2;
  if (id === 'bus') return nb === 'crm' ? { x: crmX, y: b.y } : { x: anchor(nb).x, y: b.y + b.h };
  if (nb === 'bus') return { x: b.x + b.w / 2, y: id === 'crm' ? b.y + b.h : b.y };
  if (id === 'queue') return { x: b.x + b.w / 2, y: nb === 'billing' ? b.y + b.h : b.y };
  if (nb === 'queue') return { x: b.x + b.w / 2, y: b.y };
  const c = anchor(id), o = anchor(nb), dx = o.x - c.x, dy = o.y - c.y;
  return Math.abs(dx) * b.h > Math.abs(dy) * b.w ? { x: dx > 0 ? b.x + b.w : b.x, y: c.y } : { x: c.x, y: dy > 0 ? b.y + b.h : b.y };
}
function route(hs) {
  const pts = [];
  if (hs[0][0] === 'bus') pts.push({ x: L.box.crm.x + L.box.crm.w / 2, y: L.box.bus.y + L.box.bus.h });
  pts.push(side(hs[0][0], hs[0][1]));
  hs.forEach(([a, b], k) => { pts.push(side(b, a)); if (hs[k + 1]) pts.push(side(b, hs[k + 1][1])); });
  return pts;
}

function pill(r, text, col, fill) { setText(r.pill, text); r.pill.setAttribute('fill', col); if (r.pillBg) r.pillBg.setAttribute('fill', fill); }
function setState(t) {
  T = t;
  let e = M.events[0];
  for (const ev of M.events) if (ev.start <= t + 1e-6) e = ev;
  const done = t >= M.duration - 0.05, u = Math.max(0, Math.min(1, (t - e.start) / e.dur));
  const arrived = e._arrive == null || t >= e._arrive - 0.02, prevSnap = e.i ? M.events[e.i - 1].snap : null;
  const snap = arrived || !prevSnap ? e.snap : prevSnap, sc = M.scenes[e.scene], last = sc.i === M.scenes.length - 1;
  setText(R.sub, done ? M.summary : (isEd() ? 'Event-driven' : 'Point-to-point') + ' integration · billing ' + (M.outage ? 'goes down' : 'stays up'), L.sub, 14);
  // real-time clock: interpolate between events while Maria is waiting
  const nx = M.events[e.i + 1], gap = nx ? nx.realMs - e.realMs : 0;
  const real = e.realMs + (gap > 0 && gap < 60000 ? gap * u : 0);
  setText(R.clock, real < 0 ? 'before she taps Save' : real >= 60000 ? '+' + Math.round(real / 60000) + ' min after Save' : '+' + (real / 1000).toFixed(2) + ' s after Save');
  // cards
  const pathNow = new Set();
  M.events.forEach(ev => { if (ev.start <= t + 1e-6) hops(ev.path).forEach(([a, b]) => { if (ev.i < e.i || arrived) pathNow.add(eKey(a, b)); }); });
  const crmAddr = snap.addr.crm, failed = snap.status.crm === 'rolledback';
  M.systems.forEach(s => {
    const r = R.cards[s.id], stt = snap.status[s.id], active = !done && e.station === s.id;
    let stroke = active ? C.accent : C.line, fill = active ? C.tint : '#fff', dash = '';
    if (s.id === 'queue') { setText(r.pill, snap.queue ? snap.queue + ' event waiting' : 'empty'); r.pill.setAttribute('fill', snap.queue ? C.hi : C.muted); if (snap.queue) { stroke = C.hi; fill = C.hiTint; } }
    else if (s.holdsAddress) {
      const isNew = snap.addr[s.id] === 'new', off = failed && snap.addr[s.id] !== crmAddr;
      if (stt === 'down') { pill(r, 'Down', '#fff', C.bad); stroke = C.bad; fill = C.badTint; dash = '6 4'; }
      else if (stt === 'rolledback') { pill(r, 'Rolled back', C.hi, C.hiTint); stroke = C.hi; }
      else if (stt === 'skipped') pill(r, 'Never called', C.muted, C.soft);
      else pill(r, isNew ? M.newAddress : M.oldAddress, isNew ? C.good : C.muted, isNew ? C.goodTint : C.soft);
      if (off) { stroke = C.hi; fill = C.hiTint; pill(r, M.newAddress, C.hi, '#fff'); }
      r.tag.setAttribute('opacity', off ? 1 : 0);
      r.down.setAttribute('opacity', stt === 'down' ? 1 : 0);
    } else {
      const label = { portal: { pass: 'Change sent' }, gateway: { pass: 'Checked: it is Maria' },
        bus: isEd() ? { pass: L.narrow ? '1 event published' : '1 AddressChanged event' } : { busy: 'Waiting for answers…', failed: 'Timed out', pass: 'All 4 answered' } }[s.id][stt];
      pill(r, label || 'Idle', stt === 'failed' ? '#fff' : label ? C.accent : C.muted, stt === 'failed' ? C.bad : label ? C.tint : C.soft);
      r.down && r.down.setAttribute('opacity', 0);
    }
    r.rect.setAttribute('stroke', stroke); r.rect.setAttribute('fill', fill); r.rect.setAttribute('stroke-dasharray', dash); r.rect.setAttribute('stroke-width', active ? 3 : 2);
  });
  Object.entries(R.edges).forEach(([k, ln]) => {
    const lit = pathNow.has(k), bad = lit && k.includes('billing') && (snap.status.billing === 'down' || snap.status.bus === 'failed') && !isEd();
    ln.setAttribute('stroke', bad ? C.bad : lit ? C.accent : C.line); ln.setAttribute('stroke-dasharray', bad ? '6 5' : '');
  });
  R.avatar.setAttribute('stroke-width', !done && e.station === 'maria' ? 4 : 2);
  // phone
  const mem = snap.member, typed = e.kind === 'type' ? M.newAddress.slice(0, Math.floor(u * 1.4 * M.newAddress.length)) : mem === 'idle' ? M.oldAddress : M.newAddress;
  setText(R.field, typed + (e.kind === 'type' && u < 0.75 ? '|' : ''));
  R.btn.setAttribute('fill', mem === 'saving' ? '#9fb3dc' : C.accent); setText(R.btnT, mem === 'saving' ? 'Saving…' : 'Save');
  R.spin.setAttribute('opacity', mem === 'saving' ? 1 : 0); R.spin.setAttribute('transform', 'rotate(' + (t * 360) % 360 + ' ' + R.spin.getAttribute('cx') + ' ' + R.spin.getAttribute('cy') + ')');
  const msg = { saved: ['✓ Saved', C.good, C.goodTint], error: ['Something went wrong', C.bad, C.badTint] }[mem];
  setText(R.msg, msg ? msg[0] : '', L.narrow ? 14 : 15, 14); R.msg.setAttribute('fill', msg ? msg[1] : C.ink); R.msgBg.setAttribute('fill', msg ? msg[2] : '#fff');
  // caption
  setText(R.scene, 'Scene ' + (sc.i + 1) + ' of ' + M.scenes.length + ' · ' + sc.title);
  const capLines = setText(R.cap, last ? M.outcome : sc.caption, L.cap.chars, L.cap.size + 4);
  R.note.setAttribute('y', L.cap.y + 46 + capLines * (L.cap.size + 4) + 2);
  setText(R.note, L.compact && !last && L.cap.h < 100 ? '' : last ? M.soWhat : '▸ ' + e.note, L.cap.nchars, L.cap.size + 2);
  R.note.setAttribute('font-weight', last ? 700 : 400); R.note.setAttribute('fill', last ? C.ink : C.muted);
  R.capBox.setAttribute('fill', last ? (M.consistent ? C.goodTint : C.hiTint) : C.soft); R.capBox.setAttribute('stroke', last ? (M.consistent ? C.good : C.hi) : C.soft);
  // stats
  const waited = mem === 'saving' ? Math.max(0, real) : mem === 'idle' || mem === 'typing' ? 0 : M.responseMs;
  const n = M.holders.filter(h => snap.addr[h] === 'new').length, ig = M.integrations;
  const S = [[L.narrow ? 'Maria waited' : 'Maria has waited', (waited / 1000).toFixed(waited >= 10000 ? 1 : 2) + ' s' + (mem === 'saving' ? '…' : '')],
    [isEd() ? (L.narrow ? 'Connections' : 'Connections to run') : (L.narrow ? 'P2P links' : 'Point-to-point links'), isEd() ? '1 publish + ' + ig.eventSubscriptions + ' subs' : (L.narrow ? ig.p2pFromCrm + ', mesh ' + ig.p2pMesh : ig.p2pFromCrm + ' here, ' + ig.p2pMesh + ' in a mesh')],
    [L.narrow ? 'New address in' : 'Systems with the new address', n + ' of ' + M.holders.length]];
  R.stats.forEach((s, k) => { setText(s.k, S[k][0]); setText(s.v, S[k][1]); });
  R.stats[0].v.setAttribute('fill', mem === 'error' ? C.bad : C.ink);
}

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  seek(t) { if (!tl) return; T = Math.min(Math.max(0, t), M.duration); tl.seek(T, false); setState(T); },
  mount(r, params) {
    root = r; P = params; M = model(params); build(); this.seek(0);
    ro = new ResizeObserver(() => { const nm = layout(root.clientWidth, root.clientHeight); if ((nm.narrow ? 'narrow' : 'wide') !== mode || (nm.narrow && (nm.H !== L.H || !!nm.compact !== !!L.compact))) { build(); this.seek(T); } });
    ro.observe(root);
  },
  update(params) { P = params; M = model(params); build(); this.seek(0); },
  destroy() { if (ro) ro.disconnect(); if (tl) tl.kill(); if (svg) svg.remove(); svg = world = tl = M = null; }
};

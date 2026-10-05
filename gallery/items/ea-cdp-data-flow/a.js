// Story: Maria's data moves from five sources through the platform's stages to two activations. One SVG, one paused
// GSAP timeline for the travelling records; every state (cards, profile panel, phone, captions, stats) is set from model() in setState(t).
const NS = 'http://www.w3.org/2000/svg';
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d', bad: '#b42318',
  soft: '#f4f6f9', tint: '#e8eefb', goodTint: '#e6f4ec', badTint: '#fdecea', hiTint: '#fbefe8', band: '#f7f9fc' };
const FONT = 'system-ui, -apple-system, sans-serif', TRAVEL = 0.5;
const SRC = ['portal', 'crm', 'claims', 'marketing', 'callcenter'], STAGES = ['ingest', 'harmonize', 'unify', 'insight'];
let root = null, svg = null, world = null, tl = null, M = null, L = null, R = {}, ro = null, T = 0, mode = '';

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
    const sx = i => 212 + i * 158, st = i => 212 + i * 196;
    return { W: 1000, H: 600, narrow: false, maria: { cx: 62, cy: 96, r: 24 }, phone: { x: 32, y: 136, w: 132, h: 180 },
      box: Object.fromEntries(SRC.map((id, i) => [id, { x: sx(i), y: 62, w: 146, h: 64 }]).concat(STAGES.map((id, i) => [id, { x: st(i), y: 192, w: 180, h: 60 }]))
        .concat([['profile', { x: 212, y: 306, w: 300, h: 104 }], ['agent', { x: 548, y: 306, w: 212, h: 104 }], ['journey', { x: 788, y: 306, w: 192, h: 104 }]])),
      band: { x: 200, y: 160, w: 790, h: 100 }, cap: { x: 20, y: 424, w: 960, h: 108, chars: 112, nchars: 124, size: 15.5 }, stats: { y: 544, h: 42 }, nameMax: 17, sub: 118 };
  }
  const W = 420, avail = Math.round(W * h / Math.max(1, w)), sw = (W - 20 - 4 * 5) / 5, tw = (W - 20 - 3 * 6) / 4;
  if (avail < 740) {
    // compact: a short root (an embed, a landscape phone). Smaller cards, the phone beside Maria's name, one stats line, no note line.
    const H = Math.max(600, avail);
    return { W, H, narrow: true, compact: true, maria: { cx: 26, cy: 74, r: 14 }, phone: { x: 150, y: 56, w: 160, h: 40 },
      box: Object.fromEntries(SRC.map((id, i) => [id, { x: 10 + i * (sw + 5), y: 106, w: sw, h: 76 }]).concat(STAGES.map((id, i) => [id, { x: 10 + i * (tw + 6), y: 204, w: tw, h: 76 }]))
        .concat([['profile', { x: 10, y: 298, w: 188, h: 108 }], ['agent', { x: 206, y: 298, w: 100, h: 108 }], ['journey', { x: 312, y: 298, w: 98, h: 108 }]])),
      band: { x: 4, y: 192, w: W - 8, h: 98 }, cap: { x: 10, y: 416, w: 400, h: H - 416 - 40, chars: 54, nchars: 58, size: 12.5 }, stats: { y: H - 32, h: 26 }, nameMax: 13, sub: 64 };
  }
  const H = Math.max(760, avail);
  return { W, H, narrow: true, maria: { cx: 28, cy: 90, r: 16 }, phone: { x: 10, y: 112, w: 110, h: 60 },
    box: Object.fromEntries(SRC.map((id, i) => [id, { x: 10 + i * (sw + 5), y: 184, w: sw, h: 90 }]).concat(STAGES.map((id, i) => [id, { x: 10 + i * (tw + 6), y: 296, w: tw, h: 90 }]))
      .concat([['profile', { x: 10, y: 412, w: 188, h: 126 }], ['agent', { x: 206, y: 412, w: 100, h: 126 }], ['journey', { x: 312, y: 412, w: 98, h: 126 }]])),
    band: { x: 4, y: 282, w: W - 8, h: 114 }, cap: { x: 10, y: 550, w: 400, h: H - 550 - 58, chars: 54, nchars: 58, size: 12.5 }, stats: { y: H - 50, h: 42 }, nameMax: 13, sub: 60 };
}
function anchor(id) { if (id === 'maria') return { x: L.phone.x + L.phone.w, y: L.phone.y + 30 }; const b = L.box[id]; return { x: b.x + b.w / 2, y: b.y + b.h / 2 }; }
function side(id, nb) {
  const b = L.box[id], c = anchor(id), o = anchor(nb), dx = o.x - c.x, dy = o.y - c.y;
  return Math.abs(dx) * b.h > Math.abs(dy) * b.w ? { x: dx > 0 ? b.x + b.w : b.x, y: c.y } : { x: c.x, y: dy > 0 ? b.y + b.h : b.y };
}
function route(path) {
  const pts = [side(path[0], path[1])];
  for (let k = 1; k < path.length; k++) { pts.push(side(path[k], path[k - 1])); if (path[k + 1]) pts.push(side(path[k], path[k + 1])); }
  return pts;
}
const eKey = (a, b) => a + '>' + b;

function card(id) {
  const b = L.box[id], s = M.systems.find(x => x.id === id), g = el('g', {}, world), small = L.narrow && id !== 'profile';
  const r = { g, rect: el('rect', { x: b.x, y: b.y, width: b.w, height: b.h, rx: 10, fill: '#fff', stroke: C.line, 'stroke-width': 2 }, g) };
  if (small) {
    icon(g, s.icon, b.x + b.w / 2 - 10, b.y + (L.compact ? 5 : 7), 20, C.ink);
    r.name = txt(g, b.x + b.w / 2, b.y + (L.compact ? 36 : 40), s.name.replace(/\s*\(.*\)/, ''), { size: 9.5, weight: 600, anchor: 'middle', max: L.nameMax, lh: 11 });
  } else {
    icon(g, s.icon, b.x + 10, b.y + 10, 20, C.ink);
    const nm = id === 'profile' ? 18 : L.nameMax, lines = wrap(s.name, nm).length;
    r.name = txt(g, b.x + 38, b.y + (lines > 1 ? 20 : 25), s.name, { size: id === 'profile' ? 13 : 12.5, weight: 600, max: nm, lh: 14 });
  }
  if (id === 'profile') {
    r.rows = []; const y0 = b.y + (L.compact ? 42 : L.narrow ? 46 : 48), step = L.compact ? 11.5 : L.narrow ? 13 : 19;
    for (let k = 0; k < 6; k++) { const col = L.narrow ? 0 : k % 2, row = L.narrow ? k : Math.floor(k / 2); r.rows.push(txt(g, b.x + 12 + col * 146, y0 + row * step, '', { size: L.compact ? 10 : L.narrow ? 10.5 : 11.5 })); }
    r.pillBg = el('rect', { x: b.x + b.w - (L.narrow ? 90 : 104), y: b.y + 9, width: L.narrow ? 82 : 96, height: 20, rx: 10, fill: C.soft }, g);
    r.pill = txt(g, b.x + b.w - (L.narrow ? 49 : 56), b.y + 23, '', { size: L.narrow ? 10 : 11, anchor: 'middle', weight: 600 });
    return r;
  }
  const pw = small ? b.w - 8 : Math.min(b.w - 20, 150), px = small ? b.x + 4 : b.x + 10, py = b.y + b.h - (small ? (L.compact ? 22 : 24) : 26);
  r.pillBg = el('rect', { x: px, y: py, width: pw, height: 20, rx: 10, fill: C.soft }, g);
  r.pill = txt(g, px + pw / 2, py + 14, '', { size: small ? 9.5 : 11, anchor: 'middle', weight: 600 });
  return r;
}
function stat(i) {
  const g = el('g', {}, world);
  if (L.compact) { const w = (L.W - 20) / 3, x = 10 + i * w; return { k: txt(g, x, L.stats.y + 10, '', { size: 9.5, fill: C.muted }), v: txt(g, x, L.stats.y + 23, '', { size: 11.5, weight: 700 }) }; }
  if (L.narrow) { const w = (L.W - 20 - 12) / 3, x = 10 + i * (w + 6); el('rect', { x, y: L.stats.y, width: w, height: L.stats.h, rx: 8, fill: C.soft }, g);
    return { k: txt(g, x + 8, L.stats.y + 15, '', { size: 10, fill: C.muted }), v: txt(g, x + 8, L.stats.y + 33, '', { size: 12, weight: 700 }) }; }
  const w = (L.W - 40 - 24) / 3, x = 20 + i * (w + 12); el('rect', { x, y: L.stats.y, width: w, height: L.stats.h, rx: 8, fill: C.soft }, g);
  return { k: txt(g, x + 12, L.stats.y + 26, '', { size: 12, fill: C.muted }), v: txt(g, x + w - 12, L.stats.y + 27, '', { size: 14, weight: 700, anchor: 'end' }) };
}

function build() {
  if (tl) tl.kill();
  if (svg) svg.remove();
  L = layout(root.clientWidth || 1000, root.clientHeight || 600); mode = L.narrow ? 'narrow' : 'wide';
  svg = el('svg', { viewBox: '0 0 ' + L.W + ' ' + L.H, width: '100%', height: '100%', preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': 'Animated story: one member, five sources, one profile' });
  root.appendChild(svg);
  el('rect', { x: 0, y: 0, width: L.W, height: L.H, fill: '#ffffff' }, svg);
  world = el('g', {}, svg); R = { cards: {}, edges: {} };
  R.title = txt(world, L.narrow ? 10 : 20, 26, 'One member, five sources, one profile', { size: 14, weight: 600 });
  R.sub = txt(world, L.narrow ? 10 : 20, 46, '', { size: L.narrow ? 11 : 12.5, fill: C.muted, max: L.sub, lh: 13 });
  R.clock = txt(world, L.W - (L.narrow ? 10 : 20), 26, '', { size: L.narrow ? 10.5 : 12, fill: C.muted, anchor: 'end' });
  // the platform band
  const bd = L.band;
  el('rect', { x: bd.x, y: bd.y, width: bd.w, height: bd.h, rx: 14, fill: C.band, stroke: C.line, 'stroke-dasharray': '5 4' }, world);
  if (L.narrow) txt(world, bd.x + 8, bd.y + 10, M.names === 'salesforce' ? 'DATA 360' : 'CUSTOMER DATA PLATFORM', { size: 8.5, weight: 700, fill: C.muted });
  else txt(world, bd.x + bd.w - 12, bd.y + 13, (M.names === 'salesforce' ? 'DATA 360' : 'CUSTOMER DATA PLATFORM') + ' · ingest → harmonise → unify → calculate → activate', { size: 9.5, weight: 700, fill: C.muted, anchor: 'end' });
  // edges under the cards
  const edgeG = el('g', {}, world), pairs = SRC.map(s => [s, 'ingest']).concat([['ingest', 'harmonize'], ['harmonize', 'unify'], ['unify', 'profile'], ['profile', 'insight'], ['insight', 'agent'], ['insight', 'journey']]);
  pairs.forEach(([a, b]) => { const p1 = side(a, b), p2 = side(b, a); R.edges[eKey(a, b)] = el('line', { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, stroke: C.line, 'stroke-width': 2.5, 'stroke-linecap': 'round' }, edgeG); });
  M.systems.forEach(s => { R.cards[s.id] = card(s.id); });
  // Maria and her phone
  const m = L.maria, ph = L.phone;
  R.avatar = el('circle', { cx: m.cx, cy: m.cy, r: m.r, fill: C.tint, stroke: C.accent, 'stroke-width': 2 }, world);
  icon(world, 'user', m.cx - m.r * 0.6, m.cy - m.r * 0.6, m.r * 1.2, C.accent);
  txt(world, m.cx + m.r + 8, m.cy - 2, 'Maria', { size: L.narrow ? 12.5 : 15, weight: 700 });
  txt(world, m.cx + m.r + 8, m.cy + 13, 'plan member', { size: L.narrow ? 10 : 12, fill: C.muted });
  R.phoneBg = el('rect', { x: ph.x, y: ph.y, width: ph.w, height: ph.h, rx: 12, fill: C.soft, stroke: C.line }, world);
  R.phoneIcon = el('g', {}, world);
  R.phoneT = txt(world, ph.x + (L.narrow ? 36 : 12), ph.y + (L.compact ? 17 : L.narrow ? 25 : 48), '', { size: L.narrow ? 10.5 : 12, weight: 600, max: L.compact ? 20 : L.narrow ? 14 : 16, lh: 14 });
  R.phoneS = txt(world, ph.x + (L.narrow ? 36 : 12), ph.y + (L.compact ? 31 : L.narrow ? 43 : 100), '', { size: L.narrow ? 9.5 : 11, fill: C.muted, max: L.compact ? 22 : L.narrow ? 16 : 18, lh: 13 });
  // caption and stats
  const c = L.cap;
  R.capBox = el('rect', { x: c.x, y: c.y, width: c.w, height: c.h, rx: 12, fill: C.soft, stroke: C.soft, 'stroke-width': 2 }, world);
  R.scene = txt(world, c.x + 18, c.y + 23, '', { size: L.narrow ? 11 : 12.5, weight: 700, fill: C.accent });
  R.cap = txt(world, c.x + 18, c.y + 45, '', { size: c.size, max: c.chars, lh: c.size + 4 });
  R.note = txt(world, c.x + 18, c.y + 86, '', { size: c.size - 1.5, fill: C.muted, max: c.nchars, lh: c.size + 2 });
  R.stats = [0, 1, 2].map(stat);
  // travelling records
  tl = gsap.timeline({ paused: true });
  M.events.forEach(e => {
    if (e.path.length < 2) return;
    const col = e.kind === 'blocked' ? C.hi : e.kind === 'email' || e.kind === 'task' ? C.good : C.accent;
    const tok = el('g', { opacity: 0 }, world);
    el('rect', { x: -14, y: -10, width: 28, height: 20, rx: 5, fill: col, stroke: '#fff', 'stroke-width': 2 }, tok);
    icon(tok, e.kind === 'blocked' ? 'x' : e.kind === 'email' ? 'mail' : e.kind === 'task' ? 'check' : 'file', -7, -7, 14, '#ffffff');
    const pts = route(e.path), segs = pts.slice(1).map((q, k) => Math.hypot(q.x - pts[k].x, q.y - pts[k].y) + 1), sum = segs.reduce((a, b) => a + b, 0);
    const total = Math.min(e.dur - 0.15, TRAVEL + 0.12 * (e.path.length - 2));
    gsap.set(tok, { x: pts[0].x, y: pts[0].y }); tl.set(tok, { opacity: 1 }, e.start);
    let at = e.start;
    pts.slice(1).forEach((q, k) => { const d = total * segs[k] / sum; tl.to(tok, { x: q.x, y: q.y, duration: d, ease: 'none' }, at); at += d; });
    tl.to(tok, { opacity: 0, duration: 0.2 }, e.start + total + 0.1);
    e._arrive = e.start + total;
  });
  tl.set({}, {}, M.duration);
}

function pill(r, text, col, fill) { setText(r.pill, text); r.pill.setAttribute('fill', col); r.pillBg.setAttribute('fill', fill); }
function clock(ms) { const d = new Date(2026, 0, 1, 9, 0, 0, 0); d.setTime(d.getTime() + ms); const hh = d.getHours(), mm = String(d.getMinutes()).padStart(2, '0'); return (ms >= 15 * 3600000 ? 'next day ' : 'today ') + String(hh).padStart(2, '0') + ':' + mm; }
function setState(t) {
  T = t;
  let e = M.events[0];
  for (const ev of M.events) if (ev.start <= t + 1e-6) e = ev;
  const done = t >= M.duration - 0.05, arrived = e._arrive == null || t >= e._arrive - 0.02, prev = e.i ? M.events[e.i - 1].snap : null;
  const snap = arrived || !prev ? e.snap : prev, sc = M.scenes[e.scene], last = sc.i === M.scenes.length - 1, pf = snap.profile;
  setText(R.sub, done ? M.summary : L.narrow ? M.sourcesConnected.length + ' of 5 sources · claims ' + (M.claimsFeed === 'streaming' ? 'streaming' : 'nightly') + ' · ' + (M.consent ? 'opted in' : 'opted out') : M.sourcesConnected.length + ' of 5 sources connected · claims feed ' + (M.claimsFeed === 'streaming' ? 'streaming' : 'nightly batch') + ' · marketing ' + (M.consent ? 'opted in' : 'opted out'), L.sub, 13);
  setText(R.clock, clock(e.realMs));
  const lit = new Set();
  M.events.forEach(ev => { if (ev.start <= t + 1e-6 && (ev.i < e.i || arrived)) for (let k = 1; k < ev.path.length; k++) lit.add(eKey(ev.path[k - 1], ev.path[k])); });
  M.systems.forEach(s => {
    const r = R.cards[s.id], stt = snap.status[s.id], active = !done && (e.station === s.id || (e.path.includes(s.id) && !arrived));
    let stroke = active ? C.accent : C.line, fill = active ? C.tint : '#fff', dash = '';
    if (s.kind === 'source') {
      if (!s.connected) { pill(r, L.narrow ? 'Not linked' : 'Not connected', C.muted, C.soft); stroke = C.line; fill = C.soft; dash = '5 4'; r.name.setAttribute('fill', C.muted); }
      else { const sent = pf.sources.includes(s.id) && s.id !== 'crm' || (s.id === 'crm' && pf.caseOpen); pill(r, sent ? (L.narrow ? 'Sent' : 'Record sent') : stt === 'new' ? (L.narrow ? 'Pending' : 'Record pending') : s.feed, sent ? C.good : stt === 'new' ? C.hi : C.muted, sent ? C.goodTint : stt === 'new' ? C.hiTint : C.soft); }
    } else if (s.kind === 'stage') {
      const lab = { ingest: ['Waiting', 'Receiving', 'Streams open'], harmonize: ['Waiting', 'Mapping', 'Mapped'], unify: ['Waiting', 'Matching', 'Matched'], insight: ['No match', 'Calculating', snap.insight ? 'At risk' : 'No match'] }[s.id];
      const k = active ? 1 : stt === 'busy' || stt === 'new' ? 2 : 0;
      if (s.id === 'insight' && !snap.insight && stt === 'idle' && e.kind === 'none') { pill(r, 'Nothing fires', C.hi, C.hiTint); stroke = C.hi; }
      else pill(r, lab[k], k === 2 ? (s.id === 'insight' && snap.insight ? C.hi : C.good) : k === 1 ? C.accent : C.muted, k === 2 ? (s.id === 'insight' && snap.insight ? C.hiTint : C.goodTint) : k === 1 ? C.tint : C.soft);
    } else if (s.id === 'profile') {
      if (L.narrow) { r.pillBg.setAttribute('opacity', 0); r.pill.setAttribute('opacity', 0); setText(r.name, 'Profile · ' + pf.sources.length + ' of 5 sources'); }   // no room for a pill beside the title on a phone
      else pill(r, pf.sources.length + ' of 5 sources', pf.sources.length >= 3 ? C.good : C.muted, pf.sources.length >= 3 ? C.goodTint : C.soft);
      const rows = [['Member', '#48812 (CRM)'], ['Claim', pf.claim ? 'DENIED' : '—'], ['Portal visits', pf.visits ? String(pf.visits) : '—'],
        ['Call', pf.call ? pf.call : '—'], ['Case', pf.caseOpen ? 'open' : '—'], ['Email', pf.engagement ? 'engaged' : '—']];
      r.rows.forEach((n, k) => { setText(n, rows[k][0] + ': ' + rows[k][1]); n.setAttribute('fill', rows[k][1] === '—' ? C.muted : k === 1 && pf.claim ? C.bad : C.ink); n.setAttribute('font-weight', k === 1 && pf.claim ? 700 : 400); });
      if (stt === 'new' && active) { stroke = C.accent; fill = C.tint; }
    } else if (s.id === 'agent') {
      const lab = { idle: ['No task', C.muted, C.soft], new: ['Follow-up task', C.good, C.goodTint], good: ['Sees the denial', C.good, C.goodTint], bad: ['Cannot see claim', '#fff', C.bad] }[stt];
      pill(r, lab[0], lab[1], lab[2]); if (stt === 'bad') { stroke = C.bad; fill = C.badTint; }
    } else if (s.id === 'journey') {
      const lab = { idle: ['Waiting', C.muted, C.soft], good: ['Email sent', C.good, C.goodTint], blocked: ['Opted out', C.hi, C.hiTint], off: ['Not connected', C.muted, C.soft] }[stt];
      pill(r, lab[0], lab[1], lab[2]); if (stt === 'blocked') { stroke = C.hi; fill = C.hiTint; } if (stt === 'off') { dash = '5 4'; fill = C.soft; }
    }
    r.rect.setAttribute('stroke', stroke); r.rect.setAttribute('fill', fill); r.rect.setAttribute('stroke-dasharray', dash); r.rect.setAttribute('stroke-width', active ? 3 : 2);
  });
  Object.entries(R.edges).forEach(([k, ln]) => { const src = k.split('>')[0], off = M.systems.find(s => s.id === src) && !M.systems.find(s => s.id === src).connected; ln.setAttribute('stroke', lit.has(k) ? C.accent : C.line); ln.setAttribute('stroke-dasharray', off ? '4 5' : ''); ln.setAttribute('opacity', off ? 0.5 : 1); });
  // phone
  const ps = L.narrow
    ? { home: ['Claim denied', 'letter, 09:00', 'mail-warning', C.bad], portal: ['Checking portal', 'nothing new', 'app-window', C.accent], calling: ['On the phone', snap.status.agent === 'bad' ? 'explaining it all' : 'resolved', 'phone-call', snap.status.agent === 'bad' ? C.bad : C.good] }[snap.maria]
    : { home: ['Letter: claim denied', 'Knee scan · 09:00', 'mail-warning', C.bad], portal: ['Portal: claim status', 'Denied · nothing new', 'app-window', C.accent], calling: [snap.status.agent === 'bad' ? 'On the phone, explaining' : 'On the phone, resolved', 'to the contact centre', 'phone-call', snap.status.agent === 'bad' ? C.bad : C.good] }[snap.maria];
  setText(R.phoneT, ps[0], L.narrow ? 14 : 16, 14); setText(R.phoneS, ps[1], L.narrow ? 16 : 18, 13); R.phoneT.setAttribute('fill', ps[3]);
  while (R.phoneIcon.firstChild) R.phoneIcon.removeChild(R.phoneIcon.firstChild);
  icon(R.phoneIcon, ps[2], L.phone.x + 10, L.phone.y + (L.compact ? 10 : L.narrow ? 18 : 14), L.narrow ? 20 : 24, ps[3]);
  R.avatar.setAttribute('stroke-width', !done && (e.station === 'maria' || snap.maria === 'calling') ? 4 : 2);
  // caption
  setText(R.scene, 'Scene ' + (sc.i + 1) + ' of ' + M.scenes.length + ' · ' + sc.title);
  const capLines = setText(R.cap, last ? M.outcome : sc.caption, L.cap.chars, L.cap.size + 4);
  R.note.setAttribute('y', L.cap.y + 45 + capLines * (L.cap.size + 4) + 2);
  setText(R.note, L.compact && !last && L.cap.h < 100 ? '' : last ? M.soWhat : '▸ ' + e.note, L.cap.nchars, L.cap.size + 2);
  R.note.setAttribute('font-weight', last ? 700 : 400); R.note.setAttribute('fill', last ? C.ink : C.muted);
  const goodEnd = M.proactive;
  R.capBox.setAttribute('fill', last ? (goodEnd ? C.goodTint : C.hiTint) : C.soft); R.capBox.setAttribute('stroke', last ? (goodEnd ? C.good : C.hi) : C.soft);
  // stats
  const S = [[L.narrow ? 'Sources in profile' : 'Sources in her profile', pf.sources.length + ' of 5'],
    [L.narrow ? 'Insight' : 'At-risk insight', snap.insight ? 'fired ' + clock(M.insightMs).replace('today ', '') : e.kind === 'none' || (done && !snap.insight) ? 'never fired' : 'not yet'],
    [L.narrow ? 'Maria called' : 'Times Maria has called', snap.calls + (snap.calls === 1 ? ' time' : ' times')]];
  R.stats.forEach((s, k) => { setText(s.k, S[k][0]); setText(s.v, S[k][1]); });
  R.stats[1].v.setAttribute('fill', snap.insight ? (M.proactive ? C.good : C.hi) : C.ink); R.stats[2].v.setAttribute('fill', snap.calls > 1 ? C.bad : C.ink);
}

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  seek(t) { if (!tl) return; T = Math.min(Math.max(0, t), M.duration); tl.seek(T, false); setState(T); },
  mount(r, params) {
    root = r; M = model(params); build(); this.seek(0);
    ro = new ResizeObserver(() => { const nm = layout(root.clientWidth, root.clientHeight); if ((nm.narrow ? 'narrow' : 'wide') !== mode || (nm.narrow && (nm.H !== L.H || !!nm.compact !== !!L.compact))) requestAnimationFrame(() => { if (M) { build(); this.seek(T); } }); });
    ro.observe(root);
  },
  update(params) { M = model(params); build(); this.seek(0); },
  destroy() { if (ro) ro.disconnect(); if (tl) tl.kill(); if (svg) svg.remove(); svg = world = tl = M = null; }
};

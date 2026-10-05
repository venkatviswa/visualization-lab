// Story mode: five desks, one claim card that moves between them, and a day strip that fills green while someone works
// and grey while the claim waits. One paused GSAP timeline built from model(); the host drives it through seek(t).
const NS = 'http://www.w3.org/2000/svg', FONT = 'system-ui, -apple-system, Segoe UI, sans-serif';
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d', bad: '#b42318', soft: '#f4f6f9', tint: '#e8eefb', goodTint: '#e6f4ec', badTint: '#fdecea', faint: '#9aa3b2', wait: '#e6e9ef' };
let root = null, svg = null, tl = null, M = null, T = 0, ro = null, size = '', capTexts = [], dayText = null, statTexts = [], deskCounts = [];
const ctx = document.createElement('canvas').getContext('2d');
const tw = (s, fs, wt) => { ctx.font = (wt || 400) + ' ' + fs + 'px ' + FONT; return ctx.measureText(s).width; };
function wrap(s, maxW, fs, wt) { const out = []; let line = ''; for (const w of s.split(' ')) { const t = line ? line + ' ' + w : w; if (line && tw(t, fs, wt) > maxW) { out.push(line); line = w; } else line = t; } if (line) out.push(line); return out; }
function el(tag, attrs, parent) { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; }
function txt(parent, x, y, s, o) { o = o || {}; const n = el('text', { x, y, 'font-size': o.fs || 13, 'font-weight': o.wt || 400, fill: o.fill || C.ink, 'text-anchor': o.anchor || 'start', 'font-family': FONT }, parent); n.textContent = s; return n; }
function icon(parent, name, x, y, sz, color) { const n = labIcon(name, { x, y, width: sz, height: sz, stroke: color || C.ink }); parent.appendChild(n); return n; }
const fmtD = d => (Math.round(d * 10) / 10) + ' d';

function setClock(t) {
  // Everything the picture states about time comes from the clock: the day, work and waiting so far, the caption
  let e = M.events[0]; for (const ev of M.events) if (ev.at <= t + 1e-6) e = ev;
  const done = t >= M.duration - 0.05, T0 = M.totals;
  const day = done ? T0.elapsed : Math.min(T0.elapsed, e.start + Math.max(0, Math.min(1, (t - e.at) / Math.max(e.len, 1e-6))) * e.dur);
  const work = M.events.filter(ev => ev.kind === 'work').reduce((s, ev) => s + Math.max(0, Math.min(ev.dur, day - ev.start)), 0);
  dayText.textContent = 'Day ' + (Math.round(day * 10) / 10);
  statTexts[0].textContent = 'working ' + fmtD(work); statTexts[1].textContent = 'waiting ' + fmtD(Math.max(0, day - work));
  const cap = done ? M.summary + ' Only ' + T0.touchShare + ' % of that time was anyone working on it.' : (e.kind === 'wait' ? 'Waiting · ' : '') + e.label + ': ' + e.note;
  const ls = wrap(cap, root.clientWidth - 32, 12.5); capTexts.forEach((n, q) => { n.textContent = ls[q] || ''; });
  M.lanes.forEach((ln, i) => { const d = M.events.filter(ev => ev.kind === 'work' && ev.lane === ln.id).reduce((s, ev) => s + Math.max(0, Math.min(ev.dur, day - ev.start)), 0); deskCounts[i].textContent = d > 0 ? fmtD(d) + ' of work' : M.lanesUsed.includes(ln.id) ? '' : 'not needed'; });
}
function build() {
  const W = root.clientWidth, H = root.clientHeight, narrow = W < 640;
  svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  if (tl) tl.kill(); tl = gsap.timeline({ paused: true });
  txt(svg, 16, 24, 'One claim, four desks', { fs: 14, wt: 600 });
  dayText = txt(svg, W - 16, 24, 'Day 0', { fs: 13, wt: 700, fill: C.accent, anchor: 'end' });
  statTexts = [txt(svg, W - 16, 40, '', { fs: 11, fill: C.good, anchor: 'end' }), txt(svg, W - 16, 54, '', { fs: 11, fill: C.muted, anchor: 'end' })];
  // Desks
  const n = M.lanes.length, deskTop = 66;
  const deskW = narrow ? W - 32 : (W - 32 - (n - 1) * 10) / n, deskH = narrow ? 44 : Math.max(92, Math.min(170, H - deskTop - 190)), gap = narrow ? 6 : 10;
  const deskPos = M.lanes.map((ln, i) => narrow ? { x: 16, y: deskTop + i * (deskH + gap) } : { x: 16 + i * (deskW + gap), y: deskTop });
  deskCounts = [];
  const deskRects = M.lanes.map((ln, i) => {
    const used = M.lanesUsed.includes(ln.id), p = deskPos[i], g = el('g', {}, svg);
    const r = el('rect', { x: p.x, y: p.y, width: deskW, height: deskH, rx: 9, fill: used ? C.soft : '#fff', stroke: C.line, 'stroke-dasharray': used ? 'none' : '5 4' }, g);
    icon(g, ln.icon, p.x + 10, p.y + (narrow ? 13 : 12), 18, used ? C.ink : C.faint);
    txt(g, p.x + 34, p.y + (narrow ? 20 : 26), ln.label, { fs: 12.5, wt: 600, fill: used ? C.ink : C.faint });
    deskCounts.push(txt(g, p.x + 34, p.y + (narrow ? 34 : 42), '', { fs: 10.5, fill: C.muted }));
    return r;
  });
  // The claim card
  const cardW = narrow ? 118 : Math.min(deskW - 20, 130), cardH = 30;
  const card = el('g', {}, svg), cardRect = el('rect', { x: 0, y: 0, width: cardW, height: cardH, rx: 6, fill: '#fff', stroke: C.accent, 'stroke-width': 1.5 }, card);
  icon(card, 'file-text', 7, 7, 16, C.accent); txt(card, 29, 19, 'Claim #48812', { fs: 11.5, wt: 600 });
  const badge = el('g', { opacity: 0 }, card); el('circle', { cx: cardW - 2, cy: 2, r: 9, fill: C.hi }, badge); icon(badge, 'hourglass', cardW - 8, -4, 12, '#fff');
  const cardAt = (li, waiting) => narrow ? { x: deskPos[li].x + deskW - cardW - 10, y: deskPos[li].y + 7 } : { x: deskPos[li].x + 10, y: deskPos[li].y + deskH - cardH - 8 };
  // Day strip
  const stripY = narrow ? deskTop + n * (deskH + gap) + 14 : deskTop + deskH + 30, stripH = narrow ? 14 : 30, stripX = 16, stripW = W - 32, perDay = stripW / M.totals.elapsed;
  txt(svg, stripX, stripY - 6, 'Days: green while someone works on the claim, grey while it waits', { fs: 10.5, fill: C.muted });
  el('rect', { x: stripX, y: stripY, width: stripW, height: stripH, rx: 4, fill: '#fff', stroke: C.line }, svg);
  const segs = M.events.map(ev => el('rect', { x: stripX + ev.start * perDay, y: stripY, width: 0, height: stripH, fill: ev.kind === 'work' ? (ev.bad ? C.bad : C.good) : C.wait }, svg));
  // Segment labels (wide only, when the segment is long enough for its text), shown once the segment has filled
  const segLabels = M.events.map(ev => { if (narrow) return null; const w = ev.dur * perDay, s = ev.label + ' ' + fmtD(ev.dur), short = fmtD(ev.dur); const label = tw(s, 10.5, 500) + 8 <= w ? s : tw(short, 10.5, 500) + 6 <= w ? short : null; if (!label) return null;
    return txt(svg, stripX + (ev.start + ev.dur / 2) * perDay, stripY + stripH / 2 + 4, label, { fs: 10.5, wt: 500, fill: ev.kind === 'work' ? '#fff' : C.muted, anchor: 'middle' }); });
  segLabels.forEach(l => { if (l) l.setAttribute('opacity', 0); });
  for (let d = 5; d < M.totals.elapsed; d += 5) { el('line', { x1: stripX + d * perDay, y1: stripY, x2: stripX + d * perDay, y2: stripY + stripH, stroke: '#fff', 'stroke-width': 1.5 }, svg); txt(svg, stripX + d * perDay, stripY + stripH + 12, d + ' d', { fs: 9.5, fill: C.muted, anchor: 'middle' }); }
  // Caption
  const capY = stripY + stripH + 30, capLines = Math.max(2, Math.floor((H - capY - 8) / 16));
  capTexts = Array.from({ length: capLines }, (_, k) => txt(svg, 16, capY + k * 16, '', { fs: 12.5, fill: C.muted }));
  // Timeline: the card moves at each event; the strip segment grows for the event's length; desks light up while worked at
  M.events.forEach((ev, k) => {
    const li = M.lanes.findIndex(l => l.id === ev.lane), to = cardAt(li, ev.kind === 'wait');
    tl.to(card, { attr: { transform: `translate(${to.x},${to.y})` }, duration: k === 0 ? 0.01 : 0.45, ease: 'power2.inOut' }, Math.max(0, ev.at - 0.2));
    tl.to(badge, { opacity: ev.kind === 'wait' ? 1 : 0, duration: 0.2 }, ev.at);
    tl.to(cardRect, { attr: { stroke: ev.kind === 'wait' ? C.hi : ev.bad ? C.bad : C.accent, 'stroke-dasharray': ev.kind === 'wait' ? '5 3' : 'none' }, duration: 0.2 }, ev.at);
    tl.to(segs[k], { attr: { width: ev.dur * perDay }, duration: ev.len, ease: 'none' }, ev.at);
    if (segLabels[k]) tl.to(segLabels[k], { opacity: 1, duration: 0.3 }, ev.at + ev.len * 0.7);
    if (ev.kind === 'work') { tl.to(deskRects[li], { attr: { fill: ev.bad ? C.badTint : C.tint, stroke: ev.bad ? C.bad : C.accent }, duration: 0.2 }, ev.at); tl.to(deskRects[li], { attr: { fill: ev.bad ? C.badTint : C.goodTint, stroke: ev.bad ? C.bad : C.good }, duration: 0.3 }, ev.at + ev.len); }
  });
  tl.to({}, { duration: 0.01 }, M.duration);
  card.setAttribute('transform', `translate(${cardAt(0).x},${cardAt(0).y})`);
  tl.seek(T, false); setClock(T);
  size = W + 'x' + H;
}

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  seek(t) { T = t; if (!tl) return; tl.seek(t, false); setClock(t); },
  mount(r, params) {
    root = r; M = model(params); T = 0;
    svg = el('svg', { style: 'display:block;position:absolute;inset:0;background:#fff;font-family:' + FONT }, root);
    build();
    ro = new ResizeObserver(() => requestAnimationFrame(() => { if (svg && M && root.clientWidth + 'x' + root.clientHeight !== size) build(); })); ro.observe(root);
  },
  update(params) { M = model(params); T = 0; build(); },
  destroy() { if (ro) ro.disconnect(); if (tl) tl.kill(); if (svg) svg.remove(); svg = null; tl = null; M = null; }
};

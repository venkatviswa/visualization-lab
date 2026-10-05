// Story mode: the process as a growing tableau of record cards. Each event slides a card for its object into the next
// slot with its key fields, draws the relation it arrived along from the card it came from, and the narrator caption
// says what happened. One paused GSAP timeline built from model(); the host drives it through seek(t).
const NS = 'http://www.w3.org/2000/svg', FONT = 'system-ui, -apple-system, Segoe UI, sans-serif';
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d', bad: '#b42318', soft: '#f4f6f9', tint: '#e8eefb', faint: '#9aa3b2' };
const TEAM = { membership: '#2b59c3', network: '#0f766e', claims: '#6d4bbf', service: '#be4d8a', finance: '#b4530f' };
const ICON = { member: 'user', policy: 'shield-check', provider: 'stethoscope', auth: 'clipboard-check', claim: 'file-text', line: 'list', payment: 'banknote', case: 'headset', appeal: 'gavel', letter: 'mail' };
let root = null, svg = null, tl = null, M = null, T = 0, ro = null, size = '', capTexts = [], statText = null;
const ctx = document.createElement('canvas').getContext('2d');
const tw = (s, fs, wt) => { ctx.font = (wt || 400) + ' ' + fs + 'px ' + FONT; return ctx.measureText(s).width; };
function wrap(s, maxW, fs, wt) { const out = []; let line = ''; for (const w of s.split(' ')) { const t = line ? line + ' ' + w : w; if (line && tw(t, fs, wt) > maxW) { out.push(line); line = w; } else line = t; } if (line) out.push(line); return out; }
function el(tag, attrs, parent) { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; }
function txt(parent, x, y, s, o) { o = o || {}; const n = el('text', { x, y, 'font-size': o.fs || 13, 'font-weight': o.wt || 400, fill: o.fill || C.ink, 'text-anchor': o.anchor || 'start', 'font-family': FONT }, parent); n.textContent = s; return n; }
function icon(parent, name, x, y, sz, color) { const n = labIcon(name, { x, y, width: sz, height: sz, stroke: color || C.ink }); parent.appendChild(n); return n; }

function setClock(t) {
  let e = M.events[0]; for (const ev of M.events) if (ev.start <= t + 1e-6) e = ev;
  const done = t >= M.duration - 0.05, o = M.objects.find(x => x.id === e.object);
  const cap = done ? M.summary : 'Step ' + (e.i + 1) + ' of ' + M.events.length + ' · ' + M.steps[e.i].title + (M.ownership ? ' (' + o.teamLabel + ')' : '') + ': ' + e.note;
  const ls = wrap(cap, root.clientWidth - 32, 12.5); capTexts.forEach((n, q) => { n.textContent = ls[q] || ''; });
  const touched = new Set(M.events.filter(ev => ev.i <= e.i).map(ev => ev.object)).size, teams = new Set(M.events.filter(ev => ev.i <= e.i).map(ev => M.objects.find(x => x.id === ev.object).team)).size;
  statText.textContent = touched + ' object' + (touched === 1 ? '' : 's') + ' · ' + teams + ' team' + (teams === 1 ? '' : 's') + (done ? ' · ' + M.handoffs + ' hand-offs' : '');
}
function build() {
  const W = root.clientWidth, H = root.clientHeight, narrow = W < 640;
  svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  if (tl) tl.kill(); tl = gsap.timeline({ paused: true });
  txt(svg, 16, 24, (narrow ? 'Data model · ' : 'The data model comes alive · ') + M.processTitle.toLowerCase(), { fs: 14, wt: 600 });
  statText = txt(svg, W - 16, 24, '', { fs: 11.5, wt: 600, fill: C.accent, anchor: 'end' });
  const capLines = narrow ? 3 : 2, capY = 44;
  capTexts = Array.from({ length: capLines }, (_, k) => txt(svg, 16, capY + k * 16, '', { fs: 12.5, fill: C.muted }));
  // Slots: one per distinct object in order of first touch
  const order = [...new Set(M.events.map(e => e.object))], cols = narrow ? 2 : 4, rows = Math.ceil(order.length / cols);
  const top = capY + capLines * 16 + 6, areaH = H - top - 8, gap = 10;
  const cardW = (W - 32 - (cols - 1) * gap) / cols, cardH = Math.min(narrow ? 84 : 110, (areaH - (rows - 1) * gap) / rows);
  const slot = k => ({ x: 16 + (k % cols) * (cardW + gap), y: top + Math.floor(k / cols) * (cardH + gap) });
  const cards = {}, linkLayer = el('g', {}, svg);
  order.forEach((id, k) => {
    const o = M.objects.find(x => x.id === id), p = slot(k), col = M.ownership ? TEAM[o.team] : C.accent, g = el('g', { opacity: 0, transform: `translate(${p.x},${p.y + 14})` }, svg);
    const r = el('rect', { x: 0, y: 0, width: cardW, height: cardH, rx: 9, fill: '#fff', stroke: col, 'stroke-width': 1.5 }, g);
    el('rect', { x: 0, y: 0, width: cardW, height: 26, rx: 9, fill: col + '1f' }, g); el('rect', { x: 0, y: 14, width: cardW, height: 12, fill: col + '1f' }, g);
    icon(g, ICON[id] || 'file', 8, 5, 16, col);
    let label = o.label; while (label.length > 4 && tw(label, narrow ? 11.5 : 12.5, 600) > cardW - 42) label = label.slice(0, -2) + '…';
    txt(g, 30, 18, label, { fs: narrow ? 11.5 : 12.5, wt: 600 });
    const fy0 = M.ownership && !narrow ? 54 : 44;
    if (M.ownership && !narrow) txt(g, 10, 40, 'owner: ' + o.teamLabel, { fs: 9.5, wt: 600, fill: col });
    const fields = o.fields.slice(0, narrow ? 2 : 3).map((f, q) => txt(g, 10, fy0 + q * (narrow ? 15 : 17), f, { fs: narrow ? 10 : 11, fill: C.muted }));
    const badge = el('g', { opacity: 0 }, g); el('circle', { cx: cardW - 2, cy: 2, r: 9, fill: col }, badge); txt(badge, cardW - 2, 5.5, String(k + 1), { fs: 10, wt: 700, fill: '#fff', anchor: 'middle' });
    cards[id] = { g, r, p, k, fields, badge, col, action: el('text', { x: 10, y: cardH - 8, 'font-size': 10.5, 'font-weight': 600, fill: C.hi, 'font-family': FONT, opacity: 0 }, g) };
  });
  // Timeline
  M.events.forEach(ev => {
    const c = cards[ev.object], first = M.events.find(x => x.object === ev.object).i === ev.i, o = M.objects.find(x => x.id === ev.object);
    if (first) { tl.to(c.g, { opacity: 1, attr: { transform: `translate(${c.p.x},${c.p.y})` }, duration: 0.5, ease: 'power2.out' }, ev.start); tl.to(c.badge, { opacity: 1, duration: 0.2 }, ev.start + 0.4); }
    // highlight while the event is on, then settle
    tl.to(c.r, { attr: { stroke: C.hi, 'stroke-width': 2.5 }, duration: 0.2 }, ev.start);
    tl.to(c.r, { attr: { stroke: c.col, 'stroke-width': 1.5 }, duration: 0.3 }, ev.start + ev.dur - 0.3);
    c.action.textContent = ev.action === 'create' ? 'created' : ev.action === 'link' ? 'linked' : 'updated';
    tl.to(c.action, { opacity: 1, duration: 0.2 }, ev.start + 0.6);
    tl.to(c.action, { opacity: 0, duration: 0.2 }, ev.start + ev.dur - 0.2);
    if (ev.via && cards[ev.via]) {
      // relation arrow from the card it came from, labelled with the relation
      const a = cards[ev.via], rel = M.relations.find(r => (r.from === ev.via && r.to === ev.object) || (r.from === ev.object && r.to === ev.via));
      const x1 = a.p.x + cardW / 2, y1 = a.p.y + cardH / 2, x2 = c.p.x + cardW / 2, y2 = c.p.y + cardH / 2;
      const sameRow = Math.abs(y1 - y2) < 1, sx = sameRow ? (x2 > x1 ? a.p.x + cardW : a.p.x) : x1, sy = sameRow ? y1 : (y2 > y1 ? a.p.y + cardH : a.p.y), ex = sameRow ? (x2 > x1 ? c.p.x : c.p.x + cardW) : x2, ey = sameRow ? y2 : (y2 > y1 ? c.p.y : c.p.y + cardH);
      const path = el('path', { d: `M${sx},${sy}L${ex},${ey}`, fill: 'none', stroke: C.hi, 'stroke-width': 2, 'stroke-dasharray': '6 4', opacity: 0 }, linkLayer);
      const lab = txt(linkLayer, (sx + ex) / 2, (sy + ey) / 2 - 5, rel ? rel.label : '', { fs: 10, wt: 600, fill: C.hi, anchor: 'middle' }); lab.setAttribute('opacity', 0); lab.setAttribute('paint-order', 'stroke'); lab.setAttribute('stroke', '#fff'); lab.setAttribute('stroke-width', 3);
      tl.to([path, lab], { opacity: 1, duration: 0.3 }, ev.start + 0.2);
      tl.to([path, lab], { opacity: 0.35, duration: 0.3 }, ev.start + ev.dur);
    }
  });
  tl.to({}, { duration: 0.01 }, M.duration);
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

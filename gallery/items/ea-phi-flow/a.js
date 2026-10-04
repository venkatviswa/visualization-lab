// Story mode: one SVG drawn in real pixels plus one paused GSAP timeline built from model(). The host drives it through seek(t).
// Three claim records travel hop by hop; field chips turn red where exposed, get cut or tokenised at checkpoints, and the vendor gate can block a record.
const NS = 'http://www.w3.org/2000/svg', FONT = 'system-ui, -apple-system, Segoe UI, sans-serif';
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d', bad: '#b42318',
  soft: '#f4f6f9', tint: '#e8eefb', goodTint: '#e6f4ec', badTint: '#fdecea', faint: '#9aa3b2' };
let root = null, svg = null, tl = null, M = null, T = 0, hdr = null, st = [], edges = [], scoreEl = null, ro = null, timer = 0, size = '';
const ctx = document.createElement('canvas').getContext('2d');
const tw = (s, fs, wt) => { ctx.font = (wt || 400) + ' ' + fs + 'px ' + FONT; return ctx.measureText(s).width; };
function wrap(s, maxW, fs, wt) {
  const out = []; let line = '';
  for (const w of s.split(' ')) { const t = line ? line + ' ' + w : w; if (line && tw(t, fs, wt) > maxW) { out.push(line); line = w; } else line = t; }
  if (line) out.push(line);
  return out;
}
function el(tag, attrs, parent) {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}
function txt(parent, x, y, s, o) {
  o = o || {};
  const n = el('text', { x, y, 'font-size': o.fs || 13, 'font-weight': o.wt || 400, fill: o.fill || C.ink, 'text-anchor': o.anchor || 'start', 'font-family': FONT }, parent);
  n.textContent = s;
  return n;
}
function icon(parent, name, x, y, sz, color) { const n = labIcon(name, { x, y, width: sz, height: sz, stroke: color || C.ink }); parent.appendChild(n); return n; }
function para(parent, x, y, s, w, o) { const ls = wrap(s, w, o.fs, o.wt); ls.forEach((l, k) => txt(parent, x, y + k * o.lh, l, o)); return ls.length * o.lh; }
const STY = {
  neutral: ['#fff', C.line, C.ink, null], needed: ['#fff', '#8cc7a6', C.ink, 'check'], exposed: [C.badTint, C.bad, C.bad, 'triangle-alert'],
  dropped: [C.soft, C.line, C.faint, 'scissors'], tokenised: [C.tint, C.accent, C.accent, 'key-round'], blocked: ['#eceef2', C.line, C.faint, 'lock'], absent: ['none', C.line, '#b8bfcc', null]
};
function chip(parent, x, y, w, h, state, label) {
  const [fill, stroke, ink, ic] = STY[state], g = el('g', {}, parent);
  el('rect', { x, y, width: w, height: h, rx: 6, fill, stroke, 'stroke-width': state === 'exposed' ? 1.6 : 1, 'stroke-dasharray': state === 'absent' || state === 'dropped' ? '4 3' : 'none' }, g);
  const fs = h < 25 ? 11.5 : 12;
  const t = txt(g, x + 8, y + h / 2 + 4, label, { fs, wt: state === 'exposed' ? 600 : 400, fill: ink });
  if (state === 'dropped') el('line', { x1: x + 7, y1: y + h / 2, x2: x + 9 + tw(label, fs), y2: y + h / 2, stroke: C.faint }, g);
  if (ic) icon(g, ic, x + w - 19, y + (h - 13) / 2, 13, state === 'dropped' ? C.hi : ink === C.ink ? C.good : ink);
  return g;
}
const fieldLabel = (f, cell, mb) => cell.action === 'tokenised' ? ({ token: 'Token ' + mb.token, 'age band': 'Age ' + mb.band, region: 'Region ' + mb.region })[cell.as] : f.label;

function card(g, x, y, w, L, hop, grp, s, e) {
  const ids = String(grp.members).split(', ').map(Number), mb = M.members[ids[0] - 1], hi = M.hops.indexOf(hop);
  const up = hop.from >= 0 ? M.hops[hop.from].records[ids[0] - 1] : null;
  const cols = w >= 300 ? 2 : 1, cw = (w - 16 - (cols - 1) * 8) / cols, rows = Math.ceil(7 / cols);
  L = Object.assign({}, L); L.ch = Math.max(22, Math.min(L.ch, (L.avail - 40) / rows - L.gap));
  const h = 32 + rows * (L.ch + L.gap) + 4;
  const cg = el('g', {}, g);
  for (let k = Math.min(grp.count, 3) - 1; k > 0; k--) el('rect', { x: x + k * 4, y: y - k * 4, width: w, height: h, rx: 10, fill: '#fff', stroke: C.line }, cg);
  el('rect', { x, y, width: w, height: h, rx: 10, fill: '#fff', stroke: grp.optedOut ? C.hi : C.line, 'stroke-width': grp.optedOut ? 1.5 : 1 }, cg);
  icon(cg, 'file-text', x + 8, y + 7, 15, C.accent);
  const head = grp.count === 3 ? '3 claim records' : grp.count === 2 ? 'Members ' + grp.members.replace(', ', ' and ') : 'Member ' + grp.members + (grp.optedOut ? ' · opted out' : '');
  txt(cg, x + 28, y + 19, head, { fs: 12.5, wt: 600, fill: grp.optedOut ? C.hi : C.ink });
  M.fields.forEach((f, k) => {
    const cx = x + 8 + (k % cols) * (cw + 8), cy = y + 30 + Math.floor(k / cols) * (L.ch + L.gap), cell = grp.cells[f.id];
    const arrive = up && !up.cells[f.id].present ? 'absent' : 'neutral';
    chip(cg, cx, cy, cw, L.ch, arrive, f.label);
    const fin = cell.action === 'none' ? (cell.exposed ? 'exposed' : 'needed') : cell.action;
    if (fin === arrive || e.revealAt == null) return;
    const top = chip(cg, cx, cy, cw, L.ch, fin, fieldLabel(f, cell, mb));
    gsap.set(top, { opacity: 0 });
    tl.to(top, { opacity: 1, duration: 0.3 }, (cell.action === 'none' ? e.revealAt : e.checkAt) + k * 0.06);
  });
  if (grp.blocked) {
    const b = el('g', {}, cg);
    el('rect', { x: x + w / 2 - 70, y: y + h / 2 - 18, width: 140, height: 36, rx: 8, fill: '#fff', stroke: C.hi, 'stroke-width': 2 }, b);
    icon(b, 'ban', x + w / 2 - 60, y + h / 2 - 9, 18, C.hi);
    txt(b, x + w / 2 - 36, y + h / 2 + 5, 'Blocked at gate', { fs: 12.5, wt: 700, fill: C.hi });
    gsap.set(b, { opacity: 0, scale: 0.8, transformOrigin: '50% 50%' });
    tl.to(b, { opacity: 1, scale: 1, duration: 0.3 }, e.checkAt + 0.3);
  }
  gsap.set(cg, { opacity: 0, x: -36 });
  tl.to(cg, { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out' }, s);
  return h;
}

function hopScene(g, e, L) {
  const hop = M.hops[e.hop], s = e.start, sg = M.safeguards, i = e.hop;
  const two = hop.groups.length > 1, cw = L.narrow ? (two ? (L.pw - 10) / 2 : L.pw) : (two ? (L.cardW - 12) / 2 : L.cardW);
  const short = L.narrow && L.ph < 400;   // a short phone root (an embed): a smaller card and only the lines that carry the lesson
  L = Object.assign({}, L, { avail: L.narrow ? L.ph * (two ? (short ? 0.5 : 0.56) : (short ? 0.42 : 0.48)) : L.ph });
  let ch = 0;
  hop.groups.forEach((grp, k) => { ch = Math.max(ch, card(g, L.px + k * (cw + (L.narrow ? 10 : 12)), L.py + 4, cw, L, hop, grp, s + k * 0.15, e)); });
  const ix = L.narrow ? L.px : L.px + L.cardW + 28, iw = L.narrow ? L.pw : L.W - ix - 28;
  let y = L.narrow ? L.py + ch + 26 : L.py + 16;
  const info = el('g', {}, g);
  txt(info, ix, y, L.narrow ? hop.short : hop.label, { fs: 15, wt: 700 }); y += 20;
  if (hop.generic !== hop.label && !L.narrow) { txt(info, ix, y - 2, hop.generic, { fs: 12, fill: C.muted }); y += 16; }
  const needs = hop.needs.split(' ').map(id => M.fields.find(f => f.id === id).label);
  const needTxt = i === 0 ? 'all 7 fields' : needs.join(', ') + (hop.derived ? ', plus ' + hop.derived.replace(/^an? /, '') + ' (derived)' : '') + (hop.gate ? '; nothing for members who opted out' : '');
  if (!short) y += para(info, ix, y, 'Purpose: ' + hop.purpose + '.', iw, { fs: 12.5, fill: C.muted, lh: 16 }) + 2;
  y += para(info, ix, y, 'Needs: ' + needTxt + '.', iw, { fs: short ? 12 : 12.5, fill: C.muted, lh: short ? 15 : 16 }) + (short ? 4 : 8);
  gsap.set(info, { opacity: 0 }); tl.to(info, { opacity: 1, duration: 0.3 }, s + 0.15);
  const g0 = hop.groups[0], drops = M.fields.filter(f => g0.cells[f.id].action === 'dropped').map(f => f.label);
  const toks = M.fields.filter(f => g0.cells[f.id].action === 'tokenised').map(f => ({ name: 'name', mid: 'ID', dob: 'DOB', addr: 'address' })[f.id] + ' to ' + g0.cells[f.id].as);
  const cps = [];
  if (i > 0) cps.push(sg.minNecessary ? ['scissors', drops.length ? 'Filter drops ' + drops.join(', ').replace(/, ([^,]*)$/, ' and $1').toLowerCase().replace(' id', ' ID') : 'Filter: nothing extra arrives to drop', C.hi]
    : ['scissors', 'No filter: every field is forwarded', C.faint]);
  if (hop.analytics) cps.push(sg.deidentify ? ['key-round', toks.length ? 'De-identified: ' + toks.join(', ') : 'De-identified: no identifiers left', C.accent] : ['key-round', 'No de-identification on this path', C.faint]);
  if (hop.gate) cps.push(sg.consentCheck ? ['shield-check', 'Consent and BAA check: Member 3 blocked', C.good] : ['shield-off', 'No consent check: all 3 records exported', C.faint]);
  cps.forEach(([ic, t, col], k) => {
    const r = el('g', {}, g);
    icon(r, ic, ix, y - 12, 16, col);
    y += para(r, ix + 24, y, t + '.', iw - 24, { fs: short ? 12 : 12.5, fill: col === C.faint ? C.muted : C.ink, lh: short ? 15 : 16 }) + (short ? 2 : 4);
    gsap.set(r, { opacity: 0 }); tl.to(r, { opacity: 1, duration: 0.25 }, e.checkAt + k * 0.12);
  });
  const res = el('g', {}, g), n = hop.exposures;
  if (L.narrow) y = L.py + ch + 6 + 20 - 8;
  txt(res, L.narrow ? ix + iw : ix, y + 8, n ? '+' + n + ' exposures' + (L.narrow ? '' : ' at this hop') : 'No exposure' + (L.narrow ? '' : ' at this hop'), { fs: 14, wt: 700, fill: n ? C.bad : C.good, anchor: L.narrow ? 'end' : 'start' });
  if (n && !hop.gate && !L.narrow) txt(res, ix, y + 26, n / 3 + ' per record × 3 records', { fs: 12, fill: C.muted });
  if (n && hop.gate && !L.narrow) txt(res, ix, y + 26, hop.groups.map(gr => gr.exposures + ' × ' + gr.count).join(' + '), { fs: 12, fill: C.muted });
  gsap.set(res, { opacity: 0 }); tl.to(res, { opacity: 1, duration: 0.25 }, e.revealAt + 0.4);
}

function introScene(g, e, L) {
  const s = e.start, n = L.narrow, a = el('g', {}, g), bx = n ? L.px + 70 : L.px + 80, by = L.py + 10, bw = n ? L.pw - 70 : 300;
  el('circle', { cx: L.px + (n ? 32 : 34), cy: by + 34, r: n ? 24 : 32, fill: C.tint }, a);
  icon(a, 'user', L.px + (n ? 18 : 16), by + (n ? 20 : 16), n ? 28 : 36, C.accent);
  txt(a, L.px + (n ? 32 : 34), by + (n ? 74 : 86), 'Product owner', { fs: 11.5, fill: C.muted, anchor: 'middle' });
  const said = wrap('“I need a readmission risk dashboard. Can we use the claims data?”', bw - 28, 13.5, 500);
  el('rect', { x: bx, y: by, width: bw, height: 22 + said.length * 18, rx: 12, fill: '#fff', stroke: C.accent }, a);
  said.forEach((l, k) => txt(a, bx + 14, by + 24 + k * 18, l, { fs: 13.5, wt: 500 }));
  const grp = { members: '1, 2, 3', count: 3, cells: M.hops[0].groups[0].cells, optedOut: false };
  const cx = n ? L.px : L.px + Math.max(420, L.cardW + 28), cw = n ? L.pw : Math.min(420, L.W - cx - 28);
  const cy = n ? by + 40 + said.length * 18 + 20 : L.py + 10;
  card(g, cx, cy, cw, Object.assign({}, L, { avail: n ? L.ph - (cy - L.py) : L.ph }), { from: -1 }, grp, s + 0.8, {});
}

function finaleScene(g, e, L) {
  const s = e.start, n = L.narrow, a = el('g', {}, g), base = M.baseline, mx = Math.max(...M.hops.map(h => h.exposures), 1);
  txt(a, L.px, L.py + 44, String(M.score), { fs: 44, wt: 700, fill: M.score ? C.bad : C.good });
  const sx = L.px + tw(String(M.score), 44, 700) + 12;
  txt(a, sx, L.py + 26, 'field exposures', { fs: 13, wt: 600 });
  txt(a, sx, L.py + 44, base + ' with no safeguards', { fs: 12.5, fill: C.muted });
  const bw = n ? L.pw : L.cardW, lw = Math.max(...M.hops.map(h => tw(n ? h.short : h.label, 12))) + 12, rowH = n ? 21 : Math.min(34, (L.ph - 90) / 6), y0 = L.py + 70;
  M.hops.forEach((h, k) => {
    const y = y0 + k * rowH, w = (bw - lw - 40) * h.exposures / mx;
    txt(a, L.px, y + 13, n ? h.short : h.label, { fs: 12, fill: C.muted });
    el('rect', { x: L.px + lw, y: y + 2, width: bw - lw - 40, height: 14, rx: 7, fill: '#e7ebf1' }, a);
    const b = el('rect', { x: L.px + lw, y: y + 2, width: 0, height: 14, rx: 7, fill: C.bad }, a);
    tl.to(b, { attr: { width: w }, duration: 0.5 }, s + 0.3 + k * 0.08);
    txt(a, L.px + bw - 32, y + 14, String(h.exposures), { fs: 12, wt: 600, fill: h.exposures ? C.bad : C.good });
  });
  gsap.set(a, { opacity: 0 }); tl.to(a, { opacity: 1, duration: 0.35 }, s + 0.1);
  const bx = n ? L.px : L.px + L.cardW + 28, by = n ? y0 + 6 * rowH + 10 : L.py + 8, bwid = n ? L.pw : L.W - bx - 28;
  const b = el('g', {}, g), ls = wrap(M.soWhat, bwid - 52, 13.5, 500);
  el('rect', { x: bx, y: by, width: bwid, height: 46 + ls.length * 19, rx: 12, fill: C.tint, stroke: C.accent }, b);
  icon(b, 'lightbulb', bx + 14, by + 14, 22, C.accent);
  txt(b, bx + 46, by + 30, 'So what for architects', { fs: 13.5, wt: 700, fill: C.accent });
  ls.forEach((l, k) => txt(b, bx + 46, by + 52 + k * 19, l, { fs: 13.5, wt: 500 }));
  const sg = M.safeguards, rows = [['scissors', 'Minimum necessary filtering', sg.minNecessary], ['key-round', 'De-identification for analytics', sg.deidentify], ['shield-check', 'Consent and BAA check', sg.consentCheck]];
  let y = by + 46 + ls.length * 19 + (n ? 22 : 28);
  if (!n || y + 60 < L.H) rows.forEach(([ic, lab, on]) => {
    icon(b, ic, bx + 2, y - 12, 16, on ? C.good : C.faint);
    txt(b, bx + 26, y, lab, { fs: 12.5, fill: on ? C.ink : C.muted });
    txt(b, bx + bwid - 4, y, on ? 'On' : 'Off', { fs: 12.5, wt: 700, fill: on ? C.good : C.faint, anchor: 'end' });
    y += 22;
  });
  gsap.set(b, { opacity: 0, y: 10 }); tl.to(b, { opacity: 1, y: 0, duration: 0.4 }, s + 1.0);
}

function build() {
  if (tl) tl.kill();
  while (svg.firstChild) svg.firstChild.remove();
  const W = root.clientWidth, H = root.clientHeight, narrow = W < 640;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  el('rect', { width: W, height: H, fill: '#fff' }, svg);
  tl = gsap.timeline({ paused: true });
  txt(svg, 16, 24, 'Where does PHI travel?', { fs: 14, wt: 600 });
  txt(svg, narrow ? W - 50 : W - 16, narrow ? 24 : 15, 'Exposure score', { fs: 11, fill: C.muted, anchor: 'end' });
  scoreEl = txt(svg, W - 16, narrow ? 26 : 38, '0', { fs: narrow ? 20 : 22, wt: 700, anchor: 'end' });
  hdr = { lines: [0, 1, 2].map(k => txt(svg, 16, 46 + k * 16, '', { fs: 12.5, fill: C.muted })), w: W - (narrow ? 32 : 140), max: narrow ? 3 : 2 };
  const r = narrow ? 15 : 21, ty = narrow ? 128 : 118, pad = narrow ? 40 : 70, xs = M.hops.map((h, i) => pad + i * (W - 2 * pad) / 5);
  edges = M.hops.map((h, i) => {
    if (h.from < 0) return null;
    const x1 = xs[h.from], x2 = xs[i], lift = i - h.from - 1;
    const d = lift ? `M${x1 + r * 0.5} ${ty - r * 0.85} C${x1 + 20} ${ty - r - 14 * lift - 6} ${x2 - 20} ${ty - r - 14 * lift - 6} ${x2 - r * 0.5} ${ty - r * 0.85}` : `M${x1 + r} ${ty} L${x2 - r} ${ty}`;
    return el('path', { d, fill: 'none', stroke: C.line, 'stroke-width': 2.5 }, svg);
  });
  st = M.hops.map((h, i) => {
    const g = el('g', {}, svg);
    const c = el('circle', { cx: xs[i], cy: ty, r, fill: '#fff', stroke: C.line, 'stroke-width': 2 }, g);
    icon(g, h.icon, xs[i] - r * 0.55, ty - r * 0.55, r * 1.1, C.ink);
    const lab = narrow ? [h.short] : wrap(h.label, Math.min((W - 2 * pad) / 5 - 8, 2 * pad - 6), 12);
    lab.slice(0, 2).forEach((l, k) => txt(g, xs[i], ty + r + 15 + k * 14, l, { fs: narrow ? 11 : 12, anchor: 'middle' }));
    const badge = el('g', {}, g);
    const bc = el('circle', { cx: xs[i] + r * 0.8, cy: ty - r * 0.8, r: 9, fill: C.bad }, badge);
    const bt = txt(badge, xs[i] + r * 0.8, ty - r * 0.8 + 3.5, String(h.exposures), { fs: 10, wt: 700, fill: '#fff', anchor: 'middle' });
    if (!h.exposures) bt.textContent = '0';
    bc.setAttribute('fill', h.exposures ? C.bad : C.good);
    return { c, badge };
  });
  const py = ty + r + (narrow ? 32 : 44);
  el('rect', { x: 10, y: py, width: W - 20, height: H - py - 10, rx: 12, fill: C.soft }, svg);
  const L = { W, H, narrow, px: narrow ? 22 : 30, pw: W - 44, py: py + 14, cardW: narrow ? W - 44 : Math.min(500, W * 0.5), ch: narrow ? 26 : 34, gap: narrow ? 5 : 8, ph: H - py - 38 };
  M.events.forEach((e, k) => {
    const g = el('g', {}, svg);
    gsap.set(g, { opacity: 0 });
    tl.set(g, { opacity: 1 }, e.start);
    if (k < M.events.length - 1) tl.set(g, { opacity: 0 }, e.start + e.dur);
    (e.kind === 'hop' ? hopScene : e.kind === 'intro' ? introScene : finaleScene)(g, e, L);
  });
  tl.set({}, {}, M.duration);
}

function setState(t) {
  let e = M.events[0];
  for (const ev of M.events) if (ev.start <= t + 1e-6) e = ev;
  const done = t >= M.duration - 0.05;
  const ls = wrap(done ? M.summary : e.note, hdr.w, 12.5).slice(0, hdr.max);
  hdr.lines.forEach((n, k) => { n.textContent = ls[k] || ''; n.setAttribute('fill', done ? C.ink : C.muted); });
  let score = 0;
  M.events.forEach(ev => { if (ev.kind === 'hop' && t >= ev.revealAt) score += M.hops[ev.hop].exposures; });
  scoreEl.textContent = score;
  scoreEl.setAttribute('fill', score ? C.bad : t >= M.events[M.events.length - 1].start ? C.good : C.ink);
  M.events.forEach(ev => {
    if (ev.kind !== 'hop') return;
    const i = ev.hop, active = e === ev && !done, seen = t >= ev.revealAt, entered = t >= ev.start;
    st[i].c.setAttribute('fill', active ? C.tint : seen ? (M.hops[i].exposures ? C.badTint : C.goodTint) : '#fff');
    st[i].c.setAttribute('stroke', active ? C.accent : seen ? (M.hops[i].exposures ? C.bad : C.good) : C.line);
    st[i].c.setAttribute('stroke-width', active ? 3 : 2);
    st[i].badge.setAttribute('opacity', seen ? 1 : 0);
    if (edges[i]) edges[i].setAttribute('stroke', entered ? C.accent : C.line);
  });
}

function rebuild() { build(); tl.seek(Math.min(T, M.duration), false); setState(T); }

window.lab = {
  get duration() { return M ? M.duration : 22; },
  get markers() { return M ? M.markers : []; },
  seek(t) { T = t; if (!tl) return; tl.seek(Math.min(t, M.duration), false); setState(t); },
  mount(r, params) {
    root = r; M = model(params); T = 0;
    svg = el('svg', { width: '100%', height: '100%', role: 'img', 'aria-label': 'Three claim records travel from the claims system to analytics and a vendor; unneeded fields light up as exposures' });
    svg.style.display = 'block';
    root.appendChild(svg);
    rebuild();
    ro = new ResizeObserver(() => { const k = root.clientWidth + 'x' + root.clientHeight; if (k === size) return; size = k; clearTimeout(timer); timer = setTimeout(rebuild, 60); });
    ro.observe(root);
  },
  update(params) { M = model(params); T = 0; rebuild(); },
  destroy() { if (ro) ro.disconnect(); clearTimeout(timer); if (tl) tl.kill(); if (svg) svg.remove(); svg = tl = M = null; }
};

// Story mode: one SVG, one paused GSAP timeline with one scene per flashcard. The host drives it through seek(t).
// The SVG is drawn in real pixels (viewBox = root size) so text stays readable on a phone; resize rebuilds the timeline.
const NS = 'http://www.w3.org/2000/svg', FONT = 'system-ui, -apple-system, Segoe UI, sans-serif';
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d', tint: '#e8eefb', amber: '#fff4e5', soft: '#f4f6f9' };
let root = null, svg = null, tl = null, M = null, T = 0, hdr = null, strip = [], stages = [], ro = null, timer = 0, size = '';
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
function icon(parent, name, x, y, sz, color) {
  const n = labIcon(name, { x, y, width: sz, height: sz, stroke: color || C.ink });
  parent.appendChild(n);
  return n;
}

function build() {
  if (tl) tl.kill();
  while (svg.firstChild) svg.firstChild.remove();
  const W = root.clientWidth, H = root.clientHeight, narrow = W < 600;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  el('rect', { width: W, height: H, fill: '#fff' }, svg);
  tl = gsap.timeline({ paused: true });
  // header
  txt(svg, 16, 24, 'Data privacy terms in plain English', { fs: 14, wt: 600 });
  hdr = { lines: [0, 1].map(i => txt(svg, 16, 44 + i * 16, '', { fs: 12.5, fill: C.muted })), w: W - 32, max: narrow ? 2 : 1 };
  // progress strip: one segment per card
  const n = M.cards.length, sy = narrow ? 84 : 70, gap = narrow ? 5 : 8, sw = (W - 32 - gap * (n - 1)) / n;
  strip = M.cards.map((c, i) => {
    const x = 16 + i * (sw + gap);
    el('rect', { x, y: sy, width: sw, height: 6, rx: 3, fill: C.line }, svg);
    const fill = el('rect', { x, y: sy, width: 0, height: 6, rx: 3, fill: C.accent }, svg);
    const label = narrow ? String(c.index) : (tw(c.term, 11.5) <= sw ? c.term : String(c.index));
    const lt = txt(svg, x + (narrow ? sw / 2 : 0), sy + 22, label, { fs: 11.5, fill: C.muted, anchor: narrow ? 'middle' : 'start' });
    return { fill, lt, sw };
  });
  // the deck: two static cards behind the live one
  const cw = Math.min(700, W - 48), x0 = (W - cw - 16) / 2, top = sy + 42;
  const pad = narrow ? 18 : 28, isz = narrow ? 44 : 64;
  const tx = narrow ? x0 + pad : x0 + pad + isz + 24, tW = x0 + cw - pad - tx;
  const fsT = narrow ? 24 : 30, fsD = narrow ? 15.5 : 17.5, fsE = narrow ? 14 : 15.5;
  const lay = M.cards.map(c => {
    const def = wrap(c.definition, tW, fsD), ex = c.example ? wrap(c.example, tW - 28, fsE) : [];
    const yTerm = narrow ? pad + isz + 34 : pad + 62, yDef = yTerm + fsD + 14;
    const yEx = yDef + (def.length - 1) * (fsD * 1.38) + 22;
    const exH = ex.length ? 42 + ex.length * fsE * 1.4 : 0;
    return { def, ex, yTerm, yDef, yEx, exH, h: (ex.length ? yEx + exH : yDef + (def.length - 1) * fsD * 1.38) + pad };
  });
  const ch = Math.max(...lay.map(l => l.h)), y0 = top + Math.max(0, Math.min(56, (H - top - ch - 110) / 2));
  [2, 1].forEach(k => el('rect', { x: x0 + k * 8, y: y0 + k * 8, width: cw, height: ch, rx: 16, fill: '#fff', stroke: C.line }, svg));
  el('rect', { x: x0, y: y0, width: cw, height: ch, rx: 16, fill: '#fff', stroke: C.line, 'stroke-width': 1.5 }, svg);

  M.cards.forEach((c, i) => {
    const L = lay[i], g = el('g', {}, svg), body = el('g', {}, g);
    el('circle', { cx: x0 + pad + isz / 2, cy: y0 + pad + isz / 2, r: isz / 2, fill: C.tint }, body);
    icon(body, c.icon, x0 + pad + isz * 0.24, y0 + pad + isz * 0.24, isz * 0.52, C.accent);
    const stage = 'CARD ' + c.index + ' OF ' + M.cards.length + ' · ' + c.stage.toUpperCase();
    txt(body, narrow ? x0 + pad + isz + 14 : tx, y0 + (narrow ? pad + isz / 2 + 5 : pad + 22), stage, { fs: 12, wt: 700, fill: C.accent });
    const term = txt(body, tx, y0 + L.yTerm, c.term, { fs: fsT, wt: 700 });
    const def = el('g', {}, body);
    L.def.forEach((s, k) => txt(def, tx, y0 + L.yDef + k * fsD * 1.38, s, { fs: fsD }));
    const parts = [term, def];
    if (L.ex.length) {
      const ex = el('g', {}, body);
      el('rect', { x: tx, y: y0 + L.yEx, width: tW, height: L.exH, rx: 10, fill: C.amber, stroke: '#f3d6ae' }, ex);
      icon(ex, 'briefcase', tx + 12, y0 + L.yEx + 11, 18, C.hi);
      txt(ex, tx + 36, y0 + L.yEx + 25, 'Workplace example', { fs: 12.5, wt: 700, fill: C.hi });
      L.ex.forEach((s, k) => txt(ex, tx + 14, y0 + L.yEx + 50 + k * fsE * 1.4, s, { fs: fsE }));
      parts.push(ex);
    }
    // scene: visible for this card's slot; the last card stays up
    gsap.set(g, { opacity: i ? 0 : 1 });
    if (i) tl.set(g, { opacity: 1 }, c.start);
    if (i < M.cards.length - 1) tl.set(g, { opacity: 0 }, c.end);
    if (i === 0) return; // the deck opens with the first card face up
    gsap.set(body, { x: 36, opacity: 0 });
    tl.to(body, { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' }, c.start);
    parts.forEach((p, k) => { gsap.set(p, { opacity: 0, y: 8 }); tl.to(p, { opacity: 1, y: 0, duration: 0.25, ease: 'power1.out' }, c.start + 0.12 + k * 0.18); });
  });
  // lifecycle track under the deck: where the current term sits, whatever the card order
  stages = [];
  const names = [...new Set(M.cards.slice().sort((a, b) => a.lifecycleStep - b.lifecycleStep).map(c => c.stage))];
  let sx = x0, sy2 = y0 + ch + 48;
  if (sy2 + 40 < H) {
    txt(svg, x0, sy2 - 12, 'Where each term sits in the data lifecycle', { fs: 12, fill: C.muted });
    names.forEach((nm, k) => {
      const w = tw(nm, 12, 600) + 20;
      if (k && sx + 18 + w > x0 + cw) { sx = x0; sy2 += 32; }
      else if (k) { txt(svg, sx + 9, sy2 + 16, '›', { fs: 14, fill: C.muted, anchor: 'middle' }); sx += 18; }
      if (sy2 + 24 > H) return;
      const r = el('rect', { x: sx, y: sy2, width: w, height: 24, rx: 12, fill: C.soft, stroke: C.line }, svg);
      const t = txt(svg, sx + w / 2, sy2 + 16, nm, { fs: 12, wt: 600, fill: C.muted, anchor: 'middle' });
      stages.push({ nm, r, t });
      sx += w;
    });
  }
  tl.set({}, {}, M.duration);
}

function setState(t) {
  let i = 0;
  M.cards.forEach((c, k) => { if (t >= c.start - 1e-6) i = k; });
  const done = t >= M.duration - 0.05, cur = M.cards[i];
  const frac = Math.max(0, Math.min(1, (t - cur.start) / (cur.end - cur.start)));
  strip.forEach((s, k) => {
    const f = done || k < i ? 1 : k === i ? frac : 0;
    s.fill.setAttribute('width', s.sw * f);
    s.lt.setAttribute('fill', k === i && !done ? C.ink : C.muted);
    s.lt.setAttribute('font-weight', k === i && !done ? 700 : 400);
  });
  stages.forEach(s => { const on = s.nm === cur.stage; s.r.setAttribute('fill', on ? C.accent : C.soft); s.r.setAttribute('stroke', on ? C.accent : C.line); s.t.setAttribute('fill', on ? '#fff' : C.muted); });
  const sub = done ? M.summary : 'Card ' + cur.index + ' of ' + M.cards.length + ', in ' + M.orderText + ' order' +
    (M.showExamples ? '. Read the definition, then the workplace example.' : '. Examples are switched off.');
  const ls = wrap(sub, hdr.w, 12.5).slice(0, hdr.max);
  hdr.lines.forEach((n, k) => { n.textContent = ls[k] || ''; n.setAttribute('fill', done ? C.ink : C.muted); });
}

function rebuild() { build(); tl.seek(Math.min(T, M.duration), false); setState(T); }

window.lab = {
  get duration() { return M ? M.duration : 28; },
  get markers() { return M ? M.markers : []; },
  seek(t) { T = t; if (!tl) return; tl.seek(Math.min(t, M.duration), false); setState(t); },
  mount(r, params) {
    root = r; M = model(params); T = 0;
    svg = el('svg', { width: '100%', height: '100%', role: 'img', 'aria-label': 'Flashcards for eight data privacy terms, one at a time' });
    svg.style.display = 'block';
    root.appendChild(svg);
    rebuild();
    ro = new ResizeObserver(() => { const k = root.clientWidth + 'x' + root.clientHeight; if (k === size) return; size = k; clearTimeout(timer); timer = setTimeout(rebuild, 60); });
    ro.observe(root);
  },
  update(params) { M = model(params); T = 0; rebuild(); },
  destroy() { if (ro) ro.disconnect(); clearTimeout(timer); if (tl) tl.kill(); if (svg) svg.remove(); svg = tl = M = null; }
};

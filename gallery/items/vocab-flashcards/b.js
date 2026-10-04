// Plain SVG: all eight cards on screen at once, in the chosen order. Playback only moves the highlight,
// marks earlier cards as seen and fills a progress bar; nothing is hidden, so learners keep the overview.
const NS = 'http://www.w3.org/2000/svg', FONT = 'system-ui, -apple-system, Segoe UI, sans-serif';
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d', tint: '#eef3fc', amber: '#fff4e5' };
let root = null, wrapEl = null, svg = null, M = null, T = 0, Lay = null, els = [], hdr = null, bar = null, lastIdx = -1, ro = null, timer = 0, size = '';
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
  const n = el('text', { x, y, 'font-size': o.fs || 12, 'font-weight': o.wt || 400, fill: o.fill || C.ink, 'text-anchor': o.anchor || 'start', 'font-family': FONT }, parent);
  n.textContent = s;
  return n;
}

// Grid: 4 columns on wide screens, 2 on medium, 1 on a phone. Every card in a row shares the row's height.
function layout(W, forceCols) {
  const cols = forceCols || (W >= 820 ? 4 : W >= 520 ? 2 : 1), gap = 12, cw = (W - 28 - gap * (cols - 1)) / cols, iw = cw - 28;
  const top = W >= 720 ? 76 : 90;
  const cards = M.cards.map(c => {
    const def = wrap(c.definition, iw, 12.5), ex = c.example ? wrap(c.example, iw - 16, 12) : [];
    const exY = 58 + def.length * 16 + 4, h = ex.length ? exY + 38 + ex.length * 15 + 12 : exY + 6;
    return { def, ex, exY, h };
  });
  let y = top;
  for (let r = 0; r < Math.ceil(cards.length / cols); r++) {
    const row = cards.slice(r * cols, r * cols + cols), rh = Math.max(...row.map(c => c.h));
    row.forEach((c, k) => Object.assign(c, { x: 14 + k * (cw + gap), y, w: cw, rh }));
    y += rh + gap;
  }
  return { W, cards, contentH: y + 4 };
}

function fit() {
  const W = wrapEl.clientWidth || root.clientWidth, H = root.clientHeight;
  let s = 1, L = layout(W);
  if (W >= 820 && !M.showExamples) { const L2 = layout(W, 2); if (L2.contentH <= H) return Object.assign(L2, { s, px: W, H }); } // short cards: two wide columns fill the screen
  // a little too tall on a wide screen: shrink to fit (not below 90%) rather than scroll
  for (let i = 0; i < 4 && W >= 720 && L.contentH > H / s + 0.5; i++) { s = Math.max(0.9, Math.min(s, H / L.contentH * 0.998)); L = layout(W / s); }
  return Object.assign(L, { s, px: W, H });
}

function build() {
  Lay = fit();
  const L = Lay, VH = Math.max(L.H / L.s, L.contentH);
  svg.setAttribute('width', L.px); svg.setAttribute('height', VH * L.s); svg.setAttribute('viewBox', `0 0 ${L.W} ${VH}`);
  while (svg.firstChild) svg.firstChild.remove();
  el('rect', { width: L.W, height: VH, fill: '#fff' }, svg);
  txt(svg, 14, 22, 'Data privacy terms in plain English', { fs: 14, wt: 600 });
  hdr = [0, 1].map(i => txt(svg, 14, 41 + i * 16, '', { fs: 12.5, fill: C.muted }));
  bar = { x: 14, y: L.W >= 720 ? 62 : 74, w: L.W - 28 };
  el('rect', { x: bar.x, y: bar.y, width: bar.w, height: 4, rx: 2, fill: C.line }, svg);
  bar.fill = el('rect', { x: bar.x, y: bar.y, width: 0, height: 4, rx: 2, fill: C.accent }, svg);
  els = M.cards.map((c, i) => {
    const P = L.cards[i], g = el('g', { transform: `translate(${P.x},${P.y})` }, svg);
    const box = el('rect', { width: P.w, height: P.rh, rx: 12, fill: '#fff', stroke: C.line }, g);
    const badge = el('circle', { cx: 26, cy: 24, r: 12, fill: C.tint }, g);
    const num = txt(g, 26, 28.5, String(c.index), { fs: 12, wt: 700, fill: C.accent, anchor: 'middle' });
    const check = el('path', { d: 'M20 24l4 4l8-8', fill: 'none', stroke: '#fff', 'stroke-width': 2.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0 }, g);
    txt(g, 46, 28.5, c.stage.toUpperCase(), { fs: 11, wt: 700, fill: C.muted });
    const now = txt(g, P.w - 14, 28.5, 'NOW', { fs: 11, wt: 700, fill: C.hi, anchor: 'end' });
    txt(g, 14, 52, c.term, { fs: 15.5, wt: 700 });
    P.def.forEach((s, k) => txt(g, 14, 72 + k * 16, s, { fs: 12.5, fill: C.ink }));
    if (P.ex.length) {
      el('rect', { x: 10, y: P.exY + 10, width: P.w - 20, height: 22 + P.ex.length * 15 + 6, rx: 8, fill: C.amber }, g);
      txt(g, 18, P.exY + 26, 'Workplace example', { fs: 11, wt: 700, fill: C.hi });
      P.ex.forEach((s, k) => txt(g, 18, P.exY + 43 + k * 15, s, { fs: 12, fill: C.ink }));
    }
    el('title', {}, g).textContent = c.term + ': ' + c.definition + (c.example ? ' Example: ' + c.example : '');
    return { box, badge, num, check, now };
  });
  lastIdx = -1;
}

function setState(t) {
  let i = 0;
  M.cards.forEach((c, k) => { if (t >= c.start - 1e-6) i = k; });
  const done = t >= M.duration - 0.05;
  els.forEach((e, k) => {
    const cur = k === i && !done, seen = k < i || done;
    e.box.setAttribute('fill', cur ? C.tint : '#fff');
    e.box.setAttribute('stroke', cur ? C.accent : C.line);
    e.box.setAttribute('stroke-width', cur ? 2.5 : 1);
    e.badge.setAttribute('fill', seen ? C.good : cur ? C.accent : C.tint);
    e.num.setAttribute('opacity', seen ? 0 : 1);
    e.num.setAttribute('fill', cur ? '#fff' : C.accent);
    e.check.setAttribute('opacity', seen ? 1 : 0);
    e.now.setAttribute('opacity', cur ? 1 : 0);
  });
  bar.fill.setAttribute('width', bar.w * Math.max(0, Math.min(1, t / M.duration)));
  const c = M.cards[i];
  const sub = done ? M.summary : 'Now: card ' + c.index + ' of ' + M.cards.length + ', ' + c.term + '. All cards stay on screen, in ' + M.orderText + ' order.';
  const ls = wrap(sub, Lay.W - 28, 12.5).slice(0, Lay.W >= 720 ? 1 : 2);
  hdr.forEach((n, k) => { n.textContent = ls[k] || ''; n.setAttribute('fill', done ? C.ink : C.muted); });
  const key = done ? -2 : i;
  if (Lay.contentH > Lay.H / Lay.s && key !== lastIdx) { // tall layouts (phones) scroll the current card into view; the end shows the summary
    lastIdx = key;
    wrapEl.scrollTop = Lay.s * (i === 0 || done ? 0 : Lay.cards[i].y - 84);
  }
}

function rebuild() { build(); if (wrapEl.clientWidth && wrapEl.clientWidth !== Lay.px) build(); setState(T); }

window.lab = {
  get duration() { return M ? M.duration : 28; },
  get markers() { return M ? M.markers : []; },
  seek(t) { T = t; if (M) setState(t); },
  mount(r, params) {
    root = r; M = model(params); T = 0;
    wrapEl = document.createElement('div');
    wrapEl.style.cssText = 'width:100%;height:100%;overflow-x:hidden;overflow-y:auto;background:#fff';
    svg = el('svg', { role: 'img', 'aria-label': 'All eight data privacy flashcards in a grid' });
    svg.style.display = 'block';
    wrapEl.appendChild(svg); root.appendChild(wrapEl);
    rebuild();
    ro = new ResizeObserver(() => { const k = root.clientWidth + 'x' + root.clientHeight; if (k === size) return; size = k; clearTimeout(timer); timer = setTimeout(rebuild, 60); });
    ro.observe(root);
  },
  update(params) { M = model(params); T = 0; rebuild(); },
  destroy() { if (ro) ro.disconnect(); clearTimeout(timer); if (wrapEl) wrapEl.remove(); wrapEl = svg = M = Lay = null; }
};

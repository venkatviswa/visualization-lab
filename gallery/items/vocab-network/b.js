// Plain SVG glossary: one card per term, grouped by theme, with "related terms" chips taken from the model's links.
// Playback reveals the cards theme by theme; at the focus step the focus card and its related cards stay bright.
const NS = 'http://www.w3.org/2000/svg';
const COL = ['#2b59c3', '#0f766e', '#b4530f'], TINT = ['#edf2fc', '#e8f4f2', '#fbf0e6'];
const INK = '#1d2433', MUTED = '#5b6475', LINE = '#dbe0e8', HI = '#c2410c', FONT = 'system-ui, -apple-system, Segoe UI, sans-serif';
let root = null, wrapEl = null, svg = null, head = null, headH = 52, M = null, T = 0, Lay = null, lastKey = '', ro = null, timer = 0, lastSize = '';
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
  const n = el('text', { x, y, 'font-size': o.fs || 12, 'font-weight': o.wt || 400, fill: o.fill || INK, 'font-family': FONT }, parent);
  n.textContent = s;
  return n;
}
const op = (at, t) => Math.max(0, Math.min(1, (t - at + 0.3) / 0.3));

// Measure every card once per size: definition lines and chip positions.
function layout(W, H, wide) {
  const counts = M.themes.map((_, g) => M.terms.filter(t => t.themeIndex === g).length);
  const span = counts.map(n => wide && n > 4 ? 2 : 1), cols = wide ? span.reduce((s, v) => s + v, 0) : 1;
  const gap = 12, cw = (W - 28 - gap * (cols - 1)) / cols, iw = cw - 24;
  const nameOf = Object.fromEntries(M.terms.map(t => [t.id, t]));
  const related = {};
  M.terms.forEach(t => { related[t.id] = []; });
  const verb = {}, at = {}; // with link labels on, a chip reads as half a sentence: "maintains Data catalog" or "Data owner appoints"
  M.links.forEach(l => { related[l.source].push(l.target); related[l.target].push(l.source);
    verb[l.source + '>' + l.target] = l.label + ' ' + nameOf[l.target].name; verb[l.target + '>' + l.source] = nameOf[l.source].name + ' ' + l.label;
    at[l.source + '>' + l.target] = at[l.target + '>' + l.source] = l.revealAt; });
  const top = 4;
  const cards = {}, sections = [];
  let y = top, col0 = 0;
  M.themes.forEach((name, g) => {
    if (wide) y = top;
    sections[g] = { x: 14 + (wide ? col0 * (cw + gap) : 0), y, name };
    y += 24;
    const y0 = y, list = M.terms.filter(t => t.themeIndex === g), half = Math.ceil(list.length / span[g]);
    list.forEach((t, k) => {
      const sub = wide ? Math.floor(k / half) : 0, x = 14 + (wide ? (col0 + sub) * (cw + gap) : 0);
      if (wide && k === half * sub && sub > 0) y = y0;
      const def = wrap(t.def, iw, 12);
      const ids = M.terms.filter(o => related[t.id].includes(o.id)).map(o => o.id);
      let cx = 0, cy = 0;
      const chips = ids.map(id => {
        const label = M.showLabels ? verb[t.id + '>' + id] : nameOf[id].name, w = Math.min(iw, tw(label, 11, 500) + 16);
        if (cx && cx + w > iw) { cx = 0; cy += 22; }
        const c = { id, x: cx, y: cy, w, label, at: at[t.id + '>' + id] };
        cx += w + 6;
        return c;
      });
      const h = 35 + (def.length - 1) * 14 + 8 + cy + 19 + 8;
      cards[t.id] = { x, y, w: cw, h, def, chips };
      y += h + 6;
    });
    if (!wide) y += 10;
    col0 += span[g];
  });
  const contentH = Math.max(...Object.values(cards).map(c => c.y + c.h)) + 12;
  return { W, H, wide, cards, sections, contentH, nameOf };
}

function draw() {
  if (!svg || !M) return;
  const t = T, Lw = Lay, H = Math.max(Lw.H, Lw.contentH);
  svg.setAttribute('width', Lw.px); svg.setAttribute('height', H * Lw.s); svg.setAttribute('viewBox', `0 0 ${Lw.W} ${H}`);
  while (svg.firstChild) svg.firstChild.remove();
  el('rect', { width: Lw.W, height: H, fill: '#fff' }, svg);
  const focusOn = !!M.focusId && t >= M.focusAt - 1e-6, done = t >= M.duration - 0.05;
  while (head.firstChild) head.firstChild.remove();
  head.setAttribute('width', Lw.px); head.setAttribute('height', headH);
  txt(head, 14, 22, 'Data governance glossary', { fs: 14, wt: 600 });
  const sub = done ? M.summary : t >= M.focusAt ? (M.focusId ? 'Focus: ' + M.focusTerm + ' and its related terms.' : 'All ' + M.terms.length + ' terms. Chips name the terms each one is linked to.')
    : t >= M.linksStart - 1e-6 ? 'Now the links: each card lists its related terms as chips.'
    : 'Cards appear theme by theme: People, then Processes, then Safeguards.';
  wrap(sub, Lw.px - 28, 12.5).slice(0, Lw.wide ? 1 : 2).forEach((s, i) => txt(head, 14, 41 + i * 16, s, { fs: 12.5, fill: done ? INK : MUTED }));
  Lw.sections.forEach((s, g) => {
    const on = t >= M.themeStart[g] - 0.3;
    const n = M.terms.filter(x => x.themeIndex === g).length;
    el('rect', { x: s.x, y: s.y + 2, width: 4, height: 16, rx: 2, fill: on ? COL[g] : LINE }, svg);
    txt(svg, s.x + 12, s.y + 15, s.name + ' · ' + n + ' terms', { fs: 13, wt: 700, fill: on ? COL[g] : MUTED });
  });
  M.terms.forEach(x => {
    const c = Lw.cards[x.id], o = op(x.revealAt, t);
    const isF = focusOn && x.isFocus, isN = focusOn && x.isNeighbour, dim = focusOn && !x.highlighted;
    const g = el('g', { transform: `translate(${c.x},${c.y})`, opacity: o <= 0 ? 0.0 : o * (dim ? 0.3 : 1) }, svg);
    if (o <= 0) { // placeholder so the glossary's shape is visible before its cards appear
      g.setAttribute('opacity', 1);
      el('rect', { width: c.w, height: c.h, rx: 10, fill: '#fafbfc', stroke: LINE, 'stroke-dasharray': '4 4' }, g);
      return;
    }
    el('rect', { width: c.w, height: c.h, rx: 10, fill: isF ? TINT[x.themeIndex] : '#fff',
      stroke: isF ? HI : isN ? COL[x.themeIndex] : LINE, 'stroke-width': isF ? 2.5 : isN ? 2 : 1 }, g);
    el('rect', { x: 0, y: 10, width: 3, height: c.h - 20, rx: 1.5, fill: COL[x.themeIndex] }, g);
    txt(g, 12, 19, x.name, { fs: 13.5, wt: 700, fill: isF ? HI : INK });
    if (isF) txt(g, c.w - 12, 19, 'FOCUS', { fs: 11, wt: 700, fill: HI }).setAttribute('text-anchor', 'end');
    else if (isN) txt(g, c.w - 12, 19, 'related', { fs: 11, wt: 600, fill: COL[x.themeIndex] }).setAttribute('text-anchor', 'end');
    c.def.forEach((s, i) => txt(g, 12, 35 + i * 14, s, { fs: 12, fill: MUTED }));
    const cy0 = 35 + (c.def.length - 1) * 14 + 8;
    c.chips.forEach(ch => {
      const co = op(ch.at, t);
      if (co <= 0) { // dashed outline until the link is revealed
        el('rect', { x: 12 + ch.x, y: cy0 + ch.y, width: ch.w, height: 19, rx: 9.5, fill: 'none', stroke: LINE, 'stroke-dasharray': '3 3' }, g);
        return;
      }
      const r = Lw.nameOf[ch.id], toFocus = focusOn && (ch.id === M.focusId || x.isFocus);
      const cg = el('g', { transform: `translate(${12 + ch.x},${cy0 + ch.y})`, opacity: co }, g);
      el('rect', { width: ch.w, height: 19, rx: 9.5, fill: toFocus ? '#fdeee6' : TINT[r.themeIndex], stroke: toFocus ? HI : 'none' }, cg);
      const tt = txt(cg, ch.w / 2, 13.5, ch.label, { fs: 11, wt: 500, fill: toFocus ? HI : COL[r.themeIndex] });
      tt.setAttribute('text-anchor', 'middle');
    });
    el('title', {}, g).textContent = x.name + ': ' + x.def;
  });
  // keep the current section (or the focus card) in view when the glossary is taller than the screen
  if (Lw.contentH > Lw.H) {
    let k = 0; M.themeStart.forEach((s, i) => { if (t >= s - 1e-6) k = i; });
    const linking = !focusOn && t >= M.linksStart - 1e-6;
    const key = focusOn ? 'f' + M.focusId : linking ? 'links' : 's' + k;
    if (key !== lastKey) {
      lastKey = key;
      let y = k && !linking ? Lw.sections[k].y - 4 : 0;
      if (focusOn) { // show the focus card, plus the card above it when that one is related too
        const i = M.terms.findIndex(x => x.isFocus), prev = M.terms[i - 1];
        y = (prev && prev.themeIndex === M.terms[i].themeIndex && prev.highlighted ? Lw.cards[prev.id].y : Lw.cards[M.focusId].y) - 34;
      }
      wrapEl.scrollTop = Lw.s * y;
    }
  }
}

// Wide screens: if the three columns are a little too tall, shrink the whole glossary (not below 90%) instead of scrolling.
function fit() {
  headH = root.clientWidth >= 720 ? 52 : 70;
  wrapEl.style.height = Math.max(100, root.clientHeight - headH) + 'px';
  const W = wrapEl.clientWidth || root.clientWidth, H = root.clientHeight - headH, wide = W >= 720;
  let s = 1, L = layout(W, H, wide);
  for (let i = 0; wide && i < 5 && (L.contentH > L.H + 0.5 || s < 1); i++) {
    const n = Math.max(0.9, Math.min(1, s * L.H / L.contentH * (L.contentH > L.H ? 0.995 : 1)));
    if (Math.abs(n - s) < 0.002 && L.contentH <= L.H) break;
    s = n; L = layout(W / s, H / s, wide);
  }
  return Object.assign(L, { s, px: W });
}
function relayout() { Lay = fit(); lastKey = ''; draw(); if ((wrapEl.clientWidth || Lay.px) !== Lay.px) { Lay = fit(); lastKey = ''; draw(); } }

window.lab = {
  get duration() { return M ? M.duration : 12; },
  get markers() { return M ? M.markers : []; },
  seek(t) { T = t; draw(); },
  mount(r, params) {
    root = r; M = model(params); T = 0;
    head = el('svg', { 'aria-hidden': 'true' });
    head.style.display = 'block';
    root.appendChild(head);
    wrapEl = document.createElement('div');
    wrapEl.style.cssText = 'width:100%;overflow-x:hidden;overflow-y:auto;background:#fff';
    svg = el('svg', { role: 'img', 'aria-label': 'Glossary cards of 14 data governance terms, grouped by theme' });
    svg.style.display = 'block';
    wrapEl.appendChild(svg); root.appendChild(wrapEl);
    relayout();
    ro = new ResizeObserver(() => { const k = root.clientWidth + 'x' + root.clientHeight; if (k === lastSize) return; lastSize = k; clearTimeout(timer); timer = setTimeout(relayout, 60); });
    ro.observe(root);
  },
  update(params) { M = model(params); T = 0; relayout(); },
  destroy() { if (ro) ro.disconnect(); clearTimeout(timer); if (wrapEl) wrapEl.remove(); if (head) head.remove(); wrapEl = svg = head = M = Lay = null; }
};

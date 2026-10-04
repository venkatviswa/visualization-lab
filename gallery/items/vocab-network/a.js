// D3 network map. Term positions are hand-tuned (fractions of the map area), so the map is identical on every load
// and links rarely cross. seek(t) only changes visibility and highlight.
const COL = ['#2b59c3', '#0f766e', '#b4530f'], INK = '#1d2433', MUTED = '#5b6475', LINE = '#dbe0e8', HI = '#c2410c';
const FONT = 'system-ui, -apple-system, Segoe UI, sans-serif', PH = 24;
let root = null, svg = null, M = null, T = 0, L = null, onResize = null, timer = 0;
const ctx = document.createElement('canvas').getContext('2d');
const tw = (s, fs, wt) => { ctx.font = (wt || 400) + ' ' + fs + 'px ' + FONT; return ctx.measureText(s).width; };
function wrap(s, maxW, fs, wt) {
  const out = []; let line = '';
  for (const w of s.split(' ')) { const t = line ? line + ' ' + w : w; if (line && tw(t, fs, wt) > maxW) { out.push(line); line = w; } else line = t; }
  if (line) out.push(line);
  return out;
}
const op = (at, t) => Math.max(0, Math.min(1, (t - at + 0.3) / 0.3));

function geom() {
  const W = root.clientWidth, H = root.clientHeight, wide = W >= 720;
  const subW = W - 28;
  const legendW = M.themes.reduce((s, n) => s + tw(n, 11.5) + 34, 0);
  const legendRows = legendW > W - 28 ? 2 : 1;
  const subLines = wide ? 1 : 2;
  const headH = 41 + subLines * 16 + 10 + 18 * legendRows + 8;
  const panel = wide ? { x: W - 286, y: headH, w: 272, h: H - headH - 14 } : { x: 14, y: H - 190, w: W - 28, h: 176 };
  const net = wide ? { x: 10, y: headH, w: W - 306, h: H - headH - 12 } : { x: 10, y: headH, w: W - 20, h: H - headH - 200 };
  return { W, H, wide, subW, subLines, legendRows, headH, panel, net };
}

// Hand-tuned positions (0..1 of the map area), arranged so that linked terms sit close and only one pair of links crosses.
const SPOT = { steward: [0.10, 0.28], catalog: [0.36, 0.06], metadata: [0.62, 0.06], master: [0.9, 0.06], lineage: [0.52, 0.27],
  quality: [0.32, 0.43], golden: [0.88, 0.40], owner: [0.10, 0.60], access: [0.40, 0.62], classification: [0.76, 0.62],
  audit: [0.24, 0.80], pii: [0.64, 0.85], retention: [0.10, 0.96], consent: [0.42, 0.96] };
const ANCHOR = [[0.15, 0.45], [0.6, 0.25], [0.5, 0.8]];

function layout(G) {
  const { w, h } = G.net, fs = G.wide ? 12.5 : 11.5, padX = G.wide ? 50 : 4, padY = 4;
  const nodes = M.terms.map((t, i) => {
    const s = SPOT[t.id] || [ANCHOR[t.themeIndex][0] + 0.03 * (i % 3), ANCHOR[t.themeIndex][1]];
    return { id: t.id, hw: tw(t.name, fs, 600) / 2 + 10, x: padX + s[0] * (w - 2 * padX), y: padY + PH / 2 + s[1] * (h - 2 * padY - PH) };
  });
  const clamp = () => nodes.forEach(n => { n.x = Math.max(n.hw + 2, Math.min(w - n.hw - 2, n.x)); n.y = Math.max(PH / 2 + 4, Math.min(h - PH / 2 - 4, n.y)); });
  clamp();
  for (let it = 0; it < 60; it++) { // nudge apart any pills that overlap on narrow screens
    let moved = false;
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j], dx = b.x - a.x, dy = b.y - a.y;
      const ox = a.hw + b.hw + 10 - Math.abs(dx), oy = PH + 8 - Math.abs(dy);
      if (ox > 0 && oy > 0) {
        moved = true;
        if (ox < oy) { const s = (dx >= 0 ? 1 : -1) * ox / 2; a.x -= s; b.x += s; }
        else { const s = (dy >= 0 ? 1 : -1) * oy / 2; a.y -= s; b.y += s; }
      }
    }
    clamp();
    if (!moved) break;
  }
  const pos = {};
  nodes.forEach(n => { pos[n.id] = { x: G.net.x + n.x, y: G.net.y + n.y, hw: n.hw }; });
  return { key: G.W + 'x' + G.H, pos, fs };
}

function edge(a, b) { // end point on the pill border of b, coming from a
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
  const s = Math.min(b.hw / Math.abs(dx || 1e-6), (PH / 2) / Math.abs(dy || 1e-6));
  return { x: b.x - dx * s - dx / d * 3, y: b.y - dy * s - dy / d * 3 };
}

function draw() {
  if (!svg || !M) return;
  const G = geom(), t = T;
  if (!L || L.key !== G.W + 'x' + G.H) L = layout(G);
  svg.attr('width', G.W).attr('height', G.H).selectAll('*').remove();
  const defs = svg.append('defs');
  [['arr', '#9aa3b2'], ['arrHi', HI]].forEach(([id, c]) => defs.append('marker').attr('id', id).attr('viewBox', '0 0 10 10').attr('refX', 9).attr('refY', 5)
    .attr('markerWidth', 7).attr('markerHeight', 7).attr('orient', 'auto-start-reverse').attr('markerUnits', 'userSpaceOnUse')
    .append('path').attr('d', 'M0 0L10 5L0 10Z').attr('fill', c));
  const focusOn = !!M.focusId && t >= M.focusAt - 1e-6, done = t >= M.duration - 0.05;
  // header
  svg.append('text').attr('x', 14).attr('y', 22).attr('font-size', 14).attr('font-weight', 600).attr('fill', INK).attr('font-family', FONT).text('Data governance terms and how they connect');
  const sub = done ? M.summary : t >= M.focusAt ? (M.focusId ? 'Focus: ' + M.focusTerm + ' and the terms it links to directly.' : 'All ' + M.terms.length + ' terms and ' + M.links.length + ' links. Arrows read as sentences, source to target.')
    : t >= M.linksStart - 1e-6 ? 'Now the links. Each arrow reads as a sentence, such as "Data steward maintains Data catalog".'
    : 'Terms appear theme by theme: People, then Processes, then Safeguards.';
  const sl = wrap(sub, G.subW, 12.5).slice(0, G.subLines);
  sl.forEach((s, i) => svg.append('text').attr('x', 14).attr('y', 41 + i * 16).attr('font-size', 12.5).attr('fill', done ? INK : MUTED).attr('font-family', FONT).text(s));
  let lx = 14, ly = 41 + sl.length * 16 + 10;
  M.themes.forEach((n, i) => {
    const wv = tw(n, 11.5) + 34;
    if (lx + wv > G.W - 10 && lx > 14) { lx = 14; ly += 18; }
    const on = t >= M.themeStart[i] - 1e-6;
    svg.append('rect').attr('x', lx).attr('y', ly - 9).attr('width', 11).attr('height', 11).attr('rx', 3).attr('fill', on ? COL[i] : '#fff').attr('stroke', COL[i]);
    svg.append('text').attr('x', lx + 16).attr('y', ly).attr('font-size', 11.5).attr('fill', on ? INK : MUTED).attr('font-family', FONT).text(n);
    lx += wv;
  });
  const byId = Object.fromEntries(M.terms.map(x => [x.id, x]));
  // links
  const lg = svg.append('g');
  M.links.forEach(l => {
    const o = op(l.revealAt, t); if (o <= 0) return;
    const a = L.pos[l.source], b = L.pos[l.target], e = edge(a, b), s0 = edge(b, a);
    const hi = focusOn && l.highlighted, dim = focusOn && !l.highlighted;
    lg.append('line').attr('x1', s0.x).attr('y1', s0.y).attr('x2', e.x).attr('y2', e.y).attr('stroke', hi ? HI : '#b7bfcc')
      .attr('stroke-width', hi ? 2.2 : 1.3).attr('opacity', o * (dim ? 0.25 : 1)).attr('marker-end', `url(#${hi ? 'arrHi' : 'arr'})`);
  });
  const placed = [];
  if (M.showLabels) M.links.forEach(l => {
    const o = op(l.revealAt, t), hi = focusOn && l.highlighted;
    if (o <= 0 || (focusOn && !hi)) return;
    const a = L.pos[l.source], b = L.pos[l.target], lw = tw(l.label, 11) / 2 + 2;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1, nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len;
    const free = ([f, off]) => { const x = a.x + (b.x - a.x) * f + nx * off, y = a.y + (b.y - a.y) * f + ny * off;
      const ok = Object.values(L.pos).every(q => Math.abs(q.x - x) > q.hw + lw || Math.abs(q.y - y) > PH / 2 + 6) &&
        placed.every(q => Math.abs(q.x - x) > q.w + lw || Math.abs(q.y - y) > 13);
      return ok ? { x, y } : null; };
    const at = [0, 16, -16, 26, -26].flatMap(o => [0.5, 0.4, 0.6, 0.3, 0.7].map(f => [f, o])).map(free).find(Boolean) || { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    placed.push({ x: at.x, y: at.y, w: lw });
    lg.append('text').attr('x', at.x).attr('y', at.y + 4).attr('text-anchor', 'middle').attr('font-size', 11)
      .attr('font-family', FONT).attr('fill', hi ? HI : MUTED).attr('font-weight', hi ? 600 : 400).attr('opacity', o)
      .attr('stroke', '#fff').attr('stroke-width', 4).attr('paint-order', 'stroke').attr('stroke-linejoin', 'round').text(l.label);
  });
  // nodes
  M.terms.forEach(x => {
    const o = op(x.revealAt, t), p = L.pos[x.id], c = COL[x.themeIndex];
    if (o <= 0) { // a faint dashed slot shows where the term will appear
      svg.append('rect').attr('x', p.x - p.hw).attr('y', p.y - PH / 2).attr('width', p.hw * 2).attr('height', PH).attr('rx', PH / 2)
        .attr('fill', 'none').attr('stroke', LINE).attr('stroke-dasharray', '4 4');
      return;
    }
    const isF = focusOn && x.isFocus, dim = focusOn && !x.highlighted;
    const g = svg.append('g').attr('transform', `translate(${p.x},${p.y})`).attr('opacity', o * (dim ? 0.28 : 1));
    g.append('rect').attr('x', -p.hw).attr('y', -PH / 2).attr('width', p.hw * 2).attr('height', PH).attr('rx', PH / 2)
      .attr('fill', isF ? c : '#fff').attr('stroke', isF ? HI : c).attr('stroke-width', isF ? 3 : focusOn && x.highlighted ? 2.4 : 1.4);
    g.append('text').attr('text-anchor', 'middle').attr('y', 4.5).attr('font-size', L.fs).attr('font-weight', 600).attr('font-family', FONT)
      .attr('fill', isF ? '#fff' : INK).text(x.name);
    g.append('title').text(x.name + ' (' + x.theme + '): ' + x.def);
  });
  drawPanel(G, t, focusOn, byId);
}

function drawPanel(G, t, focusOn, byId) {
  const P = G.panel, g = svg.append('g').attr('transform', `translate(${P.x},${P.y})`), iw = P.w - 28;
  g.append('rect').attr('width', P.w).attr('height', P.h).attr('rx', 10).attr('fill', '#f7f8fa').attr('stroke', LINE);
  let y = 24;
  const line = (s, o) => {
    if (y > P.h - 8) return;
    g.append('text').attr('x', 14).attr('y', y).attr('font-family', FONT).attr('font-size', o.fs).attr('font-weight', o.wt || 400).attr('fill', o.fill || INK).text(s);
    y += o.lh || o.fs + 4;
  };
  const para = (s, o) => wrap(s, iw, o.fs, o.wt).forEach(x => line(x, o));
  if (focusOn) {
    const f = byId[M.focusId];
    line(f.name, { fs: 15, wt: 700, fill: COL[f.themeIndex], lh: 18 });
    line(f.theme, { fs: 11.5, fill: MUTED, lh: 20 });
    para(f.def, { fs: 12.5, lh: 17 });
    y += 6;
    line('Direct links (' + M.neighbourCount + ')', { fs: 11.5, wt: 600, fill: MUTED, lh: 17 });
    M.links.filter(l => l.highlighted).forEach(l => para('• ' + l.sentence, { fs: 12, lh: 16 }));
  } else if (t >= M.focusAt - 1e-6) {
    line('The whole system', { fs: 15, wt: 700, lh: 22 });
    para(M.links.length + ' links join the ' + M.terms.length + ' terms, and ' + M.crossThemeLinks + ' of them cross from one theme to another.', { fs: 12.5, lh: 17 });
    y += 8;
    para('Choose a Focus term to read its definition and see only its direct links.', { fs: 12, fill: MUTED, lh: 16 });
    if (!G.wide) return;
    y += 8;
    line('Links that cross themes', { fs: 11.5, wt: 600, fill: MUTED, lh: 17 });
    M.links.filter(l => l.crossTheme).forEach(l => para('• ' + l.sentence, { fs: 12, lh: 16 }));
  } else if (t >= M.linksStart - 1e-6) {
    const shown = M.links.filter(l => op(l.revealAt, t) > 0.5);
    line('How the terms connect', { fs: 14, wt: 700, lh: 20 });
    line(shown.length + ' of ' + M.links.length + ' links', { fs: 11.5, fill: MUTED, lh: 20 });
    const rows = shown.map(l => wrap('• ' + l.sentence, iw, 12)), room = Math.floor((P.h - y) / 16);
    let used = 0, from = rows.length;
    while (from > 0 && used + rows[from - 1].length <= room) used += rows[--from].length;
    rows.slice(from).forEach(r => r.forEach(x => line(x, { fs: 12, lh: 16 })));
  } else {
    let k = 0; M.themeStart.forEach((s, i) => { if (t >= s - 1e-6) k = i; });
    const shown = M.terms.filter(x => x.themeIndex === k && op(x.revealAt, t) > 0.5);
    line(M.themes[k], { fs: 14, wt: 700, fill: COL[k], lh: 21 });
    (G.wide ? shown : shown.slice(-1)).forEach(x => {
      line(x.name, { fs: 12.5, wt: 600, lh: 16 });
      para(x.def, { fs: 12, fill: G.wide ? MUTED : INK, lh: 15.5 });
      y += 7;
    });
  }
}

window.lab = {
  get duration() { return M ? M.duration : 12; },
  get markers() { return M ? M.markers : []; },
  seek(t) { T = t; draw(); },
  mount(r, params) {
    root = r; M = model(params); T = 0; L = null;
    svg = d3.select(root).append('svg').style('display', 'block').style('background', '#fff')
      .attr('role', 'img').attr('aria-label', 'Network map of 14 data governance terms and how they connect');
    draw();
    onResize = () => { clearTimeout(timer); timer = setTimeout(draw, 100); };
    addEventListener('resize', onResize);
  },
  update(params) { M = model(params); T = 0; draw(); },
  destroy() { removeEventListener('resize', onResize); clearTimeout(timer); if (svg) svg.remove(); svg = null; M = null; L = null; }
};

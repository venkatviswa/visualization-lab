// Plain SVG: the full attention matrix as a heat map (rows = from, columns = to), the focus row outlined.
// Playback: empty grid, focus row outlined, focus row fills then every other row, strongest cell marked, summary.
const NS = 'http://www.w3.org/2000/svg';
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', accent: '#2b59c3', hi: '#c2410c', empty: '#f6f7fa', last: '#b4530f' };
const HEADC = ['#2b59c3', '#0f766e'], VMAX = 0.6;
const FONT = 'system-ui, -apple-system, Segoe UI, sans-serif';
let rootEl = null, svg = null, M = null, T = 0, ro = null, lastSize = '';
const ctx = document.createElement('canvas').getContext('2d');
const tw = (s, fs, wt) => { ctx.font = (wt || 400) + ' ' + fs + 'px ' + FONT; return ctx.measureText(s).width; };
const clamp = x => Math.max(0, Math.min(1, x));
const pc = x => Math.round(x * 100) + '%';
function el(tag, attrs, parent) {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}
function txt(parent, x, y, s, o) {
  o = o || {};
  const n = el('text', { x, y, 'font-size': o.fs || 12, 'font-weight': o.wt || 400, fill: o.fill || C.ink, 'text-anchor': o.anchor || 'start', 'font-family': FONT }, parent);
  if (o.rot) n.setAttribute('transform', `rotate(${o.rot} ${x} ${y})`);
  n.textContent = s;
  return n;
}
function wrap(s, maxW, fs, wt) {
  const out = []; let line = '';
  for (const w of s.split(' ')) { const t = line ? line + ' ' + w : w; if (line && tw(t, fs, wt) > maxW) { out.push(line); line = w; } else line = t; }
  if (line) out.push(line);
  return out;
}
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
function colour(w, base) { // white-ish to the head colour, by weight (0 to 60% and above)
  const a = hex(C.empty), b = hex(base), v = Math.pow(clamp(w / VMAX), 0.85);
  return 'rgb(' + a.map((x, i) => Math.round(x + (b[i] - x) * v)).join(',') + ')';
}
function stepAt(t) { let k = 0; M.steps.forEach((s, i) => { if (t >= s.at - 1e-6) k = i; }); return k; }
function subtitle(k) {
  const f = M.focusWord, s = M.strongest;
  return [
    'Each row is one word looking at every word in the sentence, which ends with "' + M.lastWord + '".',
    'Focus on the row for "' + f + '": how does it spread its attention?',
    'Darker cell = more attention. Every row adds up to 100%.',
    'The strongest link in the "' + f + '" row: "' + s.text + '" with ' + pc(s.weight) + '.',
    M.summary
  ][k];
}

function draw() {
  if (!svg || !M) return;
  const W = rootEl.clientWidth, H = rootEl.clientHeight, t = T, k = stepAt(t), done = t >= M.duration - 0.05;
  svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.replaceChildren();
  el('rect', { width: W, height: H, fill: '#fff' }, svg);
  const wide = W >= 700, padX = wide ? 24 : 14, base = HEADC[M.headIndex], n = M.words.length, f = M.focusIndex;
  txt(svg, padX, 24, 'Attention: what does "it" refer to?', { fs: 14, wt: 600 });
  const sub = wrap(subtitle(k), W - 2 * padX, 12.5).slice(0, 3);
  sub.forEach((s, i) => txt(svg, padX, 44 + i * 16, s, { fs: 12.5, fill: done ? C.ink : C.muted, wt: done ? 500 : 400 }));
  const top = 44 + (sub.length - 1) * 16 + 16;

  // Geometry: row labels left, rotated column labels on top, side panel (wide) or legend strip (narrow)
  const lfs = wide ? 12.5 : 11.5, rowLabW = Math.max(...M.words.map(w => tw(w, lfs, 700))) + 22;
  const colLabH = tw('because', lfs, 700) * 0.72 + 22, panelW = wide ? 250 : 0, bottom = wide ? 14 : 92;
  const cell = Math.floor(Math.max(16, Math.min((W - 2 * padX - rowLabW - panelW - (wide ? 28 : 0)) / n, (H - top - colLabH - bottom) / n)));
  const gridW = cell * n, gx = wide ? Math.max(padX + rowLabW, (W - rowLabW - gridW - 268) / 2 + rowLabW) : Math.max(padX + rowLabW, (W - gridW + rowLabW) / 2 - 4), gy = top + colLabH;
  const revealAt = i => i === f ? 3 : 4.2 + 2.0 * (i < f ? i : i - 1) / (n - 2); // focus row first, then the rest top to bottom
  const showFocus = k >= 1, strongOn = k >= 3;

  // Axis captions
  txt(svg, gx + gridW / 2, top + 10, 'to (attended word) →', { fs: 11, fill: C.muted, anchor: 'middle' });
  txt(svg, gx - rowLabW + 2, gy - 6, 'from ↓', { fs: 11, fill: C.muted });
  // Column and row labels
  M.words.forEach((w, j) => {
    const isLast = j === n - 1, isS = strongOn && j === M.strongest.i;
    const cx = gx + j * cell + cell / 2;
    txt(svg, cx - 2, gy - 6, w, { fs: lfs, wt: isS || isLast ? 700 : 500, fill: isS ? C.hi : isLast ? C.last : C.ink, rot: -45 });
    const isF = showFocus && j === f;
    if (isF) { const pw = tw(w, lfs, 700) + 14; el('rect', { x: gx - 3 - pw, y: gy + j * cell + cell / 2 - 10, width: pw, height: 20, rx: 5, fill: C.accent }, svg); }
    txt(svg, gx - 10, gy + j * cell + cell / 2 + 4, w, { fs: lfs, wt: isF || isLast ? 700 : 500, fill: isF ? '#fff' : isLast ? C.last : C.ink, anchor: 'end' });
  });
  // Cells
  const g = el('g', {}, svg), numFs = Math.max(10, Math.min(12.5, cell * 0.34));
  M.matrix.forEach((row, i) => row.forEach((w, j) => {
    const x = gx + j * cell, y = gy + i * cell, o = k >= 2 ? clamp((t - revealAt(i) - j * 0.04) / 0.35) : 0;
    el('rect', { x: x + 0.5, y: y + 0.5, width: cell - 1, height: cell - 1, fill: C.empty }, g);
    if (o <= 0) return;
    const dim = showFocus && i !== f && k < 4 ? 0.75 : 1;
    el('rect', { x: x + 0.5, y: y + 0.5, width: cell - 1, height: cell - 1, fill: colour(w, base), opacity: o * dim }, g);
    const label = i === f ? cell >= 24 : (w >= 0.2 && cell >= 26);
    if (label) txt(g, x + cell / 2, y + cell / 2 + numFs * 0.36, i === f || cell >= 34 ? pc(w) : String(Math.round(w * 100)),
      { fs: numFs, wt: i === f ? 700 : 500, anchor: 'middle', fill: Math.pow(clamp(w / VMAX), 0.85) > 0.62 ? '#fff' : C.ink }).setAttribute('opacity', o);
  }));
  el('rect', { x: gx, y: gy, width: gridW, height: gridW, fill: 'none', stroke: C.line }, svg);
  // Focus row outline and strongest cell
  if (showFocus) el('rect', { x: gx - 1, y: gy + f * cell - 1, width: gridW + 2, height: cell + 2, rx: 3, fill: 'none', stroke: C.accent, 'stroke-width': 2.5 }, svg);
  if (strongOn) el('rect', { x: gx + M.strongest.i * cell + 1.5, y: gy + f * cell + 1.5, width: cell - 3, height: cell - 3, rx: 2, fill: 'none', stroke: C.hi, 'stroke-width': 3 }, svg);
  if (wide && k >= 2 && t >= 4.2) txt(svg, gx + gridW + 8, gy + f * cell + cell / 2 + 4, 'Σ ' + pc(M.rowSum), { fs: 11.5, wt: 700, fill: C.accent });

  // Legend: head name, colour ramp, and (wide) a side panel with the focus row's top 3
  const lx = wide ? gx + gridW + 58 : padX, ly = wide ? gy + 4 : gy + gridW + 22, lw = wide ? panelW - 40 : Math.min(220, W - 2 * padX - 150);
  txt(svg, lx, ly + 10, M.head, { fs: 12.5, wt: 700, fill: base });
  const blurb = M.headIndex ? 'Looks mostly at neighbouring words, whatever they mean.' : 'Links words whose meanings fit together.';
  const ramp = wide ? ly + 46 : ly + 24, rx = wide ? lx : lx + tw(M.head, 12.5, 700) + 14;
  if (wide) wrap(blurb, panelW - 40, 11.5).forEach((s, i) => txt(svg, lx, ly + 28 + i * 14, s, { fs: 11.5, fill: C.muted }));
  const rampY = wide ? ramp + 14 : ly, rampW = wide ? lw : Math.max(90, Math.min(lw, W - padX - rx));
  for (let s = 0; s < 24; s++) el('rect', { x: rx + s * rampW / 24, y: rampY, width: rampW / 24 + 0.5, height: 10, fill: colour(VMAX * s / 23, base) }, svg);
  [0, 0.2, 0.4, 0.6].forEach(v => txt(svg, rx + rampW * v / VMAX, rampY + 23, v === 0.6 ? '60%+' : pc(v), { fs: 11, fill: C.muted, anchor: v === 0 ? 'start' : v === 0.6 ? 'end' : 'middle' }));
  const note = 'Weights are illustrative. Each row sums to 100%.';
  if (!wide) {
    txt(svg, padX, ly + 44, blurb, { fs: 11.5, fill: C.muted });
    txt(svg, padX, ly + 60, note, { fs: 11.5, fill: C.muted });
    return;
  }
  let py = rampY + 56;
  if (k >= 2 && t >= 4.2) {
    txt(svg, lx, py, 'Row "' + M.focusWord + '", top 3', { fs: 12, wt: 700 });
    M.top3.forEach((j, r) => {
      const w = M.row[j], y = py + 14 + r * 26, isS = strongOn && j === M.strongest.i;
      txt(svg, lx, y + 13, M.words[j], { fs: 12, wt: isS ? 700 : 500, fill: isS ? C.hi : C.ink });
      el('rect', { x: lx + 64, y: y + 3, width: Math.max(2, (lw - 110) * w / VMAX), height: 12, rx: 2, fill: isS ? C.hi : base }, svg);
      txt(svg, lx + 64 + (lw - 110) * w / VMAX + 6, y + 13, pc(w), { fs: 12, wt: 600, fill: isS ? C.hi : C.ink });
    });
    py += 14 + 3 * 26 + 10;
    txt(svg, lx, py, 'All ' + n + ' cells in the row: ' + pc(M.rowSum), { fs: 11.5, fill: C.muted });
    py += 24;
  }
  if (done && M.headIndex === 0) { txt(svg, lx, py, 'So "it" = the ' + M.referent + '.', { fs: 13, wt: 700, fill: C.hi }); py += 24; }
  wrap(note, panelW - 40, 11.5).forEach((s, i) => txt(svg, lx, py + i * 14, s, { fs: 11.5, fill: C.muted }));
}

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  seek(t) { T = Math.max(0, Math.min(M.duration, t)); draw(); },
  mount(root, params) {
    rootEl = root; M = model(params); T = 0;
    svg = el('svg', { role: 'img', 'aria-label': 'Attention matrix: rows are the attending word, columns the attended word' });
    svg.style.display = 'block';
    root.appendChild(svg);
    ro = new ResizeObserver(() => { const s = root.clientWidth + 'x' + root.clientHeight; if (s !== lastSize) { lastSize = s; draw(); } });
    ro.observe(root);
    draw();
  },
  update(params) { M = model(params); T = 0; draw(); },
  destroy() { if (ro) ro.disconnect(); if (svg) svg.remove(); svg = null; M = null; }
};

// D3: the sentence on one line, with arcs from the focus word to every other word.
// Arc thickness and opacity follow the attention weight; the top 3 weights are labelled; the strongest link turns orange.
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', accent: '#2b59c3', hi: '#c2410c', hiTint: '#fdeee6', tint: '#edf2fc' };
const FONT = 'system-ui, -apple-system, Segoe UI, sans-serif';
let rootEl = null, svg = null, M = null, T = 0, ro = null, lastSize = '';
const ctx = document.createElement('canvas').getContext('2d');
const tw = (s, fs, wt) => { ctx.font = (wt || 400) + ' ' + fs + 'px ' + FONT; return ctx.measureText(s).width; };
const clamp = x => Math.max(0, Math.min(1, x));
const ease = x => 1 - Math.pow(1 - clamp(x), 3);
const pc = x => Math.round(x * 100) + '%';
function wrap(s, maxW, fs, wt) {
  const out = []; let line = '';
  for (const w of s.split(' ')) { const t = line ? line + ' ' + w : w; if (line && tw(t, fs, wt) > maxW) { out.push(line); line = w; } else line = t; }
  if (line) out.push(line);
  return out;
}
function stepAt(t) { let k = 0; M.steps.forEach((s, i) => { if (t >= s.at - 1e-6) k = i; }); return k; }
function subtitle(k) {
  const f = M.focusWord, s = M.strongest;
  return [
    'Read the sentence. It ends with "' + M.lastWord + '". What does "it" refer to?',
    'Focus on "' + f + '": which other words should it look at to make sense?',
    '"' + f + '" splits 100% of its attention across the sentence. Thicker arc = more attention.',
    'The strongest link: "' + f + '" → "' + s.text + '" with ' + pc(s.weight) + '.',
    M.summary
  ][k];
}
// Point on a quadratic Bezier and the sub-curve from 0 to u (de Casteljau), so seek(t) can draw a partly grown arc exactly.
function arcPath(x0, x2, y, h, u) {
  const x1 = (x0 + x2) / 2, y1 = y - 2 * h;
  const ax = x0 + (x1 - x0) * u, ay = y + (y1 - y) * u;
  const bx = x1 + (x2 - x1) * u, by = y1 + (y - y1) * u;
  const ex = ax + (bx - ax) * u, ey = ay + (by - ay) * u;
  return `M${x0},${y}Q${ax},${ay} ${ex},${ey}`;
}

function draw() {
  if (!svg || !M) return;
  const W = rootEl.clientWidth, H = rootEl.clientHeight, t = T, k = stepAt(t), done = t >= M.duration - 0.05;
  svg.attr('width', W).attr('height', H).attr('viewBox', `0 0 ${W} ${H}`).selectAll('*').remove();
  svg.append('rect').attr('width', W).attr('height', H).attr('fill', '#fff');
  const narrow = W < 640, padX = narrow ? 14 : 24;
  // Header: title and a subtitle that walks through the steps and ends with the model's summary
  svg.append('text').attr('x', padX).attr('y', 24).attr('font-size', 14).attr('font-weight', 600).attr('fill', C.ink).text('Attention: what does "it" refer to?');
  const sub = wrap(subtitle(k), W - 2 * padX, 12.5);
  sub.slice(0, 3).forEach((s, i) => svg.append('text').attr('x', padX).attr('y', 44 + i * 16).attr('font-size', 12.5)
    .attr('fill', done ? C.ink : C.muted).attr('font-weight', done ? 500 : 400).text(s));
  const headBottom = 44 + (Math.min(3, sub.length) - 1) * 16 + 14;

  // Sentence: one line, font size chosen so all 11 words fit the width
  const words = M.words, unit = words.map(w => tw(w, 1, 600));
  const sumUnit = unit.reduce((a, b) => a + b, 0), gapK = 0.62;
  const fs = Math.max(11, Math.min(24, (W - 2 * padX) / (sumUnit + gapK * (words.length - 1) + 0.6)));
  const gap = fs * gapK, total = sumUnit * fs + gap * (words.length - 1);
  let x = (W - total) / 2;
  const pos = words.map((w, i) => { const wd = unit[i] * fs, p = { x, w: wd, cx: x + wd / 2 }; x += wd + gap; return p; });
  const note = 'From "' + M.focusWord + '": ' + pc(1 - M.selfWeight) + ' to other words + ' + pc(M.selfWeight) + ' to itself = ' + pc(M.rowSum) + '. Weights are illustrative.';
  const inline = W - 2 * padX > tw(M.head, 12, 600) + 250 + tw(note, 11.5);
  const legendH = inline ? 44 : 60, baseY = Math.round(H - legendH - 44), wordTop = baseY - fs * 0.95;
  const f = M.focusIndex, fp = pos[f];
  const showFocus = k >= 1, grow = ease((t - 3) / 2.4), labelsOn = clamp((t - 5.4) / 0.5), strongOn = k >= 3;
  const maxW = Math.max(...M.tokens.filter(x => !x.isFocus).map(x => x.weight));

  // Arcs above the sentence
  const arcY = wordTop - 4, maxDx = Math.max(...pos.map(p => Math.abs(p.cx - fp.cx)));
  const room = Math.max(40, arcY - headBottom - 22);
  const arcs = M.tokens.filter(x => !x.isFocus).map(x => {
    const dx = Math.abs(pos[x.i].cx - fp.cx), h = Math.max(16, room * Math.pow(dx / maxDx, 0.75)) / 1.0;
    const side = x.i < f ? -1 : 1, far = dx / maxDx, x0 = fp.cx + side * (fp.w * 0.42) * (1 - far);
    return Object.assign({}, x, { h: h, x0, x2: pos[x.i].cx });
  }).sort((a, b) => a.weight - b.weight); // strongest drawn last, on top
  if (k >= 2) {
    const g = svg.append('g').attr('fill', 'none').attr('stroke-linecap', 'round');
    g.selectAll('path').data(arcs).join('path')
      .attr('d', d => arcPath(d.x0, d.x2, arcY, d.h, grow))
      .attr('stroke', d => strongOn && d.strongest ? C.hi : C.accent)
      .attr('stroke-width', d => 1 + 16 * d.weight)
      .attr('stroke-opacity', d => (strongOn && !d.strongest ? 0.55 : 1) * (0.18 + 0.82 * d.weight / maxW));
    // weight labels at the arc tops, top 3 only
    if (labelsOn > 0) {
      const lg = g.append('g').attr('opacity', labelsOn);
      arcs.filter(d => d.top3).forEach(d => {
        const lx = (d.x0 + d.x2) / 2, ly = arcY - d.h - 4 - 8 * d.weight, s = pc(d.weight), lw = tw(s, 12, 700) + 10;
        const col = strongOn && d.strongest ? C.hi : C.accent;
        lg.append('rect').attr('x', lx - lw / 2).attr('y', ly - 10).attr('width', lw).attr('height', 19).attr('rx', 9.5)
          .attr('fill', '#fff').attr('stroke', col).attr('stroke-width', 1.2);
        lg.append('text').attr('x', lx).attr('y', ly + 4).attr('text-anchor', 'middle').attr('font-size', 12).attr('font-weight', 700).attr('fill', col).text(s);
      });
    }
  }

  // Words, revealed left to right in the first step
  const wg = svg.append('g').attr('font-family', FONT);
  words.forEach((w, i) => {
    const o = 0.2 + 0.8 * clamp((t - i * 0.1) / 0.35), p = pos[i], tok = M.tokens[i];
    const isF = showFocus && i === f, isS = strongOn && tok.strongest, isLast = i === words.length - 1;
    const g = wg.append('g').attr('opacity', k >= 1 ? 1 : o);
    if (isF || isS) g.append('rect').attr('x', p.x - fs * 0.28).attr('y', wordTop - fs * 0.22).attr('width', p.w + fs * 0.56).attr('height', fs * 1.5).attr('rx', 6)
      .attr('fill', isF ? C.accent : C.hiTint).attr('stroke', isF ? C.accent : C.hi).attr('stroke-width', 1.5);
    g.append('text').attr('x', p.cx).attr('y', baseY).attr('text-anchor', 'middle').attr('font-size', fs).attr('font-weight', isF || isS || isLast ? 700 : 500)
      .attr('fill', isF ? '#fff' : isS ? C.hi : isLast ? '#b4530f' : C.ink).text(w);
    if (isLast && k < 1) g.append('line').attr('x1', p.x).attr('x2', p.x + p.w).attr('y1', baseY + 5).attr('y2', baseY + 5).attr('stroke', '#b4530f').attr('stroke-width', 2);
  });
  if (showFocus) wg.append('text').attr('x', fp.cx).attr('y', baseY + fs * 0.55 + 14).attr('text-anchor', 'middle').attr('font-size', 11).attr('font-weight', 600)
    .attr('fill', C.accent).text(k >= 2 ? 'self ' + pc(M.selfWeight) : 'focus');
  // At the end, the meaning head states the referent under "it"
  if (done && M.headIndex === 0) {
    const ip = pos[7];
    wg.append('text').attr('x', ip.cx).attr('y', baseY + fs * 0.55 + (f === 7 ? 28 : 14)).attr('text-anchor', 'middle').attr('font-size', 11.5).attr('font-weight', 700)
      .attr('fill', C.hi).text('= ' + M.referent);
  }

  // Legend: head, thickness key, and what the row adds up to
  const ly = H - legendH + 6, lg = svg.append('g');
  lg.append('line').attr('x1', padX).attr('x2', W - padX).attr('y1', ly - 8).attr('y2', ly - 8).attr('stroke', C.line);
  const key = [[0.05, '5%'], [0.25, '25%'], [0.5, '50%']];
  let kx = padX;
  lg.append('text').attr('x', kx).attr('y', ly + 12).attr('font-size', 12).attr('font-weight', 600).attr('fill', M.headIndex ? '#0f766e' : C.accent).text(M.head);
  kx += tw(M.head, 12, 600) + 16;
  key.forEach(([w, s]) => {
    lg.append('line').attr('x1', kx).attr('x2', kx + 26).attr('y1', ly + 8).attr('y2', ly + 8).attr('stroke', C.accent).attr('stroke-linecap', 'round')
      .attr('stroke-width', 1 + 16 * w).attr('stroke-opacity', 0.18 + 0.82 * Math.min(1, w / maxW));
    const tx = kx + 30 + 8 * w;
    lg.append('text').attr('x', tx).attr('y', ly + 12).attr('font-size', 11.5).attr('fill', C.muted).text(s);
    kx = tx + tw(s, 11.5) + 12;
  });
  const nl = wrap(note, W - 2 * padX, 11.5);
  if (inline) lg.append('text').attr('x', W - padX).attr('y', ly + 12).attr('text-anchor', 'end').attr('font-size', 11.5).attr('fill', C.muted).text(note);
  else nl.slice(0, 2).forEach((s, i) => lg.append('text').attr('x', padX).attr('y', ly + 30 + i * 14).attr('font-size', 11.5).attr('fill', C.muted).text(s));
}

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  seek(t) { T = Math.max(0, Math.min(M.duration, t)); draw(); },
  mount(root, params) {
    rootEl = root; M = model(params); T = 0;
    svg = d3.select(root).append('svg').style('display', 'block').attr('role', 'img')
      .attr('aria-label', 'Attention arcs from one word of the sentence to every other word');
    ro = new ResizeObserver(() => { const s = root.clientWidth + 'x' + root.clientHeight; if (s !== lastSize) { lastSize = s; draw(); } });
    ro.observe(root);
    draw();
  },
  update(params) { M = model(params); T = 0; draw(); },
  destroy() { if (ro) ro.disconnect(); if (svg) svg.remove(); svg = null; M = null; }
};

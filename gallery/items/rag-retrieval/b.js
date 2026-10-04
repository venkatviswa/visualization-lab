// D3: a flat 2D projection of the same synthetic vectors, next to the ranked list of cosine scores.
// seek(t) redraws the exact state at time t from model(params); no running transitions.
const COL = ['#2b59c3', '#0f766e', '#b4530f'], INK = '#1d2433', MUTED = '#5b6475', LINE = '#dbe0e8', HI = '#c2410c';
const CAP = ['24 policy chunks, flattened to 2D: similar meaning sits close together.',
  'The question is embedded the same way: the dark diamond.',
  'Every chunk gets a cosine similarity score with the question (1 = same direction).',
  'Only the k highest scores are kept; every other chunk is ignored.'];
let svg = null, M = null, T = 0, rootEl = null, ro = null;
const clamp = x => Math.max(0, Math.min(1, x)), ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const cut = (s, n) => s.length > n ? s.slice(0, n - 1) + '…' : s;

function text(g, x, y, s, o = {}) {
  return g.append('text').attr('x', x).attr('y', y).attr('fill', o.fill || INK).attr('font-size', o.size || 12)
    .attr('font-weight', o.weight || 400).attr('text-anchor', o.anchor || 'start').attr('opacity', o.op ?? 1).attr('stroke', o.halo ? '#fff' : null).attr('stroke-width', o.halo ? 3 : null).attr('paint-order', 'stroke').text(s);
}
function draw() {
  if (!svg || !M) return;
  const W = rootEl.clientWidth, H = rootEl.clientHeight, wide = W >= 640, P = M.phases, t = T;
  svg.attr('width', W).attr('height', H).selectAll('*').remove();
  const qIn = ease((t - P.question[0]) / 1.0), rank = clamp((t - P.rank[0]) / (P.rank[1] - P.rank[0])), top = ease((t - P.topk[0]) / 1.2), ctx = t >= P.context[0];
  const done = t >= P.context[0] + 0.8, step = t < P.question[0] ? 0 : t < P.rank[0] ? 1 : t < P.topk[0] ? 2 : 3;
  // header
  text(svg, 12, 22, 'How RAG retrieval finds the right policy passages', { size: 14, weight: 600 });
  const sub = done ? M.summary : step === 3 ? (M.k > 1 ? CAP[3].replace('the k', 'the ' + M.k) : 'Only the single highest score is kept; every other chunk is ignored.') : CAP[step];
  const subLines = wide ? [sub] : wrap(sub, Math.floor((W - 24) / 6.6));
  subLines.forEach((l, i) => text(svg, 12, 41 + i * 17, l, { size: 13, fill: done ? INK : MUTED }));
  const head = 41 + subLines.length * 17;
  // areas
  const A = wide ? { x: 12, y: head + 4, w: W * 0.46 - 12, h: H - head - 10 } : { x: 12, y: head + 2, w: W - 24, h: Math.round((H - head) * 0.44) };
  const L = wide ? { x: W * 0.46 + 16, y: head + 8, w: W * 0.54 - 28, h: H - head - 16 } : { x: 12, y: A.y + A.h + 6, w: W - 24, h: H - A.y - A.h - 12 };
  // --- scatter (2D projection) ---
  const g = svg.append('g');
  const s = Math.min(A.w / 2 - 66, (A.h - 22) / 2 - 22), cx = A.x + A.w / 2, cy = A.y + (A.h - 22) / 2;
  const X = v => cx + v * s, Y = v => cy - v * s;
  g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', s).attr('fill', '#f7f8fa').attr('stroke', LINE);
  text(g, cx, A.y + A.h - 4, '2D projection of the 3D vectors: distances are approximate', { size: 11, fill: MUTED, anchor: 'middle' });
  const kept = new Set(M.context.map(c => c.id));
  M.topics.forEach((name, k) => {
    const pts = M.chunks.filter(c => c.topic === k), mx = d3.mean(pts, c => c.xy[0]), my = d3.mean(pts, c => c.xy[1]), l = Math.hypot(mx, my), ux = mx / l, uy = my / l;
    const words = Math.abs(ux) > 0.3 ? name.split(' ') : [name];
    words.forEach((wd, j) => text(g, X(ux * 1.06), Y(uy * 1.06) + 4 + (uy > 0.5 ? -8 : 0) + (j - (words.length - 1) / 2) * 14, wd, { size: 12.5, weight: 600, fill: COL[k],
      anchor: ux > 0.3 ? 'start' : ux < -0.3 ? 'end' : 'middle', op: ease((t - 1.6) / 0.6) * (1 - top * 0.4) }));
  });
  const qx = X(M.question.xy[0]), qy = Y(M.question.xy[1]);
  M.context.forEach((c, i) => {
    const gr = ease((t - P.topk[0] - i * 0.18) / 0.6);
    if (gr > 0) g.append('line').attr('x1', qx).attr('y1', qy).attr('x2', qx + (X(c.xy[0]) - qx) * gr).attr('y2', qy + (Y(c.xy[1]) - qy) * gr).attr('stroke', INK).attr('stroke-width', 2);
  });
  M.chunks.forEach(c => {
    const a = ease((t - 0.1 - c.id * 0.075) / 0.35), w = Math.max(0, c.sim), isK = kept.has(c.id);
    const r = 6 * (1 + rank * (0.35 + 0.9 * w ** 4 - 1)) * (isK ? 1 + top * 0.25 : 1);
    if (a > 0) g.append('circle').attr('cx', X(c.xy[0])).attr('cy', Y(c.xy[1])).attr('r', r * a).attr('fill', COL[c.topic])
      .attr('opacity', isK ? 1 : 1 - top * 0.7).attr('stroke', '#fff').attr('stroke-width', 1);
  });
  if (qIn > 0) {
    g.append('path').attr('d', d3.symbol(d3.symbolDiamond, 150 * qIn)()).attr('transform', `translate(${qx},${qy - (1 - qIn) * 30})`).attr('fill', INK).attr('stroke', '#fff').attr('stroke-width', 1.5);
    const ql = Math.hypot(...M.question.xy), lx = qx - M.question.xy[0] / ql * 58, ly = qy + M.question.xy[1] / ql * 58;
    g.append('line').attr('x1', qx - M.question.xy[0] / ql * 10).attr('y1', qy + M.question.xy[1] / ql * 10).attr('x2', lx).attr('y2', ly).attr('stroke', INK).attr('stroke-width', 1).attr('opacity', qIn * 0.6);
    text(g, lx, ly + (M.question.xy[1] > 0 ? 14 : -5), 'Question', { size: 12, weight: 600, anchor: 'middle', op: qIn, halo: true });
  }
  if (top > 0) M.context.forEach(c => {
    const b = g.append('g').attr('transform', `translate(${X(c.xy[0]) + 9},${Y(c.xy[1]) - 9})`).attr('opacity', top);
    b.append('rect').attr('x', -1).attr('y', -8).attr('width', 16).attr('height', 15).attr('rx', 7.5).attr('fill', COL[c.topic]);
    text(b, 7, 3.5, c.rank, { size: 11, weight: 600, fill: '#fff', anchor: 'middle' });
  });
  // --- ranked list ---
  const lg = svg.append('g');
  text(lg, L.x, L.y + 10, qIn > 0 ? 'Q: ' + cut(M.question.text, Math.floor(L.w / 6.9)) : 'Waiting for a question…', { size: 13, weight: 600, fill: qIn > 0 ? INK : MUTED });
  const gap = 20, top0 = L.y + 24, avail = L.h - 40 - gap, maxRows = Math.max(6, Math.floor(avail / 17));
  const n = Math.min(M.ranked.length, maxRows - (M.ranked.length > maxRows ? 1 : 0)), rh = Math.min(22, avail / (n + (n < M.ranked.length ? 1 : 0)));
  const rowY = i => top0 + i * rh + (i >= M.k ? gap * top : 0), bottom = rowY(n) + (n < M.ranked.length ? rh : 0);
  const labW = Math.min(wide ? 210 : 172, L.w * 0.48), valW = 44, fs = rh < 19 ? 11 : 12;
  const x = d3.scaleLinear().domain([-0.5, 1]).range([L.x + labW + 8, L.x + L.w - valW]);
  if (rank > 0) {
    lg.append('line').attr('x1', x(0)).attr('x2', x(0)).attr('y1', top0).attr('y2', bottom).attr('stroke', LINE);
    [-0.5, 0, 0.5, 1].forEach(v => text(lg, x(v), bottom + 13, v.toFixed(1), { size: 11, fill: MUTED, anchor: 'middle' }));
    text(lg, L.x + labW - 6, bottom + 13, 'cosine similarity', { size: 11, fill: MUTED, anchor: 'end' });
  }
  if (ctx) lg.append('rect').attr('x', L.x - 6).attr('y', top0).attr('width', L.w + 8).attr('height', M.k * rh).attr('rx', 6).attr('fill', '#e8eefb');
  M.ranked.slice(0, n).forEach((c, i) => {
    const y = rowY(i), show = ease((rank * 3.4 - i * 0.1) / 0.8), isK = i < M.k, op = isK ? 1 : 1 - top * 0.6;
    if (show <= 0) return;
    const row = lg.append('g').attr('opacity', op);
    row.append('circle').attr('cx', L.x + 4).attr('cy', y + rh / 2).attr('r', 4).attr('fill', COL[c.topic]);
    text(row, L.x + 13, y + rh / 2 + 4, cut(c.rank + '. ' + c.title, Math.floor(labW / (fs * 0.56))), { size: fs, weight: isK && top > 0.5 ? 600 : 400 });
    const v = c.sim * show;
    row.append('rect').attr('x', Math.min(x(0), x(v))).attr('y', y + rh * 0.2).attr('width', Math.abs(x(v) - x(0))).attr('height', rh * 0.6).attr('rx', 2).attr('fill', COL[c.topic]).attr('opacity', 0.85);
    text(row, L.x + L.w, y + rh / 2 + 4, c.sim.toFixed(3), { size: fs, fill: MUTED, anchor: 'end', op: show });
  });
  if (n < M.ranked.length && rank > 0.6) text(lg, L.x + 13, rowY(n) + rh / 2 + 4, '+ ' + (M.ranked.length - n) + ' lower-scoring chunks', { size: 11, fill: MUTED });
  if (top > 0) {
    const yc = top0 + M.k * rh + gap / 2;
    lg.append('line').attr('x1', L.x - 6).attr('x2', L.x + L.w + 2).attr('y1', yc).attr('y2', yc).attr('stroke', HI).attr('stroke-width', 1.5).attr('stroke-dasharray', '5 4').attr('opacity', top);
    const lab = ctx ? '↑ context sent to the model (top ' + M.k + ')' : 'top-' + M.k + ' cut-off: the rest is ignored';
    lg.append('rect').attr('x', L.x + 6).attr('y', yc - 8).attr('width', lab.length * 6.4 + 12).attr('height', 16).attr('fill', '#fff').attr('opacity', top);
    text(lg, L.x + 12, yc + 4, lab, { size: 11.5, weight: 600, fill: HI, op: top });
  }
}
function wrap(s, n) { const out = []; let cur = ''; for (const w of s.split(' ')) { if ((cur + ' ' + w).trim().length > n && cur) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); } if (cur) out.push(cur); return out; }

window.lab = {
  get duration() { return M ? M.duration : 12; },
  get markers() { return M ? M.markers : []; },
  seek(t) { T = t; draw(); },
  mount(root, params) {
    rootEl = root; M = model(params); T = 0;
    svg = d3.select(root).append('svg').style('display', 'block').style('background', '#fff').style('font-family', 'system-ui, sans-serif')
      .attr('role', 'img').attr('aria-label', '2D map of policy chunks and a ranked list of cosine similarities');
    ro = new ResizeObserver(() => draw()); ro.observe(root); draw();
  },
  update(params) { M = model(params); T = 0; draw(); },
  destroy() { if (ro) ro.disconnect(); if (svg) svg.remove(); svg = null; M = null; }
};

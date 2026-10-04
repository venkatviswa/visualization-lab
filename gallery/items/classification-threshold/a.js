// D3: every transaction as a dot on the score line, a moving threshold, a live confusion matrix and precision/recall bars.
// layout() builds the scene from model(params); seek(t) only recolours and relabels it for playback time t.
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', accent: '#2b59c3', tp: '#1f7a4d', fn: '#be123c', fp: '#b4530f', tn: '#b8bfcc',
  legit: '#9aa3b2', fraud: '#1d2433', flagTint: '#fdf3ea', soft: '#f4f6f9' };
const FONT = 'system-ui, -apple-system, sans-serif';
let root = null, svg = null, M = null, T = 0, S = null, ro = null, lastW = 0, lastH = 0;

const stepAt = t => { let s = M.steps[0]; for (const x of M.steps) if (x.t <= t + 1e-6) s = x; return s; };
function thresholdAt(t) {
  const k = M.thresholdKeys; let v = k[k.length - 1].value;
  for (let i = 1; i < k.length; i++) if (t <= k[i].t) { const a = k[i - 1], b = k[i], f = b.t > a.t ? (t - a.t) / (b.t - a.t) : 1; v = a.value + (b.value - a.value) * Math.max(0, f); break; }
  return Math.min(0.95, Math.max(0.05, Math.round(v * 20) / 20));
}
const rowAt = th => M.curve[Math.round(th * 20) - 1];
const pct = v => v === null ? 'n/a' : Math.round(v * 100) + ' %';
function wrap(sel, str, x, y, maxW, size, lh) {
  sel.selectAll('tspan').remove();
  const per = Math.max(10, Math.floor(maxW / (size * 0.54))), lines = [];
  let cur = '';
  for (const w of String(str).split(' ')) { if ((cur + ' ' + w).trim().length > per && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
  if (cur) lines.push(cur);
  lines.forEach((l, i) => sel.append('tspan').attr('x', x).attr('y', y + i * lh).text(l));
  return lines.length;
}
function text(g, x, y, s, o = {}) {
  return g.append('text').attr('x', x).attr('y', y).attr('fill', o.fill || C.ink).attr('font-size', o.size || 12).attr('font-weight', o.weight || 400)
    .attr('text-anchor', o.anchor || 'start').attr('font-family', FONT).text(s);
}

function layout() {
  const W = root.clientWidth, H = root.clientHeight, narrow = W < 640;
  lastW = W; lastH = H;
  svg.attr('width', W).attr('height', H).selectAll('*').remove();
  S = { W, H, narrow };
  S.title = text(svg, 16, 24, '', { size: 14, weight: 600 });
  S.sub = text(svg, 16, 44, '', { size: 12.5, fill: C.muted });
  const top = narrow ? 92 : 78;
  // Panel geometry: strips left (or top), matrix and metrics right (or below)
  const sx0 = narrow ? 56 : 92, sx1 = narrow ? W - 16 : Math.round(W * 0.6) - 8;
  const sTop = top + 20, sBot = narrow ? top + Math.max(190, Math.round((H - top) * 0.42)) : H - 58;
  const x = d3.scaleLinear().domain([0, 1]).range([sx0, sx1]);
  const gap = 18, fraudH = Math.max(46, Math.round((sBot - sTop - gap) * 0.3)), legitH = sBot - sTop - gap - fraudH;
  const bands = { legit: [sTop, sTop + legitH], fraud: [sTop + legitH + gap, sBot] };
  S.x = x; S.bands = bands;
  const g = svg.append('g');
  S.flagRect = g.append('rect').attr('y', sTop - 6).attr('height', sBot - sTop + 12).attr('fill', C.flagTint);
  for (const [k, lab] of [['legit', 'Legit.'], ['fraud', 'Fraud']]) {
    const [y0, y1] = bands[k];
    g.append('rect').attr('x', sx0).attr('y', y0).attr('width', sx1 - sx0).attr('height', y1 - y0).attr('fill', 'none').attr('stroke', C.line).attr('rx', 6);
    text(g, sx0 - 8, (y0 + y1) / 2 - 2, narrow ? lab : (k === 'legit' ? 'Legitimate' : 'Fraud'), { anchor: 'end', weight: 600, size: 12 });
    text(g, sx0 - 8, (y0 + y1) / 2 + 13, String(k === 'legit' ? M.nLegit : M.nFraud), { anchor: 'end', size: 11.5, fill: C.muted });
  }
  g.append('g').attr('transform', `translate(0,${sBot + 6})`).call(d3.axisBottom(x).ticks(narrow ? 5 : 10).tickSizeOuter(0))
    .call(a => a.selectAll('text').attr('font-size', 11).attr('fill', C.muted)).call(a => a.selectAll('path,line').attr('stroke', '#b8bfcc'));
  text(g, (sx0 + sx1) / 2, sBot + 40, 'Fraud score from the model (0 to 1)', { anchor: 'middle', size: 11.5, fill: C.muted });
  const r = narrow ? 2.4 : 3;
  S.dots = g.append('g').selectAll('circle').data(M.transactions).join('circle')
    .attr('cx', d => x(d.score)).attr('r', r)
    .attr('cy', d => { const [y0, y1] = bands[d.fraud ? 'fraud' : 'legit']; return y0 + 6 + d.jitter * (y1 - y0 - 12); });
  S.thLine = g.append('line').attr('y1', sTop - 10).attr('y2', sBot + 4).attr('stroke', C.accent).attr('stroke-width', 2.5);
  S.thLabel = text(g, 0, sTop - 13, '', { anchor: 'middle', size: 12, weight: 700, fill: C.accent });
  S.flagLabel = text(g, sx1, sTop - 13, 'Flagged →', { anchor: 'end', size: 11.5, fill: C.fp, weight: 600 });
  S.passLabel = text(g, sx0, sTop - 13, '← Passed', { size: 11.5, fill: C.muted, weight: 600 });
  // Confusion matrix
  const mx0 = narrow ? 56 : Math.round(W * 0.6) + 40, mx1 = W - 16;
  const my0 = narrow ? sBot + 72 : top + 34, cellW = (mx1 - mx0) / 2, cellH = narrow ? Math.max(56, Math.min(74, (H - sBot - 200) / 2)) : Math.max(64, Math.min(100, (H - top - 250) / 2));
  const mg = svg.append('g');
  text(mg, mx0 + cellW / 2, my0 - 10, 'Flagged', { anchor: 'middle', weight: 600 });
  text(mg, mx0 + cellW * 1.5, my0 - 10, 'Passed', { anchor: 'middle', weight: 600 });
  text(mg, mx0 - 8, my0 + cellH / 2 + 4, 'Fraud', { anchor: 'end', weight: 600 });
  text(mg, mx0 - 8, my0 + cellH * 1.5 + 4, 'Legit.', { anchor: 'end', weight: 600 });
  const cells = [['tp', 'Fraud caught', 0, 0], ['fn', 'Fraud missed', 1, 0], ['fp', 'False alarm', 0, 1], ['tn', 'Legit passed', 1, 1]];
  S.cells = cells.map(([k, lab, cx, cy]) => {
    const cg = mg.append('g').attr('transform', `translate(${mx0 + cx * cellW},${my0 + cy * cellH})`);
    const rect = cg.append('rect').attr('x', 2).attr('y', 2).attr('width', cellW - 4).attr('height', cellH - 4).attr('rx', 8).attr('stroke-width', 1.5);
    const num = text(cg, cellW / 2, cellH / 2 + 4, '', { anchor: 'middle', size: narrow ? 22 : 26, weight: 700 });
    const cap = text(cg, cellW / 2, cellH - 12, lab + ' (' + k.toUpperCase() + ')', { anchor: 'middle', size: 11, fill: C.muted });
    return { k, rect, num, cap };
  });
  // Precision and recall bars
  const by0 = my0 + 2 * cellH + (narrow ? 22 : 34), bw = mx1 - (narrow ? 16 : mx0);
  const bx0 = narrow ? 16 : mx0;
  S.bars = ['precision', 'recall'].map((k, i) => {
    const y = by0 + i * (narrow ? 48 : 58), bg = svg.append('g');
    const label = text(bg, bx0, y, '', { weight: 600, size: 12.5 });
    const how = text(bg, bx0 + bw, y, '', { anchor: 'end', size: 11.5, fill: C.muted });
    bg.append('rect').attr('x', bx0).attr('y', y + 7).attr('width', bw).attr('height', 12).attr('rx', 6).attr('fill', '#eef1f5');
    const bar = bg.append('rect').attr('x', bx0).attr('y', y + 7).attr('height', 12).attr('rx', 6).attr('fill', k === 'precision' ? C.fp : C.tp);
    return { k, g: bg, label, how, bar, bw };
  });
  // Dot colour key (desktop only; on a phone the matrix colours carry it)
  if (!narrow) {
    const ky = by0 + 2 * 58 + 6, kg = svg.append('g');
    S.key = kg;
    text(kg, bx0, ky, 'Dot colours', { size: 11.5, fill: C.muted, weight: 600 });
    [['tp', 'Fraud caught'], ['fn', 'Fraud missed'], ['fp', 'False alarm'], ['tn', 'Legit passed']].forEach(([k, lab], i) => {
      const kx = bx0 + (i % 2) * (bw / 2), yy = ky + 20 + Math.floor(i / 2) * 20;
      kg.append('circle').attr('cx', kx + 5).attr('cy', yy - 4).attr('r', 5).attr('fill', C[k]);
      text(kg, kx + 16, yy, lab, { size: 12 });
    });
  }
  draw();
}

function draw() {
  if (!S || !M) return;
  const t = T, step = stepAt(t), done = t >= M.duration - 0.05;
  const si = M.steps.indexOf(step), th = thresholdAt(t), row = rowAt(th), x = S.x;
  wrap(S.title, 'Fraud threshold · ' + step.title, 16, 24, S.W - 32, 14, 18);
  wrap(S.sub, done ? M.summary : step.note, 16, 44, S.W - 32, 12.5, 16);
  // Dots: revealed in the first step, then coloured by outcome once the threshold exists
  const showTh = si >= 1;
  S.dots.attr('opacity', d => {
    if (si > 0) return 0.85;
    const at = d.fraud ? 1.5 + (d.id - M.nLegit) / Math.max(1, M.nFraud) * 0.9 : d.id / M.nLegit * 1.5;
    return t >= at ? 0.85 : 0;
  }).attr('fill', d => {
    if (!showTh) return d.fraud ? C.fraud : C.legit;
    const flag = d.score >= th - 1e-9;
    return d.fraud ? (flag ? C.tp : C.fn) : (flag ? C.fp : C.tn);
  });
  const tx = x(th);
  S.thLine.attr('x1', tx).attr('x2', tx).attr('opacity', showTh ? 1 : 0);
  S.thLabel.attr('x', Math.min(S.W - 50, Math.max(40, tx))).text('Threshold ' + th.toFixed(2)).attr('opacity', showTh ? 1 : 0);
  S.flagRect.attr('x', tx).attr('width', Math.max(0, x(1) - tx + 4)).attr('opacity', showTh ? 1 : 0);
  S.flagLabel.attr('opacity', showTh && x(1) - tx > 120 ? 1 : 0);
  S.passLabel.attr('opacity', showTh && tx - x(0) > 120 ? 1 : 0);
  if (S.key) S.key.attr('opacity', showTh ? 1 : 0.35);
  const showM = si >= 2, showP = si >= 3;
  for (const c of S.cells) {
    const col = C[c.k];
    c.rect.attr('fill', showM ? (c.k === 'tn' ? C.soft : col) : '#fff').attr('fill-opacity', showM ? (c.k === 'tn' ? 1 : 0.13) : 1).attr('stroke', showM ? col : C.line);
    c.num.text(showM ? row[c.k] : '?').attr('fill', showM ? (c.k === 'tn' ? C.muted : col) : '#c3c9d4');
  }
  for (const b of S.bars) {
    const v = row[b.k];
    b.g.attr('opacity', showP ? 1 : 0.35);
    b.label.text((b.k === 'precision' ? 'Precision ' : 'Recall ') + (showP ? pct(v) : ''));
    b.how.text(!showP ? (b.k === 'precision' ? 'TP / (TP + FP)' : 'TP / (TP + FN)')
      : b.k === 'precision' ? (row.flagged ? row.tp + ' / ' + row.flagged + ' flags are fraud' : 'nothing flagged') : row.tp + ' / ' + M.nFraud + ' frauds flagged');
    b.bar.attr('width', showP && v !== null ? b.bw * v : 0);
  }
}

window.lab = {
  get duration() { return M ? M.duration : 13; },
  get markers() { return M ? M.markers : []; },
  seek(t) { T = Math.max(0, Math.min(M.duration, t)); draw(); },
  mount(r, params) {
    root = r; M = model(params); T = 0;
    svg = d3.select(root).append('svg').style('display', 'block').style('background', '#fff')
      .attr('role', 'img').attr('aria-label', 'Fraud scores for 400 transactions with a decision threshold, confusion matrix, precision and recall');
    // The host adds its control bars after mount, so watch the root itself rather than the window
    ro = new ResizeObserver(() => { if (root.clientWidth !== lastW || root.clientHeight !== lastH) layout(); }); ro.observe(root);
    layout();
  },
  update(params) { M = model(params); T = 0; layout(); },
  destroy() { if (ro) ro.disconnect(); if (svg) svg.remove(); svg = null; S = null; M = null; }
};

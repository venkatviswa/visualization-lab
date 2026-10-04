// D3: a flat git graph in the style of the GitHub network view. One lane per branch, commits as glowing dots with
// id and message, pull request, review and conflict notes on the commits, and a narrator box. seek(t) redraws the exact state at t.
const K = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', main: '#0f766e', feat: '#b4530f', accent: '#2b59c3', warn: '#c2410c', good: '#1f7a4d' };
const TONE = { accent: K.accent, good: K.good, warn: K.warn };
const PRC = { 'Open': K.accent, 'Changes requested': K.feat, 'Approved': K.good, 'Conflict': K.warn, 'Ready to merge': K.good, 'Merged': K.good };
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
let root, svg, M, T = 0, byId = {}, onResize;
const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = k => k * k * (3 - 2 * k);
const back = k => k <= 0 ? 0 : 1 + 2.70158 * Math.pow(k - 1, 3) + 1.70158 * Math.pow(k - 1, 2);
function wrap(s, n, max) {
  const out = []; let cur = '';
  for (const w of s.split(' ')) { if (cur && (cur + ' ' + w).length > n) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; }
  if (cur) out.push(cur);
  if (out.length > max) { out.length = max; out[max - 1] = out[max - 1].slice(0, Math.max(1, n - 1)) + '…'; }
  return out;
}
const clip = (s, n) => s.length > n ? s.slice(0, Math.max(1, n - 1)) + '…' : s;
const laneAt = c => { const to = c.lane === 'main' ? 0 : 1; if (c.moveAt == null) return to; const from = c.fromLane === 'main' ? 0 : 1; return from + (to - from) * ease(cl((T - c.moveAt) / 0.9)); };
const appear = c => c.squashOf ? c.born + 0.8 : c.born;
const popK = c => c.born === 0 ? 1 : cl((T - appear(c)) / 0.35);
const ghost = c => c.ghostAt != null && T >= c.ghostAt ? 1 - 0.68 * ease(cl((T - c.ghostAt) / 0.6)) : 1;
const isGhost = c => c.ghostAt != null && T >= c.ghostAt;
function txt(g, x, y, s, o = {}) {
  return g.append('text').attr('x', x).attr('y', y).text(s).attr('font-size', o.size || 12).attr('font-weight', o.weight || 400)
    .attr('fill', o.color || K.ink).attr('text-anchor', o.anchor || 'start').attr('font-family', o.mono ? MONO : 'system-ui, sans-serif');
}
function chip(g, cx, cy, s, color, filled, anchor) {
  const w = s.length * 6.3 + 16, x = anchor === 'start' ? cx : cx - w / 2;
  const c = g.append('g');
  c.append('rect').attr('x', x).attr('y', cy - 9.5).attr('width', w).attr('height', 19).attr('rx', 9.5)
    .attr('fill', filled ? color : '#fff').attr('stroke', color).attr('stroke-opacity', filled ? 1 : 0.55);
  txt(c, x + w / 2, cy + 4, s, { size: 11, weight: 600, color: filled ? '#fff' : color, anchor: 'middle' });
  return w;
}
function draw() {
  if (!svg || !M) return;
  const W = root.clientWidth, H = root.clientHeight, vert = W < 600;
  svg.attr('width', W).attr('height', H).selectAll('*').remove();
  const cur = M.events.filter(e => e.t <= T + 1e-6).pop() || M.events[0];
  const done = T >= M.duration - 1.0 - 1e-6;
  const styleName = { merge: 'merge commit', rebase: 'rebase and merge', squash: 'squash and merge' }[M.style];
  const scen = (M.hotfix ? 'Hotfix on main, ' + (M.sameFile ? 'same file changed' : 'different files') : 'No hotfix on main') + ', ' + styleName + '. Follow pull request #42 from branch to merge.';
  // Header: title plus a subtitle that becomes the summary at the end of playback
  txt(svg, 14, 22, 'Branches: a safe place to try ideas', { size: 14, weight: 600 });
  const sub = wrap(done ? M.summary : scen, Math.floor((W - 28) / 6.4), vert ? 3 : 2);
  sub.forEach((l, i) => txt(svg, 14, 40 + i * 16, l, { size: 12.5, color: done ? K.ink : K.muted }));
  const headB = 40 + sub.length * 16;
  // Narrator box geometry
  const cap = wrap(cur.caption, Math.floor((W - 74) / 6.5), 5), chipRow = vert && cur.pr !== 'None' ? 1 : 0;
  const NH = 50 + chipRow * 24 + (cap.length - 1) * 17 + 12, ny = H - NH - 8;
  // Graph geometry in (u along time, v across lanes), mapped to x/y by orientation
  const n = M.columns; let P, step, featV, mainV;
  if (!vert) {
    featV = headB + (ny - headB) * 0.37; mainV = headB + (ny - headB) * 0.75;
    const u0 = 132, u1 = W - 64; step = (u1 - u0) / (n - 1);
    P = (col, lf) => ({ u: u0 + col * step, v: mainV + (featV - mainV) * lf });
  } else {
    mainV = 26; featV = 70;
    const u0 = headB + 40, u1 = ny - 38; step = Math.min(52, (u1 - u0) / (n - 1));
    P = (col, lf) => ({ u: u0 + col * step, v: mainV + (featV - mainV) * lf });
  }
  const xy = q => vert ? [q.v, q.u] : [q.u, q.v];
  const f = (u, v) => xy({ u, v }).map(z => z.toFixed(1)).join(',');
  const pth = (a, b) => {
    if (Math.abs(a.v - b.v) < 0.5) return `M${f(a.u, a.v)}L${f(b.u, b.v)}`;
    const m = Math.max(a.u, b.u - step * 0.85), c = (m + b.u) / 2;
    return `M${f(a.u, a.v)}L${f(m, a.v)}C${f(c, a.v)} ${f(c, b.v)} ${f(b.u, b.v)}`;
  };
  const posOf = c => P(c.col, laneAt(c));
  const g = svg.append('g');
  // Lane rails and lane names
  const fork = byId[M.forkId], featOn = T >= M.branchT, deleted = T >= M.deleteT;
  const rail = (a, b, color, op) => { g.append('path').attr('d', pth(a, b)).attr('stroke', color).attr('stroke-width', 12).attr('stroke-linecap', 'round').attr('opacity', op * 0.1).attr('fill', 'none');
    g.append('path').attr('d', pth(a, b)).attr('stroke', color).attr('stroke-width', 1.2).attr('stroke-dasharray', '2 5').attr('opacity', op * 0.6).attr('fill', 'none'); };
  rail(P(0, 0), P(n - 1, 0), K.main, 1);
  if (featOn) rail(P(fork.col + 0.6, 1), P(n - 1, 1), K.feat, deleted ? 0.35 : ease(cl((T - M.branchT) / 0.6)));
  const fc = deleted ? K.muted : K.feat, fo = featOn ? 1 : 0;
  if (!vert) {
    txt(g, 14, mainV + 4, 'main', { size: 13, weight: 700, color: K.main });
    const ft = g.append('g').attr('opacity', fo);
    txt(ft, 14, featV - 3, 'feature/', { size: 12, weight: 700, color: fc }); txt(ft, 14, featV + 12, 'csv-export', { size: 12, weight: 700, color: fc });
    if (deleted) txt(ft, 14, featV + 27, '(deleted)', { size: 11, color: K.muted });
  } else {
    txt(g, mainV, headB + 18, 'main', { size: 12, weight: 700, color: K.main, anchor: 'middle' });
    txt(g.append('g').attr('opacity', fo), featV - 22, headB + 18, deleted ? 'deleted' : 'feature', { size: 12, weight: 700, color: fc });
  }
  const vis = M.commits.filter(c => T >= appear(c) - 1e-6);
  // Edges: cross-lane first, so the main line stays on top where they overlap
  const edges = [];
  vis.forEach(c => (c.parents || []).forEach(pid => { const p = byId[pid], a = posOf(p), b = posOf(c), same = Math.abs(a.v - b.v) < 0.5;
    edges.push({ a, b, same, color: same && laneAt(c) < 0.5 ? K.main : K.feat, k: c.born === 0 ? 1 : cl((T - appear(c)) / 0.45), op: Math.min(ghost(c), ghost(p)), dash: isGhost(c) }); }));
  edges.sort((x, y) => x.same - y.same).forEach(e => {
    const el = g.append('path').attr('d', pth(e.a, e.b)).attr('fill', 'none').attr('stroke', e.color).attr('stroke-width', 3).attr('stroke-linecap', 'round').attr('opacity', e.op);
    if (e.k < 1) el.attr('pathLength', 1).attr('stroke-dasharray', `${e.k} 1`); else if (e.dash) el.attr('stroke-dasharray', '5 5');
  });
  // Conflict marker between the two commits that changed the same line
  const ci = M.conflictInfo;
  if (ci && T >= ci.found && T < M.mergeT + 0.6) {
    const ok = T >= ci.resolved, col = ok ? K.good : K.warn, a = xy(posOf(byId[ci.a])), b = xy(posOf(byId[ci.b]));
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, op = T > M.mergeT ? 1 - (T - M.mergeT) / 0.6 : cl((T - ci.found) / 0.3);
    const cg = g.append('g').attr('opacity', op);
    cg.append('line').attr('x1', a[0]).attr('y1', a[1]).attr('x2', b[0]).attr('y2', b[1]).attr('stroke', col).attr('stroke-width', 2).attr('stroke-dasharray', '4 4');
    cg.append('circle').attr('cx', mx).attr('cy', my).attr('r', 11).attr('fill', col).attr('stroke', '#fff').attr('stroke-width', 2);
    txt(cg, mx, my + 4.5, ok ? '✓' : '!', { size: 13, weight: 700, color: '#fff', anchor: 'middle' });
    if (!vert) txt(cg, mx + 16, my + 4, ok ? 'resolved' : 'same line, src/dates.js', { size: 11, weight: 600, color: col });
  }
  // Squash: the branch commits fly into one new commit
  const tip = byId[M.tipId];
  if (M.style === 'squash' && T >= M.mergeT && T < M.mergeT + 0.9) {
    const k = ease(cl((T - M.mergeT) / 0.8)), b = xy(posOf(tip));
    tip.squashOf.forEach(id => { const a = xy(posOf(byId[id])); g.append('circle').attr('cx', a[0] + (b[0] - a[0]) * k).attr('cy', a[1] + (b[1] - a[1]) * k).attr('r', 5).attr('fill', K.feat).attr('opacity', 0.85); });
  }
  // Commits and labels
  const notes = M.notes.filter(x => T >= x.from && T < x.to);
  vis.forEach(c => {
    const lf = laneAt(c), [x, y] = xy(posOf(c)), color = lf > 0.5 ? K.feat : K.main, k = popK(c), gh = isGhost(c);
    const big = (c.parents || []).length === 2 || c.squashOf, r = big ? 10 : 8;
    const cg = g.append('g').attr('transform', `translate(${x},${y}) scale(${back(k)})`).attr('opacity', ghost(c));
    cg.append('circle').attr('r', r + 9).attr('fill', color).attr('opacity', gh ? 0 : 0.16);
    cg.append('circle').attr('r', r).attr('fill', gh ? '#fff' : color).attr('stroke', gh ? color : '#fff').attr('stroke-width', gh ? 1.5 : 2.5).attr('stroke-dasharray', gh ? '3 2' : null);
    if ((c.parents || []).length === 2) cg.append('circle').attr('r', 3.5).attr('fill', '#fff');
    if (c.squashOf) cg.append('circle').attr('r', r + 4).attr('fill', 'none').attr('stroke', color).attr('stroke-width', 1.5);
    if (cur.commit === c.id && T < cur.t + 2) { const ph = ((T - cur.t) / 0.9) % 1; cg.append('circle').attr('r', r + 4 + 12 * ph).attr('fill', 'none').attr('stroke', color).attr('stroke-width', 2).attr('opacity', (1 - ph) * 0.7); }
    const lg = g.append('g').attr('opacity', ghost(c) * k), note = notes.find(x => x.commit === c.id);
    if (!vert) {
      const up = lf > 0.5, msg = wrap(c.msg, Math.max(9, Math.floor(step / 6.4)), 2);
      const lines = up ? [...msg, c.id] : [c.id, ...msg], y0 = up ? y - 18 - (lines.length - 1) * 13.5 : y + 25;
      lines.forEach((s, i) => txt(lg, x, y0 + i * 13.5, s, s === c.id ? { size: 11, mono: true, color: K.muted, anchor: 'middle' } : { size: 11.5, color: gh ? K.muted : K.ink, anchor: 'middle' }));
      if (note) { const w = note.text.length * 6.3 + 16, cx = cl(x, w / 2 + 4, W - w / 2 - 4); chip(lg, cx, up ? y0 - 22 : y0 + lines.length * 13.5 + 6, note.text, TONE[note.tone], false); }
    } else {
      const lx = featV + 26, t1 = txt(lg, lx, y + 4, c.id + ' ', { size: 11, mono: true, color: K.muted });
      t1.append('tspan').text(clip(c.msg, Math.floor((W - lx - 64) / 6.3))).attr('font-family', 'system-ui, sans-serif').attr('font-size', 12).attr('fill', gh ? K.muted : K.ink);
      if (note) chip(lg, lx, y + 21, note.text, TONE[note.tone], false, 'start');
    }
  });
  // Narrator box: who acts, when, the pull request state and the caption
  const nb = svg.append('g').attr('transform', `translate(8,${ny})`), who = M.people[cur.actor];
  nb.append('rect').attr('width', W - 16).attr('height', NH).attr('rx', 10).attr('fill', '#f6f8fb').attr('stroke', K.line);
  nb.append('circle').attr('cx', 24).attr('cy', 24).attr('r', 13).attr('fill', who.color);
  txt(nb, 24, 28.5, who.name[0], { size: 13, weight: 700, color: '#fff', anchor: 'middle' });
  const nm = txt(nb, 46, 28, who.name, { size: 13, weight: 600 });
  nm.append('tspan').text(' · ' + who.role).attr('fill', K.muted).attr('font-weight', 400).attr('font-size', 12);
  txt(nb, W - 28, 28, cur.clock + (vert ? '' : '  ·  step ' + (cur.i + 1) + ' of ' + M.events.length), { size: 11.5, color: K.muted, anchor: 'end', mono: true });
  if (cur.pr !== 'None') chip(nb, vert ? 46 : 46 + nm.node().getComputedTextLength() + 12, vert ? 50 : 23.5, 'PR #42 · ' + cur.pr, PRC[cur.pr], cur.pr === 'Merged', 'start');
  cap.forEach((l, i) => txt(nb, 46, 50 + chipRow * 24 + i * 17, l, { size: 12.5 }));
}
window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  seek(t) { T = cl(t, 0, M.duration); draw(); },
  mount(r, params) {
    root = r; M = model(params); byId = Object.fromEntries(M.commits.map(c => [c.id, c])); T = 0;
    svg = d3.select(root).append('svg').style('display', 'block').style('background', '#fff')
      .attr('role', 'img').attr('aria-label', 'Git graph of a feature branch, a hotfix on main and a pull request being merged');
    onResize = () => draw(); addEventListener('resize', onResize); draw();
  },
  update(params) { M = model(params); byId = Object.fromEntries(M.commits.map(c => [c.id, c])); T = 0; draw(); },
  destroy() { removeEventListener('resize', onResize); if (svg) svg.remove(); svg = null; M = null; }
};

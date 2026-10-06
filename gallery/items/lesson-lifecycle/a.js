// Plain SVG swimlane: one row per place the lesson can live (the lab on claude.ai, your computer, one browser, the
// repository, GitHub Actions, the published site). Both ways out of Export lesson are drawn; the chosen one is lit up step
// by step by the host clock, the other stays faint for comparison. Underneath, who can see the lesson at the end.
// Narrow screens get the same steps as a list.
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d', bad: '#b42318', tint: '#e8eefb', goodTint: '#e9f5ee', badTint: '#fdecea', soft: '#f4f6f9', temp: '#fbefe8', perm: '#eef4fb' };
const NS = 'http://www.w3.org/2000/svg';
let M = null, wrap = null, head = null, stage = null, foot = null, ro = null, simT = 0, lastKey = '';
const fmtMin = v => v == null ? '—' : v < 10 ? v.toFixed(1) + ' min' : Math.round(v) + ' min';
const LANE_NOTE = { browser: 'temporary · this device only', repo: 'shared · permanent', ci: 'shared · checks every change', site: 'shared · what everyone opens' };

function s(tag, attrs, text) { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (text != null) n.textContent = text; return n; }
function wrapText(str, max) { const words = String(str).split(' '), lines = []; let cur = ''; for (const w of words) { if ((cur + ' ' + w).trim().length > max && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); } if (cur) lines.push(cur); return lines.slice(0, 4); }
function current() { let i = 0; M.steps.forEach((st, j) => { if (st.t <= simT + 1e-6) i = j; }); return i; }

// Column of each step in the swimlane: the four shared steps, then either way out of Export lesson
const COL = { describe: 0, spec: 1, generate: 2, export: 3, import: 4, add: 4, push: 5, ci: 6, deploy: 7, fail: 7 };
function colOf(st) { return st.id === 'outcome' ? (M.route === 'import' ? 5 : 8) : COL[st.id]; }

function renderWide(W, H, k, done) {
  const mid = W < 860, lanes = M.lanes, labelW = mid ? 100 : 132, top = 6, rowH = Math.max(44, Math.min(70, (H - top - 6) / lanes.length)), colW = (W - labelW - 12) / 9;
  const boxW = colW - 10, boxH = Math.min(rowH - 10, 52), rowOf = id => lanes.findIndex(l => l.id === id);
  const svg = s('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Swimlane of the steps from the lab to the gallery' });
  const defs = s('defs'); ['ink', 'faint', 'accent', 'good', 'bad'].forEach(n => { const m = s('marker', { id: 'ar-' + n, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }); m.append(s('path', { d: 'M0,0 L10,5 L0,10 z', fill: { ink: C.muted, faint: '#c9cfda', accent: C.accent, good: C.good, bad: C.bad }[n] })); defs.append(m); }); svg.append(defs);
  lanes.forEach((ln, i) => {
    const y = top + i * rowH, used = M.lanesUsed.includes(ln.id), temp = ln.id === 'browser', perm = ['repo', 'ci', 'site'].includes(ln.id);
    svg.append(s('rect', { x: 2, y: y + 2, width: W - 4, height: rowH - 4, rx: 8, fill: temp ? C.temp : perm ? C.perm : '#f7f9fc', stroke: C.line, 'stroke-dasharray': used ? '' : '4 3' }));
    const note = LANE_NOTE[ln.id] && (mid ? LANE_NOTE[ln.id].split(' · ')[0] : LANE_NOTE[ln.id]);
    svg.append(s('text', { x: 10, y: y + rowH / 2 - (note ? 3 : -4), 'font-size': mid ? 11 : 12, 'font-weight': 600, fill: used ? C.ink : C.muted }, mid ? ln.label.replace('Lab on claude.ai', 'Lab (claude.ai)').replace('GitHub Actions', 'GitHub Actions') : ln.label));
    if (note) svg.append(s('text', { x: 10, y: y + rowH / 2 + 12, 'font-size': 10.5, fill: temp ? C.hi : C.muted }, note));
  });
  const pos = st => ({ x: labelW + colOf(st) * colW + 5, y: top + rowOf(st.lane) * rowH + (rowH - boxH) / 2 });
  const link = (a, b, kind) => {
    const p = pos(a), q = pos(b), x1 = p.x + boxW, y1 = p.y + boxH / 2, x2 = q.x, y2 = q.y + boxH / 2, mx = (x1 + x2) / 2;
    const col = { faint: '#c9cfda', accent: C.accent, good: C.good, bad: C.bad, ink: C.muted }[kind];
    svg.append(s('path', { d: y1 === y2 ? `M${x1},${y1} L${x2 - 2},${y2}` : `M${x1},${y1} L${mx},${y1} L${mx},${y2} L${x2 - 2},${y2}`, fill: 'none', stroke: col, 'stroke-width': kind === 'faint' ? 1.2 : 2, 'stroke-dasharray': kind === 'faint' ? '4 3' : '', 'marker-end': `url(#ar-${kind})` }));
  };
  // the other way, faint, from Export lesson
  const exp = M.steps[3];
  let prev = exp;
  for (const st of M.other.steps) { link(prev, st, 'faint'); prev = st; }
  for (const st of M.other.steps) {
    const p = pos(st); svg.append(s('rect', { x: p.x, y: p.y, width: boxW, height: boxH, rx: 7, fill: '#fff', stroke: '#c9cfda', 'stroke-dasharray': '4 3' }));
    wrapText(st.title, Math.max(8, Math.floor(boxW / 6.2))).forEach((ln, j) => svg.append(s('text', { x: p.x + boxW / 2, y: p.y + 15 + j * 12, 'font-size': 10.5, 'text-anchor': 'middle', fill: '#9aa3b2' }, ln)));
  }
  const ol = pos(M.other.steps[0]); svg.append(s('text', { x: ol.x + boxW / 2, y: ol.y + boxH - 5, 'font-size': 9.5, 'font-style': 'italic', 'text-anchor': 'middle', fill: '#9aa3b2' }, 'the other way'));
  // the chosen way
  M.steps.forEach((st, i) => { if (i) link(M.steps[i - 1], st, i <= k ? (st.bad ? 'bad' : i === k && !done ? 'accent' : 'good') : 'ink'); });
  M.steps.forEach((st, i) => {
    const p = pos(st), now = i === k && !done, past = i < k || done, outcome = st.id === 'outcome';
    const stroke = now ? C.accent : past ? (st.bad ? C.bad : C.good) : C.line, fill = now ? C.tint : past ? (st.bad ? C.badTint : C.goodTint) : '#fff';
    svg.append(s('rect', { x: p.x, y: p.y, width: boxW, height: boxH, rx: 7, fill, stroke, 'stroke-width': now || outcome ? 2 : 1.4 }));
    const title = outcome && past ? (st.bad ? '✗ ' : '✓ ') + st.title : st.title;
    const fs = boxW < 84 ? 10 : 11, lh = fs + 1.5, lines = wrapText(title, Math.max(7, Math.floor(boxW / (fs * 0.58))));
    lines.forEach((ln, j) => svg.append(s('text', { x: p.x + boxW / 2, y: p.y + fs + 3 + j * lh, 'font-size': fs, 'font-weight': 600, 'text-anchor': 'middle', fill: C.ink }, ln)));
    if (!outcome && boxH - 14 - lines.length * lh > 8) svg.append(s('text', { x: p.x + boxW / 2, y: p.y + boxH - 6, 'font-size': 10, 'text-anchor': 'middle', fill: now ? C.accent : C.muted }, fmtMin(st.min)));
  });
  return svg;
}
function renderNarrow(k, done) {
  const box = document.createElement('div'); box.style.cssText = 'padding:4px 12px;display:flex;flex-direction:column;gap:4px;font-size:12px';
  M.steps.forEach((st, i) => {
    const now = i === k && !done, past = i < k || done, ln = M.lanes.find(l => l.id === st.lane);
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;align-items:center;padding:4px 8px;border-radius:7px;border:1.5px solid ' + (now ? C.accent : past ? (st.bad ? C.bad : C.good) : C.line) + ';background:' + (now ? C.tint : past ? (st.bad ? C.badTint : C.goodTint) : '#fff');
    const chip = document.createElement('span'); chip.textContent = ln.label; chip.style.cssText = 'flex:none;width:96px;font-size:10.5px;color:' + (st.lane === 'browser' ? C.hi : C.muted);
    const t = document.createElement('span'); t.style.cssText = 'flex:1;font-weight:600;color:' + C.ink; t.textContent = (st.id === 'outcome' && past ? (st.bad ? '✗ ' : '✓ ') : '') + st.title;
    const mm = document.createElement('span'); mm.style.cssText = 'flex:none;color:' + C.muted + ';font-size:11px'; mm.textContent = st.id === 'outcome' ? '' : fmtMin(st.min);
    row.append(chip, t, mm); box.append(row);
  });
  const other = document.createElement('div'); other.style.cssText = 'color:#8a93a3;font-size:11px;padding:2px 2px 0';
  other.textContent = 'The other way: ' + M.other.steps.map(st => st.title).join(' → ') + (M.route === 'import' ? ' (' + fmtMin(M.publishMinutes) + ', for everyone)' : ' (' + fmtMin(M.importMinutes) + ', one browser)');
  box.append(other);
  return box;
}
function renderFoot(k, done) {
  const narrow = wrap.clientWidth < 640, reached = done || k === M.steps.length - 1;
  foot.innerHTML = '';
  const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:6px;flex-wrap:' + (narrow ? 'wrap' : 'nowrap');
  M.viewerResults.forEach((v, i) => {
    const card = document.createElement('div'), sel = i === M.viewer;
    card.style.cssText = 'flex:1 1 ' + (narrow ? '100%' : '0') + ';min-width:0;padding:5px 9px;border-radius:8px;font-size:12px;border:' + (sel ? '2px solid ' + C.accent : '1px solid ' + C.line) + ';background:' + (!reached ? '#fff' : v.sees ? C.goodTint : C.badTint);
    const b = document.createElement('b'); b.textContent = v.label + (sel ? ' (chosen)' : '');
    const r = document.createElement('div'); r.style.color = !reached ? C.muted : v.sees ? C.good : C.bad; r.style.fontWeight = '600';
    r.textContent = !reached ? 'waiting for the last step…' : v.sees ? '✓ sees it' : '✗ does not see it';
    card.append(b, narrow ? document.createTextNode(' · ') : document.createElement('br'), r); if (narrow) { r.style.display = 'inline'; }
    row.append(card);
  });
  foot.append(row);
}
function render() {
  if (!M || !stage) return;
  const W = stage.clientWidth, H = stage.clientHeight, narrow = wrap.clientWidth < 640, k = current(), done = simT >= M.duration - 0.05, st = M.steps[k];
  stage.innerHTML = '';
  stage.append(narrow ? renderNarrow(k, done) : renderWide(W, H, k, done));
  head.querySelector('.sub').textContent = done ? M.summary : st.title + ': ' + st.note;
  const lasts = M.route === 'import' ? 'one browser, until cleared' : M.ciPass ? 'for everyone, permanently' : 'nothing published';
  const stats = narrow ? [['Minutes', st.endMin.toFixed(1)]] : [['Minutes so far', st.endMin.toFixed(1)], ['Shows after', fmtMin(M.shownAtMin)], ['Lasts', lasts]];
  head.querySelector('.stats').innerHTML = stats.map(([kk, v]) => '<span style="display:inline-block;margin:0 0 4px 6px;padding:3px 8px;border-radius:8px;background:#f4f6f9;font-size:11.5px;color:#5b6475;white-space:nowrap">' + kk + ' <b style="color:#1d2433">' + v + '</b></span>').join('');
  renderFoot(k, done);
}

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  seek(t) { simT = t; const key = current() + '|' + (t >= M.duration - 0.05); if (key !== lastKey) { lastKey = key; render(); } },
  mount(root, params) {
    M = model(params); simT = 0; lastKey = '';
    wrap = document.createElement('div'); wrap.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;background:#fff;font-family:system-ui,sans-serif;color:#1d2433';
    head = document.createElement('div'); head.style.cssText = 'flex:none;padding:8px 14px 4px;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:flex-start';
    head.innerHTML = '<div style="flex:1 1 300px;min-width:0"><div style="font-size:14px;font-weight:600">From the lab to the gallery · where the lesson lives</div><div class="sub" style="font-size:12px;line-height:1.35;color:#5b6475;min-height:32px"></div></div><div class="stats" style="flex:0 1 auto;text-align:right"></div>';
    stage = document.createElement('div'); stage.style.cssText = 'position:relative;flex:1;min-height:0;overflow:hidden';
    foot = document.createElement('div'); foot.style.cssText = 'flex:none;padding:6px 12px 8px;border-top:1px solid #e3e7ee;background:#fafbfc';
    wrap.append(head, stage, foot); root.append(wrap);
    render();
    ro = new ResizeObserver(() => requestAnimationFrame(render)); ro.observe(stage);
  },
  update(params) { M = model(params); simT = 0; lastKey = ''; render(); },
  destroy() { if (ro) ro.disconnect(); if (wrap) wrap.remove(); wrap = stage = head = foot = null; M = null; }
};

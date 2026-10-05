// Plain SVG cohort grid: one row per adoption month, one column per month since adoption (two before, six from),
// each cell the cohort's mean change against its baseline, coloured green when better. The clock runs the calendar:
// a cell appears when its calendar month arrives, so the grid fills as a staircase and the step shows in every row.
const NS = 'http://www.w3.org/2000/svg', FONT = 'system-ui, -apple-system, sans-serif';
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d', bad: '#b42318', soft: '#f4f6f9', faint: '#9aa3b2' };
let M = null, root = null, wrap = null, head = null, svg = null, foot = null, ro = null, lastT = 0, lastKey = '';
function el(tag, attrs, parent) { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; }
function txt(parent, x, y, s, o) { o = o || {}; const n = el('text', { x, y, 'font-size': o.fs || 12, 'font-weight': o.wt || 400, fill: o.fill || C.ink, 'text-anchor': o.anchor || 'start', 'font-family': FONT }, parent); n.textContent = s; return n; }
const mix = (a, b, f) => { const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16)); return 'rgb(' + pa.map((v, i) => Math.round(v + (pb[i] - v) * f)).join(',') + ')'; };
function cellColor(pct, scale) { if (pct === null) return C.soft; const f = Math.min(1, Math.abs(pct) / scale); return pct <= 0 ? mix('#ffffff', '#1f7a4d', 0.12 + 0.75 * f) : mix('#ffffff', '#b42318', 0.12 + 0.75 * f); }

function draw() {
  if (!svg) return;
  const W = wrap.clientWidth, H = Math.max(120, svg.clientHeight), narrow = W < 560, t = lastT, done = t >= M.duration - 0.05;
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const month = done ? M.monthsTotal : Math.min(M.monthsTotal, Math.floor(t / M.duration * M.monthsTotal) + 1); // calendar month on the clock
  const left = narrow ? 64 : 150, topY = 46, rowH = Math.min(narrow ? 40 : 52, (H - topY - 40) / (M.cohorts.length + 1)), colW = (W - left - 12) / M.ks.length;
  const scale = Math.max(10, M.effect + 10);
  txt(svg, left - 6, 18, narrow ? 'Adopted' : 'Cohort (month adopted)', { fs: 11, wt: 600, fill: C.muted, anchor: 'end' });
  txt(svg, left + colW * M.ks.length / 2, 18, narrow ? 'Months since adoption' : 'Months since adoption · cell = mean change in cycle time vs the cohort\'s baseline', { fs: 11, wt: 600, fill: C.muted, anchor: 'middle' });
  M.ks.forEach((k, j) => txt(svg, left + j * colW + colW / 2, 36, (k > 0 ? '+' : '') + k, { fs: 11, fill: k === 0 ? C.hi : C.muted, wt: k === 0 ? 700 : 400, anchor: 'middle' }));
  // adoption column marker
  const j0 = M.ks.indexOf(0);
  el('rect', { x: left + j0 * colW, y: topY - 4, width: colW, height: rowH * M.cohorts.length + 8, rx: 6, fill: 'none', stroke: C.hi, 'stroke-dasharray': '4 3' }, svg);
  M.cohorts.forEach((c, r) => {
    const y = topY + r * rowH;
    txt(svg, left - 6, y + rowH / 2 - (narrow ? 0 : 4), c.label + (narrow ? '' : ' · ' + c.size + (c.size === 1 ? ' team' : ' teams')), { fs: narrow ? 11 : 12, wt: 600, anchor: 'end', fill: c.month <= month ? C.ink : C.faint });
    if (!narrow) txt(svg, left - 6, y + rowH / 2 + 10, c.teams.join(', '), { fs: 10, fill: C.muted, anchor: 'end' });
    c.cells.forEach((cell, j) => {
      const x = left + j * colW, cal = c.month + cell.k, shown = cell.pct !== null && cal >= 1 && cal <= month;
      el('rect', { x: x + 2, y: y + 2, width: colW - 4, height: rowH - 4, rx: 4, fill: shown ? cellColor(cell.pct, scale) : (cell.pct === null || cal < 1 ? '#fff' : C.soft), stroke: shown ? 'none' : C.line, 'stroke-dasharray': shown ? 'none' : '3 3' }, svg);
      if (shown) txt(svg, x + colW / 2, y + rowH / 2 + 4, (cell.pct > 0 ? '+' : '') + Math.round(cell.pct) + '%', { fs: narrow ? 9.5 : 11, wt: cell.k >= 1 ? 600 : 400, anchor: 'middle', fill: Math.abs(cell.pct) / scale > 0.55 ? '#fff' : C.ink });
    });
  });
  // summary row: mean over the cohorts that have reached that column
  const y = topY + M.cohorts.length * rowH + 6;
  el('line', { x1: left - 4, x2: W - 12, y1: y - 3, y2: y - 3, stroke: C.line }, svg);
  txt(svg, left - 6, y + rowH / 2 + 4, narrow ? 'All' : 'All cohorts', { fs: 12, wt: 700, anchor: 'end' });
  M.ks.forEach((k, j) => {
    const vals = M.cohorts.map(c => ({ c, cell: c.cells[j] })).filter(d => d.cell.pct !== null && d.c.month + k >= 1 && d.c.month + k <= month);
    if (!vals.length) return;
    const n = vals.reduce((a, d) => a + d.c.size, 0), pct = vals.reduce((a, d) => a + d.cell.pct * d.c.size, 0) / n;
    el('rect', { x: left + j * colW + 2, y: y + 2, width: colW - 4, height: rowH - 4, rx: 4, fill: cellColor(pct, scale), stroke: C.ink, 'stroke-width': 0.8 }, svg);
    txt(svg, left + j * colW + colW / 2, y + rowH / 2 + 4, (pct > 0 ? '+' : '') + Math.round(pct) + '%', { fs: narrow ? 9.5 : 11, wt: 700, anchor: 'middle', fill: Math.abs(pct) / scale > 0.55 ? '#fff' : C.ink });
  });
  caption(month, done, narrow);
}
function caption(month, done, narrow) {
  const reached = M.cohorts.filter(c => c.month <= month).length;
  head.querySelector('.sub').textContent = done ? M.summary + ' Every cohort steps down at month 0 and stays down: the change travelled with the method, not with one team.' : 'Calendar month ' + month + ' of ' + M.monthsTotal + ': ' + reached + ' of ' + M.cohorts.length + ' cohorts have adopted. Cells appear as their month arrives; the dashed column is the adoption month.';
  const stats = narrow ? [['Month', month + '/' + M.monthsTotal], ['Pooled', M.pooled + ' %']] : [['Calendar month', month + ' of ' + M.monthsTotal], ['Cohorts adopted', reached + ' of ' + M.cohorts.length], ['Pooled change', M.pooled + ' % ± ' + M.pooledMargin], ['Teams', String(M.teams)]];
  head.querySelector('.stats').innerHTML = stats.map(([kk, v]) => '<span style="display:inline-block;margin:0 0 4px 6px;padding:3px 8px;border-radius:8px;background:#f4f6f9;font-size:11.5px;color:#5b6475;white-space:nowrap">' + kk + ' <b style="color:#1d2433">' + v + '</b></span>').join('');
  foot.textContent = narrow ? 'Green: faster than the cohort\'s own baseline. Red: slower. Columns −2 and −1 are before adoption.' : 'Rows: the teams that adopted in the same month. Columns: months since adoption (−2 and −1 are before). Green: faster than the cohort\'s own baseline; red: slower. The bottom row pools the cohorts that have reached that column.';
}

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  seek(t) { lastT = t; const key = Math.floor(t / M.duration * M.monthsTotal) + '|' + (t >= M.duration - 0.05); if (key !== lastKey) { lastKey = key; draw(); } },
  mount(r, params) {
    root = r; M = model(params); lastT = 0; lastKey = '';
    wrap = document.createElement('div'); wrap.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;background:#fff;font-family:system-ui,sans-serif;color:#1d2433';
    head = document.createElement('div'); head.style.cssText = 'flex:none;padding:8px 14px 2px;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:flex-start';
    head.innerHTML = '<div style="flex:1 1 280px;min-width:0"><div style="font-size:14px;font-weight:600">Before and after · the rollout as cohorts</div><div class="sub" style="font-size:12px;line-height:1.35;color:#5b6475;min-height:32px"></div></div><div class="stats" style="flex:0 1 auto;text-align:right"></div>';
    const box = document.createElement('div'); box.style.cssText = 'flex:1;min-height:0;position:relative';
    svg = el('svg', { style: 'display:block;width:100%;height:100%' }, box);
    foot = document.createElement('div'); foot.style.cssText = 'flex:none;height:48px;box-sizing:border-box;padding:6px 14px;font:12px/1.4 system-ui,sans-serif;color:#5b6475;border-top:1px solid #e3e7ee;background:#fafbfc;overflow:auto';
    wrap.append(head, box, foot); root.append(wrap);
    draw();
    ro = new ResizeObserver(() => requestAnimationFrame(() => { if (svg && M) draw(); })); ro.observe(box);
  },
  update(params) { M = model(params); lastT = 0; lastKey = ''; draw(); },
  destroy() { if (ro) ro.disconnect(); if (wrap) wrap.remove(); wrap = null; svg = null; M = null; }
};

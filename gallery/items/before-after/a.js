// D3 slope chart: cycle time before and after per team as two columns joined by a line, with the pooled change as a
// thick line. The clock adds the before dots, draws the slopes, then recolours them by whether the change clears zero.
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d', bad: '#b42318', soft: '#f4f6f9', faint: '#9aa3b2' };
const FONT = 'system-ui, -apple-system, sans-serif';
let M = null, wrap = null, head = null, svg = null, foot = null, ro = null, lastT = 0, lastKey = '';
const clamp01 = v => Math.max(0, Math.min(1, v));
const st = id => M.steps.find(s => s.id === id).t;

function draw() {
  if (!svg) return;
  const W = wrap.clientWidth, H = Math.max(120, svg.node().clientHeight), narrow = W < 560, t = lastT, done = t >= M.duration - 0.05;
  svg.attr('width', W).attr('height', H).selectAll('*').remove();
  const left = narrow ? 78 : 150, right = narrow ? 70 : 150, top = 30, bottom = 16;
  const x0 = left, x1 = W - right, ys = M.list.flatMap(tm => [tm.before, tm.after]);
  const y = d3.scaleLinear().domain([Math.min(...ys) * 0.9, Math.max(...ys) * 1.05]).range([H - bottom, top]);
  const phase = t >= st('ranges') ? 2 : t >= st('after') ? 1 : 0;
  // column heads
  [[x0, 'Before'], [x1, 'After']].forEach(([x, s]) => { svg.append('text').attr('x', x).attr('y', 16).attr('text-anchor', 'middle').attr('font-family', FONT).attr('font-size', 12).attr('font-weight', 600).attr('fill', C.muted).text(s); svg.append('line').attr('x1', x).attr('x2', x).attr('y1', top - 4).attr('y2', H - bottom).attr('stroke', C.line); });
  svg.append('text').attr('x', (x0 + x1) / 2).attr('y', 16).attr('text-anchor', 'middle').attr('font-family', FONT).attr('font-size', 11).attr('fill', C.faint).text(narrow ? 'cycle time, days' : 'cycle time in days, a mean of ' + M.n + ' measurements per team');
  // Label collision: nudge labels apart in each column
  const place = (vals, minGap) => { const idx = vals.map((v, i) => [y(v), i]).sort((a, b) => a[0] - b[0]); const out = []; let last = -Infinity; idx.forEach(([py, i]) => { const yy = Math.max(py, last + minGap); out[i] = yy; last = yy; });
    const over = last - (H - bottom); if (over > 0) idx.forEach(([, i]) => { out[i] -= over; }); return out; };
  const lBefore = place(M.list.map(tm => tm.before), 13), lAfter = place(M.list.map(tm => tm.after), 13);
  // Pooled line
  const meanB = M.list.reduce((a, tm) => a + tm.before, 0) / M.teams, meanA = M.list.reduce((a, tm) => a + tm.after, 0) / M.teams;
  M.list.forEach((tm, i) => {
    const inB = clamp01((t - 0.3 - i * 0.25) / 0.3); if (inB <= 0) return;
    const f = phase >= 1 ? clamp01((t - st('after') - 0.2 - i * 0.18) / 0.5) : 0;
    const col = phase >= 2 ? (tm.clear ? C.good : tm.looksWorse ? C.bad : C.faint) : C.accent, wgt = phase >= 2 && tm.clear ? 2.2 : 1.4;
    const g = svg.append('g').attr('opacity', inB);
    g.append('circle').attr('cx', x0).attr('cy', y(tm.before)).attr('r', 3.5).attr('fill', col);
    g.append('text').attr('x', x0 - 8).attr('y', lBefore[i] + 4).attr('text-anchor', 'end').attr('font-family', FONT).attr('font-size', narrow ? 10 : 11).attr('fill', C.ink).text((narrow ? '' : tm.name + ' · ') + tm.before.toFixed(1));
    if (f > 0) {
      g.append('line').attr('x1', x0).attr('y1', y(tm.before)).attr('x2', x0 + (x1 - x0) * f).attr('y2', y(tm.before) + (y(tm.after) - y(tm.before)) * f).attr('stroke', col).attr('stroke-width', wgt);
      if (f >= 1) { g.append('circle').attr('cx', x1).attr('cy', y(tm.after)).attr('r', 3.5).attr('fill', col);
        g.append('text').attr('x', x1 + 8).attr('y', lAfter[i] + 4).attr('font-family', FONT).attr('font-size', narrow ? 10 : 11).attr('fill', phase >= 2 ? col : C.ink).attr('font-weight', phase >= 2 && tm.clear ? 600 : 400)
          .text(tm.after.toFixed(1) + (narrow ? '' : ' · ' + (tm.change > 0 ? '+' : '') + tm.change + ' %' + (phase >= 2 ? ' ± ' + tm.margin : ''))); }
    }
  });
  if (phase >= 1 && t >= st('after') + 1.5) {
    const g = svg.append('g').attr('opacity', clamp01((t - st('after') - 1.5) / 0.5));
    g.append('line').attr('x1', x0).attr('y1', y(meanB)).attr('x2', x1).attr('y2', y(meanA)).attr('stroke', C.hi).attr('stroke-width', 3.5).attr('stroke-opacity', 0.85);
    g.append('text').attr('x', (x0 + x1) / 2).attr('y', y((meanB + meanA) / 2) - 8).attr('text-anchor', 'middle').attr('font-family', FONT).attr('font-size', 11.5).attr('font-weight', 700).attr('fill', C.hi).attr('paint-order', 'stroke').attr('stroke', '#fff').attr('stroke-width', 4)
      .text('all teams ' + M.pooled + ' %' + (phase >= 2 ? ' ± ' + M.pooledMargin : ''));
  }
  caption(done, narrow, phase);
}
function caption(done, narrow, phase) {
  let k = 0; M.steps.forEach((s, i) => { if (s.t <= lastT + 1e-6) k = i; });
  const s = M.steps[k];
  head.querySelector('.sub').textContent = done ? M.summary : s.title + ': ' + s.note;
  const stats = narrow ? [['Pooled', M.pooled + ' %'], ['Clear zero', M.clearCount + '/' + M.teams]] : [['Pooled change', M.pooled + ' % ± ' + M.pooledMargin], ['Teams clear zero', M.clearCount + ' of ' + M.teams], ['Look worse', String(M.worseCount)], ['n per team', String(M.n)]];
  head.querySelector('.stats').innerHTML = stats.map(([kk, v]) => '<span style="display:inline-block;margin:0 0 4px 6px;padding:3px 8px;border-radius:8px;background:#f4f6f9;font-size:11.5px;color:#5b6475;white-space:nowrap">' + kk + ' <b style="color:#1d2433">' + v + '</b></span>').join('');
  foot.textContent = phase >= 2 ? 'Green: the 95 % range excludes zero. Grey: it does not. Red: the change points the wrong way. Orange: all teams pooled.' : phase === 1 ? 'One line per team, before to after. The orange line is every team pooled.' : 'One dot per team: its mean cycle time before the rollout.';
}

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  seek(t) { lastT = t; const key = Math.round(t * 20) + '|' + (t >= M.duration - 0.05); if (key !== lastKey) { lastKey = key; draw(); } },
  mount(root, params) {
    M = model(params); lastT = 0; lastKey = '';
    wrap = document.createElement('div'); wrap.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;background:#fff;font-family:system-ui,sans-serif;color:#1d2433';
    head = document.createElement('div'); head.style.cssText = 'flex:none;padding:8px 14px 2px;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:flex-start';
    head.innerHTML = '<div style="flex:1 1 280px;min-width:0"><div style="font-size:14px;font-weight:600">Before and after · a slope per team</div><div class="sub" style="font-size:12px;line-height:1.35;color:#5b6475;min-height:32px"></div></div><div class="stats" style="flex:0 1 auto;text-align:right"></div>';
    const box = document.createElement('div'); box.style.cssText = 'flex:1;min-height:0;position:relative';
    svg = d3.select(box).append('svg').style('display', 'block').style('width', '100%').style('height', '100%');
    foot = document.createElement('div'); foot.style.cssText = 'flex:none;height:44px;box-sizing:border-box;padding:6px 14px;font:12px/1.4 system-ui,sans-serif;color:#5b6475;border-top:1px solid #e3e7ee;background:#fafbfc;overflow:auto';
    wrap.append(head, box, foot); root.append(wrap);
    draw();
    ro = new ResizeObserver(() => requestAnimationFrame(() => { if (svg && M) draw(); })); ro.observe(box);
  },
  update(params) { M = model(params); lastT = 0; lastKey = ''; draw(); },
  destroy() { if (ro) ro.disconnect(); if (wrap) wrap.remove(); wrap = null; svg = null; M = null; }
};

// Plotly waterfall: the context window as a running total. Every turn adds its tokens (a rising green step), every
// compaction removes most of them (a falling orange step), and the limit is a red line the total must stay under.
// Plotly's waterfall trace does the cumulative bookkeeping; seek(t) hands it the steps that have happened so far.
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d', bad: '#b42318', soft: '#f4f6f9' };
let M = null, wrap = null, head = null, plot = null, foot = null, ro = null, lastT = 0, lastKey = '', drawn = false;
const k = v => (v / 1000).toFixed(v >= 100000 ? 0 : 1) + 'k';

function steps() {
  // one step per turn: the compaction (if any) first, then the turn's own tokens; a final total
  const out = [];
  M.records.forEach(r => {
    if (r.compacted) { const drop = r.before + r.size - r.after; out.push({ x: 'C' + (M.compactions.findIndex(c => c.turn === r.turn) + 1), y: -drop, turn: r.turn, kind: 'compact', label: 'compaction before turn ' + r.turn + ': −' + k(drop) }); }
    out.push({ x: 'T' + r.turn, y: r.size, turn: r.turn, kind: 'turn', label: 'turn ' + r.turn + ': +' + k(r.size) });
  });
  return out;
}
function currentTurn() { let e = M.events[0]; for (const ev of M.events) if (ev.start <= lastT + 1e-6) e = ev; return e; }
function build() {
  const narrow = wrap.clientWidth < 600, done = lastT >= M.duration - 0.05, e = currentTurn(), all = steps();
  const shown = all.filter(s => done || s.turn < e.turn || (s.turn === e.turn && (e.type === 'turn' || s.kind === 'compact')));
  const base = M.sysTokens;
  const traces = [{ type: 'waterfall', orientation: 'v', x: ['system'].concat(shown.map(s => s.x)).concat(done ? ['now'] : []), y: [base].concat(shown.map(s => s.y)).concat(done ? [0] : []),
    measure: ['absolute'].concat(shown.map(() => 'relative')).concat(done ? ['total'] : []),
    increasing: { marker: { color: C.good } }, decreasing: { marker: { color: C.hi } }, totals: { marker: { color: C.ink } }, connector: { line: { color: C.line, width: 1, dash: 'dot' } },
    text: shown.length ? [''].concat(shown.map(s => s.kind === 'compact' ? '−' + k(-s.y) : '')).concat(done ? [k(M.finalUsed)] : []) : [''], textposition: 'outside', textfont: { size: narrow ? 9 : 10.5, color: C.ink }, cliponaxis: false,
    hovertext: ['system instructions ' + k(base)].concat(shown.map(s => s.label)).concat(done ? ['on the desk now: ' + k(M.finalUsed)] : []), hoverinfo: 'text' }];
  const shapes = [{ type: 'line', xref: 'paper', x0: 0, x1: 1, y0: M.limit, y1: M.limit, line: { color: C.bad, width: 1.5, dash: 'dash' } }, { type: 'line', xref: 'paper', x0: 0, x1: 1, y0: M.threshold, y1: M.threshold, line: { color: C.hi, width: 1, dash: 'dot' } }];
  const annotations = [{ xref: 'paper', x: 0, y: M.limit, xanchor: 'left', yanchor: 'bottom', text: 'limit ' + k(M.limit), showarrow: false, font: { size: 10.5, color: C.bad } }, { xref: 'paper', x: 1, y: M.threshold, xanchor: 'right', yanchor: 'top', text: 'compaction at ' + k(M.threshold), showarrow: false, font: { size: 10, color: C.hi } }];
  const layout = { width: Math.max(200, plot.clientWidth), height: Math.max(120, plot.clientHeight), autosize: false, margin: { l: narrow ? 42 : 56, r: 10, t: 10, b: narrow ? 40 : 34 }, paper_bgcolor: '#fff', plot_bgcolor: '#fff',
    font: { family: 'system-ui, sans-serif', size: narrow ? 10 : 11.5, color: C.ink }, showlegend: false, shapes, annotations,
    xaxis: { type: 'category', tickfont: { size: narrow ? 8.5 : 10 }, tickangle: narrow ? -60 : 0, fixedrange: true, title: { text: 'turns (T) and compactions (C)', font: { size: 10.5, color: C.muted } } },
    yaxis: { range: [0, M.limit * 1.1], tickvals: [0, 50000, 100000, 150000, 200000], ticktext: ['0', '50k', '100k', '150k', '200k'], gridcolor: '#eef1f5', zeroline: false, fixedrange: true, title: { text: 'tokens on the desk', font: { size: 10.5, color: C.muted } } } };
  const cfg = { responsive: false, displaylogo: false, displayModeBar: false };
  if (!drawn) { Plotly.newPlot(plot, traces, layout, cfg); drawn = true; } else Plotly.react(plot, traces, layout, cfg);
  caption(e, done, narrow, shown);
}
function caption(e, done, narrow, shown) {
  const used = M.sysTokens + shown.reduce((a, s) => a + s.y, 0), comps = shown.filter(s => s.kind === 'compact').length;
  head.querySelector('.sub').textContent = done ? M.summary : e.type === 'compact' ? 'Compaction ' + (comps) + ' before turn ' + e.turn + ': the oldest turns fold into a summary and the desk clears.' : 'Turn ' + e.turn + ' of ' + M.turnsN + ': ' + k(M.turns[e.turn - 1].total) + ' tokens land on the desk (' + k(M.turns[e.turn - 1].tool) + ' of them tool results).';
  const stats = narrow ? [['On the desk', k(used)], ['Compactions', String(comps)]] : [['On the desk', k(used) + ' of ' + k(M.limit)], ['Compactions', String(comps)], ['Peak', k(M.peakUsed)], ['Tool size', M.large ? 'large' : 'small']];
  head.querySelector('.stats').innerHTML = stats.map(([kk, v]) => '<span style="display:inline-block;margin:0 0 4px 6px;padding:3px 8px;border-radius:8px;background:#f4f6f9;font-size:11.5px;color:#5b6475;white-space:nowrap">' + kk + ' <b style="color:' + (kk === 'On the desk' && used > M.threshold ? C.hi : C.ink) + '">' + v + '</b></span>').join('');
  foot.textContent = done ? (narrow ? 'Rises are turns, falls are compactions. ' + M.summary : 'Every rise is a turn, every fall a compaction. The falls are where facts get lost: ' + M.summary) : (narrow ? 'At the dotted line the oldest turns fold into a summary (an orange drop).' : 'The running total is what the model can see. When it reaches the dotted line the oldest turns are folded into a summary (an orange drop), and anything not in the summary is gone.');
  foot.style.background = done ? '#fbefe8' : '#fafbfc';
}

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  seek(t) { lastT = t; const e = currentTurn(), key = e.type + e.turn + '|' + (t >= M.duration - 0.05); if (key !== lastKey) { lastKey = key; if (drawn) build(); } },
  mount(root, params) {
    M = model(params); lastT = 0; lastKey = ''; drawn = false;
    wrap = document.createElement('div'); wrap.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;background:#fff;font-family:system-ui,sans-serif;color:#1d2433';
    head = document.createElement('div'); head.style.cssText = 'flex:none;padding:8px 14px 2px;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:flex-start';
    head.innerHTML = '<div style="flex:1 1 280px;min-width:0"><div style="font-size:14px;font-weight:600">The context window · tokens as a running total</div><div class="sub" style="font-size:12px;line-height:1.35;color:#5b6475;min-height:32px"></div></div><div class="stats" style="flex:0 1 auto;text-align:right"></div>';
    plot = document.createElement('div'); plot.style.cssText = 'flex:1;min-height:0;width:100%';
    foot = document.createElement('div'); foot.style.cssText = 'flex:none;height:' + (root.clientWidth < 600 ? 52 : 48) + 'px;box-sizing:border-box;padding:6px 14px;font:12.5px/1.4 system-ui,sans-serif;border-top:1px solid #e3e7ee;background:#fafbfc;overflow:auto';
    wrap.append(head, plot, foot); root.append(wrap);
    build();
    ro = new ResizeObserver(() => requestAnimationFrame(() => { if (plot && drawn) build(); })); ro.observe(plot);
  },
  update(params) { M = model(params); lastT = 0; lastKey = ''; build(); },
  destroy() { if (ro) ro.disconnect(); if (plot && drawn) Plotly.purge(plot); if (wrap) wrap.remove(); wrap = null; plot = null; M = null; drawn = false; }
};

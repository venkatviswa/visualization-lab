// Plotly waterfall: where the minutes go, from git push to deploy, one floating bar per stretch of real time, each
// starting where the previous one ended. Work on the runner is green, waiting is orange, a failing step red; a final
// bar is the total. Built from Plotly bar traces with a base, so every bar keeps its own colour and label.
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d', bad: '#b42318', soft: '#f4f6f9', skip: '#c3cad6' };
let M = null, wrap = null, head = null, plot = null, foot = null, ro = null, lastT = 0, lastKey = '', drawn = false;
const fmt = s => s >= 60 ? Math.floor(s / 60) + ' min ' + String(Math.round(s % 60)).padStart(2, '0') + ' s' : Math.round(s) + ' s';

function segments() {
  // Every stretch between two consecutive events is one segment, labelled by what was happening
  const out = []; let runNo = 0;
  M.events.forEach((e, k) => {
    const nx = M.events[k + 1]; if (!nx) return;
    const sec = (nx.realMs - e.realMs) / 1000; if (sec <= 0) return;
    let label, kind;
    if (e.kind === 'run') { const st = M.steps.find(s => s.id === e.step); label = (runNo ? 'Run 2 · ' : '') + st.name; kind = st.status === 'failed' && !M.events.slice(k + 1).some(x => x.kind === 'run') ? 'failed' : 'work'; }
    else if (e.kind === 'event') { label = runNo ? 'Second run queued' : 'Runner queue'; kind = 'wait'; }
    else if (e.kind === 'green') { label = 'Waiting for a reviewer'; kind = 'wait'; }
    else if (e.kind === 'merge') { label = 'Merge to main'; kind = 'wait'; runNo = 1; }
    else if (e.kind === 'push') { label = 'git push'; kind = 'wait'; }
    else if (e.kind === 'red') { label = 'Job stopped'; kind = 'failed'; }
    else { label = e.kind; kind = 'wait'; }
    out.push({ label, kind, sec, at: e.start, i: e.i });
  });
  return out;
}
function build() {
  const narrow = wrap.clientWidth < 600, done = lastT >= M.duration - 0.05, segs = segments();
  const shown = segs.filter(s => s.at <= lastT + 1e-6 || done);
  let cum = 0; const bars = shown.map(s => { const b = { ...s, base: cum }; cum += s.sec; return b; });
  const total = segs.reduce((a, s) => a + s.sec, 0), colour = k => k === 'work' ? C.good : k === 'failed' ? C.bad : C.hi;
  const ys = bars.map(b => b.label).concat(done ? ['Total'] : []);
  const traces = [{ type: 'bar', orientation: 'h', y: ys, x: bars.map(b => b.sec).concat(done ? [total] : []), base: bars.map(b => b.base).concat(done ? [0] : []),
    marker: { color: bars.map(b => colour(b.kind)).concat(done ? [C.ink] : []), line: { width: 0 } }, width: 0.7,
    text: bars.map(b => fmt(b.sec)).concat(done ? [fmt(total)] : []), textposition: 'outside', textfont: { size: narrow ? 9.5 : 11, color: C.ink }, cliponaxis: false,
    hovertemplate: '%{y}: %{text}<extra></extra>' }];
  // connectors from the end of one bar to the start of the next
  const shapes = bars.slice(1).map((b, i) => ({ type: 'line', x0: b.base, x1: b.base, y0: i, y1: i + 1, line: { color: C.line, width: 1, dash: 'dot' } }));
  const layout = { width: Math.max(200, plot.clientWidth), height: Math.max(120, plot.clientHeight), autosize: false, margin: { l: narrow ? 120 : 200, r: narrow ? 56 : 80, t: 8, b: 36 }, paper_bgcolor: '#fff', plot_bgcolor: '#fff',
    font: { family: 'system-ui, sans-serif', size: narrow ? 10 : 11.5, color: C.ink }, showlegend: false, shapes,
    xaxis: { title: { text: 'seconds after git push', font: { size: 10.5, color: C.muted } }, range: [0, total * 1.12], gridcolor: '#eef1f5', zeroline: false, fixedrange: true, tickvals: Array.from({ length: Math.floor(total / 120) + 1 }, (_, i) => i * 120), ticktext: Array.from({ length: Math.floor(total / 120) + 1 }, (_, i) => (i * 2) + ' min') },
    yaxis: { autorange: 'reversed', dtick: 1, tickfont: { size: narrow ? 9.5 : (ys.length > 14 ? 10 : 11) }, fixedrange: true, automargin: false } };
  const cfg = { responsive: false, displaylogo: false, displayModeBar: false };
  if (!drawn) { Plotly.newPlot(plot, traces, layout, cfg); drawn = true; } else Plotly.react(plot, traces, layout, cfg);
  caption(bars, total, done, narrow);
}
function caption(bars, total, done, narrow) {
  let e = M.events[0]; for (const ev of M.events) if (ev.start <= lastT + 1e-6) e = ev;
  const sc = M.scenes[e.scene], work = bars.filter(b => b.kind !== 'wait').reduce((a, b) => a + b.sec, 0), wait = bars.filter(b => b.kind === 'wait').reduce((a, b) => a + b.sec, 0);
  head.querySelector('.sub').textContent = done ? M.summary : 'Scene ' + (sc.i + 1) + ' of ' + M.scenes.length + ' · ' + sc.title + (narrow ? '' : ': ' + sc.caption);
  const stats = narrow ? [['Elapsed', fmt(work + wait)], ['Waiting', fmt(wait)]] : [['Elapsed', fmt(work + wait)], ['On the runner', fmt(work)], ['Waiting', fmt(wait)], ['Install', M.installSeconds + ' s (' + (M.warm ? 'warm' : 'cold') + ')']];
  head.querySelector('.stats').innerHTML = stats.map(([k, v]) => '<span style="display:inline-block;margin:0 0 4px 6px;padding:3px 8px;border-radius:8px;background:#f4f6f9;font-size:11.5px;color:#5b6475;white-space:nowrap">' + k + ' <b style="color:#1d2433">' + v + '</b></span>').join('');
  foot.innerHTML = ''; const b = document.createElement('b'); b.textContent = done ? 'Outcome: ' : 'Now: '; foot.append(b, document.createTextNode(done ? M.outcome + ' ' : e.note));
  if (done) { const w = document.createElement('b'); w.textContent = total > 0 ? Math.round(100 * wait / total) + ' % of the time was waiting, not running.' : ''; foot.append(w); }
  foot.style.background = done ? (M.deployed ? '#e6f4ec' : '#fbefe8') : '#fafbfc';
}

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  seek(t) { lastT = t; let e = M.events[0]; for (const ev of M.events) if (ev.start <= t + 1e-6) e = ev; const key = e.i + '|' + (t >= M.duration - 0.05); if (key !== lastKey) { lastKey = key; if (drawn) build(); } },
  mount(root, params) {
    M = model(params); lastT = 0; lastKey = ''; drawn = false;
    wrap = document.createElement('div'); wrap.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;background:#fff;font-family:system-ui,sans-serif;color:#1d2433';
    head = document.createElement('div'); head.style.cssText = 'flex:none;padding:8px 14px 2px;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:flex-start';
    head.innerHTML = '<div style="flex:1 1 280px;min-width:0"><div style="font-size:14px;font-weight:600">One push, one workflow, one deploy · where the minutes go, as a waterfall</div><div class="sub" style="font-size:12px;line-height:1.35;color:#5b6475;min-height:32px"></div></div><div class="stats" style="flex:0 1 auto;text-align:right"></div>';
    plot = document.createElement('div'); plot.style.cssText = 'flex:1;min-height:0;width:100%';
    foot = document.createElement('div'); foot.style.cssText = 'flex:none;height:' + (root.clientWidth < 600 ? 52 : 60) + 'px;box-sizing:border-box;padding:7px 14px;font:13px/1.4 system-ui,sans-serif;border-top:1px solid #e3e7ee;background:#fafbfc;overflow:auto';
    wrap.append(head, plot, foot); root.append(wrap);
    build();
    ro = new ResizeObserver(() => requestAnimationFrame(() => { if (plot && drawn) build(); })); ro.observe(plot);
  },
  update(params) { M = model(params); lastT = 0; lastKey = ''; build(); },
  destroy() { if (ro) ro.disconnect(); if (plot && drawn) Plotly.purge(plot); if (wrap) wrap.remove(); wrap = null; plot = null; M = null; drawn = false; }
};

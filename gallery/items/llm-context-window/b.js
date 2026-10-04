// Chart.js: tokens on the desk after each turn, stacked by kind, with the limit, the 90% threshold and
// compaction drops; the facts table and plan.md card beside it are plain HTML.
let chart = null, box = null, M = null, T = 0, ro = null;
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', sys: '#8a93a6', user: '#2b59c3', tool: '#b4530f', reply: '#0f766e',
  sum: '#7048b8', notes: '#1f7a4d', limit: '#d32f2f', good: '#1f7a4d', gist: '#a16207', lost: '#c2410c' };
const KINDS = [['sys', 'Instructions', C.sys], ['notes', 'plan.md', C.notes], ['summary', 'Summary', C.sum], ['user', 'Your messages', C.user], ['tool', 'Tool results', C.tool], ['reply', 'Replies', C.reply]];
const k1 = n => (n / 1000).toFixed(n < 10000 && n % 1000 ? 1 : 0) + 'k';
const clamp = x => Math.max(0, Math.min(1, x));
const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function stateAt(t) {
  const ev = M.events; let i = -1;
  for (let j = 0; j < ev.length; j++) if (ev[j].start <= t + 1e-9) i = j; else break;
  return i < 0 ? { e: null, k: 0, i } : { e: ev[i], k: clamp((t - ev[i].start) / ev[i].dur), i };
}
function caption(st, t) {
  const end = M.events[M.events.length - 1];
  if (t >= end.start + end.dur - 1e-6) return M.summary;
  if (!st.e) return 'Before the first message, instructions and tool definitions already take ' + k1(M.sysTokens) + ' tokens.';
  const e = st.e;
  if (e.type === 'compact') {
    const c = M.compactions.find(x => x.turn === e.turn);
    return 'Compaction ' + c.n + ': turn ' + e.turn + ' would cross 90%, so turns ' + c.foldedFrom + '–' + c.foldedTo + (c.oldSummary ? ' and the old summary' : '') +
      ' (' + k1(c.foldedTurns + c.oldSummary) + ') become a summary of ' + k1(c.summary) + '.';
  }
  const d = M.turns[e.turn - 1], f = M.facts.find(x => x.turn === e.turn);
  const head = 'Turn ' + e.turn + ' of ' + M.turnsN + ': ';
  if (f) return head + (f.from === 'file' ? 'a file read brings in' : 'you say') + ' “' + f.text + '”' + (M.notesOn ? ', saved to plan.md.' : '.');
  return head + 'message ' + k1(d.user) + ', ' + (M.large ? 'large ' : '') + 'tool result ' + k1(d.tool) + ', reply ' + k1(d.reply) + '.';
}

// Limit, threshold, compaction markers and the "would have reached" ghost bars
const guides = {
  id: 'guides',
  afterDatasetsDraw(ch) {
    if (!M) return;
    const { ctx, chartArea: a, scales: { x, y } } = ch, shown = ch.$shownTurn || 0;
    ctx.save(); ctx.font = '11px system-ui, sans-serif';
    const hline = (v, dash, lab, col) => {
      ctx.strokeStyle = col; ctx.lineWidth = dash ? 1.2 : 2; ctx.setLineDash(dash ? [5, 4] : []);
      ctx.beginPath(); ctx.moveTo(a.left, y.getPixelForValue(v)); ctx.lineTo(a.right, y.getPixelForValue(v)); ctx.stroke(); ctx.setLineDash([]);
      ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(a.left + 2, y.getPixelForValue(v) - 15, ctx.measureText(lab).width + 4, 13); ctx.fillStyle = col; ctx.fillText(lab, a.left + 4, y.getPixelForValue(v) - 2);
    };
    const nar = a.right - a.left < 420;
    hline(M.limit / 1000, false, 'Limit ' + k1(M.limit), C.limit);
    hline(M.threshold / 1000, true, nar ? '90%' : 'Compacts at 90%', C.muted);
    const bw = Math.max(2, (a.right - a.left) / M.turnsN * 0.8);
    M.compactions.forEach(c => {
      if (c.turn > shown + (ch.$compacting === c.turn ? 1 : 0)) return;
      const px = x.getPixelForValue(c.turn - 1) - (x.getPixelForValue(1) - x.getPixelForValue(0)) / 2;
      ctx.strokeStyle = C.sum; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(px, a.top + 14); ctx.lineTo(px, a.bottom); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.sum; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText('C' + c.n, px, a.top);
      const top = (c.before + M.turns[c.turn - 1].total) / 1000, cx = x.getPixelForValue(c.turn - 1);
      ctx.strokeStyle = C.limit; ctx.setLineDash([4, 3]);
      ctx.strokeRect(cx - bw / 2, y.getPixelForValue(top), bw, y.getPixelForValue(c.before / 1000) - y.getPixelForValue(top));
      ctx.setLineDash([]);
      if (ch.$compacting === c.turn) {
        ctx.fillStyle = C.limit; ctx.textAlign = cx > (a.left + a.right) / 2 ? 'right' : 'left'; ctx.textBaseline = 'middle';
        ctx.fillText('turn ' + c.turn + ' would reach ' + k1(Math.round(top * 10) * 100), cx + (ctx.textAlign === 'right' ? -bw : bw), y.getPixelForValue(top) + 8);
      }
    });
    ctx.restore();
  }
};

function draw() {
  const st = stateAt(T), e = st.e;
  const shown = !e ? 0 : e.type === 'turn' ? e.turn : e.turn - 1, grow = e && e.type === 'turn' ? clamp(st.k / 0.6) : 1;
  KINDS.forEach(([key], di) => {
    chart.data.datasets[di].data = M.series.map((r, i) => i < shown - 1 ? r[key] / 1000 : i === shown - 1 ? r[key] / 1000 * (key === 'sys' || key === 'notes' || key === 'summary' ? 1 : grow) : null);
  });
  chart.$shownTurn = shown; chart.$compacting = e && e.type === 'compact' ? e.turn : 0;
  chart.update('none');
  const snap = st.i < 0 ? null : M.snaps[st.e.type === 'compact' && st.k < 0.6 ? st.i - 1 : st.i] || null;
  const facts = snap ? snap.facts : M.facts.map(() => 'unsaid'), saved = snap ? snap.saved : 0;
  box.querySelector('.sub').textContent = caption(st, T);
  const nar = box.clientWidth < 680;
  const LAB = { verbatim: ['✓', nar ? 'Exact' : 'Word for word', C.good], notes: ['✓', nar ? 'In plan.md' : 'Exact in plan.md', C.good], gist: ['~', nar ? 'Gist' : 'Gist only', C.gist], lost: ['✗', 'Lost', C.lost], unsaid: ['·', 'Not yet', '#9aa3b2'] };
  box.querySelector('tbody').innerHTML = M.facts.map((f, i) => {
    const [ic, lab, col] = LAB[facts[i]], s = facts[i];
    return '<tr style="color:' + (s === 'unsaid' ? '#9aa3b2' : C.ink) + '"><td style="color:' + col + ';font-weight:700;text-align:center">' + ic + '</td><td>' +
      '<span style="' + (s === 'lost' ? 'text-decoration:line-through;color:' + C.muted : '') + '">' + esc(f.text) + '</span>' +
      (s === 'gist' ? '<div style="color:' + C.gist + ';font-size:11px">now only “' + esc(f.gist) + '”</div>' : '') +
      '</td><td class="tc" style="text-align:right">' + f.turn + '</td><td style="color:' + col + ';white-space:nowrap">' + lab + '</td></tr>';
  }).join('');
  box.querySelectorAll('.tc').forEach(el => { el.style.display = nar ? 'none' : ''; });
  const notes = box.querySelector('.notes');
  notes.innerHTML = '<b style="color:' + (M.notesOn ? C.notes : C.muted) + '">plan.md</b> <span style="color:' + C.muted + '">· a file outside the chat</span><div' + (nar ? ' style="display:inline"> · ' : '>') +
    (M.notesOn ? (saved && nar ? saved + ' fact' + (saved > 1 ? 's' : '') + ' saved word for word.' : saved ? M.facts.filter(f => M.notesFile.some(n => n.id === f.id)).slice(0, saved).map(f => '✓ ' + esc(f.text.split(' (')[0])).join(nar ? ' \u00a0' : '<br>') : 'Empty so far: facts are written here as they come up.')
      : '<span style="color:' + C.muted + '">' + (nar ? 'Notes off.' : 'Notes off: nothing is written down outside the chat.') + '</span>') + '</div>';
}

function layout() {
  const narrow = box.clientWidth < 680;
  box.style.gridTemplateColumns = narrow ? '1fr' : 'minmax(0,1.45fr) minmax(0,1fr)';
  box.style.gridTemplateRows = narrow ? 'auto minmax(190px,1fr) auto' : 'auto 1fr';
  box.querySelector('.side').style.gridColumn = narrow ? '1' : '2';
  box.querySelector('.side').style.gridRow = narrow ? '3' : '2';
  box.querySelector('.side').style.overflow = narrow ? 'visible' : 'auto';
  box.querySelector('.notes').style.fontSize = narrow ? '11.5px' : '12px';
  box.querySelector('table').style.fontSize = narrow ? '11.5px' : '12px';
  if (chart) { chart.options.scales.y.max = narrow ? 250 : 220; chart.options.scales.y.title.text = narrow ? 'Tokens (thousands)' : 'Tokens on the desk (thousands)'; chart.options.plugins.legend.labels.boxWidth = narrow ? 9 : 11; }
}

window.lab = {
  get duration() { return M ? M.duration : 12; },
  get markers() { return M ? M.markers : []; },
  seek(t) { T = Math.max(0, Math.min(M.duration, t)); draw(); },
  mount(root, params) {
    M = model(params); T = 0;
    box = document.createElement('div');
    box.style.cssText = 'position:absolute;inset:0;display:grid;gap:6px 18px;padding:12px 16px 8px;box-sizing:border-box;background:#fff;color:' + C.ink + ';font:13px/1.35 system-ui,sans-serif;overflow:hidden';
    box.innerHTML = '<div style="grid-column:1/-1"><div style="font-size:14px;font-weight:600">The context window is the model\'s desk</div><div class="sub" style="font-size:12px;color:' + C.muted + ';min-height:16px"></div></div>' +
      '<div class="cw" style="position:relative;min-height:0;min-width:0"><canvas></canvas></div>' +
      '<div class="side" style="min-width:0;min-height:0"><div class="notes" style="border:1px solid #b9dcc7;background:#eef7f1;border-radius:8px;padding:7px 10px;margin:2px 0 10px;line-height:1.45"></div>' +
      '<div style="font-weight:600;font-size:12.5px;margin-bottom:4px">What the assistant still knows</div>' +
      '<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="color:' + C.muted + ';font-size:11px;text-align:left"><th></th><th>Fact</th><th class="tc" style="text-align:right">Turn</th><th style="padding-left:8px">Status</th></tr></thead><tbody></tbody></table></div>';
    root.appendChild(box);
    const st = document.createElement('style');
    st.textContent = '.lab-ctx td{padding:2px 4px;border-top:1px solid ' + C.line + ';vertical-align:top}.lab-ctx th{padding:0 4px 3px;font-weight:500}';
    box.classList.add('lab-ctx'); box.appendChild(st);
    if (!M.notesOn) { const n = box.querySelector('.notes'); n.style.background = '#f5f6f8'; n.style.borderColor = C.line; }
    layout();
    Chart.defaults.font.family = 'system-ui, sans-serif'; Chart.defaults.color = C.muted;
    chart = new Chart(box.querySelector('canvas'), {
      type: 'bar',
      data: { labels: M.series.map(r => r.turn), datasets: KINDS.map(([key, label, col]) => ({ label, data: [], backgroundColor: col, borderWidth: 0, categoryPercentage: 0.9, barPercentage: 0.9 })) },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        scales: {
          x: { stacked: true, title: { display: true, text: 'Turn' }, grid: { display: false }, ticks: { autoSkip: true, maxRotation: 0 } },
          y: { stacked: true, min: 0, max: 220, title: { display: true, text: 'Tokens on the desk (thousands)' }, grid: { color: '#eef1f5' }, ticks: { stepSize: 50 } }
        },
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 11, boxHeight: 11, font: { size: 11 } } },
          tooltip: { callbacks: { label: c => c.dataset.label + ': ' + (c.raw || 0).toFixed(1) + 'k' } }
        }
      },
      plugins: [guides]
    });
    layout();
    ro = new ResizeObserver(() => { layout(); if (chart) { chart.resize(); draw(); } }); ro.observe(root);
    draw();
  },
  update(params) {
    M = model(params); T = 0;
    chart.data.labels = M.series.map(r => r.turn);
    const n = box.querySelector('.notes'); n.style.background = M.notesOn ? '#eef7f1' : '#f5f6f8'; n.style.borderColor = M.notesOn ? '#b9dcc7' : C.line;
    draw();
  },
  destroy() { if (ro) ro.disconnect(); if (chart) chart.destroy(); if (box) box.remove(); chart = box = ro = M = null; }
};

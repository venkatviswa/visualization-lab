// Chart.js: precision and recall against threshold as two standard curves, the current threshold marked, plus the four counts.
// seek(t) reveals the curves, then the marker, the counts and the values, then sweeps the marker.
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', accent: '#2b59c3', tp: '#1f7a4d', fn: '#be123c', fp: '#b4530f', tn: '#5b6475' };
let chart = null, wrap = null, head = null, tiles = null, M = null, T = 0, TH = 0.5, showMarker = false, showValues = false;

const stepAt = t => { let s = M.steps[0]; for (const x of M.steps) if (x.t <= t + 1e-6) s = x; return s; };
function thresholdAt(t) {
  const k = M.thresholdKeys; let v = k[k.length - 1].value;
  for (let i = 1; i < k.length; i++) if (t <= k[i].t) { const a = k[i - 1], b = k[i], f = b.t > a.t ? (t - a.t) / (b.t - a.t) : 1; v = a.value + (b.value - a.value) * Math.max(0, f); break; }
  return Math.min(0.95, Math.max(0.05, Math.round(v * 20) / 20));
}
const rowAt = th => M.curve[Math.round(th * 20) - 1];
const pct = v => v === null ? 'n/a' : Math.round(v * 100) + ' %';

// Draws the vertical threshold marker and the value labels on top of the curves
const marker = {
  id: 'marker',
  afterDatasetsDraw(c) {
    if (!showMarker) return;
    const { ctx, chartArea: a, scales: { x, y } } = c, px = x.getPixelForValue(TH), row = rowAt(TH);
    ctx.save();
    ctx.fillStyle = 'rgba(180,83,15,0.06)'; ctx.fillRect(px, a.top, a.right - px, a.bottom - a.top);
    ctx.strokeStyle = C.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, a.top); ctx.lineTo(px, a.bottom); ctx.stroke();
    ctx.font = '700 12px system-ui, sans-serif'; ctx.fillStyle = C.accent;
    const lab = 'Threshold ' + TH.toFixed(2), w = ctx.measureText(lab).width;
    ctx.textAlign = 'left'; ctx.fillText(lab, Math.min(a.right - w, Math.max(a.left, px - w / 2)), a.top - 6);
    if (showValues) {
      ctx.font = '600 12px system-ui, sans-serif';
      const items = [['recall', C.tp], ['precision', C.fp]].filter(([k]) => row[k] !== null).map(([k, col]) => ({ k, col, y: y.getPixelForValue(row[k] * 100) }));
      if (items.length === 2 && Math.abs(items[0].y - items[1].y) < 16) { const mid = (items[0].y + items[1].y) / 2, up = items[0].y <= items[1].y ? 0 : 1; items[up].y = mid - 8; items[1 - up].y = mid + 8; }
      const right = px < (a.left + a.right) / 2;
      for (const it of items) {
        ctx.textAlign = right ? 'left' : 'right'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.lineJoin = 'round';
        const s = (it.k === 'recall' ? 'Recall ' : 'Precision ') + pct(row[it.k]), lx = px + (right ? 10 : -10), ly = Math.max(a.top + 12, it.y + 4);
        ctx.strokeText(s, lx, ly); ctx.fillStyle = it.col; ctx.fillText(s, lx, ly);
      }
    }
    ctx.restore();
  }
};

function tile(k, name, col) {
  const d = document.createElement('div');
  d.style.cssText = `border:1.5px solid ${C.line};border-radius:8px;padding:6px 10px;min-width:0;background:#fff`;
  d.innerHTML = `<div style="font:700 22px system-ui,sans-serif;color:${col}" data-n></div><div style="font:11.5px system-ui,sans-serif;color:${C.muted};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name}</div>`;
  d.dataset.k = k; d.dataset.col = col;
  return d;
}

function draw() {
  const step = stepAt(T), si = M.steps.indexOf(step), done = T >= M.duration - 0.05;
  TH = thresholdAt(T); showMarker = si >= 1; showValues = si >= 3;
  const row = rowAt(TH);
  head.querySelector('[data-t]').textContent = 'Fraud threshold · ' + (si === 0 ? 'Precision and recall curves' : step.title);
  head.querySelector('[data-s]').textContent = done ? M.summary
    : si === 0 ? 'Each threshold from 0.05 to 0.95 gives one recall and one precision value for these ' + M.total + ' transactions (' + M.nFraud + ' fraud).'
    : si === 2 ? 'The four counts at this threshold. They always add up to ' + M.total + '.' : step.note;
  // Curves draw in from the left during the first step
  const upTo = si === 0 ? Math.floor(T / 2.3 * 19) : 19;
  chart.data.datasets[0].data = M.curve.slice(0, upTo + 1).map(r => ({ x: r.threshold, y: r.recall * 100 }));
  chart.data.datasets[1].data = M.curve.slice(0, upTo + 1).map(r => ({ x: r.threshold, y: r.precision === null ? null : r.precision * 100 }));
  chart.data.datasets[2].data = showMarker ? [{ x: TH, y: row.recall * 100 }] : [];
  chart.data.datasets[3].data = showMarker && row.precision !== null ? [{ x: TH, y: row.precision * 100 }] : [];
  chart.update('none');
  for (const d of tiles.children) {
    const on = si >= 2, col = d.dataset.col;
    d.querySelector('[data-n]').textContent = on ? row[d.dataset.k] : '?';
    d.querySelector('[data-n]').style.color = on ? col : '#c3c9d4';
    d.style.borderColor = on ? col : C.line;
  }
}

function sizeTiles() { if (wrap) tiles.style.gridTemplateColumns = wrap.clientWidth < 560 ? 'repeat(2, minmax(0,1fr))' : 'repeat(4, minmax(0,1fr))'; }

window.lab = {
  get duration() { return M ? M.duration : 13; },
  get markers() { return M ? M.markers : []; },
  seek(t) { T = Math.max(0, Math.min(M.duration, t)); draw(); },
  mount(root, params) {
    M = model(params); T = 0;
    wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;padding:10px 16px 6px;box-sizing:border-box;gap:8px;font-family:system-ui,sans-serif;background:#fff';
    head = document.createElement('div');
    head.innerHTML = `<div data-t style="font-size:14px;font-weight:600;color:${C.ink}"></div><div data-s style="font-size:12.5px;color:${C.muted};min-height:2.6em;line-height:1.3"></div>`;
    tiles = document.createElement('div');
    tiles.style.cssText = 'display:grid;gap:8px';
    tiles.append(tile('tp', 'Fraud caught (TP)', C.tp), tile('fn', 'Fraud missed (FN)', C.fn), tile('fp', 'False alarms (FP)', C.fp), tile('tn', 'Legit passed (TN)', C.tn));
    const box = document.createElement('div'); box.style.cssText = 'position:relative;flex:1;min-height:0';
    const canvas = document.createElement('canvas');
    canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', 'Precision and recall against decision threshold');
    box.appendChild(canvas); wrap.append(head, tiles, box); root.appendChild(wrap);
    sizeTiles(); addEventListener('resize', sizeTiles);
    Chart.defaults.font.family = 'system-ui, sans-serif'; Chart.defaults.color = C.muted;
    const pt = (col) => ({ type: 'scatter', data: [], pointRadius: 6, pointBackgroundColor: col, pointBorderColor: '#fff', pointBorderWidth: 2, showLine: false });
    chart = new Chart(canvas, {
      type: 'line',
      data: { datasets: [
        { label: 'Recall: share of fraud flagged', data: [], borderColor: C.tp, backgroundColor: C.tp, borderWidth: 2.5, pointRadius: 2.5, tension: 0 },
        { label: 'Precision: share of flags that are fraud', data: [], borderColor: C.fp, backgroundColor: C.fp, borderWidth: 2.5, pointRadius: 2.5, tension: 0, spanGaps: false },
        Object.assign(pt(C.tp), { label: 'now-r' }), Object.assign(pt(C.fp), { label: 'now-p' })
      ] },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false, parsing: true,
        layout: { padding: { top: 18 } },
        scales: {
          x: { type: 'linear', min: 0, max: 1, ticks: { stepSize: 0.1 }, title: { display: true, text: 'Decision threshold (flag if score ≥ threshold)' }, grid: { color: '#eef1f5' } },
          y: { min: 0, max: 100, ticks: { stepSize: 20, callback: v => v + ' %' }, title: { display: true, text: 'Percent' }, grid: { color: '#eef1f5' } }
        },
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 18, boxHeight: 2, filter: i => !i.text.startsWith('now') } },
          tooltip: { filter: i => i.datasetIndex < 2, callbacks: { label: c => c.dataset.label.split(':')[0] + ' ' + Math.round(c.parsed.y) + ' %' } }
        }
      },
      plugins: [marker]
    });
    draw();
  },
  update(params) { M = model(params); T = 0; draw(); },
  destroy() { removeEventListener('resize', sizeTiles); if (chart) chart.destroy(); if (wrap) wrap.remove(); chart = wrap = M = null; }
};

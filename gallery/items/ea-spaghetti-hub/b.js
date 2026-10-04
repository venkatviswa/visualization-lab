// Chart.js: the numbers story. Left, integrations versus number of systems for both architectures (current one solid,
// the other dashed as a reference) revealed year by year; right, the integrations broken by one API change.
const INK = '#1d2433', MUTED = '#5b6475', LINE = '#dbe0e8', ACC = '#2b59c3', HI = '#c2410c', TEAL = '#0f766e';
const FONT = 'system-ui, -apple-system, Segoe UI, sans-serif';
let root = null, wrapEl = null, els = {}, line = null, bars = null, M = null, T = 0, ro = null;
const ctx = document.createElement('canvas').getContext('2d');
const tw = (s, fs, wt) => { ctx.font = (wt || 400) + ' ' + fs + 'px ' + FONT; return ctx.measureText(s).width; };
const nLines = (s, maxW, fs) => { let n = 1, l = ''; for (const w of s.split(' ')) { const t = l ? l + ' ' + w : w; if (l && tw(t, fs) > maxW) { n++; l = w; } else l = t; } return n; };
const clamp01 = v => Math.max(0, Math.min(1, v));
const alpha = (hex, a) => hex + Math.round(a * 255).toString(16).padStart(2, '0');

// Direct labels at the tip of each line, plus a marker for the current year.
const tipLabels = {
  id: 'tipLabels',
  afterDatasetsDraw(c) {
    const g = c.ctx, area = c.chartArea, small = c.width < 420;
    c.data.datasets.forEach((ds, i) => {
      const meta = c.getDatasetMeta(i), pt = meta.data[meta.data.length - 1], d = ds.data[ds.data.length - 1];
      if (!pt || !d) return;
      const txt = ds.label + ': ' + Math.round(d.y), fs = small ? 11 : 12;
      g.save(); g.font = (ds.emph ? '600 ' : '400 ') + fs + 'px ' + FONT; g.fillStyle = ds.borderColor.slice(0, 7);
      const w = g.measureText(txt).width, left = pt.x + 8 + w > area.right, up = ds.p2p;
      const x = left ? Math.max(area.left + 2, pt.x - 8 - w) : pt.x + 8, y = up ? pt.y - 9 : pt.y + fs + 14;
      g.strokeStyle = '#fff'; g.lineWidth = 3; g.strokeText(txt, x, y); g.fillText(txt, x, y); g.restore();
    });
    const mk = c.options.plugins.tipLabels;
    if (mk && mk.x != null) {
      const x = c.scales.x.getPixelForValue(mk.x);
      g.save(); g.strokeStyle = mk.color; g.setLineDash([4, 4]); g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(x, area.top); g.lineTo(x, area.bottom); g.stroke(); g.setLineDash([]);
      g.font = '600 11.5px ' + FONT; g.fillStyle = mk.color; g.textAlign = x > area.right - 70 ? 'right' : 'left';
      g.fillText(mk.text, x + (g.textAlign === 'right' ? -5 : 5), area.top - 6); g.restore();
    }
  }
};
const barLabels = {
  id: 'barLabels',
  afterDatasetsDraw(c) {
    const g = c.ctx, meta = c.getDatasetMeta(0), ds = c.data.datasets[0];
    meta.data.forEach((b, i) => {
      const v = ds.data[i], txt = ds.notes[i]; if (!txt) return;
      g.save(); g.font = (i === ds.emph ? '600 ' : '400 ') + '12px ' + FONT; g.fillStyle = i === ds.emph ? HI : MUTED; g.textBaseline = 'middle';
      const w = g.measureText(txt).width, inside = b.x + 6 + w > c.chartArea.right;
      if (inside) { g.fillStyle = i === ds.emph ? '#fff' : INK; g.textAlign = 'right'; g.fillText(txt, b.x - 6, b.y); } else g.fillText(txt, b.x + 6, b.y);
      g.restore();
    });
  }
};

function layout() {
  const W = root.clientWidth, wide = W >= 700, fs = wide ? 12.5 : 11.5;
  const texts = M.years.map(y => y.caption).concat([M.change.caption, M.summary]);
  els.sub.style.fontSize = fs + 'px';
  els.sub.style.minHeight = Math.max(...texts.map(s => nLines(s, W - 28, fs))) * (fs + 4) + 'px';
  els.body.style.flexDirection = wide ? 'row' : 'column';
  els.left.style.flex = wide ? '1.65 1 0' : '1.5 1 0';
  els.right.style.flex = wide ? '1 1 0' : '0 0 auto';
  els.barBox.style.height = wide ? '180px' : '150px';
  els.note.style.fontSize = (wide ? 12.5 : 11.5) + 'px';
}

function build() {
  const hub = M.hub;
  const mk = (p2p) => {
    const emph = p2p !== hub, col = p2p ? ACC : TEAL;
    return { label: p2p ? 'Point-to-point' : M.hubName, p2p, emph, data: [], borderColor: emph ? col : alpha(col, 0.6), backgroundColor: col,
      borderWidth: emph ? 3 : 1.6, borderDash: emph ? [] : [6, 5], pointRadius: emph ? 3 : 0, pointBackgroundColor: col, tension: 0 };
  };
  line.data.datasets = [mk(true), mk(false)];
  line.options.scales.x.max = M.n;
  line.options.scales.y.max = Math.ceil(M.p2pTotal * 1.08 / 5) * 5;
  bars.data.labels = ['Point-to-point', M.hubName];
  bars.options.scales.x.max = Math.max(4, M.change.p2pImpacted + 1);
  els.note.textContent = M.soWhat;
  els.title.textContent = 'From spaghetti to hub: why an integration layer';
}

function draw() {
  if (!M) return;
  const t = T, ch = M.change, done = t >= M.duration - 0.05, inChange = t >= ch.at - 1e-6;
  const yi = M.years.filter(y => y.at <= t + 1e-6).length - 1, yr = M.years[Math.max(0, yi)];
  els.sub.textContent = done ? M.summary : inChange ? ch.caption : yr.caption;
  els.sub.style.color = done ? INK : MUTED;
  // Reveal both curves up to the current year, sliding the newest segment in.
  const ptsFor = key => {
    const out = [];
    M.years.slice(0, yi + 1).forEach((y, i) => {
      if (!i) { out.push({ x: y.systems, y: y[key] }); return; }
      const prev = M.years[i - 1][key], u = i === yi ? clamp01((t - y.at) / Math.min(0.6, y.at - M.years[i - 1].at)) : 1;
      out.push({ x: y.systems - 1 + u, y: prev + (y[key] - prev) * u });
    });
    return out;
  };
  line.data.datasets[0].data = ptsFor('p2p');
  line.data.datasets[1].data = ptsFor('hub');
  line.options.plugins.tipLabels = inChange
    ? { x: M.n, text: 'Year ' + ch.year + ': API change', color: HI }
    : { x: yr.systems, text: 'Year ' + yr.year, color: MUTED };
  line.update('none');
  // Impact bars: the current architecture counts up link by link; the other appears as a reference.
  const cur = ch.impacted.filter(x => t >= x.at).length, refOn = clamp01((t - ch.at - 0.3) / 0.5);
  const iHub = M.hub ? 1 : 0, vals = [0, 0], notes = ['', ''];
  vals[iHub] = cur; vals[1 - iHub] = (M.hub ? ch.p2pImpacted : ch.hubImpacted) * refOn;
  const teamWord = k => k === 1 ? ' team' : ' teams';
  if (cur) notes[iHub] = cur + ' to rework · ' + new Set(ch.teams.slice(0, cur)).size + teamWord(new Set(ch.teams.slice(0, cur)).size);
  if (refOn >= 1) notes[1 - iHub] = M.hub ? ch.p2pImpacted + ' (reference)' : '1 adapter (reference)';
  const ds = bars.data.datasets[0];
  ds.data = vals; ds.notes = notes; ds.emph = iHub;
  ds.backgroundColor = [0, 1].map(i => i === iHub ? HI : alpha(HI, 0.28));
  bars.options.plugins.title.text = inChange ? 'Integrations broken when ' + ch.name + ' changes its API' : 'Coming up: ' + ch.name + ' changes its API';
  bars.options.plugins.title.color = inChange ? INK : MUTED;
  bars.update('none');
  els.note.style.opacity = clamp01((t - M.soWhatAt) / 0.4);
}

function el(tag, css, parent) { const e = document.createElement(tag); e.style.cssText = css; (parent || wrapEl).appendChild(e); return e; }

window.lab = {
  get duration() { return M ? M.duration : 14; },
  get markers() { return M ? M.markers : []; },
  seek(t) { T = Math.max(0, Math.min(M.duration, t)); draw(); },
  mount(r, params) {
    root = r; M = model(params); T = 0;
    Chart.defaults.font.family = FONT; Chart.defaults.color = MUTED;
    wrapEl = document.createElement('div');
    wrapEl.style.cssText = `position:absolute;inset:0;display:flex;flex-direction:column;padding:10px 14px 8px;box-sizing:border-box;background:#fff;font-family:${FONT};color:${INK}`;
    root.appendChild(wrapEl);
    els.title = el('div', 'font-size:14px;font-weight:600;line-height:18px');
    els.sub = el('div', 'line-height:1.3;margin:3px 0 6px');
    els.body = el('div', 'flex:1;display:flex;gap:14px;min-height:0');
    els.left = el('div', 'position:relative;min-height:0;min-width:0', els.body);
    els.right = el('div', 'display:flex;flex-direction:column;gap:8px;min-width:0;justify-content:center', els.body);
    els.barBox = el('div', 'position:relative;min-height:0', els.right);
    els.note = el('div', `background:#f3f6fc;border-left:3.5px solid ${ACC};border-radius:6px;padding:7px 10px;line-height:1.4;color:${INK}`, els.right);
    const c1 = el('canvas', '', els.left), c2 = el('canvas', '', els.barBox);
    line = new Chart(c1, {
      type: 'line', data: { datasets: [] }, plugins: [tipLabels],
      options: {
        responsive: true, maintainAspectRatio: false, animation: false, parsing: false, layout: { padding: { right: 8, top: 18 } },
        scales: {
          x: { type: 'linear', min: 2, ticks: { stepSize: 1 }, title: { display: true, text: 'Systems in the estate (one added per year)' }, grid: { color: '#eef1f5' } },
          y: { min: 0, title: { display: true, text: 'Integrations to build and run' }, grid: { color: '#eef1f5' } }
        },
        plugins: { legend: { display: false }, tooltip: { enabled: true }, tipLabels: {} }
      }
    });
    bars = new Chart(c2, {
      type: 'bar', data: { labels: [], datasets: [{ data: [0, 0], notes: ['', ''], borderRadius: 4, barPercentage: 0.75 }] }, plugins: [barLabels],
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: false,
        scales: { x: { min: 0, ticks: { stepSize: 1 }, title: { display: true, text: 'Integrations to rework' }, grid: { color: '#eef1f5' } },
          y: { ticks: { color: INK, font: { size: 12 } }, grid: { display: false } } },
        plugins: { legend: { display: false }, tooltip: { enabled: false }, title: { display: true, align: 'start', font: { size: 12.5, weight: '600' }, text: '' } }
      }
    });
    layout(); build(); draw();
    ro = new ResizeObserver(() => { layout(); draw(); }); ro.observe(root);
  },
  update(params) { M = model(params); T = 0; layout(); build(); draw(); },
  destroy() { if (ro) ro.disconnect(); if (line) line.destroy(); if (bars) bars.destroy(); if (wrapEl) wrapEl.remove(); line = bars = wrapEl = M = null; }
};

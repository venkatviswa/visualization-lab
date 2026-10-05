// Story mode: the same month told as counters. Source cards on the left pour records into three stations
// (quality check, identity resolution, consent); at each station a bar splits into two outcomes and the counts
// count up as the playback clock passes. One paused GSAP timeline, rebuilt from model() on update and on resize.
const NS = 'http://www.w3.org/2000/svg', FONT = 'system-ui, -apple-system, Segoe UI, sans-serif';
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d', bad: '#b42318', soft: '#f4f6f9', tint: '#e8eefb', faint: '#9aa3b2' };
const SRC = { portal: '#2b59c3', claims: '#0f766e', contact: '#6d4bbf', marketing: '#be4d8a', pharmacy: '#b4530f' };
let root = null, svg = null, tl = null, M = null, T = 0, ro = null, size = '';
const fmt = v => Math.round(v).toLocaleString('en-US');
const ctx = document.createElement('canvas').getContext('2d');
const tw = (s, fs, wt) => { ctx.font = (wt || 400) + ' ' + fs + 'px ' + FONT; return ctx.measureText(s).width; };
function wrap(s, maxW, fs, wt) { const out = []; let line = ''; for (const w of s.split(' ')) { const t = line ? line + ' ' + w : w; if (line && tw(t, fs, wt) > maxW) { out.push(line); line = w; } else line = t; } if (line) out.push(line); return out; }
function el(tag, attrs, parent) { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; }
function txt(parent, x, y, s, o) { o = o || {}; const n = el('text', { x, y, 'font-size': o.fs || 13, 'font-weight': o.wt || 400, fill: o.fill || C.ink, 'text-anchor': o.anchor || 'start', 'font-family': FONT }, parent); n.textContent = s; return n; }
function icon(parent, name, x, y, sz, color) { const n = labIcon(name, { x, y, width: sz, height: sz, stroke: color || C.ink }); parent.appendChild(n); return n; }

function build() {
  const W = root.clientWidth, H = root.clientHeight, narrow = W < 640;
  svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  if (tl) tl.kill();
  tl = gsap.timeline({ paused: true });
  const Tt = M.totals, steps = M.steps;
  // Header: title, caption (per scene), counters
  txt(svg, 16, 24, 'Where the records go · one month', { fs: 14, wt: 600 });
  const capG = el('g', {}, svg);
  const capW = W - 32, capLines = narrow ? 3 : 2, capH = capLines * 16 + 4;
  const capTexts = Array.from({ length: capLines }, (_, k) => txt(capG, 16, 44 + k * 16, '', { fs: 12.5, fill: C.muted }));
  const setCap = s => { const ls = wrap(s, capW, 12.5); capTexts.forEach((t, k) => { t.textContent = ls[k] || ''; }); };
  const top = 44 + capH + 6;
  // Layout: source cards on the left (wide) or a compact strip on top (narrow); three stations with split bars
  const stations = [
    { id: 'quality', title: 'Quality check', a: ['Passed', Tt.passed, '#5b6475'], b: ['Rejected', Tt.rejected, C.bad] },
    { id: 'identity', title: 'Identity resolution', a: ['New profiles', Tt.fresh, C.accent], b: ['Merged', Tt.merged, '#0f766e'] },
    { id: 'consent', title: 'Consent', a: ['Marketing + service', Tt.marketing, C.good], b: ['Service only', Tt.service, '#8a93a6'] }
  ];
  const srcX = 16, srcW = narrow ? W - 32 : 196, rowH = narrow ? 22 : 40, srcTop = top + (narrow ? 0 : 6);
  const srcG = el('g', {}, svg);
  txt(srcG, srcX, srcTop - (narrow ? 4 : 2), narrow ? 'Sources · ' + fmt(Tt.ingested) + ' records' : 'Sources', { fs: 11, wt: 600, fill: C.muted });
  const srcRows = M.sources.map((s, i) => {
    const g = el('g', { opacity: 0 }, srcG), y = srcTop + 6 + i * rowH;
    if (narrow) {
      el('rect', { x: srcX, y, width: srcW, height: rowH - 4, rx: 5, fill: C.soft }, g);
      icon(g, s.icon, srcX + 6, y + 3, 12, SRC[s.id]);
      txt(g, srcX + 24, y + 13, s.label, { fs: 11.5, wt: 500 });
      txt(g, srcX + srcW - 6, y + 13, fmt(s.vol), { fs: 11.5, wt: 600, anchor: 'end' });
    } else {
      el('rect', { x: srcX, y, width: srcW, height: rowH - 6, rx: 7, fill: '#fff', stroke: C.line }, g);
      el('rect', { x: srcX, y, width: 5, height: rowH - 6, rx: 2, fill: SRC[s.id] }, g);
      icon(g, s.icon, srcX + 12, y + 9, 16, SRC[s.id]);
      txt(g, srcX + 34, y + 15, s.label, { fs: 12, wt: 500 });
      txt(g, srcX + 34, y + 29, fmt(s.vol) + ' records', { fs: 11, fill: C.muted });
    }
    return g;
  });
  const srcBottom = srcTop + 6 + M.sources.length * rowH;
  // Stations
  const stX0 = narrow ? 16 : srcX + srcW + 26, stY0 = narrow ? srcBottom + 10 : top, stW = W - stX0 - 16;
  const soLines = narrow ? [fmt(Tt.marketing) + ' of ' + fmt(Tt.ingested) + ' can be marketed to.'] : wrap('Of ' + fmt(Tt.ingested) + ' records, ' + fmt(Tt.marketing) + ' can be marketed to. Start the capacity, licence or consent conversation from the width, not the arrow.', W - 32, 12, 600);
  const soH = soLines.length * 16 + 6;
  const stH = narrow ? Math.max(60, (H - stY0 - 10 - soH) / 3) : H - stY0 - 10 - soH, colW = narrow ? stW : (stW - 2 * 16) / 3;
  const barMax = narrow ? Math.max(80, stW - 80) : Math.max(60, stH - 96);
  const stG = stations.map((s, k) => {
    const g = el('g', { opacity: 0 }, svg), x = narrow ? stX0 : stX0 + k * (colW + 16), y = narrow ? stY0 + k * stH : stY0;
    el('rect', { x, y, width: narrow ? stW : colW, height: narrow ? stH - 8 : stH, rx: 9, fill: C.soft }, g);
    const into = fmt(k === 0 ? Tt.ingested : Tt.passed);
    txt(g, x + 10, y + 18, (k + 1) + ' · ' + s.title + (narrow ? ' · in: ' + into : ''), { fs: 12.5, wt: 600 });
    const inLabel = narrow ? null : txt(g, x + 10, y + 34, 'in: ' + into, { fs: 11, fill: C.muted });
    // Split bar: two segments whose length is the count; counts count up next to them
    const parts = [s.a, s.b].map(([label, val, col], j) => {
      const total = k === 0 ? Tt.ingested : Tt.passed, frac = total ? val / total : 0;
      const seg = el('rect', { fill: col, rx: 3 }, g), cnt = txt(g, 0, 0, '0', { fs: 12, wt: 600, fill: col });
      const lab = txt(g, 0, 0, label, { fs: 11, fill: C.muted });
      if (narrow) {
        const bx = x + 10, by = y + 38 + j * 24;
        seg.setAttribute('x', bx); seg.setAttribute('y', by); seg.setAttribute('height', 12); seg.setAttribute('width', 0);
        lab.setAttribute('x', bx); lab.setAttribute('y', by - 3); cnt.setAttribute('x', bx + Math.max(60, barMax * frac) + 6); cnt.setAttribute('y', by + 10);
        return { seg, cnt, val, len: barMax * frac, vertical: false };
      }
      const bw = (colW - 30) / 2, bx = x + 10 + j * (bw + 10), base = y + stH - 36;
      seg.setAttribute('x', bx); seg.setAttribute('width', bw); seg.setAttribute('y', base); seg.setAttribute('height', 0);
      lab.setAttribute('x', bx); lab.setAttribute('y', base + 16); cnt.setAttribute('x', bx); cnt.setAttribute('y', base - 4);
      wrap(label, bw, 11).forEach((l, q) => { if (q === 0) lab.textContent = l; else txt(g, bx, base + 16 + q * 13, l, { fs: 11, fill: C.muted }); });
      return { seg, cnt, val, len: barMax * frac, vertical: true, base };
    });
    return { g, parts, inLabel, x, y };
  });
  // The "so what" line at the end
  const soG = el('g', { opacity: 0 }, svg);
  soLines.forEach((l, q) => txt(soG, 16, H - soH + 12 + q * 16, l, { fs: 12, wt: 600, fill: C.hi }));
  // Timeline: scene by scene
  const sceneAt = i => steps[i].t, sceneEnd = i => (steps[i + 1] ? steps[i + 1].t : M.duration);
  steps.forEach((s, i) => tl.call(() => setCap(T >= M.duration - 0.05 ? M.summary : s.note), null, sceneAt(i)));
  // scene 0: sources appear, counter runs
  srcRows.forEach((g, i) => tl.to(g, { opacity: 1, duration: 0.35 }, sceneAt(0) + 0.2 + i * 0.45));
  // scenes 1-3: station fades in, bars grow, counters count
  stG.forEach((st, k) => {
    const t0 = sceneAt(k + 1), dur = Math.max(1.2, sceneEnd(k + 1) - t0 - 1.2);
    tl.to(st.g, { opacity: 1, duration: 0.4 }, t0);
    st.parts.forEach((p, j) => {
      const o = { v: 0 }, at = t0 + 0.3 + j * 0.5;
      if (p.vertical) { tl.to(p.seg, { attr: { y: p.base - p.len, height: p.len }, duration: dur, ease: 'power2.out' }, at); tl.to(p.cnt, { attr: { y: p.base - p.len - 5 }, duration: dur, ease: 'power2.out' }, at); }
      else tl.to(p.seg, { attr: { width: p.len }, duration: dur, ease: 'power2.out' }, at);
      tl.to(o, { v: p.val, duration: dur, ease: 'power2.out', onUpdate: () => { p.cnt.textContent = fmt(o.v); } }, at);
    });
  });
  tl.to(soG, { opacity: 1, duration: 0.5 }, sceneAt(4) + 0.2);
  tl.to({}, { duration: 0.01 }, M.duration);
  setCap(steps[0].note);
  tl.seek(T, false);
  // seek does not replay call()s, so set the caption directly from the clock
  let k = 0; steps.forEach((s, i) => { if (s.t <= T + 1e-6) k = i; }); setCap(T >= M.duration - 0.05 ? M.summary : steps[k].note);
  size = W + 'x' + H;
}

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  seek(t) { T = t; if (!tl) return; tl.seek(t, false); let k = 0; M.steps.forEach((s, i) => { if (s.t <= t + 1e-6) k = i; }); const cap = svg.querySelectorAll('g')[0]; if (cap) { const ls = wrap(t >= M.duration - 0.05 ? M.summary : M.steps[k].note, root.clientWidth - 32, 12.5); Array.from(cap.children).forEach((n, q) => { n.textContent = ls[q] || ''; }); } },
  mount(r, params) {
    root = r; M = model(params); T = 0;
    svg = el('svg', { style: 'display:block;position:absolute;inset:0;background:#fff;font-family:' + FONT }, root);
    build();
    ro = new ResizeObserver(() => requestAnimationFrame(() => { if (svg && M && root.clientWidth + 'x' + root.clientHeight !== size) build(); })); ro.observe(root);
  },
  update(params) { M = model(params); T = 0; build(); },
  destroy() { if (ro) ro.disconnect(); if (tl) tl.kill(); if (svg) svg.remove(); svg = null; tl = null; M = null; }
};

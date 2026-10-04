// Story: one SVG sized to the root (1 unit = 1 px) and one paused GSAP timeline built from model().
// Word chips grow and shrink with probability, drop out at the top-p cut, and the sampled word flies into the sentence.
const NS = 'http://www.w3.org/2000/svg', FONT = 'system-ui, -apple-system, sans-serif';
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d', soft: '#f4f6f9', tint: '#e8eefb', cut: '#eef0f4', hiTint: '#fdeee6' };
const STAGES = [['list-ordered', 'Raw scores', 'Scores'], ['percent', 'Softmax', 'Softmax'], ['thermometer', 'Temperature', 'Temp.'], ['scissors', 'Top-p cut', 'Top-p'], ['dice-5', 'Sample', 'Pick']];
let root = null, svg = null, tl = null, M = null, L = null, H = null, T = 0, ro = null, lastW = 0, lastH = 0;
const EASE = 'power1.inOut';

function el(tag, attrs, parent) { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; }
function txt(parent, x, y, s, o = {}) {
  const n = el('text', { x, y, 'font-size': o.size || 12.5, 'font-weight': o.weight || 400, fill: o.fill || C.ink, 'text-anchor': o.anchor || 'start', 'font-family': FONT }, parent);
  n.textContent = s; return n;
}
function wrapText(node, s, x, maxW, lh, maxLines) {
  while (node.firstChild) node.removeChild(node.firstChild);
  const size = +node.getAttribute('font-size'), per = Math.max(8, Math.floor(maxW / (size * 0.53))), lines = [];
  let cur = '';
  for (const w of String(s).replace(/ %/g, '\u00a0%').split(' ')) { if ((cur + ' ' + w).trim().length > per && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
  if (cur) lines.push(cur);
  lines.slice(0, maxLines || 9).forEach((l, i) => { const t = el('tspan', { x, dy: i ? lh : 0 }, node); t.textContent = l; });
  return lines.length;
}
function icon(parent, name, x, y, size, color) { const n = labIcon(name, { x, y, width: size, height: size, stroke: color || C.ink }); parent.appendChild(n); return n; }
const pc = v => (v * 100 < 1 && v > 0 ? '<1' : Math.round(v * 100)) + '\u00a0%';
const stepAt = t => { let k = 0; M.steps.forEach((s, i) => { if (s.t <= t + 1e-6) k = i; }); return k; };

function geometry() {
  const W = root.clientWidth, Hh = root.clientHeight, narrow = W < 640;
  const headBot = narrow ? 92 : 76, railY = headBot + 22, sentY = railY + 58, top = sentY + 18;
  const cardMin = narrow ? 104 : 0, rowH = Math.max(20, Math.min(32, (Hh - top - cardMin - 10) / 12));
  const colX = narrow ? 16 : 24, colW = narrow ? W - 32 : Math.round(W * 0.6) - 24;
  const textW = Math.max(...M.tokens.map(d => d.text.length)) * 7.4 + 18;
  const card = narrow ? { x: 16, y: top + 12 * rowH + 8, w: W - 32 } : { x: Math.round(W * 0.6) + 16, y: top, w: W - Math.round(W * 0.6) - 40 };
  card.h = narrow ? Hh - card.y - 8 : Math.min(12 * rowH, 200);
  return { W, H: Hh, narrow, headBot, railY, sentY, top, rowH, colX, colW, textW, K: colW - textW - 128, card };
}
const chipW = d => w => d.text.length * 7.4 + 18 + w * L.K;

function build() {
  if (tl) tl.kill();
  if (svg) svg.remove();
  L = geometry();
  svg = el('svg', { width: L.W, height: L.H, viewBox: `0 0 ${L.W} ${L.H}`, role: 'img', 'aria-label': 'Step-by-step story of how an LLM picks the next word' }, root);
  svg.style.display = 'block';
  el('rect', { x: 0, y: 0, width: L.W, height: L.H, fill: '#fff' }, svg);
  tl = gsap.timeline({ paused: true });
  H = { title: txt(svg, 16, 24, '', { size: 14, weight: 600 }), note: txt(svg, 16, 44, '', { size: 12.5, fill: C.muted }) };
  // Stage rail
  const inset = L.narrow ? 34 : 56, sx = i => inset + i * (L.W - 2 * inset) / 4;
  el('line', { x1: sx(0), y1: L.railY, x2: sx(4), y2: L.railY, stroke: C.line, 'stroke-width': 3 }, svg);
  H.prog = el('line', { x1: sx(0), y1: L.railY, x2: sx(0), y2: L.railY, stroke: C.accent, 'stroke-width': 3 }, svg);
  H.stages = STAGES.map(([ic, long, short], i) => {
    const g = el('g', {}, svg);
    const c = el('circle', { cx: sx(i), cy: L.railY, r: 16, fill: '#fff', stroke: C.line, 'stroke-width': 2 }, g);
    const ico = icon(g, ic, sx(i) - 9, L.railY - 9, 18, C.muted);
    const lab = txt(g, sx(i), L.railY + 32, L.narrow ? short : long, { size: 11.5, anchor: 'middle', fill: C.muted });
    return { c, ico, lab };
  });
  // Context sentence with the blank the picked word flies into
  const sent = txt(svg, L.colX, L.sentY, '“' + M.context, { size: 16, weight: 500 });
  const blankX = L.colX + (M.context.length + 1) * 8.3 + 8;
  el('rect', { x: blankX, y: L.sentY - 18, width: 92, height: 26, rx: 6, fill: '#fff', stroke: C.muted, 'stroke-dasharray': '4 3' }, svg);
  txt(svg, blankX + 98, L.sentY, '”', { size: 16, weight: 500 });
  sent.setAttribute('aria-hidden', 'true');
  // Word chips, one row each, sorted by score
  H.rows = M.tokens.map((d, i) => {
    const y = L.top + i * L.rowH, ch = L.rowH - 6, w = chipW(d);
    const g = el('g', {}, svg);
    const rect = el('rect', { x: L.colX, y, width: w(0), height: ch, rx: ch / 2, fill: C.tint, stroke: C.accent, 'stroke-width': 1.5 }, g);
    txt(g, L.colX + 10, y + ch / 2 + 4.5, d.text, { size: 12.5, weight: 600 });
    const val = txt(g, L.colX + w(0) + 8, y + ch / 2 + 4.5, '', { size: 12, fill: C.muted });
    gsap.set(g, { opacity: 0, x: -24 });
    tl.to(g, { opacity: 1, x: 0, duration: 0.35, ease: 'power2.out' }, 0.15 + i * 0.14);
    const sAt = M.steps[1].t + 0.3, tAt = M.steps[2].t + 0.3, cAt = M.steps[3].t + 0.9 + i * 0.1, pAt = M.steps[4].t + 0.3;
    tl.to(rect, { attr: { width: w(d.pBase) }, duration: 0.9, ease: EASE }, sAt).to(val, { attr: { x: L.colX + w(d.pBase) + 8 }, duration: 0.9, ease: EASE }, sAt);
    tl.to(rect, { attr: { width: w(d.p) }, duration: 1.3, ease: EASE }, tAt).to(val, { attr: { x: L.colX + w(d.p) + 8 }, duration: 1.3, ease: EASE }, tAt);
    if (!d.kept) {
      tl.to(rect, { attr: { fill: C.cut, stroke: '#c3c9d4' }, duration: 0.3 }, cAt).to(g, { opacity: 0.4, x: 14, y: 3, duration: 0.45, ease: 'power2.in' }, cAt);
      tl.to(rect, { attr: { width: w(0) }, duration: 0.8, ease: EASE }, pAt).to(val, { attr: { x: L.colX + w(0) + 8 }, duration: 0.8, ease: EASE }, pAt);
    } else {
      tl.to(rect, { attr: { width: w(d.pFinal) }, duration: 0.8, ease: EASE }, pAt).to(val, { attr: { x: L.colX + w(d.pFinal) + 8 }, duration: 0.8, ease: EASE }, pAt);
      if (d.picked) tl.to(rect, { attr: { fill: C.hiTint, stroke: C.hi }, duration: 0.3 }, pAt + 1.0);
    }
    return { g, rect, val, d };
  });
  // Top-p cut line under the last kept word
  const cutY = L.top + M.keptCount * L.rowH - 3;
  const cut = el('g', {}, svg);
  el('line', { x1: L.colX, y1: cutY, x2: L.colX + L.colW, y2: cutY, stroke: C.hi, 'stroke-width': 2, 'stroke-dasharray': '6 4' }, cut);
  const cutLab = M.keptCount < 12 ? 'top-p ' + M.topP.toFixed(2) + ': kept ' + pc(M.keptMass) : 'top-p 1.00: nothing cut';
  const labY = M.keptCount < 12 ? cutY + 15 : cutY - 6;
  txt(cut, L.colX + L.colW, labY, cutLab, { size: 11.5, anchor: 'end', weight: 600, fill: C.hi });
  icon(cut, 'scissors', L.colX + L.colW - cutLab.length * 6.4 - 24, labY - 12, 16, C.hi);
  gsap.set(cut, { opacity: 0 }); tl.to(cut, { opacity: 1, duration: 0.4 }, M.steps[3].t + 0.4);
  // The picked word flies from its row into the blank
  const pk = H.rows[M.pick], fly = el('g', {}, svg), fw = M.picked.length * 8.4 + 20;
  el('rect', { x: 0, y: 0, width: fw, height: 24, rx: 12, fill: C.hi }, fly);
  txt(fly, fw / 2, 16.5, M.picked, { size: 13.5, weight: 700, fill: '#fff', anchor: 'middle' });
  const py = L.top + M.pick * L.rowH;
  gsap.set(fly, { opacity: 0, x: L.colX, y: py });
  tl.set(fly, { opacity: 1 }, M.steps[4].t + 1.3).to(fly, { x: blankX + 46 - fw / 2, y: L.sentY - 17, duration: 0.8, ease: 'power2.inOut' }, M.steps[4].t + 1.3);
  buildCard();
  tl.set({}, {}, M.duration);
}

function buildCard() {
  const c = L.card; if (c.h < 70) return;
  el('rect', { x: c.x, y: c.y, width: c.w, height: c.h, rx: 12, fill: C.soft }, svg);
  const tk = M.tokens, T0 = tk[0];
  const body = [
    ['list-ordered', 'Scores, not probabilities', 'Each word gets a raw score (a logit) from the model. Scores can be negative and do not add up to anything.'],
    ['percent', 'Softmax', 'p = e^score ÷ the sum of e^score over all 12 words. Every word gets a share and the shares add up to 100 %.'],
    ['thermometer', 'Temperature ' + M.temperature.toFixed(1), M.temperature < 1 ? 'Scores are divided by ' + M.temperature.toFixed(1) + ' before softmax. That stretches the gaps: "' + T0.text + '" grows from ' + pc(T0.pBase) + ' to ' + pc(T0.p) + '.'
      : M.temperature > 1 ? 'Scores are divided by ' + M.temperature.toFixed(1) + ' before softmax. That squeezes the gaps: "' + T0.text + '" shrinks from ' + pc(T0.pBase) + ' to ' + pc(T0.p) + ' and long shots grow.' : 'Dividing by 1.0 changes nothing: the probabilities stay as they were.'],
    ['scissors', 'Top-p ' + M.topP.toFixed(2), M.keptCount < 12 ? 'Add words from the top until the total reaches ' + Math.round(M.topP * 100) + ' %. ' + M.keptCount + ' words make ' + pc(M.keptMass) + '; the other ' + (12 - M.keptCount) + ' can never be picked.' : 'Top-p 1.00 keeps every word, even the long shots.'],
    ['dice-5', 'Sample: u = ' + M.u.toFixed(2), 'The kept words are rescaled to 100 % and laid end to end. A seeded random number u lands on "' + M.picked + '".']
  ];
  const pad = L.narrow ? 10 : 16, small = L.narrow;
  body.forEach(([ic, head, line], k) => {
    const g = el('g', {}, svg), s = M.steps[k];
    icon(g, ic, c.x + pad, c.y + pad - 2, small ? 18 : 24, C.accent);
    txt(g, c.x + pad + (small ? 26 : 34), c.y + pad + (small ? 12 : 15), head, { size: small ? 13 : 14, weight: 700 });
    const b = txt(g, c.x + pad, c.y + pad + (small ? 34 : 48), '', { size: 12.5, fill: C.ink });
    const n = wrapText(b, line, c.x + pad, c.w - 2 * pad, 17, small ? 3 : 6);
    const stripY = c.y + pad + (small ? 34 : 48) + n * 17 + 6;
    if (k >= 3 && stripY + 34 < c.y + c.h) strip(g, k === 4, c.x + pad, stripY, c.w - 2 * pad);
    gsap.set(g, { opacity: 0 });
    tl.set(g, { opacity: 1 }, s.t);
    if (k < 4) tl.set(g, { opacity: 0 }, M.steps[k + 1].t);
  });
}
// A 100 % strip: words laid end to end. Before sampling it shows the top-p mark; at sampling it shows the kept words and u.
function strip(g, sample, x, y, w) {
  let acc = 0;
  M.tokens.forEach(d => {
    const v = sample ? d.pFinal : d.p; if (v <= 0) return;
    el('rect', { x: x + acc * w, y, width: Math.max(0.5, v * w - 1), height: 16, fill: sample ? (d.picked ? C.hi : C.accent) : (d.kept ? C.accent : '#c3c9d4') }, g);
    acc += v;
  });
  const mark = sample ? M.u : Math.min(1, M.topP), mx = x + mark * w;
  el('path', { d: `M${mx} ${y - 2} l-5 -8 h10 z`, fill: C.hi }, g);
  txt(g, Math.min(x + w, Math.max(x, mx)), y + 31, sample ? 'u = ' + M.u.toFixed(2) + ' → "' + M.picked + '"' : 'top-p ' + M.topP.toFixed(2), { size: 11.5, weight: 600, fill: C.hi, anchor: mx > x + w * 0.7 ? 'end' : mx < x + w * 0.3 ? 'start' : 'middle' });
}

function setState(t) {
  const k = stepAt(t), s = M.steps[k], done = t >= M.duration - 0.05;
  H.title.textContent = s.title;
  wrapText(H.note, done ? M.summary : s.note, 16, L.W - 32, 16, L.narrow ? 3 : 2);
  H.stages.forEach((st, i) => {
    const on = i === k && !done, past = i < k || done;
    st.c.setAttribute('fill', on ? C.tint : past ? '#e6f4ec' : '#fff');
    st.c.setAttribute('stroke', on ? C.accent : past ? C.good : C.line);
    st.ico.setAttribute('stroke', on ? C.accent : past ? C.good : C.muted);
    st.lab.setAttribute('fill', on ? C.ink : C.muted); st.lab.setAttribute('font-weight', on ? 700 : 400);
  });
  const sx0 = +H.stages[0].c.getAttribute('cx'); H.prog.setAttribute('x2', sx0 + (+H.stages[4].c.getAttribute('cx') - sx0) * k / 4);
  // Value labels follow the same eased blend as the chip widths
  const ez = gsap.parseEase(EASE), f = (a, d) => ez(Math.max(0, Math.min(1, (t - a) / d)));
  H.rows.forEach(r => {
    const d = r.d;
    let v;
    if (k === 0) { r.val.textContent = 'score ' + d.score.toFixed(1); return; }
    if (k === 1) v = d.pBase;
    else if (k === 2) v = d.pBase + (d.p - d.pBase) * f(M.steps[2].t + 0.3, 1.3);
    else if (k === 3) v = d.p;
    else v = d.p + (d.pFinal - d.p) * f(M.steps[4].t + 0.3, 0.8);
    r.val.textContent = k >= 3 && !d.kept && (k === 4 || t >= M.steps[3].t + 0.9 + (d.rank - 1) * 0.1) ? (k === 4 ? 'cut' : pc(d.p) + ' · cut') : pc(v) + (k === 4 && d.picked && t >= M.steps[4].t + 1.0 ? '  ← picked' : '');
    r.val.setAttribute('fill', k === 4 && d.picked && t >= M.steps[4].t + 1.0 ? C.hi : C.muted);
    r.val.setAttribute('font-weight', k === 4 && d.picked ? 700 : 400);
  });
}

window.lab = {
  get duration() { return M ? M.duration : 12.5; },
  get markers() { return M ? M.markers : []; },
  seek(t) { if (!tl) return; T = Math.max(0, Math.min(M.duration, t)); tl.seek(T, false); setState(T); },
  mount(r, params) {
    root = r; M = model(params); T = 0;
    build(); this.seek(0);
    ro = new ResizeObserver(() => { if (root.clientWidth !== lastW || root.clientHeight !== lastH) { lastW = root.clientWidth; lastH = root.clientHeight; build(); this.seek(T); } });
    ro.observe(root);
  },
  update(params) { M = model(params); T = 0; build(); this.seek(0); },
  destroy() { if (ro) ro.disconnect(); if (tl) tl.kill(); if (svg) svg.remove(); svg = tl = M = null; }
};

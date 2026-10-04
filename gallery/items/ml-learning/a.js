// p5.js: the scatter with the model's line, red error gaps, a faint trail of earlier lines,
// and two dial gauges (slope, intercept) that turn as gradient descent steps forward.
// The host owns playback: seek(t) sets the step shown; the draw loop only renders that state.
let inst = null, M = null, T = 0, rootEl = null;
const INK = '#1d2433', MUTED = '#5b6475', LINE = '#dbe0e8', ACC = '#2b59c3', HI = '#c2410c', GOOD = '#1f7a4d', TEAL = '#0f766e';
const TITLE = 'How a model learns: nudging two dials';
const f0 = v => Math.round(v).toLocaleString('en-US');
const big = v => v >= 1e9 ? +(v / 1e9).toPrecision(3) + ' billion' : v >= 1e6 ? +(v / 1e6).toPrecision(3) + ' million' : f0(v);
const num = v => Math.abs(v) >= 1000 ? f0(v) : v.toFixed(Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 1 ? 1 : 2);
const sgn = v => (v >= 0 ? '+' : '−') + num(Math.abs(v));

function stepAt(t) {
  const { lead, span } = M.timing;
  if (t <= lead) return 0;
  const u = Math.min(1, (t - lead) / span);
  return Math.min(M.steps, Math.floor(M.steps * u * u + 1e-9));
}
function caption(k) {
  if (k >= M.steps) return M.summary;
  if (k === 0) return 'Start: a ' + M.start.toLowerCase() + '. Each red gap is how wrong one week’s prediction is.';
  if (M.outcome === 'diverged') return 'Learning rate ' + M.lr + ': each nudge is so big it jumps past the best line, and lands further away.';
  if (M.outcome === 'slow') return 'Learning rate ' + M.lr + ': every nudge points the right way, but each one is tiny.';
  return M.stallStep && k >= M.stallStep ? 'The gaps barely change now: the error has stopped falling.' : 'Each step: measure the error, then nudge both dials a little in the direction that shrinks it.';
}
function wrapText(s, str, maxW) {
  const out = []; let cur = '';
  for (const w of str.split(' ')) { const nx = cur ? cur + ' ' + w : w; if (s.textWidth(nx) > maxW && cur) { out.push(cur); cur = w; } else cur = nx; }
  if (cur) out.push(cur); return out;
}
function dial(s, cx, cy, r, o) {
  const a0 = s.radians(135), sweep = s.radians(270), [lo, hi] = o.range;
  const off = o.value < lo || o.value > hi, frac = Math.max(0, Math.min(1, (o.value - lo) / (hi - lo))), a = a0 + frac * sweep;
  s.noStroke(); s.fill('#f6f8fb'); s.stroke(LINE); s.strokeWeight(1); s.circle(cx, cy, r * 2);
  s.noFill(); s.strokeCap(s.ROUND); s.strokeWeight(6); s.stroke('#e8ecf2'); s.arc(cx, cy, r * 2 + 14, r * 2 + 14, a0, a0 + sweep);
  s.stroke(off ? HI : o.color); s.arc(cx, cy, r * 2 + 14, r * 2 + 14, a0, Math.max(a0 + 0.02, a));
  // tick marks for the range ends and zero
  s.strokeWeight(1.5); s.stroke(MUTED);
  for (const v of [lo, 0, hi]) { const b = a0 + (v - lo) / (hi - lo) * sweep; s.line(cx + Math.cos(b) * (r - 6), cy + Math.sin(b) * (r - 6), cx + Math.cos(b) * (r - 1), cy + Math.sin(b) * (r - 1)); }
  if (o.target != null) { const b = a0 + (o.target - lo) / (hi - lo) * sweep; s.stroke(GOOD); s.strokeWeight(3); s.line(cx + Math.cos(b) * (r + 2), cy + Math.sin(b) * (r + 2), cx + Math.cos(b) * (r + 14), cy + Math.sin(b) * (r + 14)); }
  s.stroke(off ? HI : INK); s.strokeWeight(3); s.line(cx, cy, cx + Math.cos(a) * (r - 9), cy + Math.sin(a) * (r - 9));
  s.noStroke(); s.fill(off ? HI : INK); s.circle(cx, cy, 9);
  s.textSize(11); s.fill(MUTED); s.textAlign(s.CENTER, s.CENTER);
  s.text(lo, cx + Math.cos(a0) * (r + 4) - 8, cy + Math.sin(a0) * (r + 4) + 12); s.text(hi, cx + Math.cos(a0 + sweep) * (r + 4) + 8, cy + Math.sin(a0 + sweep) * (r + 4) + 12);
  s.textAlign(s.CENTER, s.TOP); s.textSize(12); s.fill(INK); s.textStyle(s.BOLD);
  s.text(o.label + ' ' + o.text, cx, cy + r + 14); s.textStyle(s.NORMAL);
  s.textSize(11); s.fill(off ? HI : MUTED);
  s.text(off ? 'off the dial' : o.unit, cx, cy + r + 30);
  if (o.delta != null) { s.fill(o.color); s.text(o.settled ? 'settled: no more change' : 'this nudge ' + sgn(o.delta), cx, cy + r + 45); }
}

function render(s) {
  const W = s.width, H = s.height, wide = W >= 640, k = stepAt(T), h = M.history[k], prev = k > 0 ? M.history[k - 1] : null, done = k >= M.steps;
  s.background(255); s.textFont('system-ui');
  s.noStroke(); s.fill(INK); s.textAlign(s.LEFT, s.TOP); s.textSize(14); s.textStyle(s.BOLD); s.text(TITLE, 12, 10); s.textStyle(s.NORMAL);
  s.textSize(13); s.fill(done ? INK : MUTED);
  const sub = wrapText(s, caption(k), W - 24); sub.forEach((l, i) => s.text(l, 12, 31 + i * 17));
  const head = 31 + sub.length * 17 + 6;
  // layout: plot left + dial panel right (wide), or plot on top + dial row below (phone)
  const panelW = 240, dialsH = wide ? 0 : 196;
  const pl = { l: 54, r: wide ? W - panelW - 28 : W - 14, t: head + 12, b: H - 40 - dialsH };
  const X = x => pl.l + (x - M.xDomain[0]) / (M.xDomain[1] - M.xDomain[0]) * (pl.r - pl.l);
  const Y = y => pl.b - (y - M.yDomain[0]) / (M.yDomain[1] - M.yDomain[0]) * (pl.b - pl.t);
  // axes and grid
  s.textSize(11); s.strokeWeight(1);
  for (let v = M.yDomain[0]; v <= M.yDomain[1]; v += 100) { s.stroke(v ? '#eef1f5' : LINE); s.line(pl.l, Y(v), pl.r, Y(v)); s.noStroke(); s.fill(MUTED); s.textAlign(s.RIGHT, s.CENTER); s.text(v, pl.l - 6, Y(v)); }
  for (let v = 0; v <= M.xDomain[1]; v += 5) { s.stroke(LINE); s.line(X(v), pl.b, X(v), pl.b + 4); s.noStroke(); s.fill(MUTED); s.textAlign(s.CENTER, s.TOP); s.text(v, X(v), pl.b + 6); }
  s.stroke(LINE); s.line(pl.l, pl.t, pl.l, pl.b);
  s.noStroke(); s.fill(MUTED); s.textSize(12); s.textAlign(s.CENTER, s.TOP); s.text('Active customers (thousands)', (pl.l + pl.r) / 2, pl.b + 21);
  s.push(); s.translate(14, (pl.t + pl.b) / 2); s.rotate(-s.HALF_PI); s.textAlign(s.CENTER, s.CENTER); s.text('Weekly support tickets', 0, 0); s.pop();
  s.textAlign(s.LEFT, s.TOP); s.textSize(11);
  // everything that can leave the plot is clipped to it
  const ctx = s.drawingContext; ctx.save(); ctx.beginPath(); ctx.rect(pl.l - 7, pl.t - 2, pl.r - pl.l + 7, pl.b - pl.t + 4); ctx.clip();
  const lineAt = (q, x) => q.slope * x + q.intercept, x0 = M.xDomain[0], x1 = M.xDomain[1];
  for (let j = Math.max(0, k - 30); j < k; j++) {
    const q = M.history[j], age = (k - j) / 30; s.stroke(43, 89, 195, 20 + 70 * (1 - age)); s.strokeWeight(1); s.line(X(x0), Y(lineAt(q, x0)), X(x1), Y(lineAt(q, x1)));
  }
  s.stroke(194, 65, 12, 210); s.strokeWeight(1.8);
  M.points.forEach(p => s.line(X(p.x), Y(p.y), X(p.x), Y(lineAt(h, p.x))));
  s.stroke(ACC); s.strokeWeight(3); s.line(X(x0), Y(lineAt(h, x0)), X(x1), Y(lineAt(h, x1)));
  if (done) { s.stroke(GOOD); s.strokeWeight(2.2); ctx.setLineDash([7, 5]); s.line(X(x0), Y(lineAt(M.ls, x0)), X(x1), Y(lineAt(M.ls, x1))); ctx.setLineDash([]); }
  s.stroke(255); s.strokeWeight(1.5); s.fill(29, 36, 51, 215); M.points.forEach(p => s.circle(X(p.x), Y(p.y), 8));
  const iy = Y(h.intercept); if (iy >= pl.t && iy <= pl.b) { s.stroke(255); s.strokeWeight(2); s.fill(TEAL); s.circle(X(0), iy, 11); }
  ctx.restore();
  s.noStroke(); s.textSize(11); s.fill(255, 220); s.rect(pl.l + 4, pl.t + 2, s.textWidth('Illustrative data, 20 weeks') + 8, 17, 4);
  s.fill(MUTED); s.textAlign(s.LEFT, s.TOP); s.text('Illustrative data, 20 weeks', pl.l + 8, pl.t + 4);
  // legend in the top-left corner of the plot, which the rising data leave empty
  const items = [[ACC, 'solid', 'Model’s line'], [HI, 'gap', 'Error gap'], [TEAL, 'dot', 'Intercept dial']].concat(done ? [[GOOD, 'dash', 'Least-squares line']] : []);
  s.textSize(11); const lw = 26 + Math.max(...items.map(i => s.textWidth(i[2]))), lgx = pl.l + 14, lgy = pl.t + 28;
  s.noStroke(); s.fill(255, 235); s.rect(lgx - 6, lgy - 4, lw + 12, items.length * 17 + 6, 6);
  items.forEach(([c, kind, label], i) => {
    const y = lgy + 7 + i * 17; s.stroke(c); s.strokeWeight(kind === 'solid' ? 3 : 2);
    if (kind === 'gap') s.line(lgx + 9, y - 6, lgx + 9, y + 6); else if (kind === 'dot') { s.stroke(255); s.fill(c); s.circle(lgx + 9, y, 9); }
    else { if (kind === 'dash') ctx.setLineDash([5, 3]); s.line(lgx, y, lgx + 18, y); ctx.setLineDash([]); }
    s.noStroke(); s.fill(c); s.textAlign(s.LEFT, s.CENTER); s.text(label, lgx + 24, y);
  });
  // dials and the error readout (wide: a centred column on the right; phone: a row under the plot)
  const settled = M.outcome === 'converged' && M.stallStep !== null && k >= M.stallStep + 3;
  const r = wide ? 46 : 34, colH = 2 * (2 * r + 14) + 86 + 56, top = wide ? Math.max(head + 8, (pl.t + pl.b - colH) / 2) : 0;
  const dx1 = wide ? W - panelW / 2 - 12 : W * 0.27, dx2 = wide ? dx1 : W * 0.73;
  const dy1 = wide ? top + r + 10 : H - dialsH + r + 52, dy2 = wide ? dy1 + 2 * r + 86 : dy1;
  dial(s, dx1, dy1, r, { label: 'Slope', text: num(h.slope), unit: 'tickets per 1,000 customers', value: h.slope, range: M.slopeRange, color: ACC, target: done ? M.ls.slope : null, delta: prev ? h.slope - prev.slope : null, settled });
  dial(s, dx2, dy2, r, { label: 'Intercept', text: f0(h.intercept), unit: 'tickets at 0 customers', value: h.intercept, range: M.interceptRange, color: TEAL, target: done ? M.ls.intercept : null, delta: prev ? h.intercept - prev.intercept : null, settled });
  const lossRel = h.loss / M.ls.loss, bad = M.outcome === 'diverged' && k > 0;
  const note = lossRel < 1.01 ? 'as low as it can go (least squares ' + f0(M.ls.loss) + ')' : 'typical miss ≈ ' + big(Math.sqrt(h.loss)) + ' tickets';
  s.noStroke(); s.textAlign(s.LEFT, s.TOP);
  if (wide) {
    const lx = W - panelW - 4, ry = dy2 + r + 66;
    s.textSize(12); s.fill(MUTED); s.text('Step ' + k + ' of ' + M.steps + ' · learning rate ' + M.lr, lx, ry);
    s.textSize(15); s.textStyle(s.BOLD); s.fill(bad ? HI : INK); s.text('Error ' + big(h.loss) + ' tickets²', lx, ry + 18); s.textStyle(s.NORMAL);
    s.textSize(11); s.fill(lossRel < 1.01 ? GOOD : MUTED); s.text(note, lx, ry + 39);
  } else {
    const ry = H - dialsH + 2;
    s.textSize(12); s.fill(MUTED); s.text('Step ' + k + ' of ' + M.steps + ' · rate ' + M.lr, 12, ry);
    s.textAlign(s.RIGHT, s.TOP); s.textStyle(s.BOLD); s.textSize(13); s.fill(bad ? HI : INK); s.text('Error ' + big(h.loss) + ' tickets²', W - 12, ry); s.textStyle(s.NORMAL);
    s.textSize(11); s.fill(lossRel < 1.01 ? GOOD : MUTED); s.text(note, W - 12, ry + 17);
  }
}

window.lab = {
  get duration() { return M.duration; },
  get markers() { return M.markers; },
  seek(t) { T = Math.max(0, Math.min(M.duration, t)); },
  mount(root, params) {
    rootEl = root; M = model(params); T = 0;
    inst = new p5(s => {
      s.setup = () => { s.createCanvas(root.clientWidth, root.clientHeight); s.pixelDensity(Math.min(2, window.devicePixelRatio || 1)); };
      s.windowResized = () => s.resizeCanvas(root.clientWidth, root.clientHeight);
      s.draw = () => render(s);
    }, root);
  },
  update(params) { M = model(params); T = 0; },
  destroy() { if (inst) inst.remove(); inst = null; M = null; }
};

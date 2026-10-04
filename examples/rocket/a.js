// p5.js: rocket column with force arrows (left) + speed vs escape speed over time (right).
// The host owns playback: it calls lab.seek(t) with playback seconds 0..duration.
let inst = null, M = null, simT = 0;
const PLAY = 12; // playback seconds for the whole run

function stateAt(t) {
  const f = M.frames;
  if (t <= f[0].t) return f[0];
  let i = Math.min(f.length - 2, Math.max(0, Math.floor(t)));
  while (i > 0 && f[i].t > t) i--;
  while (i < f.length - 2 && f[i + 1].t < t) i++;
  const a = f[i], b = f[Math.min(i + 1, f.length - 1)];
  const k = b.t > a.t ? Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))) : 0;
  const L = (x, y) => x + (y - x) * k;
  return { t, h: L(a.h, b.h), v: L(a.v, b.v), m: L(a.m, b.m), thrust: a.thrust, weight: L(a.weight, b.weight), vEsc: L(a.vEsc, b.vEsc), phase: a.phase };
}
function niceStep(range, n) {
  const raw = range / n, p = Math.pow(10, Math.floor(Math.log10(raw)));
  return [1, 2, 2.5, 5, 10].map(x => x * p).find(x => raw <= x);
}
function arrow(s, x, y, dy, col, label, align) {
  if (Math.abs(dy) < 2) return;
  s.stroke(col); s.strokeWeight(3); s.line(x, y, x, y + dy);
  s.noStroke(); s.fill(col);
  const d = Math.sign(dy);
  s.triangle(x - 6, y + dy - d * 2, x + 6, y + dy - d * 2, x, y + dy + d * 8);
  s.textSize(11); s.textAlign(align, s.CENTER); s.text(label, x + (align === s.LEFT ? 10 : -10), y + dy / 2);
}

window.lab = {
  get duration() { return PLAY; },
  seek(t) { simT = Math.max(0, Math.min(1, t / PLAY)) * M.tEnd; },
  mount(root, params) {
    M = model(params); simT = 0;
    inst = new p5(s => {
      s.setup = () => { s.createCanvas(root.clientWidth, root.clientHeight); s.textFont('system-ui'); };
      s.windowResized = () => s.resizeCanvas(root.clientWidth, root.clientHeight);
      s.draw = () => {
        const W = s.width, H = s.height, st = stateAt(simT);
        const top = 80, bot = H - 40, split = Math.max(190, Math.min(300, W * 0.36));
        s.background(255);

        // Readout and outcome
        const phase = { pad: 'On the pad', burn: 'Engine burning', coast: 'Coasting, engine off', landed: 'Back on the ground' }[st.phase] || '';
        s.noStroke(); s.textAlign(s.LEFT, s.TOP); s.textSize(13); s.fill(29, 36, 51);
        s.text('t = ' + st.t.toFixed(0) + ' s   ' + phase, 14, 12);
        s.fill(91, 100, 117); s.textSize(12);
        s.text('Altitude ' + Math.round(st.h / 1000).toLocaleString() + ' km   Speed ' + (st.v / 1000).toFixed(2) + ' km/s   Escape speed here ' + (st.vEsc / 1000).toFixed(2) + ' km/s', 14, 32);
        const done = simT >= M.tEnd - 1e-6 || (M.crossT !== null && simT >= M.crossT);
        if (done || M.outcome === 'no-liftoff') {
          s.textSize(12.5); s.fill(M.outcome === 'escape' ? s.color(31, 122, 77) : s.color(194, 65, 12));
          s.text(M.summary, 14, 50);
        }

        // Left: altitude column
        const maxH = Math.max(1000, M.maxH);
        const Yh = h => bot - (h / maxH) * (bot - top - 46);   // leave room for the rocket body above the top tick
        s.noStroke(); s.fill(228, 238, 230); s.rect(0, bot, split, H - bot);
        s.stroke(170, 190, 175); s.strokeWeight(1); s.line(0, bot, split, bot);
        const hs = niceStep(maxH / 1000, 4);
        s.textSize(10.5); s.textAlign(s.LEFT, s.CENTER);
        for (let km = 0; km <= maxH / 1000 + 1e-9; km += hs) {
          s.stroke(232, 235, 240); s.line(40, Yh(km * 1000), split - 8, Yh(km * 1000));
          s.noStroke(); s.fill(120, 128, 142); s.text(Math.round(km).toLocaleString() + ' km', 4, Yh(km * 1000));
        }
        const rx = split * 0.5, ry = Yh(st.h);
        s.noStroke(); s.fill(29, 36, 51);
        s.rect(rx - 6, ry - 30, 12, 30, 2); s.triangle(rx - 6, ry - 30, rx + 6, ry - 30, rx, ry - 44);
        if (st.phase === 'burn' || (st.phase === 'pad' && M.outcome !== 'no-liftoff')) {
          const flick = 14 + 4 * Math.sin(s.frameCount * 0.6);
          s.fill(234, 140, 30); s.triangle(rx - 5, ry, rx + 5, ry, rx, ry + flick);
        }
        // Force arrows, scaled to the larger of liftoff thrust and liftoff weight
        const fScale = 70 / Math.max(M.thrustN, M.frames[0].weight);
        arrow(s, rx + 22, ry - 22, -st.thrust * fScale, s.color(194, 65, 12), 'Thrust ' + (st.thrust / 1e6).toFixed(0) + ' MN', s.LEFT);
        arrow(s, rx - 22, ry - 22, st.weight * fScale, s.color(91, 100, 117), 'Weight ' + (st.weight / 1e6).toFixed(1) + ' MN', s.RIGHT);

        // Right: speed vs escape speed
        const cx0 = split + 52, cx1 = W - 18, cy0 = top, cy1 = bot;
        if (cx1 - cx0 < 80) return;
        const vHi = Math.max(M.vMax, M.frames[0].vEsc) * 1.08, vLo = Math.min(0, M.vMin * 1.08);
        const X = t => cx0 + (t / M.tEnd) * (cx1 - cx0), Yv = v => cy1 - ((v - vLo) / (vHi - vLo)) * (cy1 - cy0);
        const vs = niceStep((vHi - vLo) / 1000, 5), ts = niceStep(M.tEnd, 5);
        s.textSize(10.5);
        for (let k = Math.ceil(vLo / 1000 / vs) * vs; k <= vHi / 1000; k += vs) {
          s.stroke(236, 239, 243); s.line(cx0, Yv(k * 1000), cx1, Yv(k * 1000));
          s.noStroke(); s.fill(120, 128, 142); s.textAlign(s.RIGHT, s.CENTER); s.text(+k.toFixed(1) + '', cx0 - 6, Yv(k * 1000));
        }
        s.textAlign(s.CENTER, s.TOP);
        for (let t = 0; t <= M.tEnd + 1e-9; t += ts) { s.noStroke(); s.text(Math.round(t) + ' s', X(t), cy1 + 6); }
        s.push(); s.translate(cx0 - 38, (cy0 + cy1) / 2); s.rotate(-Math.PI / 2); s.textAlign(s.CENTER, s.TOP); s.text('Speed (km/s)', 0, 0); s.pop();
        s.stroke(200); s.line(cx0, cy1, cx1, cy1); s.line(cx0, cy0, cx0, cy1);
        // Burnout marker
        s.stroke(210, 214, 222); s.drawingContext.setLineDash([3, 4]); s.line(X(M.burnTime), cy0, X(M.burnTime), cy1); s.drawingContext.setLineDash([]);
        s.noStroke(); s.fill(120, 128, 142); s.textAlign(s.LEFT, s.TOP); s.text('Engine cutoff', X(M.burnTime) + 4, cy0);
        // Escape speed curve (full run), dashed
        s.noFill(); s.stroke(194, 65, 12); s.strokeWeight(1.5); s.drawingContext.setLineDash([6, 4]);
        s.beginShape(); M.frames.forEach(f => s.vertex(X(f.t), Yv(f.vEsc))); s.endShape(); s.drawingContext.setLineDash([]);
        s.noStroke(); s.fill(194, 65, 12); s.textAlign(s.RIGHT, s.BOTTOM); s.text('Escape speed', cx1, Yv(M.frames[M.frames.length - 1].vEsc) - 4);
        // Rocket speed up to now
        s.noFill(); s.stroke(43, 89, 195); s.strokeWeight(2.5); s.beginShape();
        for (const f of M.frames) { if (f.t > simT) break; s.vertex(X(f.t), Yv(f.v)); }
        s.vertex(X(st.t), Yv(st.v)); s.endShape();
        s.noStroke(); s.fill(43, 89, 195); s.circle(X(st.t), Yv(st.v), 9);
        if (M.crossT !== null && simT >= M.crossT) {
          const c = stateAt(M.crossT);
          s.fill(31, 122, 77); s.circle(X(c.t), Yv(c.v), 10);
          s.textAlign(s.RIGHT, s.BOTTOM); s.text('Passes escape speed', X(c.t) - 6, Yv(c.v) - 6);
        }
      };
    }, root);
  },
  update(params) { M = model(params); simT = 0; },
  destroy() { if (inst) inst.remove(); inst = null; M = null; }
};

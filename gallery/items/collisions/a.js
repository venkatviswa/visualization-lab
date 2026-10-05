// p5: the track, two carts sized by mass with velocity arrows, and two bars underneath (total momentum, total kinetic
// energy) that are the lesson: one never moves, the other drops at the hit unless the collision is elastic.
let inst = null, M = null, simT = 0;
const C = { ink: [29, 36, 51], muted: [91, 100, 117], line: [219, 224, 232], accent: [43, 89, 195], hi: [194, 65, 12], good: [31, 122, 77], teal: [15, 118, 110], soft: [244, 246, 249] };
const fmt = v => (Math.round(v * 100) / 100).toFixed(2);

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  seek(t) { simT = t; },
  mount(root, params) {
    M = model(params); simT = 0;
    inst = new p5(s => {
      s.setup = () => { s.createCanvas(root.clientWidth, root.clientHeight); s.textFont('system-ui'); };
      s.windowResized = () => s.resizeCanvas(root.clientWidth, root.clientHeight);
      const arrow = (x, y, v, col) => { if (Math.abs(v) < 0.05) return; const len = v * 22; s.stroke(...col); s.strokeWeight(2.5); s.line(x, y, x + len, y); const d = Math.sign(v); s.noStroke(); s.fill(...col); s.triangle(x + len, y, x + len - 8 * d, y - 5, x + len - 8 * d, y + 5); };
      s.draw = () => {
        const W = s.width, H = s.height, narrow = W < 560, t = Math.min(simT, M.duration), done = simT >= M.duration - 0.05;
        let k = 0; M.steps.forEach((st, j) => { if (st.t <= t + 1e-6) k = j; });
        const i = Math.min(M.series.length - 1, Math.round(t * 60)), cur = M.series[i], hit = t >= M.tc;
        s.background(255);
        s.noStroke(); s.fill(...C.ink); s.textAlign(s.LEFT, s.TOP); s.textStyle(s.BOLD); s.textSize(14);
        const title = (narrow ? 'Collisions · ' : 'Collisions · ') + (done ? 'the balance sheet' : M.steps[k].title), tl = s.textWidth(title) > W - 32 ? 2 : 1;
        s.text(title, 16, 10, W - 32); s.textStyle(s.NORMAL); s.textSize(12); s.fill(...C.muted);
        const noteY = 12 + tl * 18; s.text(done ? M.summary : M.steps[k].note, 16, noteY, W - 32, 50);
        // track: fit the positions the series visits
        const top = noteY + (narrow ? 66 : 58), barsH = narrow ? 100 : 110, trackY = top + Math.max(70, (H - top - barsH) * 0.55), xs = M.series.flatMap(q => [q.x1 - M.L1 / 2, q.x2 + M.L2 / 2]);
        const minX = Math.min(0, ...xs) - 1.2, maxX = Math.max(8, ...xs) + 1.2, sc = (W - 40) / (maxX - minX), X = v => 20 + (v - minX) * sc;
        s.stroke(...C.line); s.strokeWeight(3); s.line(20, trackY, W - 20, trackY);
        s.noStroke(); s.fill(...C.muted); s.textSize(10.5); s.textAlign(s.CENTER, s.TOP);
        for (let m = Math.ceil(minX); m <= maxX; m += maxX - minX > 16 ? 4 : 2) { s.stroke(...C.line); s.strokeWeight(1); s.line(X(m), trackY, X(m), trackY + 6); s.noStroke(); s.text(m + ' m', X(m), trackY + 9); }
        // carts: height scales with mass so a 4 kg cart looks heavier
        const carts = [[cur.x1, M.L1, M.m1, cur.v1, C.accent, 'cart 1'], [cur.x2, M.L2, M.m2, cur.v2, C.teal, 'cart 2']];
        carts.forEach(([x, L, m, v, col, name]) => {
          const w = Math.max(L * sc, narrow ? 26 : 34), h = Math.min(64, 24 + 14 * Math.sqrt(m)), cx = X(x);
          s.noStroke(); s.fill(...col); s.rect(cx - w / 2, trackY - h - 6, w, h, 5);
          s.fill(...C.ink); s.circle(cx - w / 3, trackY - 3, 8); s.circle(cx + w / 3, trackY - 3, 8);
          s.fill(255); s.textAlign(s.CENTER, s.CENTER); s.textSize(11); s.textStyle(s.BOLD); s.text(m + ' kg', cx, trackY - h / 2 - 6); s.textStyle(s.NORMAL);
          arrow(cx + (v >= 0 ? w / 2 + 4 : -w / 2 - 4), trackY - h - 16, v, col);
          const stuck = hit && M.e === 0;
          s.noStroke(); s.fill(...C.ink); s.textSize(10.5); s.textAlign(s.CENTER, s.BOTTOM); if (!stuck || name === 'cart 2') s.text((stuck ? 'stuck together' : name) + ' · ' + fmt(Math.abs(v)) + ' m/s', stuck ? X((cur.x1 + cur.x2) / 2) : cx, trackY - h - 20);
        });
        if (hit && t < M.tc + 0.4) { s.noStroke(); s.fill(194, 65, 12, 180 * (1 - (t - M.tc) / 0.4)); s.circle(X((cur.x1 + M.L1 / 2 + cur.x2 - M.L2 / 2) / 2), trackY - 24, 24 + 60 * (t - M.tc) / 0.4); }
        // the two bars: momentum (always full) and energy (drops at the hit unless elastic)
        const by = trackY + 40, bw = W - 32 - (narrow ? 0 : 140), bh = narrow ? 16 : 20, label = narrow ? 70 : 150;
        const bars = [['Momentum', cur.p, M.pBefore, C.accent, fmt(cur.p) + ' kg·m/s'], ['Kinetic energy', cur.k, M.kBefore, hit && M.e < 1 ? C.hi : C.good, fmt(cur.k) + ' J' + (hit && M.e < 1 ? ' (−' + fmt(M.loss) + ')' : '')]];
        bars.forEach(([name, v, full, col, text], j) => {
          const y = by + j * (bh + 22);
          s.noStroke(); s.fill(...C.ink); s.textAlign(s.LEFT, s.CENTER); s.textSize(11.5); s.text(name, 16, y + bh / 2);
          s.fill(...C.soft); s.rect(16 + label, y, bw - label, bh, 5);
          s.fill(...col); s.rect(16 + label, y, Math.max(0, (bw - label) * v / full), bh, 5);
          s.fill(...C.ink); s.textAlign(s.LEFT, s.CENTER); s.text(text, 16 + label + 8, y + bh / 2);
        });
        s.noStroke(); s.fill(...C.muted); s.textAlign(s.LEFT, s.TOP); s.textSize(10.5);
        s.text(narrow ? 'elasticity ' + M.e + ' · ' + M.kind : 'elasticity ' + M.e + ' (' + M.kind + ') · the momentum bar never moves; the energy bar drops by ½ μ (1 − e²) Δv²', 16, by + 2 * (bh + 22) + 2, W - 32);
      };
    }, root);
  },
  update(params) { M = model(params); simT = 0; },
  destroy() { if (inst) inst.remove(); inst = null; M = null; }
};

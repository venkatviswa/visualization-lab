let inst = null, P = null, M = null, simT = 0, ghosts = [];
const G = 9.81;

function setParams(p) {
  // Keep up to 3 completed launches as faint "ghost" paths for comparison.
  if (M && simT >= M.tFlight - 1e-6) {
    ghosts.push({ m: M, angle: P.angle });
    if (ghosts.length > 3) ghosts.shift();
  }
  P = p; M = model(p); simT = 0;
}

window.lab = {
  // The host owns playback: real-time flight, so playback seconds = flight seconds.
  get duration() { return M ? Math.max(1.5, M.tFlight) : 3; },
  seek(t) { simT = Math.min(t, M.tFlight); },
  mount(root, params) {
    setParams(params);
    inst = new p5(s => {
      s.setup = () => { s.createCanvas(root.clientWidth, root.clientHeight); s.textFont('system-ui'); };
      s.windowResized = () => s.resizeCanvas(root.clientWidth, root.clientHeight);
      s.draw = () => {
        const W = s.width, H = s.height, padL = 40, padR = 28, padB = 40, padT = 72;
        const maxR = P.speed * P.speed / G, maxH = maxR / 2;   // fixed scale per speed
        const sc = Math.min((W - padL - padR) / maxR, (H - padT - padB) / maxH);
        const X = x => padL + x * sc, Y = y => H - padB - y * sc;
        s.background(255);

        // Ground with distance ticks
        const step = [1, 2, 5, 10, 20, 25, 50, 100].find(v => maxR / v <= 8);
        s.stroke(200); s.strokeWeight(1); s.line(padL, Y(0), X(maxR), Y(0));
        s.textSize(11); s.textAlign(s.CENTER, s.TOP);
        for (let d = 0; d <= maxR + 1e-9; d += step) {
          s.stroke(200); s.line(X(d), Y(0), X(d), Y(0) + 5);
          s.noStroke(); s.fill(91, 100, 117); s.text(d + ' m', X(d), Y(0) + 8);
        }

        // Earlier launches
        ghosts.forEach((g, i) => {
          s.noFill(); s.stroke(148, 163, 184, 90 + i * 50); s.strokeWeight(1.5);
          s.beginShape(); g.m.points.forEach(pt => s.vertex(X(pt.x), Y(pt.y))); s.endShape();
          s.noStroke(); s.fill(148, 163, 184); s.textAlign(s.CENTER, s.BOTTOM);
          s.text(g.angle + '\u00b0', X(g.m.range), Y(0) - 4);
        });

        // Current flight, at the time the host chose
        const t = simT;
        s.noFill(); s.stroke(43, 89, 195); s.strokeWeight(2.5); s.beginShape();
        for (const pt of M.points) { if (pt.t > t) break; s.vertex(X(pt.x), Y(pt.y)); }
        const bx = M.vx * t, by = Math.max(0, M.vy * t - 0.5 * G * t * t);
        s.vertex(X(bx), Y(by)); s.endShape();
        s.noStroke(); s.fill(194, 65, 12); s.circle(X(bx), Y(by), 12);
        if (t >= M.tFlight) { s.textAlign(s.CENTER, s.BOTTOM); s.text(M.range.toFixed(1) + ' m', X(M.range), Y(0) - 12); }

        // Readout
        s.textAlign(s.LEFT, s.TOP); s.textSize(13); s.fill(29, 36, 51);
        s.text('Angle ' + P.angle + '\u00b0    Speed ' + P.speed + ' m/s', 16, 14);
        s.fill(91, 100, 117);
        s.text('Range ' + M.range.toFixed(1) + ' m    Max height ' + M.maxHeight.toFixed(1) + ' m    Flight ' + M.tFlight.toFixed(2) + ' s', 16, 34);
      };
    }, root);
  },
  update(params) { setParams(params); },
  destroy() { if (inst) inst.remove(); inst = null; ghosts = []; M = null; }
};

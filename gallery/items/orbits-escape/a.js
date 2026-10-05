// p5 top view: the planet, the launch point, the path drawn up to the clock and the body on it, with the closed-form
// orbit drawn faintly underneath so the integrated path can be seen to follow it. Scale fits the whole path.
let inst = null, M = null, simT = 0;
const C = { ink: [29, 36, 51], muted: [91, 100, 117], line: [219, 224, 232], accent: [43, 89, 195], hi: [194, 65, 12], good: [31, 122, 77], bad: [180, 35, 24], soft: [244, 246, 249] };
const fmtKm = v => Math.round(v).toLocaleString('en-US') + ' km';
const fmtH = s => s >= 3600 ? (s / 3600).toFixed(2) + ' h' : Math.round(s / 60) + ' min';

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  seek(t) { simT = t; },
  mount(root, params) {
    M = model(params); simT = 0;
    inst = new p5(s => {
      s.setup = () => { s.createCanvas(root.clientWidth, root.clientHeight); s.textFont('system-ui'); };
      s.windowResized = () => s.resizeCanvas(root.clientWidth, root.clientHeight);
      s.draw = () => {
        const W = s.width, H = s.height, narrow = W < 560, t = Math.min(simT, M.duration), done = simT >= M.duration - 0.05;
        let k = 0; M.steps.forEach((st, j) => { if (st.t <= t + 1e-6) k = j; });
        let i = 0; while (i < M.path.length - 1 && M.path[i + 1].at <= t + 1e-6) i++;
        const cur = M.path[i];
        s.background(255);
        s.noStroke(); s.fill(...C.ink); s.textAlign(s.LEFT, s.TOP); s.textStyle(s.BOLD); s.textSize(14);
        const title = (narrow ? 'Orbits · ' : "Newton's cannon · ") + (done ? 'the verdict' : M.steps[k].title), tl = s.textWidth(title) > W - 32 ? 2 : 1;
        s.text(title, 16, 10, W - 32); s.textStyle(s.NORMAL); s.textSize(12); s.fill(...C.muted);
        const noteY = 12 + tl * 18; s.text(done ? M.summary : M.steps[k].note, 16, noteY, W - 32, 50);
        // stage and scale: fit the whole path (plus the planet) into the stage
        const top = noteY + (narrow ? 66 : 56), stageH = H - top - (narrow ? 42 : 26), stageW = W - 32;
        const xs = M.path.map(q => q.x), ys = M.path.map(q => q.y);
        const minX = Math.min(-M.R, ...xs), maxX = Math.max(M.R, ...xs), minY = Math.min(-M.R, ...ys), maxY = Math.max(M.R, ...ys);
        const sc = Math.min(stageW / (maxX - minX), stageH / (maxY - minY)) * 0.94;
        const cx = 16 + stageW / 2 - ((minX + maxX) / 2) * sc, cy = top + stageH / 2 + ((minY + maxY) / 2) * sc;
        const X = v => cx + v * sc, Y = v => cy - v * sc; // model y points "up" on screen
        // planet, atmosphere ring (the 300 km launch altitude) and the closed-form orbit as a faint guide
        s.noStroke(); s.fill(...C.soft); s.circle(X(0), Y(0), 2 * (M.R + M.h0) * sc);
        s.fill(190, 206, 230); s.circle(X(0), Y(0), 2 * M.R * sc);
        s.fill(...C.muted); s.textSize(10.5); s.textAlign(s.CENTER, s.CENTER); if (M.R * sc > 26) s.text('planet', X(0), Y(0));
        if (!M.escapes && !M.crashes && M.a) {
          // ellipse with one focus at the planet; periapsis on the launch side when launched horizontally
          const b = M.a * Math.sqrt(1 - M.e * M.e);
          s.push(); s.translate(X(0), Y(0)); s.noFill(); s.stroke(170, 180, 200); s.strokeWeight(1.5); s.drawingContext.setLineDash([5, 5]);
          const ox = -(M.a * M.e) * sc; s.rotate(-M.periapsisAngle); s.ellipse(ox, 0, 2 * M.a * sc, 2 * b * sc); s.drawingContext.setLineDash([]); s.pop();
        }
        // the integrated path so far
        s.noFill(); s.stroke(...C.accent); s.strokeWeight(2); s.beginShape(); for (let j = 0; j <= i; j++) s.vertex(X(M.path[j].x), Y(M.path[j].y)); s.endShape();
        // launch marker and the body
        s.noStroke(); s.fill(...C.muted); s.circle(X(M.path[0].x), Y(M.path[0].y), 6);
        s.fill(...(done && M.crashes ? C.bad : C.accent)); s.circle(X(cur.x), Y(cur.y), narrow ? 9 : 11);
        if (done && M.crashes) { s.fill(...C.bad); s.textAlign(s.LEFT, s.CENTER); s.textSize(11); s.text(' impact', X(cur.x) + 6, Y(cur.y)); }
        // readouts
        s.fill(...C.ink); s.textAlign(s.LEFT, s.BOTTOM); s.textSize(11);
        const line1 = 't = ' + fmtH(cur.t) + ' · altitude ' + fmtKm(cur.r - M.R) + ' · speed ' + cur.v.toFixed(2) + ' km/s';
        s.text(line1, 16, H - 8);
        s.textAlign(narrow ? s.LEFT : s.RIGHT, s.BOTTOM); s.fill(...C.muted);
        s.text(narrow ? 'circular ' + M.vCirc.toFixed(2) + ' · escape ' + M.vEsc.toFixed(2) + ' km/s' : 'circular speed ' + M.vCirc.toFixed(2) + ' km/s · escape ' + M.vEsc.toFixed(2) + ' km/s · energy ' + M.energy.toFixed(1) + ' km²/s²', narrow ? 16 : W - 16, narrow ? H - 24 : H - 8);
        if (!narrow) { s.textAlign(s.RIGHT, s.TOP); s.text(M.crashes ? 'the path would dip ' + fmtKm(M.R - M.rp) + ' below the surface' : M.escapes ? 'open path' : 'closed orbit: ' + fmtKm(M.rp - M.R) + ' to ' + fmtKm(M.ra - M.R) + ' altitude, period ' + fmtH(M.period), W - 16, top - 14); }
      };
    }, root);
  },
  update(params) { M = model(params); simT = 0; },
  destroy() { if (inst) inst.remove(); inst = null; M = null; }
};

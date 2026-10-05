// p5: the pendulum hangs from a pivot that slides sideways with the drive; the bob swings along the model's integrated
// series, a fading arc shows where it has been, and a small meter beside it fills toward the steady amplitude.
// seek(t) picks the sample at t; nothing is simulated here.
let inst = null, M = null, simT = 0, rootEl = null;
const C = { ink: [29, 36, 51], muted: [91, 100, 117], line: [219, 224, 232], accent: [43, 89, 195], hi: [194, 65, 12], good: [31, 122, 77], soft: [244, 246, 249] };
const deg = v => (v * 180 / Math.PI).toFixed(1) + '°';

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  seek(t) { simT = t; },
  mount(root, params) {
    rootEl = root; M = model(params); simT = 0;
    inst = new p5(s => {
      s.setup = () => { s.createCanvas(root.clientWidth, root.clientHeight); s.textFont('system-ui'); };
      s.windowResized = () => s.resizeCanvas(root.clientWidth, root.clientHeight);
      s.draw = () => {
        const W = s.width, H = s.height, narrow = W < 560, t = Math.min(simT, M.duration), done = simT >= M.duration - 0.05;
        const i = Math.min(M.series.length - 1, Math.round(t * 60)), cur = M.series[i];
        let k = 0; M.steps.forEach((st, j) => { if (st.t <= t + 1e-6) k = j; });
        s.background(255);
        // header
        s.noStroke(); s.fill(...C.ink); s.textAlign(s.LEFT, s.TOP); s.textStyle(s.BOLD); s.textSize(14);
        const title = (narrow ? 'Resonance · ' : 'Pendulum and resonance · ') + (done ? 'steady state' : M.steps[k].title), titleLines = s.textWidth(title) > W - 32 ? 2 : 1;
        s.text(title, 16, 10, W - 32);
        s.textStyle(s.NORMAL); s.textSize(12); s.fill(...C.muted);
        const noteY = 12 + titleLines * 18; s.text(done ? M.summary : M.steps[k].note, 16, noteY, W - 32, 48);
        // geometry: pivot track across the top of the stage, bob below; the pivot slides with the drive
        const top = noteY + (narrow ? 62 : 54), stageH = H - top - 16, meterW = narrow ? 0 : 150;
        const cx = (W - meterW) / 2, rodLen = Math.min(stageH * 0.78, (W - meterW) * 0.45) * (0.7 + 0.3 * (M.L - 0.5) / 1.5);
        const pivotX = cx + (cur.drive / M.a) * (narrow ? 22 : 34), pivotY = top + 24;
        const bx = pivotX + rodLen * Math.sin(cur.theta), by = pivotY + rodLen * Math.cos(cur.theta);
        s.stroke(...C.line); s.strokeWeight(2); s.line(cx - 60, pivotY, cx + 60, pivotY); // the track the pivot slides on
        s.noStroke(); s.fill(...C.muted); s.textSize(10.5); s.textAlign(s.CENTER, s.BOTTOM); s.text('pivot shaken at ' + M.r.toFixed(2) + ' × natural', cx, pivotY - 8);
        // arc of where the bob has been in the last period
        const back = Math.round(M.period * 60);
        for (let j = Math.max(0, i - back); j < i; j++) { const a = (j - (i - back)) / back; const sx = cx + (M.series[j].drive / M.a) * (narrow ? 22 : 34) + rodLen * Math.sin(M.series[j].theta), sy = pivotY + rodLen * Math.cos(M.series[j].theta); s.noStroke(); s.fill(43, 89, 195, 30 + 120 * a); s.circle(sx, sy, 4); }
        // amplitude guide lines at the steady-state angle
        s.stroke(...C.hi); s.strokeWeight(1); s.drawingContext.setLineDash([4, 4]);
        for (const sgn of [-1, 1]) s.line(cx, pivotY, cx + rodLen * Math.sin(sgn * M.steady), pivotY + rodLen * Math.cos(sgn * M.steady));
        s.drawingContext.setLineDash([]);
        // rod, pivot, bob
        s.stroke(...C.ink); s.strokeWeight(2); s.line(pivotX, pivotY, bx, by);
        s.noStroke(); s.fill(...C.ink); s.circle(pivotX, pivotY, 9);
        s.fill(...C.accent); s.circle(bx, by, narrow ? 22 : 28);
        s.fill(...C.ink); s.textSize(11); s.textAlign(s.CENTER, s.TOP); s.text(deg(Math.abs(cur.theta)), bx, by + (narrow ? 14 : 18));
        // meter: the swing so far against the steady amplitude (wide screens), a line of text on a phone
        const env = M.envelope.filter(e => e.t <= t), sofar = env.length ? Math.max(...env.map(e => e.amp)) : 0;
        if (!narrow) {
          const mx = W - meterW + 10, my = top + 10, mh = stageH - 40, scale = Math.max(M.steady, M.peakAmp) * 1.15;
          s.noStroke(); s.fill(...C.soft); s.rect(mx, my, 26, mh, 6);
          s.fill(...C.accent); const fh = mh * Math.min(1, sofar / scale); s.rect(mx, my + mh - fh, 26, fh, 6);
          s.stroke(...C.hi); s.strokeWeight(2); const sy = my + mh - mh * M.steady / scale; s.line(mx - 4, sy, mx + 30, sy);
          s.stroke(...C.good); s.strokeWeight(1.5); const py = my + mh - mh * M.peakAmp / scale; s.line(mx - 4, py, mx + 30, py);
          s.noStroke(); s.textAlign(s.LEFT, s.CENTER); s.textSize(10.5); s.fill(...C.hi); s.text('steady ' + deg(M.steady), mx + 34, sy);
          s.fill(...C.good); s.text('peak ' + deg(M.peakAmp) + ' at ' + (M.peakR || 0.3).toFixed(2) + ' ×', mx + 34, py + (Math.abs(py - sy) < 14 ? 14 : 0));
          s.fill(...C.ink); s.textStyle(s.BOLD); s.text('swing so far ' + deg(sofar), mx + 34, my + mh + 14); s.textStyle(s.NORMAL);
          s.fill(...C.muted); s.text('lag ' + Math.round(M.lag * 180 / Math.PI) + '° · Q ' + M.q.toFixed(1), mx + 34, my + mh + 30);
        } else { s.noStroke(); s.fill(...C.ink); s.textAlign(s.LEFT, s.BOTTOM); s.textSize(11); s.text('swing so far ' + deg(sofar) + ' · steady ' + deg(M.steady) + ' · peak ' + deg(M.peakAmp), 16, H - 6); }
        // time
        s.fill(...C.muted); s.textAlign(s.RIGHT, s.TOP); s.textSize(11); s.text(t.toFixed(1) + ' s · period ' + M.period.toFixed(2) + ' s', W - 16, top - 14);
      };
    }, root);
  },
  update(params) { M = model(params); simT = 0; },
  destroy() { if (inst) inst.remove(); inst = null; M = null; }
};

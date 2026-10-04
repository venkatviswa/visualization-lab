// p5.js: an animated support queue. Tickets (dots) arrive from the left, wait in the backlog grid, and agents on the
// right resolve them. A sparkline below tracks the backlog over the week against one extra agent.
// The host owns playback: seek(t) sets the hour; the p5 draw loop only renders that state.
const C = { ink: [29, 36, 51], muted: [91, 100, 117], line: [219, 224, 232], arrive: [43, 89, 195], wait: [180, 83, 15], done: [31, 122, 77], hi: [194, 65, 12], agent: [15, 118, 110], idle: [195, 201, 212] };
let inst = null, M = null, T = 0, rootEl = null, cumA = [], cumR = [];

function prep() {
  cumA = [0]; cumR = [0];
  M.hours.forEach((x, i) => {
    cumA.push(cumA[i] + x.arrivals);
    const prev = i ? M.base.backlog[i - 1] : 0;
    cumR.push(cumR[i] + prev + x.arrivals - M.base.backlog[i]);
  });
}
function state(t) {
  const hf = Math.max(0, Math.min(120, t / M.perHour)), k = Math.min(119, Math.floor(hf)), f = hf - k;
  const lerp = (arr, base) => { const p = k ? arr[k - 1] : base; return p + (arr[k] - p) * f; };
  return { hf, k, f, h: M.hours[k], backlog: lerp(M.base.backlog, 0), plus: lerp(M.plus.backlog, 0),
    arrived: cumA[k] + (cumA[k + 1] - cumA[k]) * f, resolved: cumR[k] + (cumR[k + 1] - cumR[k]) * f };
}
function niceUnit(maxB, slots) { for (const u of [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500]) if (maxB / u <= slots) return u; return 1000; }
function wrap(s, str, w) {
  const out = []; let line = '';
  for (const word of str.split(' ')) { const t = line ? line + ' ' + word : word; if (line && s.textWidth(t) > w) { out.push(line); line = word; } else line = t; }
  return out.concat(line);
}
function chip(s, x, y, label, col) {
  s.textSize(12); const w = s.textWidth(label) + 16;
  s.noStroke(); s.fill(col ? s.color(...col, 28) : s.color(243, 245, 248)); s.rect(x, y, w, 22, 11);
  s.fill(...(col || C.ink)); s.textAlign(s.LEFT, s.CENTER); s.text(label, x + 8, y + 11.5);
  return w;
}
function person(s, x, y, busy) {
  s.noStroke(); s.fill(...(busy ? C.agent : C.idle));
  s.circle(x, y - 8, 10); s.rect(x - 8, y - 2, 16, 10, 6, 6, 2, 2);
}

function sketch(s) {
  s.setup = () => { s.createCanvas(rootEl.clientWidth, rootEl.clientHeight); s.textFont('system-ui'); };
  s.windowResized = () => s.resizeCanvas(rootEl.clientWidth, rootEl.clientHeight);
  s.draw = () => {
    if (!M) return;
    const W = s.width, H = s.height, narrow = W < 560, st = state(T), done = T >= M.duration - 1e-6;
    s.background(255);
    // Header
    s.noStroke(); s.fill(...C.ink); s.textAlign(s.LEFT, s.TOP); s.textSize(14); s.textStyle(s.BOLD);
    s.text('Support queue: ' + M.agents + ' agents, ' + M.handle + ' min per ticket', 14, 10); s.textStyle(s.NORMAL);
    s.textSize(12.5); s.fill(...(done ? C.ink : C.muted));
    const cap = +M.base.capacity.toFixed(1), intro = M.maxArrivals > cap ? 'In busy hours tickets arrive faster than the ' + cap + '/h the agents can resolve. Watch what is left each morning.'
      : 'Capacity of ' + cap + '/h covers even the busiest hour (' + M.maxArrivals + '/h).';
    const sub = wrap(s, done ? M.summary : intro, W - 28);
    sub.forEach((l, i) => s.text(l, 14, 30 + i * 16));
    let y = 34 + sub.length * 16;
    // Status chips
    const over = st.h.arrivals > M.base.capacity;
    const mins = Math.floor(st.hf * 60 + 1e-6), clock = st.hf >= 120 ? 'Fri 24:00' : M.hours[Math.floor(mins / 1440) * 24].day + ' ' + String(Math.floor(mins / 60) % 24).padStart(2, '0') + ':' + String(mins % 60).padStart(2, '0');
    const chips = [[clock], ['Arriving ' + st.h.arrivals + '/h', over ? C.hi : null],
      ['Capacity ' + +M.base.capacity.toFixed(1) + '/h'], ['Waiting ' + Math.round(st.backlog), st.backlog > 0.5 ? C.wait : C.done]];
    let cx = 14;
    chips.forEach(([l, c]) => { s.textSize(12); const w = s.textWidth(l) + 16; if (cx + w > W - 10) { cx = 14; y += 28; } cx += chip(s, cx, y, l, c) + 8; });
    y += 36;
    // Scene geometry
    const sparkH = Math.max(110, Math.min(170, H * 0.3)), sceneB = H - sparkH - 18, sceneT = y + 18;
    const laneW = narrow ? 54 : Math.min(180, W * 0.17), outW = narrow ? 44 : Math.min(150, W * 0.14);
    const cols = M.agents > 5 && (sceneB - sceneT) < 9 * 26 ? 2 : 1, agentW = cols * 30 + 14;
    const ax0 = W - 14 - outW - agentW, qx0 = 14 + laneW + 10, qx1 = ax0 - 14;
    s.textSize(11.5); s.fill(...C.muted); s.textAlign(s.LEFT, s.BOTTOM);
    s.text('Arriving', 14, sceneT - 4); s.text(narrow ? 'Waiting' : 'Waiting (backlog)', qx0, sceneT - 4);
    s.textAlign(s.CENTER, s.BOTTOM); s.text('Agents', ax0 + agentW / 2, sceneT - 4);
    s.stroke(...C.line); s.noFill(); s.rect(qx0 - 6, sceneT, qx1 - qx0 + 12, sceneB - sceneT, 8);
    // Backlog grid: fills from the agents' side; one dot may stand for several tickets
    const bw = qx1 - qx0, bh = sceneB - sceneT - 12, pk = Math.max(1, M.base.peak);
    const d = Math.max(6, Math.min(14, Math.floor(Math.sqrt(bw * bh * 0.7 / pk) - 3))), gap = 3, gcols = Math.max(1, Math.floor((qx1 - qx0) / (d + gap))), grows = Math.max(1, Math.floor((sceneB - sceneT - 12) / (d + gap)));
    const unit = niceUnit(Math.max(M.base.peak, 1), gcols * grows), dots = Math.round(st.backlog / unit);
    s.noStroke(); s.fill(...C.wait);
    for (let i = 0; i < dots; i++) {
      const c = Math.floor(i / grows), r = i % grows;
      s.circle(qx1 - c * (d + gap) - d / 2, sceneB - 6 - r * (d + gap) - d / 2, d);
    }
    s.fill(...C.muted); s.textAlign(s.LEFT, s.TOP); s.textSize(11);
    s.text('● = ' + unit + (unit === 1 ? ' ticket' : ' tickets'), qx0, sceneB + 4);
    // Arrival lane: the next tickets travel toward the queue at the current arrival rate
    const midY = (sceneT + sceneB) / 2, sp = narrow ? 11 : 14;
    s.stroke(...C.line); s.line(14, midY, qx0 - 8, midY); s.noStroke(); s.fill(...C.arrive);
    for (let q = Math.ceil(st.arrived); q < st.arrived + laneW / sp; q++) {
      const x = qx0 - 10 - (q - st.arrived) * sp, wob = ((q * 37) % 7 - 3) * 1.6;
      if (x > 16) s.circle(x, midY + wob, 7);
    }
    // Agents: all busy while tickets wait, otherwise as many as the arrivals need
    const busy = st.backlog > 0.5 ? M.agents : Math.min(M.agents, Math.ceil(st.h.arrivals * M.handle / 60 - 1e-9));
    const perCol = Math.ceil(M.agents / cols), rowH = Math.min(34, (sceneB - sceneT - 8) / perCol);
    for (let i = 0; i < M.agents; i++) {
      const c = Math.floor(i / perCol), r = i % perCol;
      const x = ax0 + 14 + c * 30 + 8, yy = sceneT + 10 + rowH * (r + 0.5) + (sceneB - sceneT - 8 - rowH * perCol) / 2;
      person(s, x, yy, i < busy);
      if (i < busy) { s.fill(...C.wait); s.circle(x - 13, yy - 2, 5); }
    }
    // Resolved stream and counter
    s.stroke(...C.line); s.line(ax0 + agentW + 4, midY, W - 14, midY); s.noStroke(); s.fill(...C.done);
    for (let q = Math.floor(st.resolved); q > st.resolved - outW / sp; q--) {
      const x = ax0 + agentW + 8 + (st.resolved - q) * sp, wob = ((q * 53) % 7 - 3) * 1.6;
      if (x < W - 16 && q > 0) s.circle(x, midY + wob, 7);
    }
    s.textAlign(s.RIGHT, s.TOP); s.fill(...C.ink); s.textSize(narrow ? 13 : 15); s.textStyle(s.BOLD);
    s.text(Math.round(st.resolved).toLocaleString(), W - 14, midY + 14); s.textStyle(s.NORMAL);
    s.textSize(11); s.fill(...C.muted); s.text('resolved', W - 14, midY + (narrow ? 31 : 33));
    // Sparkline: backlog over the week, now vs one more agent
    const px0 = narrow ? 40 : 50, px1 = W - (narrow ? 96 : 120), py0 = H - sparkH + 16, py1 = H - 22;
    const maxY = Math.max(10, M.base.peak, M.plus.peak) * 1.1;
    const X = hf => px0 + (hf / 120) * (px1 - px0), Y = v => py1 - (v / maxY) * (py1 - py0);
    s.textSize(11); s.fill(...C.muted); s.noStroke(); s.textAlign(s.LEFT, s.BOTTOM); s.text('Backlog over the week (tickets waiting)', 14, py0 - 6);
    s.textAlign(s.RIGHT, s.CENTER); s.text(Math.round(maxY / 1.1), px0 - 6, Y(maxY / 1.1)); s.text('0', px0 - 6, py1);
    for (let dd = 0; dd < 5; dd++) {
      s.stroke(...C.line); s.line(X(dd * 24), py0, X(dd * 24), py1);
      s.noStroke(); s.fill(...C.muted); s.textAlign(s.CENTER, s.TOP); s.text(M.hours[dd * 24].day, X(dd * 24 + 12), py1 + 4);
    }
    s.stroke(...C.line); s.line(px0, py1, px1, py1); s.line(px0, Y(maxY / 1.1), px1, Y(maxY / 1.1));
    const path = (arr, cur, col, dash, wgt) => {
      s.noFill(); s.stroke(...col); s.strokeWeight(wgt); s.drawingContext.setLineDash(dash);
      s.beginShape(); s.vertex(X(0), Y(0));
      for (let i = 1; i <= Math.floor(st.hf); i++) s.vertex(X(i), Y(arr[i - 1]));
      s.vertex(X(st.hf), Y(cur)); s.endShape(); s.drawingContext.setLineDash([]); s.strokeWeight(1);
    };
    path(M.plus.backlog, st.plus, C.done, [5, 4], 1.8);
    path(M.base.backlog, st.backlog, C.hi, [], 2.5);
    s.noStroke(); s.fill(...C.hi); s.circle(X(st.hf), Y(st.backlog), 7);
    // Direct labels at the right end of the sparkline
    let ly1 = Y(st.backlog), ly2 = Y(st.plus);
    if (Math.abs(ly1 - ly2) < 26) { const mid = Math.min((ly1 + ly2) / 2, py1 - 13), up = ly1 <= ly2 ? -13 : 13; ly1 = mid + up; ly2 = mid - up; }
    const sep = [0, 0];
    s.textAlign(s.LEFT, s.CENTER); s.textSize(11.5);
    s.fill(...C.hi); s.text(M.agents + ' agents: ' + Math.round(st.backlog), px1 + 8, ly1 + sep[0]);
    s.fill(...C.done); s.text((M.agents + 1) + ' agents: ' + Math.round(st.plus), px1 + 8, ly2 + sep[1]);
  };
}

window.lab = {
  get duration() { return M ? M.duration : 12; },
  get markers() { return M ? M.markers : []; },
  seek(t) { T = t; },
  mount(root, params) { rootEl = root; M = model(params); T = 0; prep(); inst = new p5(sketch, root); },
  update(params) { M = model(params); T = 0; prep(); },
  destroy() { if (inst) inst.remove(); inst = null; M = null; }
};

// Story: the agent sits between the customer and its five tools. One paused GSAP timeline moves the packets
// (calls out, results back); seek(t) sets the thought bubble, tool states, approver and trace panel from the model.
const NS = 'http://www.w3.org/2000/svg', FONT = 'system-ui, -apple-system, sans-serif', MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d', bad: '#b42318', teal: '#0f766e',
  amber: '#b4530f', rose: '#9d174d', soft: '#f6f7fa', tint: '#e8eefb', goodTint: '#e6f4ec', badTint: '#fdecea', roseTint: '#fbecf2', amberTint: '#fdf3e8' };
const KIND = { request: ['Customer', C.ink], thought: ['Thought', C.accent], action: ['Action', C.amber], observation: ['Observation', C.teal], human: ['Human', C.rose], final: ['Answer', C.good] };
const SUB = 'A support agent works a double-charge complaint: think, call a tool, read the result, repeat.';
let rootEl, svg, tl, M, L, R, ro, lastT = 0, lastKey = '';
const ctx = document.createElement('canvas').getContext('2d');

function el(tag, a, p) { const n = document.createElementNS(NS, tag); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; }
function tw(s, size, weight, mono) { ctx.font = (weight || 400) + ' ' + size + 'px ' + (mono ? MONO : FONT); return ctx.measureText(s).width; }
function wrap(s, width, size, o) {
  o = o || {}; const words = String(s).split(' '), lines = []; let cur = '';
  for (const w of words) { const nx = cur ? cur + ' ' + w : w; if (cur && tw(nx, size, o.weight, o.mono) > width) { lines.push(cur); cur = w; } else cur = nx; }
  if (cur) lines.push(cur);
  if (o.max && lines.length > o.max) { lines.length = o.max; let last = lines[o.max - 1]; while (last.length > 1 && tw(last + '…', size, o.weight, o.mono) > width) last = last.slice(0, -1); lines[o.max - 1] = last + '…'; }
  return lines;
}
function para(p, x, y, s, width, o) {
  o = o || {}; const size = o.size || 13, lh = o.lh || size * 1.32, lines = wrap(s, width, size, o);
  const t = el('text', { x, y, 'font-size': size, 'font-weight': o.weight || 400, fill: o.fill || C.ink, 'font-family': o.mono ? MONO : FONT, 'text-anchor': o.anchor || 'start', 'font-style': o.italic ? 'italic' : 'normal' }, p);
  lines.forEach((ln, k) => { const ts = el('tspan', { x, dy: k ? lh : 0 }, t); ts.textContent = ln; });
  return lines.length;
}
function icon(p, name, x, y, size, color) { const n = labIcon(name, { x, y, width: size, height: size, stroke: color || C.ink }); p.appendChild(n); return n; }
function clear(g) { while (g.firstChild) g.firstChild.remove(); }

function layout(W, H) {
  const wide = W >= 680, pad = 12, sub = Math.max(wrap(SUB, W - 2 * pad, 12.5).length, wrap(M.summary, W - 2 * pad, 12.5).length);
  const hh = 30 + sub * 16 + 4, sw = wide ? Math.round(W * 0.57) - pad : W - 2 * pad;
  const reqLines = wrap(M.request, sw - 72, 12.5).length, custH = Math.max(38, 14 + reqLines * 16);
  const bw = sw - 24, texts = M.steps.filter(s => s.kind === 'thought' || s.kind === 'final').map(s => s.text);
  const bubLines = Math.max(...texts.map(s => wrap(s, bw - 24, 13).length)), bubH = 34 + bubLines * 17;
  // compact phone: a short root (an embed) cannot hold the story and the trace; the story shrinks a little and the trace panel is dropped
  const compact = !wide && H - hh < 20 + custH + bubH + 112 + 84 + 76 + 120;
  const agentH = compact ? 96 : 112, toolH = compact ? 80 : 84, fixed = 20 + custH + bubH + agentH + toolH + 6 + 30 + 20;
  const sh = wide ? H - hh - pad : compact ? H - hh - pad : Math.min(fixed + 40, Math.max(fixed, H - hh - 200));
  const extra = Math.max(0, sh - fixed), g1 = 6 + extra * 0.2, g2 = 30 + extra * 0.25;
  const st = { x: pad, y: hh, w: sw, h: sh };
  const tr = wide ? { x: pad * 2 + sw, y: hh, w: W - sw - 3 * pad, h: H - hh - pad } : compact ? { x: pad, y: H + 10, w: W - 2 * pad, h: 0, hidden: true } : { x: pad, y: hh + sh + 8, w: W - 2 * pad, h: H - hh - sh - 8 - pad };
  const custY = st.y + 10, bubY = custY + custH + g1, agentY = bubY + bubH + g2 + 26, toolY = st.y + sh - 10 - toolH;
  return { W, H, wide, compact, hh, st, tr, custY, custH, bubY, bubH, bw, agentY, toolY, toolH, cx: st.x + sw / 2 };
}

function build() {
  if (tl) tl.kill(); if (svg) svg.remove();
  const W = Math.max(320, rootEl.clientWidth), H = Math.max(320, rootEl.clientHeight);
  L = layout(W, H); R = { tools: {} }; lastKey = '';
  svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', height: '100%', role: 'img', 'aria-label': 'An AI agent resolving a billing dispute, step by step' });
  rootEl.appendChild(svg);
  el('rect', { width: W, height: H, fill: '#fff' }, svg);
  const head = el('g', {}, svg);
  el('text', { x: 12, y: 22, 'font-size': 14, 'font-weight': 600, fill: C.ink, 'font-family': FONT }, head).textContent = 'Watch an agent resolve a billing dispute';
  R.sub = el('g', {}, head);
  const { st, tr, cx, agentY } = L;
  el('rect', { x: st.x, y: st.y, width: st.w, height: st.h, rx: 14, fill: C.soft }, svg);
  if (!tr.hidden) el('rect', { x: tr.x, y: tr.y, width: tr.w, height: tr.h, rx: 14, fill: '#fff', stroke: C.line }, svg);
  // customer
  const cust = el('g', {}, svg);
  el('circle', { cx: st.x + 30, cy: L.custY + 18, r: 17, fill: '#fff', stroke: C.line }, cust);
  icon(cust, 'user', st.x + 20, L.custY + 8, 20, C.ink);
  el('rect', { x: st.x + 56, y: L.custY, width: st.w - 68, height: L.custH, rx: 10, fill: '#fff', stroke: C.line }, cust);
  para(cust, st.x + 68, L.custY + 22, '“' + M.request + '”', st.w - 92, { size: 12.5, lh: 16 });
  el('text', { x: st.x + 30, y: L.custY + L.custH + 13, 'font-size': 11, fill: C.muted, 'text-anchor': 'middle', 'font-family': FONT }, cust).textContent = 'Dana';
  R.custOk = icon(cust, 'circle-check', st.x + st.w - 30, L.custY + 6, 18, C.good); gsap.set(R.custOk, { opacity: 0 });
  // tool cards and their connector lines
  const n = M.tools.length, gap = 8, cw = (st.w - 20 - gap * (n - 1)) / n;
  const lines = el('g', {}, svg), aBot = agentY + 56 + 26;
  M.tools.forEach((tool, k) => {
    const x = st.x + 10 + k * (cw + gap), y = L.toolY, tx = x + cw / 2;
    const ln = el('line', { x1: cx, y1: aBot, x2: tx, y2: y, stroke: C.line, 'stroke-width': 2 }, lines);
    const g = el('g', {}, svg), box = el('rect', { x, y, width: cw, height: L.toolH, rx: 10, fill: '#fff', stroke: C.line, 'stroke-width': 1.5 }, g);
    const ic = icon(g, tool.icon, tx - 10, y + 9, 20, C.muted);
    para(g, tx, y + 44, tool.label, cw - 8, { size: 11.5, weight: 600, anchor: 'middle', lh: 13.5, max: 2 });
    const stt = el('text', { x: tx, y: y + L.toolH - 9, 'font-size': 11, 'font-weight': 600, fill: C.muted, 'text-anchor': 'middle', 'font-family': FONT }, g);
    R.tools[tool.id] = { box, ic, stt, ln, tx, ty: y };
  });
  // agent
  R.ring = el('circle', { cx, cy: agentY, r: 28, fill: 'none', stroke: C.accent, 'stroke-width': 2, opacity: 0 }, svg);
  R.agent = el('circle', { cx, cy: agentY, r: 26, fill: '#fff', stroke: C.accent, 'stroke-width': 2.5 }, svg);
  icon(svg, 'bot', cx - 15, agentY - 15, 30, C.accent);
  R.agentLbl = el('text', { x: cx, y: agentY + 44, 'font-size': 12, 'font-weight': 600, fill: C.ink, 'text-anchor': 'middle', 'font-family': FONT }, svg);
  R.pills = ['Reason', 'Act', 'Observe'].map((p, k) => {
    const x = cx - 96 + k * 66, g = el('g', {}, svg);
    const r = el('rect', { x, y: agentY + 52, width: 60, height: 20, rx: 10, fill: '#fff', stroke: C.line }, g);
    const t = el('text', { x: x + 30, y: agentY + 66, 'font-size': 11, 'font-weight': 600, fill: C.muted, 'text-anchor': 'middle', 'font-family': FONT }, g);
    t.textContent = p; return { r, t };
  });
  // counters (left) and human approver (right)
  R.count = el('g', {}, svg);
  const hx = cx + 40, hw = Math.min(190, st.x + st.w - 10 - hx);
  R.human = el('g', {}, svg);
  R.humanBox = el('rect', { x: hx, y: agentY - 34, width: hw, height: 64, rx: 10, fill: '#fff', stroke: C.rose, 'stroke-width': 1.5 }, R.human);
  icon(R.human, 'user-check', hx + 8, agentY - 26, 18, C.rose);
  el('text', { x: hx + 31, y: agentY - 13, 'font-size': 12, 'font-weight': 600, fill: C.ink, 'font-family': FONT }, R.human).textContent = L.wide ? 'Billing supervisor' : 'Supervisor';
  el('text', { x: hx + 10, y: agentY + 4, 'font-size': 11, fill: C.muted, 'font-family': FONT }, R.human).textContent = 'Sam Okafor';
  R.humanSt = el('text', { x: hx + 10, y: agentY + 21, 'font-size': 11, 'font-weight': 600, fill: C.rose, 'font-family': FONT }, R.human);
  gsap.set(R.human, { opacity: 0 });
  // thought bubble (content set in setState)
  R.bub = el('g', {}, svg);
  R.bubBox = el('rect', { x: st.x + 12, y: L.bubY, width: L.bw, height: L.bubH, rx: 14, fill: '#fff', stroke: C.accent, 'stroke-width': 1.5 }, R.bub);
  [[0, 8, 4.5], [-9, 18, 3]].forEach(([dx, dy, r]) => el('circle', { cx: cx + dx, cy: L.bubY + L.bubH + dy, r, fill: '#fff', stroke: C.accent, 'stroke-width': 1.5 }, R.bub));
  R.bubTxt = el('g', {}, R.bub);
  R.trace = el('g', {}, svg);
  timeline();
}

function packet(from, to, color, start, dur) {
  const c = el('circle', { cx: from[0], cy: from[1], r: 6, fill: color, stroke: '#fff', 'stroke-width': 2, opacity: 0 }, svg);
  tl.set(c, { opacity: 1, attr: { cx: from[0], cy: from[1] } }, start);
  tl.to(c, { attr: { cx: to[0], cy: to[1] }, duration: Math.min(0.75, dur * 0.75), ease: 'power1.inOut' }, start);
  tl.set(c, { opacity: 0 }, start + dur);
}
function timeline() {
  tl = gsap.timeline({ paused: true });
  const { cx, agentY } = L, aBot = [cx, agentY + 82], hum = [cx + 40, agentY];
  gsap.set(R.bub, { opacity: 0.35 });
  M.steps.forEach((s, k) => {
    const T = s.tool && R.tools[s.tool], tp = T && [T.tx, T.ty];
    if (s.kind === 'thought') {
      tl.to(R.bub, { opacity: 1, duration: 0.25 }, s.start);
      tl.fromTo(R.ring, { attr: { r: 28 }, opacity: 0.7 }, { attr: { r: 42 }, opacity: 0, duration: s.dur * 0.9, immediateRender: false }, s.start);
      const nx = M.steps[k + 1]; if (nx && nx.kind !== 'final') tl.to(R.bub, { opacity: 0.55, duration: 0.25 }, nx.start);
      if (s.text.includes('limit')) tl.to(R.human, { opacity: M.needsApproval ? 1 : 0.6, duration: 0.35 }, s.start + 0.3);
    }
    if (s.kind === 'action') packet(aBot, tp, C.amber, s.start, s.dur);
    if (s.kind === 'observation') packet(tp, aBot, s.status === 'error' ? C.bad : C.teal, s.start, s.dur);
    if (s.kind === 'human') { packet([cx + 28, agentY], hum, C.rose, s.start, s.dur * 0.3); packet(hum, [cx + 28, agentY], C.good, s.start + s.dur * 0.62, s.dur * 0.38); }
    if (s.kind === 'final') { tl.to(R.bub, { opacity: 1, duration: 0.25 }, s.start); tl.to(R.custOk, { opacity: 1, duration: 0.3 }, s.start + 0.6); }
  });
  tl.set({}, {}, M.duration);
}

function stepAt(t) { let k = -1; M.steps.forEach((s, i) => { if (s.start <= t + 1e-6) k = i; }); return k; }
function setState(t) {
  const k = stepAt(t), done = t >= M.duration - 0.05, cur = M.steps[k], appr = M.steps.find(s => s.kind === 'human');
  const approvedNow = appr && t >= appr.start + appr.dur * 0.62, key = k + '|' + done + '|' + !!approvedNow;
  if (key === lastKey) return; lastKey = key;
  const { st, tr, cx, agentY } = L, past = M.steps.slice(0, k + 1);
  clear(R.sub); para(R.sub, 12, 42, done ? M.summary : SUB, L.W - 24, { size: 12.5, fill: C.muted, lh: 16 });
  // thought bubble
  clear(R.bubTxt);
  const lastThought = [...past].reverse().find(s => s.kind === 'thought'), fin = cur && cur.kind === 'final';
  const bx = st.x + 24, by = L.bubY + 20, bw = L.bw - 24;
  R.bubBox.setAttribute('fill', fin ? C.goodTint : '#fff');
  [...R.bub.querySelectorAll('rect,circle')].forEach(n => n.setAttribute('stroke', fin ? C.good : C.accent));
  const hdr = (s, col) => el('text', { x: bx, y: by, 'font-size': 11, 'font-weight': 700, fill: col, 'font-family': FONT, 'letter-spacing': '.04em' }, R.bubTxt).textContent = s.toUpperCase();
  if (fin) { hdr('Reply to Dana', C.good); para(R.bubTxt, bx, by + 20, cur.text, bw, { size: 13, lh: 17 }); }
  else if (!lastThought) { hdr('Reading the request', C.accent); para(R.bubTxt, bx, by + 20, '…', bw, { size: 13 }); }
  else if (!M.showThoughts) { hdr('Thinking (hidden)', C.muted); para(R.bubTxt, bx, by + 20, '· · ·   A customer-facing view hides the reasoning. The agent still thinks before every step.', bw, { size: 13, fill: C.muted, italic: true, lh: 17 }); }
  else { hdr('Thought ' + lastThought.loop, C.accent); para(R.bubTxt, bx, by + 20, lastThought.text, bw, { size: 13, lh: 17, italic: true }); }
  // agent label, phase pills, counters
  const kind = cur ? cur.kind : 'request', waiting = kind === 'human' && !approvedNow;
  R.agentLbl.textContent = done ? 'Done' : waiting ? 'Paused: waiting for approval' : kind === 'final' ? 'Replying' : kind === 'human' ? 'Approved, resuming' : 'Support agent';
  R.agentLbl.setAttribute('fill', waiting ? C.rose : C.ink);
  R.agent.setAttribute('stroke-dasharray', waiting ? '5 4' : 'none'); R.agent.setAttribute('stroke', waiting ? C.rose : C.accent);
  ['thought', 'action', 'observation'].forEach((kd, i) => {
    const on = kind === kd && !done, col = KIND[kd][1];
    R.pills[i].r.setAttribute('fill', on ? col : '#fff'); R.pills[i].r.setAttribute('stroke', on ? col : C.line);
    R.pills[i].t.setAttribute('fill', on ? '#fff' : C.muted);
  });
  clear(R.count);
  const acts = past.filter(s => s.kind === 'action');
  [['Loop', cur ? cur.loop : 0], ['Tool calls', acts.length], ['Retries', acts.filter(s => s.retry).length], ['Approvals', approvedNow ? 1 : 0]].forEach(([lab, v], i) => {
    const y = agentY - 26 + i * 18;
    el('text', { x: st.x + 14, y, 'font-size': 11.5, fill: C.muted, 'font-family': FONT }, R.count).textContent = lab;
    el('text', { x: st.x + 92, y, 'font-size': 12, 'font-weight': 700, fill: C.ink, 'font-family': FONT }, R.count).textContent = v;
  });
  // tools
  M.tools.forEach(tool => {
    const T = R.tools[tool.id], mine = past.filter(s => s.tool === tool.id), last = mine[mine.length - 1];
    const active = cur && cur.tool === tool.id && !done, err = last && last.status === 'error';
    const col = active ? (cur.kind === 'action' ? C.amber : err ? C.bad : C.teal) : last ? (err ? C.bad : C.good) : C.line;
    T.box.setAttribute('stroke', col); T.box.setAttribute('stroke-width', active ? 2.5 : 1.5);
    T.box.setAttribute('fill', active ? (cur.kind === 'action' ? C.amberTint : err ? C.badTint : '#e6f4f2') : err ? C.badTint : '#fff');
    T.ic.setAttribute('stroke', active ? col : last ? C.ink : C.muted);
    T.ln.setAttribute('stroke', active ? col : C.line); T.ln.setAttribute('stroke-width', active ? 3 : 2);
    T.stt.textContent = active && cur.kind === 'action' ? (cur.retry ? 'Retrying…' : 'Calling…') : last && last.kind === 'observation' ? last.short : last ? 'Waiting…' : 'Idle';
    T.stt.setAttribute('fill', err ? C.bad : last && last.kind === 'observation' ? C.good : active ? C.amber : C.muted);
  });
  // human approver status
  const decided = past.some(s => s.text.includes('limit'));
  R.humanSt.textContent = !M.needsApproval ? 'Not needed: under $' + M.limit : approvedNow ? 'Approved: APR-311' : kind === 'human' ? 'Approve ' + M.amountText + '?' : decided ? 'Approval needed' : '';
  R.humanSt.setAttribute('fill', !M.needsApproval ? C.muted : approvedNow ? C.good : C.rose);
  R.humanBox.setAttribute('stroke-dasharray', M.needsApproval ? 'none' : '5 4');
  R.humanBox.setAttribute('stroke', !M.needsApproval ? C.line : approvedNow ? C.good : C.rose);
  drawTrace(past, done, approvedNow);
}

function drawTrace(past, done, approvedNow) {
  clear(R.trace);
  if (L.tr.hidden) return;
  const { tr } = L, fs = L.wide ? 12 : 11.5, lh = fs + 3.5, lw = L.wide ? 84 : 78, tx = tr.x + 10 + lw, tw2 = tr.w - lw - 22, maxL = L.wide ? 3 : 2;
  el('text', { x: tr.x + 12, y: tr.y + 20, 'font-size': 13, 'font-weight': 600, fill: C.ink, 'font-family': FONT }, R.trace).textContent = 'Agent trace';
  el('text', { x: tr.x + tr.w - 12, y: tr.y + 20, 'font-size': 11, fill: C.muted, 'text-anchor': 'end', 'font-family': FONT }, R.trace).textContent = M.showThoughts ? 'all steps' : 'thoughts hidden';
  const vis = [{ kind: 'request', text: M.request }].concat(past.filter(s => s.visible));
  const rows = vis.map((s, j) => {
    const mx = L.wide || j === vis.length - 1 ? maxL : 1;
    const mono = s.kind === 'action', text = s.kind === 'action' ? s.call : s.kind === 'human' && !approvedNow ? 'Asks Sam Okafor (billing supervisor) to approve a ' + M.amountText + ' refund. Waiting…' : s.text;
    const lines = wrap(text, tw2, fs, { mono, max: mx });
    return { s, mono, lines, mx, h: 8 + lines.length * lh };
  });
  let room = tr.h - 34, i = rows.length;
  while (i > 0 && room - rows[i - 1].h - 4 >= (i > 1 ? 18 : 0)) { room -= rows[i - 1].h + 4; i--; }
  let y = tr.y + 32;
  if (i > 0) { el('text', { x: tr.x + 12, y: y + 10, 'font-size': 11, fill: C.muted, 'font-family': FONT }, R.trace).textContent = '↑ ' + i + ' earlier step' + (i > 1 ? 's' : ''); y += 18; }
  rows.slice(i).forEach((r, j, arr) => {
    const now = j === arr.length - 1 && !done && r.s.kind !== 'request', err = r.s.status === 'error';
    const [lab, col0] = KIND[r.s.kind], col = err ? C.bad : col0;
    el('rect', { x: tr.x + 6, y, width: tr.w - 12, height: r.h, rx: 7, fill: now ? C.tint : err ? C.badTint : C.soft, stroke: now ? C.accent : 'none' }, R.trace);
    el('text', { x: tr.x + 14, y: y + 4 + fs, 'font-size': 11, 'font-weight': 700, fill: col, 'font-family': FONT }, R.trace).textContent = r.s.retry ? 'Retry' : err ? 'Error' : lab;
    para(R.trace, tx, y + 4 + fs, r.lines.join(' '), tw2 + 0.5, { size: fs, lh, mono: r.mono, fill: err ? C.bad : C.ink, italic: r.s.kind === 'thought', max: r.mx });
    y += r.h + 4;
  });
}

window.lab = {
  get duration() { return M ? M.duration : 20; },
  get markers() { return M ? M.markers : []; },
  seek(t) { if (!tl) return; lastT = Math.max(0, Math.min(t, M.duration)); tl.seek(lastT, false); setState(lastT); },
  mount(root, params) {
    rootEl = root; M = model(params); build(); this.seek(0);
    let pw = root.clientWidth, ph = root.clientHeight;
    ro = new ResizeObserver(() => { if (root.clientWidth !== pw || root.clientHeight !== ph) { pw = root.clientWidth; ph = root.clientHeight; build(); this.seek(lastT); } });
    ro.observe(root);
  },
  update(params) { M = model(params); build(); this.seek(0); },
  destroy() { if (ro) ro.disconnect(); if (tl) tl.kill(); if (svg) svg.remove(); svg = tl = M = null; }
};

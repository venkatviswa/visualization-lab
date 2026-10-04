// p5.js: the context window as a desk. Blocks stack toward a red limit line, older turns get squashed
// into a summary at compaction, plan.md sits beside the desk, and the facts list shows what survived.
let inst = null, M = null, T = 0, U = 1, CHIPS = [];
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', sys: '#5b6475', user: '#2b59c3', tool: '#b4530f', reply: '#0f766e',
  sum: '#7048b8', notes: '#1f7a4d', limit: '#d32f2f', good: '#1f7a4d', gist: '#a16207', lost: '#c2410c' };
const SHORT = { org: 'staging org', reports: 'weekly reports', budget: '$40k cap', golive: 'go-live 14 Mar', label: '"Account Name"', approver: 'Priya approves', optout: 'opt-outs', region: 'region filter' };
const k1 = n => (n / 1000).toFixed(n < 10000 && n % 1000 ? 1 : 0) + 'k';
const ease = x => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
const clamp = x => Math.max(0, Math.min(1, x));
const INIT = () => ({ sys: M.sysTokens, summary: 0, notes: 0, live: [], used: M.sysTokens, saved: 0, facts: M.facts.map(() => 'unsaid') });

function stateAt(t) {
  const ev = M.events; let i = -1;
  for (let j = 0; j < ev.length; j++) if (ev[j].start <= t + 1e-9) i = j; else break;
  if (i < 0) return { e: null, k: 0, prev: INIT(), next: INIT() };
  return { e: ev[i], k: clamp((t - ev[i].start) / ev[i].dur), prev: i ? M.snaps[i - 1] : INIT(), next: M.snaps[i] };
}
function caption(st, t) {
  const end = M.events[M.events.length - 1];
  if (t >= end.start + end.dur - 1e-6) return M.summary;
  if (!st.e) return 'Before the first message, instructions and tool definitions already take ' + k1(M.sysTokens) + ' tokens.';
  const e = st.e;
  if (e.type === 'compact') {
    const c = M.compactions.find(x => x.turn === e.turn);
    return 'Compaction ' + c.n + ': turn ' + e.turn + ' would cross 90%, so turns ' + c.foldedFrom + '–' + c.foldedTo + (c.oldSummary ? ' and the old summary' : '') +
      ' (' + k1(c.foldedTurns + c.oldSummary) + ') become a summary of ' + k1(c.summary) + '.';
  }
  const d = M.turns[e.turn - 1], f = M.facts.find(x => x.turn === e.turn);
  const head = 'Turn ' + e.turn + ' of ' + M.turnsN + ': ';
  if (f) return head + (f.from === 'file' ? 'a file read brings in' : 'you say') + ' “' + f.text + '”' + (M.notesOn ? ', saved to plan.md.' : '.');
  return head + 'message ' + k1(d.user) + ', ' + (M.large ? 'large ' : '') + 'tool result ' + k1(d.tool) + ', reply ' + k1(d.reply) + '.';
}

function drawTurn(s, d, x, w, yBot, u, alpha, mini) {
  let y = yBot;
  for (const [key, col] of [['user', C.user], ['tool', C.tool], ['reply', C.reply]]) {
    const h = d[key] * u; const c = s.color(col); c.setAlpha(alpha * 255);
    s.fill(c); s.rect(x, y - h, w, h); y -= h;
  }
  s.stroke(255); s.strokeWeight(1); s.line(x, y, x + w, y); s.noStroke();
  const h = yBot - y;
  if (h >= 13 && alpha > 0.5) {
    s.fill(255); s.textSize(11); s.textStyle(s.BOLD); s.textAlign(s.LEFT, s.CENTER);
    s.text((mini ? 'T' : 'Turn ') + d.turn, x + 6, (y + yBot) / 2); s.textStyle(s.NORMAL);
  }
  if (d.fact && alpha > 0.5) {
    const lab = h >= 13 && !mini ? '★ ' + SHORT[d.fact] : '★';
    s.textSize(11); const tw = s.textWidth(lab) + 10, cy = (y + yBot) / 2;
    s.fill(255, 245); s.rect(x + w - tw - 4, cy - 7.5, tw, 15, 7.5);
    s.fill(C.ink); s.textAlign(s.CENTER, s.CENTER); s.text(lab, x + w - 4 - tw / 2, cy);
  }
  return y;
}
function band(s, x, w, yBot, h, col, label, alpha) {
  if (h <= 0.5) return yBot;
  const c = s.color(col); c.setAlpha((alpha == null ? 1 : alpha) * 255);
  s.fill(c); s.rect(x, yBot - h, w, h, 3);
  if (h >= 13 && label) { s.fill(255); s.textSize(11); s.textStyle(s.BOLD); s.textAlign(s.LEFT, s.CENTER); s.text(label, x + 6, yBot - h / 2); s.textStyle(s.NORMAL); }
  else if (label && h >= 1.5 && (alpha == null || alpha > 0.5)) { // too thin to label inside: a chip on the right edge
    CHIPS.push({ lab: label + ' ' + k1(Math.round(h / U / 100) * 100), col, x: x + w - 6, y: yBot - h / 2 });
  }
  return yBot - h;
}

function drawDesk(s, st, X0, X1, top, bot, mini) {
  const u = (bot - top) / M.limit, w = X1 - X0, e = st.e, k = st.k; U = u; CHIPS = [];
  // tray, scale, limit and threshold
  s.noFill(); s.stroke(C.line); s.strokeWeight(2); s.rect(X0 - 5, top - 5, w + 10, bot - top + 10, 8); s.noStroke();
  s.textSize(10.5); s.textAlign(s.RIGHT, s.CENTER);
  for (let v = 0; v <= M.limit; v += 50000) { s.fill(C.muted); s.text(k1(v), X0 - 9, bot - v * u); }
  // stack
  const P = st.prev, N = st.next; let y = bot;
  y = band(s, X0, w, y, M.sysTokens * u, C.sys, mini ? 'Instructions' : 'Instructions + tools');
  if (e && e.type === 'compact') {
    const q = ease(clamp((k - 0.4) / 0.6)), c = M.compactions.find(x => x.turn === e.turn);
    y = band(s, X0, w, y, (P.notes + (N.notes - P.notes) * q) * u, C.notes, 'plan.md re-read');
    const folded = P.live.filter(t => !N.live.includes(t));
    if (q <= 0) {
      const g0 = y;
      if (P.summary) y = band(s, X0, w, y, P.summary * u, C.sum, 'Summary');
      folded.forEach(t => { y = drawTurn(s, M.turns[t - 1], X0, w, y, u, 1, mini); });
      const pulse = 0.5 + 0.5 * Math.sin(k * 30);
      s.noFill(); s.stroke(C.limit); s.strokeWeight(2 + pulse); s.drawingContext.setLineDash([6, 4]);
      s.rect(X0 - 2, y - 1, w + 4, g0 - y + 2, 4); s.drawingContext.setLineDash([]); s.noStroke();
    } else {
      const hFrom = (c.foldedTurns + c.oldSummary) * u, hTo = c.summary * u;
      y = band(s, X0, w, y, hFrom + (hTo - hFrom) * q, s.lerpColor(s.color(C.tool), s.color(C.sum), clamp((k - 0.4) / 0.2)).toString('#rrggbb'),
        q > 0.6 ? 'Summary of turns 1–' + c.foldedTo : 'Squashing turns 1–' + c.foldedTo + '…');
    }
    N.live.forEach(t => { y = drawTurn(s, M.turns[t - 1], X0, w, y, u, 1, mini); });
  } else {
    y = band(s, X0, w, y, N.notes * u, C.notes, 'plan.md re-read');
    if (N.summary) y = band(s, X0, w, y, N.summary * u, C.sum, 'Summary of turns 1–' + (N.live[0] - 1));
    N.live.forEach(t => {
      if (e && t === e.turn) {
        const q = ease(clamp(k / 0.7)), d = M.turns[t - 1];
        y = drawTurn(s, { turn: t, user: d.user * q, tool: d.tool * q, reply: d.reply * q, fact: d.fact }, X0, w, y, u, Math.min(1, 0.3 + q), mini);
      } else y = drawTurn(s, M.turns[t - 1], X0, w, y, u, 1, mini);
    });
  }
  CHIPS.forEach(c => { // labels for bands too thin to hold text
    s.textSize(10.5); const tw = s.textWidth(c.lab) + 12; s.stroke(255); s.strokeWeight(1.5);
    s.fill(c.col); s.rect(c.x - tw, c.y - 8, tw, 16, 8); s.noStroke(); s.fill(255); s.textAlign(s.CENTER, s.CENTER); s.text(c.lab, c.x - tw / 2, c.y);
  });
  // limit and threshold lines drawn on top of the stack
  s.stroke(C.limit); s.strokeWeight(2); s.line(X0 - 8, top, X1 + 8, top);
  s.strokeWeight(1.2); s.drawingContext.setLineDash([5, 4]); s.line(X0 - 8, bot - M.threshold * u, X1 + 8, bot - M.threshold * u); s.drawingContext.setLineDash([]); s.noStroke();
  s.fill(C.limit); s.textSize(11); s.textAlign(s.LEFT, s.BOTTOM); s.text('Limit ' + k1(M.limit), X0, top - 8);
  s.textAlign(s.RIGHT, s.BOTTOM); s.fill(C.muted);
  const qq = !e ? 0 : e.type === 'turn' ? ease(clamp(k / 0.7)) : ease(clamp((k - 0.4) / 0.6)), used = P.used + (N.used - P.used) * qq;
  s.text(k1(Math.round(used / 100) * 100) + ' used · compacts at 90%', X1, top - 8);
  if (e && e.type === 'compact' && k < 0.5) {
    s.fill(255, 235); s.rect(X0 + w / 2 - 105, top + 10, 210, 26, 6); s.fill(C.limit); s.textAlign(s.CENTER, s.CENTER); s.textSize(12.5); s.textStyle(s.BOLD);
    s.text('Desk nearly full: compacting', X0 + w / 2, top + 23); s.textStyle(s.NORMAL);
  }
}
function legend(s, x, y, maxW) {
  const items = [['Your messages', C.user], ['Tool results', C.tool], ['Replies', C.reply], ['Summary', C.sum], ['plan.md', C.notes]];
  let cx = x; s.textSize(11); s.textAlign(s.LEFT, s.CENTER);
  for (const [t, c] of items) {
    const iw = 14 + s.textWidth(t) + 12;
    if (cx + iw > x + maxW) { cx = x; y += 16; }
    s.fill(c); s.rect(cx, y - 5, 10, 10, 2); s.fill(C.muted); s.text(t, cx + 14, y); cx += iw;
  }
  return y;
}
function drawPanel(s, st, x, y, w, rowH) {
  const facts = (st.e && st.k >= (st.e.type === 'compact' ? 0.6 : 0.5)) ? st.next.facts : st.prev.facts;
  const savedN = (st.e && st.k >= 0.5) ? st.next.saved : st.prev.saved;
  // plan.md card
  const lines = M.notesOn ? M.facts.filter(f => M.notesFile.some(n => n.id === f.id)).slice(0, savedN).map(f => '✓ ' + SHORT[f.id]).join('   ') : '';
  s.textSize(11.5); const bodyH = M.notesOn ? Math.max(16, Math.ceil((s.textWidth(lines) + 10) / (w - 20)) * 16) : 16;
  s.fill(M.notesOn ? '#eef7f1' : '#f5f6f8'); s.stroke(M.notesOn ? '#b9dcc7' : C.line); s.rect(x, y, w, 30 + bodyH, 8); s.noStroke();
  s.fill(M.notesOn ? C.notes : C.muted); s.textStyle(s.BOLD); s.textSize(12); s.textAlign(s.LEFT, s.TOP);
  s.text('plan.md  ·  a file outside the chat', x + 10, y + 8); s.textStyle(s.NORMAL); s.textSize(11.5);
  s.fill(M.notesOn ? C.ink : C.muted);
  s.text(M.notesOn ? (lines || 'Empty so far: facts are written here as they come up.') : 'Notes off: nothing is written down outside the chat.', x + 10, y + 26, w - 20, bodyH + 4);
  y += 30 + bodyH + 14;
  // facts list
  s.fill(C.ink); s.textStyle(s.BOLD); s.textSize(12.5); s.text('What the assistant still knows', x, y); s.textStyle(s.NORMAL); y += 20;
  const ICON = { verbatim: ['✓', C.good], notes: ['✓', C.good], gist: ['~', C.gist], lost: ['✗', C.lost], unsaid: ['·', '#9aa3b2'] };
  M.facts.forEach((f, i) => {
    const stt = facts[i], [ic, col] = ICON[stt], yy = y + i * rowH;
    s.fill(col); s.textSize(14); s.textStyle(s.BOLD); s.textAlign(s.CENTER, s.TOP); s.text(ic, x + 7, yy - 1); s.textStyle(s.NORMAL);
    s.textAlign(s.LEFT, s.TOP); s.textSize(12); s.fill(stt === 'unsaid' ? '#9aa3b2' : stt === 'lost' ? C.muted : stt === 'gist' && rowH < 28 ? C.gist : C.ink);
    let t = rowH < 28 && stt === 'gist' ? '\u201c' + f.gist + '\u201d (gist)' : f.text; const full = t; while (s.textWidth(t) > w - 22 && t.length > 8) t = t.slice(0, -2);
    if (t !== full) t = t.slice(0, -1) + '…';
    s.text(t, x + 20, yy);
    if (stt === 'lost') { s.stroke(C.lost); s.strokeWeight(1); s.line(x + 20, yy + 8, x + 20 + s.textWidth(t), yy + 8); s.noStroke(); }
    if (rowH >= 28) {
      const note = { verbatim: 'On the desk word for word (turn ' + f.turn + ')', notes: 'Kept exact in plan.md', gist: 'Only the gist: “' + f.gist + '”',
        lost: 'Lost when summarised', unsaid: 'Not mentioned yet (turn ' + f.turn + ')' }[stt];
      s.textSize(11); s.fill(stt === 'gist' ? C.gist : stt === 'lost' ? C.lost : C.muted); s.text(note, x + 20, yy + 14.5);
    }
  });
}

window.lab = {
  get duration() { return M ? M.duration : 12; },
  get markers() { return M ? M.markers : []; },
  seek(t) { T = Math.max(0, Math.min(M.duration, t)); },
  mount(root, params) {
    M = model(params); T = 0;
    inst = new p5(s => {
      s.setup = () => { s.createCanvas(root.clientWidth, root.clientHeight); s.textFont('system-ui'); };
      s.windowResized = () => s.resizeCanvas(root.clientWidth, root.clientHeight);
      s.draw = () => {
        const W = s.width, H = s.height, wide = W >= 680, st = stateAt(T);
        s.background(255); s.noStroke();
        s.fill(C.ink); s.textSize(14); s.textStyle(s.BOLD); s.textAlign(s.LEFT, s.TOP); s.text("The context window is the model's desk", 16, 12); s.textStyle(s.NORMAL);
        s.fill(C.muted); s.textSize(12); s.text(caption(st, T), 16, 32, W - 32, 34);
        const top = wide ? 84 : 92;
        if (wide) {
          const X1 = Math.min(W * 0.5, 520), legY = H - 26, bot = legY - 22;
          drawDesk(s, st, 60, X1, top, bot, false);
          legend(s, 55, legY, X1 - 50);
          const px = X1 + 36, pw = W - px - 16;
          drawPanel(s, st, px, top - 22, pw, Math.max(24, Math.min(32, (bot - top - 110) / 8)));
        } else {
          const rowH = H > 760 ? 30 : 20, panelH = 8 * rowH + 20 + 80, legH = 36;
          const bot = Math.max(top + 140, H - panelH - legH - 14);
          drawDesk(s, st, 52, W - 14, top, bot, true);
          const ly = legend(s, 16, bot + 18, W - 32);
          drawPanel(s, st, 16, ly + 16, W - 32, rowH);
        }
      };
    }, root);
  },
  update(params) { M = model(params); T = 0; },
  destroy() { if (inst) inst.remove(); inst = null; M = null; }
};

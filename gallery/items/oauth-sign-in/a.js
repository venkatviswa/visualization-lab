// Mermaid: the sign-in as a UML sequence diagram, built from model(params) and stepped one message at a time.
// mermaid.render is async, so seek(t) stores the time and draw() applies it once the SVG is in place.
const INK = '#1d2433', MUTED = '#5b6475', LINE = '#dbe0e8', ACCENT = '#2b59c3', HOT = '#c2410c', GOOD = '#1f7a4d';
let box = null, cap = null, M = null, T = 0, svg = null, msgs = [], renderN = 0, ro = null, lastW = 0;

mermaid.initialize({
  startOnLoad: false, securityLevel: 'strict', theme: 'base', fontFamily: 'system-ui, sans-serif',
  themeVariables: { primaryColor: '#eef2fb', primaryBorderColor: ACCENT, primaryTextColor: INK, lineColor: MUTED, actorLineColor: LINE, signalColor: INK, signalTextColor: INK, sequenceNumberColor: '#ffffff' },
  sequence: { mirrorActors: false, showSequenceNumbers: true, useMaxWidth: false, messageFontSize: 15, actorFontSize: 15, actorMargin: 30, boxMargin: 6, messageMargin: 26 }
});

// Mermaid reads ';' as a line break and '#' as an entity start, so neither may appear in message text.
const clean = s => String(s).replace(/;/g, ',').replace(/#/g, '');
function source(m, narrow) {
  const L = ['sequenceDiagram'];
  for (const q of m.participants) L.push((q.actor ? 'actor ' : 'participant ') + q.id + ' as ' + clean(narrow ? q.label.replace('System browser', 'Browser').replace('Malicious app', 'Attacker') : q.label));
  for (const s of m.steps) L.push(s.from + (s.reply ? '-->>' : '->>') + (s.blocked ? 'x' : '') + s.to + ': ' + clean(s.text));
  return L.join('\n').replace(/->>x/g, '-x');
}

async function render() {
  const n = ++renderN, narrow = box.clientWidth < 640;
  let out;
  try { out = await mermaid.render('seq' + n, source(M, narrow)); }
  catch (e) { (window.__errors = window.__errors || []).push('mermaid.render failed: ' + e.message); cap.textContent = 'The diagram could not be drawn.'; return; }
  if (n !== renderN || !box) return;
  box.innerHTML = out.svg;
  svg = box.querySelector('svg');
  svg.removeAttribute('style'); svg.setAttribute('width', '100%'); svg.setAttribute('height', '100%');
  svg.setAttribute('preserveAspectRatio', 'xMidYMin meet');
  svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Sequence diagram of the sign-in, one message per step');
  // Each message renders as text.messageText, then its arrow, then the number badge, in step order.
  const texts = svg.querySelectorAll('.messageText'), lines = svg.querySelectorAll('.messageLine0, .messageLine1'), nums = svg.querySelectorAll('.sequenceNumber');
  msgs = M.steps.map((s, i) => ({ s, text: texts[i], line: lines[i], num: nums[i], dot: nums[i] && nums[i].previousElementSibling }));
  // A self-message centres its text over its own loop and number badge; move the text to the right of the loop.
  for (const g of msgs) if (g.s.from === g.s.to && g.text && g.line) { const b = g.line.getBBox(); g.text.setAttribute('text-anchor', 'start'); g.text.setAttribute('x', b.x + b.width + 8); g.text.setAttribute('y', b.y + b.height / 2 + 5); }
  draw();
}

function draw() {
  if (!M || !cap) return;
  const cur = Math.min(M.steps.length - 1, Math.floor(T / M.STEP + 1e-6)), s = M.steps[cur];
  for (const g of msgs) {
    const past = g.s.i < cur, on = g.s.i === cur, col = g.s.blocked ? GOOD : g.s.attack ? HOT : on ? ACCENT : INK;
    for (const el of [g.text, g.line, g.num, g.dot]) if (el) el.style.opacity = g.s.i > cur ? 0.12 : 1;
    if (g.text) { g.text.style.fill = col; g.text.style.fontWeight = on ? 700 : 400; }
    if (g.line) { g.line.style.stroke = col; g.line.style.strokeWidth = on ? 3 : 1.5; }
  }
  const name = id => (M.participants.find(q => q.id === id) || {}).label;
  cap.innerHTML = '';
  const head = document.createElement('b');
  head.textContent = 'Step ' + (cur + 1) + ' of ' + M.steps.length + ' · ' + name(s.from) + (s.from === s.to ? '' : ' → ' + name(s.to)) + ': ' + s.text;
  head.style.color = s.blocked ? GOOD : s.attack ? HOT : ACCENT;
  const note = document.createElement('div'); note.textContent = s.note;
  const end = document.createElement('div'); end.style.cssText = 'margin-top:4px;color:' + MUTED;
  end.textContent = (M.pkce ? 'PKCE on' : 'PKCE off') + (M.stolen ? ' · a malicious app is listening for myapp://' : ' · no malicious app');
  cap.append(head, note, end);
}

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  get markerLabels() { return M ? M.markerLabels : []; },
  seek(t) { T = t; draw(); },
  mount(root, params) {
    M = model(params); T = 0;
    root.style.display = 'flex'; root.style.flexDirection = 'column';
    box = document.createElement('div'); box.style.cssText = 'flex:1;min-height:0;padding:8px 12px 0;overflow:hidden';
    cap = document.createElement('div'); cap.setAttribute('aria-live', 'polite');
    cap.style.cssText = 'flex:none;padding:8px 14px 10px;border-top:1px solid ' + LINE + ';font:14px/1.4 system-ui,sans-serif;color:' + INK + ';min-height:74px';
    root.append(box, cap);
    lastW = box.clientWidth;
    // Re-render only when the width crosses the narrow breakpoint; the SVG scales itself otherwise.
    ro = new ResizeObserver(() => { const w = box.clientWidth; if ((w < 640) !== (lastW < 640)) render(); lastW = w; });
    ro.observe(box);
    render();
  },
  update(params) { M = model(params); T = 0; render(); },
  destroy() { if (ro) ro.disconnect(); renderN++; if (box) box.remove(); if (cap) cap.remove(); box = cap = svg = M = ro = null; msgs = []; }
};

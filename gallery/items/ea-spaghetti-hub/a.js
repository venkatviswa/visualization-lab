// D3: the integration estate grows year by year on a fixed ring of systems. Point-to-point draws a curve for every
// pair (spaghetti); the hub routes one spoke per system to a central node. seek(t) redraws the exact state at time t.
const INK = '#1d2433', MUTED = '#5b6475', LINE = '#dbe0e8', ACC = '#2b59c3', HI = '#c2410c', TEAL = '#0f766e', OLD = '#8f99ab';
const FONT = 'system-ui, -apple-system, Segoe UI, sans-serif';
let root = null, svg = null, M = null, T = 0, onResize = null;
const ctx = document.createElement('canvas').getContext('2d');
const tw = (s, fs, wt) => { ctx.font = (wt || 400) + ' ' + fs + 'px ' + FONT; return ctx.measureText(s).width; };
function wrap(s, maxW, fs, wt) {
  const out = []; let line = '';
  for (const w of s.split(' ')) { const t = line ? line + ' ' + w : w; if (line && tw(t, fs, wt) > maxW) { out.push(line); line = w; } else line = t; }
  if (line) out.push(line);
  return out;
}
const clamp01 = v => Math.max(0, Math.min(1, v));
const op = (at, t, d) => clamp01((t - at) / (d || 0.35));

function geom() {
  const W = root.clientWidth, H = root.clientHeight, wide = W >= 700;
  const subFs = wide ? 12.5 : 11.5, subW = W - 28;
  const texts = M.years.map(y => y.caption).concat([M.change.caption, M.summary]);
  const subLines = Math.max(...texts.map(s => wrap(s, subW, subFs).length));
  const headH = 30 + subLines * (subFs + 4) + 10;
  const legendH = M.salesforceNames ? 20 : 0;
  if (wide) {
    const pw = Math.min(260, Math.max(220, W * 0.26));
    return { W, H, wide, subFs, subW, headH, legendH, lab: 12, panel: { x: W - pw - 14, y: headH, w: pw, h: H - headH - 10 },
      net: { x: 8, y: headH, w: W - pw - 34, h: H - headH - 10 - legendH } };
  }
  const swLines = wrap(M.soWhat, W - 44, 11.5).length, panelH = 74 + swLines * 15 + 18;
  return { W, H, wide, subFs, subW, headH, legendH, lab: 11, panel: { x: 14, y: H - panelH - 6, w: W - 28, h: panelH },
    net: { x: 6, y: headH, w: W - 12, h: H - headH - panelH - 12 - legendH } };
}

function layout(G) {
  const label = s => G.wide ? s.name : s.short;
  const lw = Math.max(...M.systems.map(s => tw(label(s), G.lab, 600)));
  const cx = G.net.x + G.net.w / 2, cy = G.net.y + G.net.h / 2;
  const r = Math.max(40, Math.min((G.net.w - 2 * lw - 34) / 2, (G.net.h - 2 * (G.lab + 28)) / 2));
  const ry = Math.max(r, Math.min(r * 1.45, (G.net.h - 2 * (G.lab + 28)) / 2)); // stretch to an ellipse on tall screens
  const pos = { hub: { x: cx, y: cy } };
  M.systems.forEach((s, i) => {
    const a = -Math.PI / 2 + i * 2 * Math.PI / M.n;
    pos[s.id] = { x: cx + r * Math.cos(a), y: cy + ry * Math.sin(a), c: Math.cos(a), s: Math.sin(a), label: label(s) };
  });
  return { cx, cy, r, pos };
}

const lerp = (p, q, u) => ({ x: p.x + (q.x - p.x) * u, y: p.y + (q.y - p.y) * u });
function curve(L, a, b, u) { // quadratic bezier bent towards the centre, cut at fraction u (de Casteljau)
  const P0 = L.pos[a], P2 = L.pos[b], mid = lerp(P0, P2, 0.5), C = { x: L.cx, y: L.cy };
  const P1 = b === 'hub' ? mid : lerp(mid, C, 0.35);
  const Q0 = lerp(P0, P1, u), Q1 = lerp(P1, P2, u), B = lerp(Q0, Q1, u);
  return `M${P0.x},${P0.y}Q${Q0.x},${Q0.y} ${B.x},${B.y}`;
}

function textLines(g, lines, x, y, lh, attrs) {
  const t = g.append('text').attr('x', x).attr('y', y).attr('font-family', FONT);
  Object.entries(attrs).forEach(([k, v]) => t.attr(k, v));
  lines.forEach((l, i) => t.append('tspan').attr('x', x).attr('dy', i ? lh : 0).text(l));
  return t;
}

function draw() {
  if (!svg || !M) return;
  const G = geom(), L = layout(G), t = T, ch = M.change;
  const done = t >= M.duration - 0.05, inChange = t >= ch.at - 1e-6, inSoWhat = t >= M.soWhatAt - 1e-6;
  svg.attr('width', G.W).attr('height', G.H).selectAll('*').remove();
  // Header: title, then narrator caption (summary at the end)
  svg.append('text').attr('x', 14).attr('y', 22).attr('font-size', 14).attr('font-weight', 600).attr('fill', INK).attr('font-family', FONT).text('From spaghetti to hub: why an integration layer');
  const yr = M.years.filter(y => y.at <= t + 1e-6).pop() || M.years[0];
  const caption = done ? M.summary : inChange ? ch.caption : yr.caption;
  textLines(svg, wrap(caption, G.subW, G.subFs), 14, 42, G.subFs + 4, { 'font-size': G.subFs, fill: done ? INK : MUTED });

  // Links
  const impactAt = Object.fromEntries(ch.impacted.map(x => [x.link, x.at]));
  const gl = svg.append('g').attr('fill', 'none').attr('stroke-linecap', 'round');
  M.links.forEach(l => {
    const u = l.year === 1 ? 1 : op(l.at, t, 0.45); if (u <= 0) return; // Year 1 is the starting state
    const hit = impactAt[l.id] !== undefined && t >= impactAt[l.id];
    const fresh = !inChange && l.year === yr.year;
    gl.append('path').attr('d', curve(L, l.a, l.b, u))
      .attr('stroke', hit ? HI : fresh ? ACC : M.hub ? TEAL : OLD)
      .attr('stroke-width', hit ? 2.6 : fresh ? 2 : 1.3)
      .attr('stroke-opacity', hit ? 1 : fresh ? 0.95 : inChange ? 0.22 : M.hub ? 0.7 : 0.5);
  });
  // Hub node
  if (M.hub) {
    const fs = G.wide ? 12.5 : 11.5, w = tw(M.hubName, fs, 600) + 22, h = 30;
    const hg = svg.append('g').attr('transform', `translate(${L.cx},${L.cy})`);
    hg.append('rect').attr('x', -w / 2).attr('y', -h / 2).attr('width', w).attr('height', h).attr('rx', 8).attr('fill', TEAL);
    hg.append('text').attr('text-anchor', 'middle').attr('dy', '0.35em').attr('font-size', fs).attr('font-weight', 600).attr('fill', '#fff').attr('font-family', FONT).text(M.hubName);
    if (inChange) hg.append('text').attr('text-anchor', 'middle').attr('y', h / 2 + 15).attr('font-size', 11).attr('fill', HI).attr('font-weight', 600).attr('font-family', FONT)
      .attr('opacity', op(ch.impacted[0].at, t)).text('1 adapter updated');
  }
  // Systems
  const hitNodes = new Set();
  M.links.forEach(l => { const at = impactAt[l.id]; if (at !== undefined && t >= at) { hitNodes.add(l.a); hitNodes.add(l.b); } });
  const gn = svg.append('g');
  M.systems.forEach(s => {
    const o = s.year === 1 ? 1 : op(s.at, t); if (o <= 0) return;
    const P = L.pos[s.id], isCh = inChange && s.id === ch.systemId, hit = !M.hub && hitNodes.has(s.id) && !isCh;
    const g = gn.append('g').attr('opacity', o);
    if (isCh) {
      const k = Math.abs(Math.sin((t - ch.at) * 4));
      g.append('circle').attr('cx', P.x).attr('cy', P.y).attr('r', 10 + 9 * k).attr('fill', HI).attr('fill-opacity', 0.15 * (1 - k) + 0.08).attr('stroke', HI).attr('stroke-opacity', 0.6 * (1 - k) + 0.2);
    }
    const fill = isCh ? HI : s.salesforce ? TEAL : ACC;
    g.append('circle').attr('cx', P.x).attr('cy', P.y).attr('r', 7).attr('fill', fill).attr('stroke', hit ? HI : '#fff').attr('stroke-width', hit ? 3 : 2);
    const off = 13, lx = P.x + P.c * off, ly = P.y + P.s * off;
    const anchor = P.c > 0.3 ? 'start' : P.c < -0.3 ? 'end' : 'middle';
    const dy = P.s > 0.5 ? 10 : P.s < -0.5 ? -G.lab - 6 : 4;
    g.append('text').attr('x', lx).attr('y', ly + dy).attr('text-anchor', anchor).attr('font-size', G.lab).attr('font-weight', 600)
      .attr('fill', isCh ? HI : INK).attr('font-family', FONT).attr('paint-order', 'stroke').attr('stroke', '#fff').attr('stroke-width', 3).text(P.label);
    const sub = isCh ? 'API changed' : 'Year ' + s.year;
    g.append('text').attr('x', lx).attr('y', ly + dy + G.lab + 2).attr('text-anchor', anchor).attr('font-size', 11)
      .attr('fill', isCh ? HI : MUTED).attr('font-family', FONT).attr('paint-order', 'stroke').attr('stroke', '#fff').attr('stroke-width', 3).text(sub);
  });
  // Legend for Salesforce names
  if (M.salesforceNames) {
    const lg = svg.append('g').attr('transform', `translate(${G.net.x + 8},${G.net.y + G.net.h + 12})`).attr('font-family', FONT).attr('font-size', 11).attr('fill', MUTED);
    [[TEAL, 'Salesforce cloud'], [ACC, 'Other system']].forEach(([c, n], i) => {
      const x = i * 130;
      lg.append('circle').attr('cx', x + 5).attr('cy', -4).attr('r', 5).attr('fill', c);
      lg.append('text').attr('x', x + 15).attr('y', 0).text(n);
    });
  }
  panel(G, t, yr, inChange, inSoWhat);
}

function panel(G, t, yr, inChange, inSoWhat) {
  const ch = M.change, P = G.panel, g = svg.append('g').attr('font-family', FONT);
  const shownHit = ch.impacted.filter(x => t >= x.at).length;
  const sysNow = M.systems.filter(s => s.at <= t + 1e-6).length;
  const shownTotal = M.links.filter(l => l.year === 1 || l.at <= t + 0.2).length;
  const unit = M.hub ? 'hub connections' : 'point-to-point integrations';
  const ref = M.hub ? 'Point-to-point would need ' + yr.p2p : 'A hub would need ' + yr.hub;
  const yearLabel = inChange ? 'Year ' + ch.year : 'Year ' + yr.year;
  const teams = new Set(ch.teams.slice(0, shownHit)).size;
  const box = (x, y, w, fs) => {
    const lines = wrap(M.soWhat, w - 16, fs), h = lines.length * (fs + 3.5) + 14;
    g.append('rect').attr('x', x).attr('y', y).attr('width', w).attr('height', h).attr('rx', 6).attr('fill', '#f3f6fc').attr('opacity', op(M.soWhatAt, t));
    g.append('rect').attr('x', x).attr('y', y).attr('width', 3.5).attr('height', h).attr('fill', ACC).attr('opacity', op(M.soWhatAt, t));
    textLines(g, lines, x + 12, y + fs + 5, fs + 3.5, { 'font-size': fs, fill: INK, opacity: op(M.soWhatAt, t) });
  };
  if (G.wide) {
    let y = P.y + 22;
    g.append('text').attr('x', P.x).attr('y', y).attr('font-size', 24).attr('font-weight', 700).attr('fill', INK).text(yearLabel);
    g.append('text').attr('x', P.x).attr('y', y + 21).attr('font-size', 12.5).attr('fill', MUTED).text(sysNow + ' systems connected');
    g.append('text').attr('x', P.x).attr('y', y + 70).attr('font-size', 40).attr('font-weight', 700).attr('fill', M.hub ? TEAL : ACC).text(shownTotal);
    g.append('text').attr('x', P.x).attr('y', y + 90).attr('font-size', 12.5).attr('fill', INK).text(unit);
    g.append('text').attr('x', P.x).attr('y', y + 108).attr('font-size', 12).attr('fill', MUTED).text(ref);
    g.append('line').attr('x1', P.x).attr('x2', P.x + P.w).attr('y1', y + 124).attr('y2', y + 124).attr('stroke', LINE);
    y += 148;
    if (!inChange) g.append('text').attr('x', P.x).attr('y', y).attr('font-size', 12).attr('fill', MUTED).text('Coming up: ' + ch.name + ' changes its API');
    else {
      g.append('text').attr('x', P.x).attr('y', y).attr('font-size', 13).attr('font-weight', 600).attr('fill', INK).text(ch.name + ' retires its v1 API');
      g.append('text').attr('x', P.x).attr('y', y + 46).attr('font-size', 40).attr('font-weight', 700).attr('fill', HI).text(shownHit);
      g.append('text').attr('x', P.x).attr('y', y + 66).attr('font-size', 12.5).attr('fill', INK).text(M.hub ? 'integration to rework (the adapter)' : 'integrations to rework');
      if (shownHit) g.append('text').attr('x', P.x).attr('y', y + 84).attr('font-size', 12).attr('fill', MUTED).text('by ' + teams + (teams === 1 ? ' team' : ' different teams') + ' · ' + (M.hub ? 'point-to-point: ' + ch.p2pImpacted : 'with a hub: 1'));
    }
    if (inSoWhat) box(P.x, y + 102, P.w, 12.5);
  } else {
    const x2 = P.x + P.w / 2 + 6, y = P.y + 14;
    g.append('text').attr('x', P.x).attr('y', y).attr('font-size', 12).attr('font-weight', 600).attr('fill', INK).text(yearLabel + ' · ' + sysNow + ' systems');
    g.append('text').attr('x', P.x).attr('y', y + 32).attr('font-size', 28).attr('font-weight', 700).attr('fill', M.hub ? TEAL : ACC).text(shownTotal);
    g.append('text').attr('x', P.x + tw(String(shownTotal), 28, 700) + 6).attr('y', y + 32).attr('font-size', 11).attr('fill', INK).text(M.hub ? 'connections' : 'integrations');
    g.append('text').attr('x', P.x).attr('y', y + 50).attr('font-size', 11).attr('fill', MUTED).text(M.hub ? 'P2P would need ' + yr.p2p : 'Hub would need ' + yr.hub);
    g.append('line').attr('x1', x2 - 8).attr('x2', x2 - 8).attr('y1', P.y + 2).attr('y2', P.y + 56).attr('stroke', LINE);
    if (!inChange) g.append('text').attr('x', x2).attr('y', y).attr('font-size', 11).attr('fill', MUTED).text('Next: ' + ch.name + ' API change');
    else {
      g.append('text').attr('x', x2).attr('y', y).attr('font-size', 12).attr('font-weight', 600).attr('fill', INK).text(ch.name + ' API change');
      g.append('text').attr('x', x2).attr('y', y + 32).attr('font-size', 28).attr('font-weight', 700).attr('fill', HI).text(shownHit);
      g.append('text').attr('x', x2 + tw(String(shownHit), 28, 700) + 6).attr('y', y + 32).attr('font-size', 11).attr('fill', INK).text('to rework');
      if (shownHit) g.append('text').attr('x', x2).attr('y', y + 50).attr('font-size', 11).attr('fill', MUTED).text(teams + (teams === 1 ? ' team' : ' teams') + ' · ' + (M.hub ? 'P2P: ' + ch.p2pImpacted : 'hub: 1'));
    }
    if (inSoWhat) box(P.x, P.y + 70, P.w, 11.5);
  }
}

window.lab = {
  get duration() { return M ? M.duration : 14; },
  get markers() { return M ? M.markers : []; },
  seek(t) { T = Math.max(0, Math.min(M.duration, t)); draw(); },
  mount(r, params) {
    root = r; M = model(params); T = 0;
    svg = d3.select(root).append('svg').style('display', 'block').style('background', '#fff');
    onResize = () => draw(); addEventListener('resize', onResize); draw();
  },
  update(params) { M = model(params); T = 0; draw(); },
  destroy() { if (svg) svg.remove(); removeEventListener('resize', onResize); svg = null; M = null; }
};

// D3 chord diagram: every system is an arc on a circle sized by how many integrations it carries, every integration a
// chord between two arcs (or between a system and the hub). seek(t) rebuilds the matrix for the connections that exist
// at time t, so the ring thickens year by year, and the change scene colours the chords the API change touches.
const INK = '#1d2433', MUTED = '#5b6475', LINE = '#dbe0e8', ACC = '#2b59c3', HI = '#c2410c', TEAL = '#0f766e', OLD = '#8f99ab';
const FONT = 'system-ui, -apple-system, Segoe UI, sans-serif';
let root = null, svg = null, M = null, T = 0, onResize = null, lastKey = '';
const ctx = document.createElement('canvas').getContext('2d');
const tw = (s, fs, wt) => { ctx.font = (wt || 400) + ' ' + fs + 'px ' + FONT; return ctx.measureText(s).width; };
function wrap(s, maxW, fs, wt) { const out = []; let line = ''; for (const w of s.split(' ')) { const t = line ? line + ' ' + w : w; if (line && tw(t, fs, wt) > maxW) { out.push(line); line = w; } else line = t; } if (line) out.push(line); return out; }
function textLines(g, lines, x, y, lh, attrs) { const t = g.append('text').attr('x', x).attr('y', y).attr('font-family', FONT); Object.entries(attrs).forEach(([k, v]) => t.attr(k, v)); lines.forEach((l, i) => t.append('tspan').attr('x', x).attr('dy', i ? lh : 0).text(l)); return t; }

function draw() {
  if (!svg || !M) return;
  const W = root.clientWidth, H = root.clientHeight, wide = W >= 640, t = T, ch = M.change;
  const done = t >= M.duration - 0.05, inChange = t >= ch.at - 1e-6;
  svg.attr('width', W).attr('height', H).selectAll('*').remove();
  svg.append('text').attr('x', 14).attr('y', 22).attr('font-size', 14).attr('font-weight', 600).attr('fill', INK).attr('font-family', FONT).text('From spaghetti to hub · the estate as a chord diagram');
  const yr = M.years.filter(y => y.at <= t + 1e-6).pop() || M.years[0];
  const subFs = wide ? 12.5 : 11.5, caption = done ? M.summary : inChange ? ch.caption : yr.caption, capLines = wrap(caption, W - 28, subFs);
  textLines(svg, capLines, 14, 42, subFs + 4, { 'font-size': subFs, fill: done ? INK : MUTED });
  const headH = 30 + capLines.length * (subFs + 4) + 12;
  // Nodes: the systems live so far, plus the hub when it exists
  const live = M.systems.filter(s => s.at <= t + 1e-6), ids = live.map(s => s.id).concat(M.hub ? ['hub'] : []), idx = Object.fromEntries(ids.map((id, i) => [id, i]));
  const present = M.links.filter(l => l.at <= t + 1e-6 && idx[l.a] !== undefined && idx[l.b] !== undefined);
  const n = ids.length, matrix = Array.from({ length: n }, () => Array(n).fill(0));
  present.forEach(l => { matrix[idx[l.a]][idx[l.b]] += 1; matrix[idx[l.b]][idx[l.a]] += 1; });
  const lab = wide ? 12 : 11, labelW = Math.max(...M.systems.map(s => tw(wide ? s.name : s.short, lab, 600)), tw(M.hubName, lab, 600));
  const statsTop = W >= 980, statsH = statsTop ? 0 : 30;
  const cx = W / 2, cy = headH + (H - headH - statsH) / 2, R = Math.max(50, Math.min((W - 2 * labelW - 40) / 2, (H - headH - statsH - 2 * labelW - 16) / 2)), r0 = R - (wide ? 14 : 10);
  const chord = d3.chord().padAngle(0.04).sortSubgroups(d3.descending), chords = present.length ? chord(matrix) : Object.assign([], { groups: [] });
  const arc = d3.arc().innerRadius(r0).outerRadius(R), ribbon = d3.ribbon().radius(r0 - 1);
  const g = svg.append('g').attr('transform', `translate(${cx},${cy})`);
  const impactAt = Object.fromEntries(ch.impacted.map(x => [x.link, x.at]));
  const colorOf = id => id === 'hub' ? HI : ACC;
  // Ribbons: one per integration; the change colours the ones it touches, the current year's are bold
  g.append('g').attr('fill-opacity', 0.55).selectAll('path').data(chords).join('path').attr('d', ribbon)
    .attr('fill', d => { const a = ids[d.source.index], b = ids[d.target.index], l = present.find(x => (x.a === a && x.b === b) || (x.a === b && x.b === a)); if (!l) return OLD;
      if (impactAt[l.id] !== undefined && t >= impactAt[l.id]) return HI; if (!inChange && l.year === yr.year) return TEAL; return b === 'hub' || a === 'hub' ? ACC : OLD; })
    .attr('stroke', d => { const a = ids[d.source.index], b = ids[d.target.index], l = present.find(x => (x.a === a && x.b === b) || (x.a === b && x.b === a)); return l && impactAt[l.id] !== undefined && t >= impactAt[l.id] ? HI : 'none'; })
    .append('title').text(d => ids[d.source.index] + ' ↔ ' + ids[d.target.index]);
  // Arcs and labels
  const groups = g.append('g').selectAll('g').data(chords.groups).join('g');
  groups.append('path').attr('d', arc).attr('fill', d => colorOf(ids[d.index])).attr('fill-opacity', d => (inChange && ids[d.index] === ch.systemId) ? 1 : 0.85);
  groups.append('text').each(d => { d.angle = (d.startAngle + d.endAngle) / 2; }).attr('dy', '0.35em')
    .attr('transform', d => `rotate(${d.angle * 180 / Math.PI - 90}) translate(${R + 6}) ${d.angle > Math.PI ? 'rotate(180)' : ''}`)
    .attr('text-anchor', d => (d.angle > Math.PI ? 'end' : null)).attr('font-family', FONT).attr('font-size', lab).attr('font-weight', 600).attr('fill', INK)
    .text(d => { const id = ids[d.index]; if (id === 'hub') return M.hubName; const s = M.systems.find(x => x.id === id); return (wide ? s.name : s.short) + ' · ' + (matrix[d.index].reduce((a, v) => a + v, 0)); });
  // Systems live but not yet connected (year 1 before its first link) still get a label at their place
  // Centre: the count
  g.append('text').attr('y', -4).attr('text-anchor', 'middle').attr('font-family', FONT).attr('font-size', wide ? 26 : 20).attr('font-weight', 700).attr('fill', inChange ? HI : INK).text(inChange ? ch.count : present.length);
  g.append('text').attr('y', 14).attr('text-anchor', 'middle').attr('font-family', FONT).attr('font-size', 11).attr('fill', MUTED).text(inChange ? (ch.count === 1 ? 'integration touched' : 'integrations touched') : present.length === 1 ? 'integration' : 'integrations');
  const statLine = M.architecture + ' · ' + live.length + ' systems · ' + present.length + ' integrations' + (inChange ? ' · change touches ' + ch.count : '') + (wide ? ' · ribbon width = 1 integration' : '');
  if (!statsTop) svg.append('text').attr('x', 14).attr('y', H - 12).attr('font-family', FONT).attr('font-size', 11).attr('fill', MUTED).text(statLine);
  else svg.append('text').attr('x', W - 14).attr('y', 22).attr('text-anchor', 'end').attr('font-family', FONT).attr('font-size', 11.5).attr('fill', MUTED).text(statLine);
}

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  seek(t) { T = t; const key = Math.round(t * 20) + '|' + (t >= M.duration - 0.05); if (key !== lastKey) { lastKey = key; draw(); } },
  mount(r, params) {
    root = r; M = model(params); T = 0; lastKey = '';
    svg = d3.select(root).append('svg').style('display', 'block').style('background', '#fff');
    draw();
    onResize = new ResizeObserver(() => requestAnimationFrame(() => { if (svg) draw(); })); onResize.observe(root);
  },
  update(params) { M = model(params); T = 0; lastKey = ''; draw(); },
  destroy() { if (onResize) onResize.disconnect(); if (svg) svg.remove(); svg = null; M = null; }
};

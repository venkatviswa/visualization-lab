// D3 org chart of data ownership: the plan's data at the root, the owning teams beneath it, the objects under their
// team, laid out with d3.tree. The host clock numbers the objects as the process touches them and draws the hops
// between consecutive objects, so every hop that crosses from one team's branch to another is a hand-off you can see.
const C = { ink: '#1d2433', muted: '#5b6475', line: '#dbe0e8', accent: '#2b59c3', hi: '#c2410c', good: '#1f7a4d', bad: '#b42318', soft: '#f4f6f9', faint: '#9aa3b2' };
const TEAM = { membership: '#2b59c3', network: '#0f766e', claims: '#6d4bbf', service: '#be4d8a', finance: '#b4530f' };
const FONT = 'system-ui, -apple-system, sans-serif';
let M = null, wrap = null, head = null, svg = null, foot = null, ro = null, lastT = 0, lastKey = '';

function currentEvent() { let e = M.events[0]; for (const ev of M.events) if (ev.start <= lastT + 1e-6) e = ev; return e; }
function draw() {
  if (!svg) return;
  const W = wrap.clientWidth, H = Math.max(120, svg.node().clientHeight), narrow = W < 600, e = currentEvent(), done = lastT >= M.duration - 0.05;
  svg.attr('width', W).attr('height', H).selectAll('*').remove();
  const own = M.ownership;
  // Layout by hand (an org chart with vertical lists): root on top, one column per team, the team's objects stacked beneath it.
  // Narrow: one band per team, its objects in a row under the team label.
  const teams = M.teams.map((t, i) => ({ ...t, i, objs: M.objects.filter(o => o.team === t.id) }));
  const nodes = {}, boxW = narrow ? 104 : Math.min(124, (W - 24) / teams.length - 10), boxH = narrow ? 24 : 28;
  if (!narrow) {
    const colW = (W - 24) / teams.length, rootY = 36, teamY = 92, objY0 = 142, objGap = boxH + 12;
    nodes.root = { x: W / 2, y: rootY, w: 150, h: 32, depth: 0, label: 'Health plan data' };
    teams.forEach(t => { const x = 12 + colW * (t.i + 0.5); nodes['t:' + t.id] = { x, y: teamY, w: boxW, h: boxH, depth: 1, team: t.id, label: own ? t.label : 'Team ' + (t.i + 1) };
      t.objs.forEach((o, k) => { nodes[o.id] = { x, y: objY0 + k * objGap, w: boxW, h: boxH, depth: 2, team: t.id, id: o.id, label: o.label, parent: 't:' + t.id }; }); });
  } else {
    const bandH = Math.max(56, (H - 44) / teams.length), rootY = 16, ow = (W - 24 - 12) / 3;
    nodes.root = { x: W / 2, y: rootY, w: 120, h: 24, depth: 0, label: 'Health plan data' };
    teams.forEach(t => { const y0 = 36 + t.i * bandH; nodes['t:' + t.id] = { x: 12 + 54, y: y0 + 10, w: 108, h: 20, depth: 1, team: t.id, label: own ? t.label : 'Team ' + (t.i + 1) };
      t.objs.forEach((o, k) => { nodes[o.id] = { x: 12 + k * (ow + 6) + ow / 2, y: y0 + 10 + 12 + boxH / 2 + 4, w: ow, h: boxH, depth: 2, team: t.id, id: o.id, label: o.label, parent: 't:' + t.id }; }); });
  }
  const px = d => d.x, py = d => d.y;
  const seen = {}; M.events.forEach(ev => { if (ev.i <= e.i && seen[ev.object] === undefined) seen[ev.object] = Object.keys(seen).length + 1; });
  const teamsSoFar = new Set(M.events.filter(ev => ev.i <= e.i).map(ev => M.objects.find(o => o.id === ev.object).team));
  // tree links: root to teams, team to objects (a spine down the column on wide screens)
  const links = svg.append('g').attr('fill', 'none');
  teams.forEach(t => { const tn = nodes['t:' + t.id], lit = teamsSoFar.has(t.id), col = own ? TEAM[t.id] : C.accent;
    links.append('path').attr('d', narrow ? `M${nodes.root.x},${nodes.root.y + 12}L${nodes.root.x},${tn.y - 11}` + (t.i === 0 ? '' : '') : `M${nodes.root.x},${nodes.root.y + 16}C${nodes.root.x},${(nodes.root.y + tn.y) / 2} ${tn.x},${(nodes.root.y + tn.y) / 2} ${tn.x},${tn.y - boxH / 2}`)
      .attr('stroke', lit ? col : C.line).attr('stroke-width', lit ? 2 : 1.2).attr('opacity', narrow && t.i > 0 ? 0 : 1);
    t.objs.forEach(o => { const on = nodes[o.id], lit2 = !!seen[o.id];
      links.append('path').attr('d', narrow ? `M${tn.x - tn.w / 2 + 8},${tn.y + tn.h / 2}L${tn.x - tn.w / 2 + 8},${on.y}L${on.x - on.w / 2},${on.y}` : `M${tn.x},${tn.y + boxH / 2}L${on.x},${on.y - boxH / 2}`).attr('stroke', lit2 ? col : C.line).attr('stroke-width', lit2 ? 2 : 1.2); });
  });
  const nodeOf = {}; Object.values(nodes).forEach(d => { if (d.id) nodeOf[d.id] = d; });
  const rootDesc = Object.values(nodes);
  // hops of the process so far, drawn as arcs between consecutive objects
  const hops = svg.append('g').attr('fill', 'none');
  for (let i = 1; i <= e.i; i++) {
    const a = nodeOf[M.events[i - 1].object], b = nodeOf[M.events[i].object]; if (!a || !b || a === b) continue;
    const cross = a.team !== b.team, now = i === e.i && !done;
    const x1 = px(a), y1 = py(a), x2 = px(b), y2 = py(b), lift = narrow ? 14 + Math.abs(x2 - x1) * 0.12 : 26 + Math.abs(x2 - x1) * 0.18;
    hops.append('path').attr('d', narrow ? `M${x1},${y1 + a.h / 2}C${x1},${y1 + a.h / 2 + lift} ${x2},${y2 - b.h / 2 - lift} ${x2},${y2 - b.h / 2}` : `M${x1},${y1 + a.h / 2}C${x1},${y1 + a.h / 2 + lift} ${x2},${y2 + b.h / 2 + lift} ${x2},${y2 + b.h / 2}`)
      .attr('stroke', now ? C.hi : cross ? C.hi : C.faint).attr('stroke-width', now ? 2.5 : 1.6).attr('stroke-dasharray', cross ? null : '4 3').attr('stroke-opacity', now ? 1 : 0.8);
  }
  // nodes
  rootDesc.forEach(d => {
    const g = svg.append('g').attr('transform', `translate(${px(d)},${py(d)})`), depth = d.depth, isObj = depth === 2, n = isObj ? seen[d.id] : null;
    const active = isObj && !done && e.object === d.id, col = own && d.team ? TEAM[d.team] : C.accent;
    const w = d.w, hh = d.h;
    const lit = depth === 0 || (depth === 1 && teamsSoFar.has(d.team)) || (isObj && n);
    g.append('rect').attr('x', -w / 2).attr('y', -hh / 2).attr('width', w).attr('height', hh).attr('rx', 7)
      .attr('fill', active ? '#fde7da' : depth === 0 ? C.ink : depth === 1 ? (lit ? col + '22' : C.soft) : n ? '#fff' : '#fbfcfd')
      .attr('stroke', active ? C.hi : depth === 0 ? C.ink : lit ? col : C.line).attr('stroke-width', active ? 2 : lit && depth > 0 ? 1.5 : 1);
    g.append('text').attr('y', 4).attr('text-anchor', 'middle').attr('font-family', FONT).attr('font-size', depth === 0 ? 12 : narrow ? 9.5 : 11).attr('font-weight', depth < 2 || n ? 600 : 400)
      .attr('fill', depth === 0 ? '#fff' : lit || M.path.includes(d.id) ? C.ink : C.faint).text(d.label.length > (narrow ? 15 : 17) ? d.label.slice(0, narrow ? 14 : 16) + '…' : d.label);
    if (n) { g.append('circle').attr('cx', w / 2 - 2).attr('cy', -hh / 2 + 2).attr('r', 8).attr('fill', active ? C.hi : col); g.append('text').attr('x', w / 2 - 2).attr('y', -hh / 2 + 5.5).attr('text-anchor', 'middle').attr('font-family', FONT).attr('font-size', 9.5).attr('font-weight', 700).attr('fill', '#fff').text(n); }
  });
  caption(e, done, narrow, teamsSoFar);
}
function caption(e, done, narrow, teamsSoFar) {
  const o = M.objects.find(x => x.id === e.object);
  let handoffsSoFar = 0; for (let i = 1; i <= e.i; i++) if (M.objects.find(x => x.id === M.events[i - 1].object).team !== M.objects.find(x => x.id === M.events[i].object).team) handoffsSoFar++;
  head.querySelector('.sub').textContent = done ? M.summary : 'Step ' + (e.i + 1) + ' of ' + M.events.length + ' · ' + M.steps[e.i].title + (M.ownership ? ' · owned by ' + o.teamLabel : '');
  const stats = narrow ? [['Teams', teamsSoFar.size + '/' + M.teams.length], ['Hand-offs', String(handoffsSoFar)]] : [['Teams so far', teamsSoFar.size + ' of ' + M.teams.length], ['Hand-offs so far', String(handoffsSoFar)], ['Objects', M.objects.length + ' in ' + M.teams.length + ' teams']];
  head.querySelector('.stats').innerHTML = stats.map(([k, v]) => '<span style="display:inline-block;margin:0 0 4px 6px;padding:3px 8px;border-radius:8px;background:#f4f6f9;font-size:11.5px;color:#5b6475;white-space:nowrap">' + k + ' <b style="color:#1d2433">' + v + '</b></span>').join('');
  foot.textContent = done ? M.summary + (M.ownership ? ' Solid orange hops cross a team boundary; dashed grey hops stay inside one.' : ' Turn ownership on to name the teams.') : e.note;
  foot.style.background = done ? '#fbefe8' : '#fafbfc';
}

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  seek(t) { lastT = t; const key = currentEvent().i + '|' + (t >= M.duration - 0.05); if (key !== lastKey) { lastKey = key; draw(); } },
  mount(root, params) {
    M = model(params); lastT = 0; lastKey = '';
    wrap = document.createElement('div'); wrap.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;background:#fff;font-family:system-ui,sans-serif;color:#1d2433';
    head = document.createElement('div'); head.style.cssText = 'flex:none;padding:8px 14px 2px;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:flex-start';
    head.innerHTML = '<div style="flex:1 1 280px;min-width:0"><div style="font-size:14px;font-weight:600">The data model comes alive · who owns what the process touches</div><div class="sub" style="font-size:12px;line-height:1.35;color:#5b6475;min-height:16px"></div></div><div class="stats" style="flex:0 1 auto;text-align:right"></div>';
    const box = document.createElement('div'); box.style.cssText = 'flex:1;min-height:0;position:relative';
    svg = d3.select(box).append('svg').style('display', 'block').style('width', '100%').style('height', '100%');
    foot = document.createElement('div'); foot.style.cssText = 'flex:none;height:52px;box-sizing:border-box;padding:6px 14px;font:12.5px/1.4 system-ui,sans-serif;border-top:1px solid #e3e7ee;background:#fafbfc;overflow:auto';
    wrap.append(head, box, foot); root.append(wrap);
    draw();
    ro = new ResizeObserver(() => requestAnimationFrame(() => { if (svg && M) draw(); })); ro.observe(box);
  },
  update(params) { M = model(params); lastT = 0; lastKey = ''; draw(); },
  destroy() { if (ro) ro.disconnect(); if (wrap) wrap.remove(); wrap = null; svg = null; M = null; }
};

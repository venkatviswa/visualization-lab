// Word cloud: D3 + d3-cloud. Size shows importance, colour shows theme.
// Layout is computed once per update or resize with a seeded random source, so the cloud is stable;
// seek(t) only reveals words in importance order.
const COLORS = ['#2b59c3', '#0f766e', '#b4530f'], MUTED = '#c3c9d4', FONT = 'system-ui, -apple-system, Segoe UI, sans-serif';
const TOP = 58;
let root = null, svg = null, M = null, placed = [], dropped = 0, T = 0, onResize = null, resizeTimer = 0;

function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function colorOf(t) { return M.focusGroup && !t.highlighted ? MUTED : COLORS[t.groupIndex]; }

function layout() {
  const W = root.clientWidth, H = root.clientHeight - TOP;
  const top = Math.max(26, Math.min(72, H / 5.5));
  let scale = 1;
  for (let attempt = 0; attempt < 5; attempt++) {
    const size = d3.scaleSqrt().domain([M.minWeight, Math.max(M.maxWeight, M.minWeight + 1)]).range([13 * scale, top * scale]);
    let out = [];
    d3.layout.cloud().size([W, H]).words(M.terms.map(t => ({ text: t.text, src: t })))
      .padding(3).rotate(0).font(FONT).fontWeight(600).fontSize(d => size(d.src.weight))
      .random(rng(11)).timeInterval(Infinity)
      .on('end', w => { out = w; }).start();
    placed = out; dropped = M.terms.length - out.length;
    if (!dropped) break;
    scale *= 0.85;
  }
}

function draw() {
  if (!svg || !M) return;
  const W = root.clientWidth, H = root.clientHeight;
  svg.attr('width', W).attr('height', H);
  const head = svg.selectAll('g.head').data([0]).join(enter => {
    const g = enter.append('g').attr('class', 'head');
    g.append('text').attr('class', 'title').attr('x', 14).attr('y', 22).attr('fill', '#1d2433').attr('font-size', 14).attr('font-weight', 600).attr('font-family', FONT);
    g.append('text').attr('class', 'sub').attr('x', 14).attr('y', 42).attr('font-size', 12.5).attr('font-family', FONT);
    g.append('g').attr('class', 'legend');
    return g;
  });
  head.select('.title').text('Key terms, sized by importance');
  const done = T >= M.terms[M.terms.length - 1].revealAt + 0.3;
  head.select('.sub').attr('fill', done ? '#1d2433' : '#5b6475')
    .text(done ? M.summary + (dropped ? '  (' + dropped + ' did not fit at this size)' : '') : 'Terms appear from most to least important. Bigger means more important.');
  const items = M.groups.map((g, i) => ({ g, i }));
  const lg = head.select('.legend').attr('transform', `translate(${Math.max(14, W - 14 - items.length * 128)},16)`);
  lg.selectAll('g.it').data(items).join(e => { const g = e.append('g').attr('class', 'it'); g.append('rect').attr('width', 10).attr('height', 10).attr('rx', 2).attr('y', -9); g.append('text').attr('x', 15).attr('font-size', 11.5).attr('font-family', FONT); return g; })
    .attr('transform', d => `translate(${d.i * 128},0)`)
    .call(g => g.select('rect').attr('fill', d => M.focusGroup && M.focusGroup !== d.g ? MUTED : COLORS[d.i]))
    .call(g => g.select('text').attr('fill', '#5b6475').text(d => d.g));
  const cloud = svg.selectAll('g.cloud').data([0]).join('g').attr('class', 'cloud')
    .attr('transform', `translate(${W / 2},${TOP + (H - TOP) / 2})`);
  cloud.selectAll('text').data(placed, d => d.text).join('text')
    .attr('text-anchor', 'middle').attr('font-family', FONT).attr('font-weight', 600)
    .attr('font-size', d => d.size).attr('transform', d => `translate(${d.x},${d.y})`)
    .attr('fill', d => colorOf(d.src))
    .attr('opacity', d => Math.max(0, Math.min(1, (T - d.src.revealAt) / 0.3)))
    .text(d => d.text)
    .selectAll('title').data(d => [d]).join('title').text(d => `${d.src.text}: importance ${d.src.weight}/10 (${d.src.group}), rank ${d.src.rank}`);
}

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  seek(t) { T = t; draw(); },
  mount(r, params) {
    root = r; M = model(params); T = 0;
    svg = d3.select(root).append('svg').style('display', 'block').style('background', '#fff')
      .attr('role', 'img').attr('aria-label', 'Word cloud of key terms sized by importance');
    layout(); draw();
    onResize = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { layout(); draw(); }, 120); };
    addEventListener('resize', onResize);
  },
  update(params) { M = model(params); T = 0; layout(); draw(); },
  destroy() { removeEventListener('resize', onResize); clearTimeout(resizeTimer); if (svg) svg.remove(); svg = null; M = null; placed = []; }
};

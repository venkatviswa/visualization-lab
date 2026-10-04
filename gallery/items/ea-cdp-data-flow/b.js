// 3D story on the Story3D kit: Maria, the five sources, the platform stages, the profile and the two activations are
// stations; each model event is a timed visit. The kit draws props, flies the camera and seeks exactly; this adapter only maps model() output.
let story = null, M = null;

function config(m) {
  const PROP = { maria: 'people', portal: 'monitor', crm: 'magnifier', claims: 'pages', marketing: 'cards', callcenter: 'people',
    ingest: 'servers', harmonize: 'chain', unify: 'magnifier', insight: 'bars', profile: 'database', agent: 'robot', journey: 'cards' };
  const order = ['maria', 'claims', 'portal', 'crm', 'callcenter', 'marketing', 'ingest', 'harmonize', 'unify', 'profile', 'insight', 'agent', 'journey'];
  const sys = id => m.systems.find(s => s.id === id);
  const name = id => id === 'maria' ? 'Maria' : sys(id).name;
  const red = '#b42318', green = '#1f7a4d', amber = '#c2410c', blue = '#2b59c3';
  const profileScreen = (p, title) => ({ title: title || 'Unified profile', typing: false, status: [
    { label: 'Claim: ' + (p.claim ? 'DENIED' : 'none on file'), color: p.claim ? red : '#5b6475' },
    { label: 'Portal visits: ' + (p.visits || 0), color: blue },
    { label: 'Call: ' + (p.call || 'none'), color: p.call === 'negative' ? red : green },
    { label: 'Sources: ' + p.sources.length + ' of 5', color: p.sources.length >= 3 ? green : amber }] });
  return {
    title: 'One member, five sources, one profile',
    summary: m.summary,
    duration: m.duration,
    stations: order.map(id => ({
      id, label: name(id), prop: PROP[id], icon: id === 'maria' ? 'user' : sys(id).icon,
      count: id === 'claims' ? 5 : id === 'marketing' || id === 'journey' ? 4 : id === 'ingest' ? 3 : undefined,
      values: id === 'insight' ? [40, 55, 70, 85, 95] : undefined,
      locked: id !== 'maria' && sys(id).kind === 'source' && !sys(id).connected
    })),
    events: m.events.map(e => {
      const sc = m.scenes[e.scene], last = sc.i === m.scenes.length - 1, p = e.snap.profile;
      const station = e.kind === 'match' ? 'profile' : e.station;
      const good = ['match', 'insight', 'task', 'email', 'followup', 'call-good', 'map', 'ingest'].includes(e.kind);
      return {
        station, start: e.start, dur: e.dur,
        title: 'Scene ' + (sc.i + 1) + ' of ' + m.scenes.length + ' · ' + sc.title,
        note: last ? m.soWhat : e.note,
        ok: good,
        flags: e.kind === 'call-bad' || e.kind === 'blocked' || e.kind === 'again' ? 1 : e.kind === 'none' ? 2 : 0,
        mode: e.kind === 'blocked' ? 'enforce' : 'observe',
        open: e.kind === 'email' || e.kind === 'task',
        screen: e.kind === 'call-good' || e.kind === 'call-bad' || e.kind === 'followup' ? profileScreen(p, e.kind === 'call-bad' ? 'What the agent sees' : 'What the agent sees') : e.kind === 'match' ? profileScreen(p) : undefined
      };
    }),
    loops: m.insight ? [] : [{ from: 'agent', to: 'maria', label: 'calls again' }]
  };
}

window.lab = {
  get duration() { return M ? M.duration : 10; },
  get markers() { return M ? M.markers : []; },
  seek(t) { if (story) story.seek(t); },
  mount(root, params) { M = model(params); story = Story3D.mount(root, config(M)); },
  update(params) { M = model(params); story.update(config(M)); },
  destroy() { if (story) story.destroy(); story = null; }
};

// 3D story built on the Story3D kit: describe stations and timed events from model(); the kit draws,
// animates, flies the camera and seeks exactly.
const PROP = { jira: 'cards', plan: 'robot', build: 'monitor', review: 'magnifier', deploy: 'servers',
  document: 'chain', govern: 'shield', score: 'bars', improve: 'gate' };
const STATUS = [
  { label: 'RED · new test fails', color: '#b42318' },
  { label: 'GREEN · test passes', color: '#1f7a4d' },
  { label: 'REFACTOR · tests stay green', color: '#2b59c3' }
];
let story = null, M = null;

function config(m) {
  return {
    title: 'Agentic delivery pipeline',
    summary: m.summary,
    duration: m.duration,
    stations: m.stations.map(s => ({
      id: s.id, label: s.label, prop: PROP[s.id],
      values: s.id === 'score' ? m.scores.map(x => x.value) : undefined,
      pages: s.id === 'score' ? m.boardSections : undefined,
      count: s.id === 'document' ? 6 : undefined
    })),
    events: m.events.map(e => {
      const s = m.stations.find(x => x.id === e.station);
      return {
        station: e.station, start: e.start, dur: e.dur, note: e.note,
        title: s.n + ' · ' + s.label + (e.cycle ? ', cycle ' + e.cycle : ''),
        loop: e.kind === 'findings' || e.kind === 'rework',
        flags: e.kind === 'findings' ? e.open : 0,
        ok: e.kind === 'pass',
        mode: e.kind === 'enforce' ? 'enforce' : 'observe',
        open: e.kind === 'applied',
        screen: e.station === 'build' ? {
          title: e.cycle > 1 ? 'Cycle ' + e.cycle + ': fix a finding' : 'Cycle 1: Apex + LWC',
          status: STATUS, typing: e.cycle === 1, highlightLine: e.cycle > 1 ? 3 : undefined
        } : undefined
      };
    }),
    loops: m.findings ? [{ from: 'review', to: 'build', label: 'rework ×' + m.findings }] : []
  };
}

window.lab = {
  get duration() { return story ? story.duration : 10; },
  get markers() { return story ? story.markers : []; },
  seek(t) { if (story) story.seek(t); },
  mount(root, params) { M = model(params); story = Story3D.mount(root, config(M)); },
  update(params) { M = model(params); story.update(config(M)); },
  destroy() { if (story) story.destroy(); story = null; }
};

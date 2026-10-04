// 3D story on the Story3D kit: Maria and the eight systems are stations, each model event is a timed visit.
// The kit draws the props, flies the camera and seeks exactly; this adapter only maps model() output.
const ICONS = { maria: 'smartphone', portal: 'app-window', gateway: 'shield-check', crm: 'contact', mdm: 'database',
  claims: 'file-text', billing: 'receipt', analytics: 'chart-column' };
let story = null, M = null;

function config(m) {
  const ed = m.style === 'event';
  // Station props: billing is a gate, so a closed bar means "nothing gets through" (down or still waiting).
  const PROP = { maria: 'people', portal: 'monitor', gateway: 'shield', crm: 'magnifier', bus: ed ? 'cards' : 'chain',
    mdm: 'database', claims: 'pages', billing: 'gate', analytics: 'bars' };
  const order = ['maria', 'portal', 'gateway', 'crm', 'bus', 'mdm', 'claims', 'billing', 'analytics'];
  const name = id => id === 'maria' ? 'Maria' : m.systems.find(s => s.id === id).name;
  const saving = { label: 'Saving…', color: '#2b59c3' };
  const SCREEN = {
    submit: { title: 'Update address: ' + m.newAddress, status: [saving], typing: true },
    saved: { title: 'Update address: ' + m.newAddress, status: [{ label: 'Saved ✓ (' + m.responseText + ')', color: '#1f7a4d' }], typing: false },
    error: { title: 'Update address: ' + m.newAddress, status: [{ label: 'Something went wrong', color: '#b42318' }], typing: false }
  };
  const failCase = !ed && m.outage;
  return {
    title: 'One address change, eight systems',
    summary: m.summary,
    duration: m.duration,
    stations: order.map(id => ({
      id, label: name(id), prop: PROP[id], icon: id === 'bus' ? (ed ? 'radio-tower' : 'cable') : ICONS[id],
      count: id === 'maria' ? 1 : id === 'claims' ? 6 : id === 'bus' ? 4 : undefined,
      values: id === 'analytics' ? [62, 78, 55, 88, 70] : undefined
    })),
    events: m.events.map(e => {
      const sc = m.scenes[e.scene], last = sc.i === m.scenes.length - 1;
      // queued and caught-up events happen at billing's door in 3D: the gate holds the message until billing is back
      const station = e.kind === 'queued' ? 'billing' : e.station;
      return {
        station, start: e.start, dur: e.dur,
        title: 'Scene ' + (sc.i + 1) + ' of ' + m.scenes.length + ' · ' + sc.title,
        note: last ? m.soWhat : e.note,
        ok: e.kind === 'save',
        flags: e.kind === 'rollback' ? 2 : 0,
        mode: 'enforce',
        open: e.kind === 'catchup',
        loop: failCase && (e.kind === 'timeout' || e.kind === 'rollback'),
        screen: SCREEN[e.kind]
      };
    }),
    loops: failCase ? [{ from: 'billing', to: 'crm', label: 'timeout, rollback' }] : []
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

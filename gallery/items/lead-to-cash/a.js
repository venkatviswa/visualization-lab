// 3D story built on the Story3D kit: one platform per stage this deal visits, timed events from model(),
// the kit draws the props, flies the camera and seeks exactly. Colours come from the viewer's chosen look.
const PROP = { lead: 'people', qualify: 'magnifier', quote: 'monitor', approval: 'gate', contract: 'pages',
  credit: 'shield', hold: 'gate', order: 'servers', invoice: 'cards', payment: 'database' };
const ICON = { lead: 'user-plus', qualify: 'search', quote: 'badge-percent', approval: 'user-check', contract: 'file-signature',
  credit: 'credit-card', hold: 'circle-pause', order: 'shopping-cart', invoice: 'receipt', payment: 'banknote' };
let story = null;

const dollars = v => '$' + v.toLocaleString('en-US');
const dayText = d => d + (d === 1 ? ' day' : ' days');

function config(m) {
  const path = m.stations.filter(s => s.onPath);
  const num = id => path.findIndex(s => s.id === id) + 1;
  return {
    title: 'Lead to cash: paid on day ' + m.totalDays,
    summary: m.summary,
    duration: m.duration,
    stations: path.map(s => ({
      id: s.id, label: s.label, prop: PROP[s.id], icon: ICON[s.id],
      count: s.id === 'lead' ? 3 : s.id === 'contract' ? 8 : undefined,
      locked: s.id === 'order' ? false : undefined
    })),
    events: m.events.map(e => {
      const s = m.stations.find(x => x.id === e.station);
      const stall = e.kind === 'wait';
      return {
        station: e.station, start: e.start, dur: e.dur, note: e.note,
        title: num(e.station) + ' · ' + s.label + (e.days ? ' · ' + dayText(e.days) : '') + (stall ? ' stalled' : ''),
        ok: e.kind === 'qualify',
        mode: e.kind === 'pass' ? 'enforce' : 'observe',
        open: e.kind === 'approved' || e.kind === 'released',
        screen: e.station === 'quote' ? {
          title: 'Quote · ' + m.discountPct + '% discount',
          typing: true,
          status: [
            { label: 'List ' + dollars(m.listValue), color: '#5b6475' },
            { label: m.discountPct + '% off' + (m.approvalStep ? ' · needs approval' : ''), color: m.approvalStep ? '#c2410c' : '#2b59c3' },
            { label: 'Net ' + dollars(m.netValue) + ' a year', color: '#1f7a4d' }
          ]
        } : undefined
      };
    }),
    loops: []
  };
}

window.lab = {
  get duration() { return story ? story.duration : 10; },
  get markers() { return story ? story.markers : []; },
  seek(t) { if (story) story.seek(t); },
  mount(root, params) { story = Story3D.mount(root, config(model(params))); },
  update(params) { story.update(config(model(params))); },
  destroy() { if (story) story.destroy(); story = null; }
};

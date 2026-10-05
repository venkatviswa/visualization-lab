// Text version of a lesson: what the visual shows, as text, built from the model alone. Renderers never compute, so the model
// already holds every number, step and label the picture draws; this turns it into a summary, a step list, key numbers and
// small tables. Used by the lab's Text tab, the "Text version" of standalone and course pages, and the step announcements
// for screen readers. Plain script, no imports: the page and kit/build.mjs inline it.
//
// labText.view(model(p)) -> { summary, steps: [{ time, title, note }], numbers: [[label, value]], tables: [{ name, cols, rows }], long: [[label, count]] }
// labText.stepAt(view, seconds) -> index of the step showing at that playback time, or -1
// labText.render(document, view, check) -> an element with the text version (check is { pass, detail } or null)
// labText.say(view, index) -> "Step 2 of 5: title. note" for a live region
(function (g) {
  const STEP_KEYS = ['steps', 'events', 'scenes', 'stages', 'stations', 'phases', 'moments'];
  const TITLE = ['title', 'label', 'name', 'headline', 'text', 'station', 'id'];
  const NOTE = ['note', 'detail', 'details', 'description', 'desc', 'caption', 'body', 'message'];
  const TIME = ['t', 'start', 'at', 'time'];
  const SKIP = ['summary', 'duration', 'markers'];
  const scalar = v => v == null || typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean';
  const words = k => String(k).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/^./, c => c.toUpperCase());
  const show = v => v == null ? '' : typeof v === 'boolean' ? (v ? 'yes' : 'no') : typeof v === 'number' ? (Number.isInteger(v) ? String(v) : String(+v.toPrecision(4))) : String(v);
  const pick = (o, keys) => { for (const k of keys) if (o[k] != null && scalar(o[k]) && String(o[k]).trim() !== '') return o[k]; return null; };

  function view(m) {
    const out = { summary: '', steps: [], numbers: [], tables: [], long: [] };
    if (!m || typeof m !== 'object') return out;
    if (typeof m.summary === 'string') out.summary = m.summary;
    let stepsKey = null;
    for (const k of STEP_KEYS) {
      const a = m[k];
      if (!Array.isArray(a) || !a.length || a.length > 200 || !a.every(x => x && typeof x === 'object')) continue;
      const steps = a.map(x => { const t = pick(x, TIME), title = pick(x, TITLE), note = pick(x, NOTE); return { time: typeof t === 'number' ? t : null, title: title == null ? '' : String(title), note: note == null || note === title ? '' : String(note) }; }).filter(x => x.title || x.note);
      if (steps.length) { out.steps = steps; stepsKey = k; break; }
    }
    const addNumber = (label, v) => { if (out.numbers.length < 30) out.numbers.push([label, show(v)]); };
    for (const [k, v] of Object.entries(m)) {
      if (SKIP.includes(k) || k === stepsKey || typeof v === 'function') continue;
      if (scalar(v)) { if (v != null && v !== '') addNumber(words(k), v); continue; }
      if (Array.isArray(v)) {
        if (!v.length) continue;
        if (v.every(x => typeof x === 'number' || typeof x === 'string') && v.length <= 12) { addNumber(words(k), v.map(show).join(', ')); continue; }
        const rows = v.filter(x => x && typeof x === 'object' && !Array.isArray(x));
        if (rows.length === v.length && rows.length <= 60 && out.tables.length < 4) {
          const cols = Object.keys(rows[0]).filter(c => rows.every(r => scalar(r[c]))).slice(0, 6);
          if (cols.length) { out.tables.push({ name: words(k), cols: cols.map(words), rows: rows.map(r => cols.map(c => show(r[c]))) }); continue; }
        }
        out.long.push([words(k), v.length]);
        continue;
      }
      if (v && typeof v === 'object') for (const [k2, v2] of Object.entries(v)) if (scalar(v2) && v2 != null && v2 !== '') addNumber(words(k) + ' · ' + words(k2).toLowerCase(), v2);
    }
    return out;
  }
  function stepAt(tv, t) {
    if (!tv || !tv.steps.length || tv.steps.every(s => s.time == null)) return -1;
    let i = -1; tv.steps.forEach((s, j) => { if (s.time != null && s.time <= t + 1e-6) i = j; });
    return i;
  }
  function say(tv, i) {
    const s = tv && tv.steps[i]; if (!s) return '';
    return 'Step ' + (i + 1) + ' of ' + tv.steps.length + ': ' + [s.title, s.note].filter(Boolean).join('. ');
  }
  function render(doc, tv, check) {
    const h = (tag, attrs, ...kids) => { const n = doc.createElement(tag); for (const k in attrs || {}) if (attrs[k] != null) n.setAttribute(k, attrs[k]); for (const c of kids) if (c != null) n.append(c); return n; };
    const box = h('div', { class: 'textview' });
    if (!tv) { box.append(h('p', null, 'The text version appears once the visual has started.')); return box; }
    if (tv.summary) box.append(h('p', { class: 'tv-summary' }, tv.summary));
    if (check && check.detail) box.append(h('p', { class: 'tv-check' }, h('strong', null, check.pass ? 'What the model confirms: ' : 'Check failed: '), check.detail));
    if (tv.steps.length) {
      box.append(h('h3', null, 'Step by step'));
      const ol = h('ol');
      for (const s of tv.steps) ol.append(h('li', null, s.time != null ? h('span', { class: 'tv-time' }, s.time.toFixed(1) + ' s · ') : null, s.title ? h('strong', null, s.title) : null, s.note ? (s.title ? '. ' : '') + s.note : null));
      box.append(ol);
    }
    if (tv.numbers.length) {
      box.append(h('h3', null, 'Key numbers'));
      const t = h('table'), tb = h('tbody');
      for (const [k, v] of tv.numbers) tb.append(h('tr', null, h('th', { scope: 'row' }, k), h('td', null, v)));
      t.append(tb); box.append(t);
    }
    for (const tab of tv.tables) {
      const t = h('table'), head = h('tr');
      t.append(h('caption', null, tab.name));
      for (const c of tab.cols) head.append(h('th', { scope: 'col' }, c));
      const tb = h('tbody'); for (const r of tab.rows) tb.append(h('tr', null, ...r.map(c => h('td', null, c))));
      t.append(h('thead', null, head), tb); box.append(t);
    }
    if (tv.long.length) box.append(h('p', { class: 'tv-note' }, 'Not listed here (too long to read out): ' + tv.long.map(([k, n]) => k.toLowerCase() + ' (' + n + ' entries)').join(', ') + '.'));
    if (!tv.summary && !tv.steps.length && !tv.numbers.length && !tv.tables.length) box.append(h('p', null, 'This lesson\'s model returns no summary, steps or numbers to show as text.'));
    return box;
  }
  g.labText = { view, stepAt, say, render };
})(typeof globalThis !== 'undefined' ? globalThis : window);

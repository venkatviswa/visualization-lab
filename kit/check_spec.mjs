// Validate a lesson spec before any visual is built.
// Usage: node check_spec.mjs spec.json   -> prints {ok, issues[], defaults: {check}, sweep[]} and exits 1 when not ok.
import fs from 'fs';
const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const issues = [];
for (const k of ['title', 'objective', 'params', 'modelCode', 'checkCode']) if (!spec[k]) issues.push('missing ' + k);
let model, check;
try { ({ model, check } = new Function(spec.modelCode + '\n' + spec.checkCode + '\nreturn { model, check };')()); }
catch (e) { issues.push('modelCode/checkCode do not compile: ' + e.message); }
const probe = (m, tag) => {
  const seen = new Set();
  if (m == null || typeof m !== 'object') { issues.push(tag + ': model() returned no data object'); return; }
  (function walk(v, path, d) {
    if (d > 5) return;
    if (Array.isArray(v)) { if (!v.length) seen.add(path + ' is empty'); else if (v.length === 1 && d < 2) seen.add(path + ' has only one entry'); v.slice(0, 400).forEach(x => walk(x, path + '[]', d + 1)); return; }
    if (typeof v === 'number') { if (!Number.isFinite(v)) seen.add(path + ' contains ' + v); return; }
    if (v && typeof v === 'object') for (const k in v) walk(v[k], path + '.' + k, d + 1);
  })(m, 'result', 0);
  seen.forEach(x => issues.push(tag + ': ' + x));
};
const out = { ok: false, issues, defaults: null, sweep: [] };
if (model && Array.isArray(spec.params)) {
  const P = Object.fromEntries(spec.params.map(q => [q.id, q.value]));
  for (const q of spec.params) {
    if (!(q.min < q.max) || q.value < q.min || q.value > q.max) issues.push('param ' + q.id + ' has an invalid range or default');
    if (q.labels && q.labels.length !== Math.round((q.max - q.min) / q.step) + 1) issues.push('param ' + q.id + ' labels do not match its steps');
  }
  try {
    const m0 = model(P); probe(m0, 'defaults'); const c = check(P); out.defaults = c;
    if (!c || !c.pass) issues.push('check fails at defaults: ' + (c && c.detail));
    if (!spec.expectAtDefaults) issues.push('missing expectAtDefaults: a JS expression over m (model output) and p that is true when the defaults show the main behavior');
    else if (!new Function('m', 'p', 'return (' + spec.expectAtDefaults + ');')(m0, P)) issues.push('defaults do not show the main behavior: expectAtDefaults is false (' + spec.expectAtDefaults + ')');
  }
  catch (e) { issues.push('defaults: ' + e.message); }
  for (const q of spec.params) for (const v of [q.min, q.max]) {
    const p = Object.assign({}, P, { [q.id]: v });
    try { model(p); const c = check(p); out.sweep.push({ [q.id]: v, pass: !!(c && c.pass), detail: c && c.detail }); if (!c || !c.pass) issues.push('check fails at ' + q.id + '=' + v + ': ' + (c && c.detail)); }
    catch (e) { issues.push(q.id + '=' + v + ': ' + e.message); }
  }
}
out.ok = !issues.length;
console.log(JSON.stringify(out, null, 2));
process.exit(out.ok ? 0 : 1);

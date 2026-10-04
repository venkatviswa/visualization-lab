// Validate a lesson spec before any visual is built.
// Usage: node check_spec.mjs spec.json   -> prints {ok, issues[], warnings[], defaults: {check}, sweep[]} and exits 1 when not ok.
// Issues fail the spec: missing fields, code that does not compile, a failing check anywhere, empty / single-entry / NaN data at the defaults,
// NaN or no data at a slider's extremes, and defaults that do not show the main behaviour (expectAtDefaults). Empty or single-entry data at an
// extreme is a warning, because an edge value may legitimately produce none.
import fs from 'fs';
const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const issues = [], warnings = [];
for (const k of ['title', 'objective', 'params', 'modelCode', 'checkCode']) if (!spec[k]) issues.push('missing ' + k);
let model, check;
try { ({ model, check } = new Function(spec.modelCode + '\n' + spec.checkCode + '\nreturn { model, check };')()); }
catch (e) { issues.push('modelCode/checkCode do not compile: ' + e.message); }
// strict (defaults): empty or single-entry arrays are issues. Lenient (slider extremes): they are warnings, since an edge value may legitimately produce none. NaN is always an issue.
const probe = (m, tag, lenient) => {
  const seen = new Set(), soft = new Set();
  if (m == null || typeof m !== 'object') { issues.push(tag + ': model() returned no data object'); return; }
  (function walk(v, path, d) {
    if (d > 5) return;
    if (Array.isArray(v)) { if (!v.length) (lenient ? soft : seen).add(path + ' is empty'); else if (v.length === 1 && d < 2) (lenient ? soft : seen).add(path + ' has only one entry'); v.slice(0, 400).forEach(x => walk(x, path + '[]', d + 1)); return; }
    if (typeof v === 'number') { if (!Number.isFinite(v)) seen.add(path + ' contains ' + v); return; }
    if (v && typeof v === 'object') for (const k in v) walk(v[k], path + '.' + k, d + 1);
  })(m, 'result', 0);
  seen.forEach(x => issues.push(tag + ': ' + x));
  soft.forEach(x => warnings.push(tag + ': ' + x));
};
const out = { ok: false, issues, warnings, defaults: null, sweep: [] };
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
    try { probe(model(p), q.id + '=' + v, true); const c = check(p); out.sweep.push({ [q.id]: v, pass: !!(c && c.pass), detail: c && c.detail }); if (!c || !c.pass) issues.push('check fails at ' + q.id + '=' + v + ': ' + (c && c.detail)); }
    catch (e) { issues.push(q.id + '=' + v + ': ' + e.message); }
  }
}
out.ok = !issues.length;
console.log(JSON.stringify(out, null, 2));
process.exit(out.ok ? 0 : 1);

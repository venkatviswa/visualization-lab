#!/usr/bin/env node
// Publish a lesson made in the lab to the gallery: turn an exported .lesson.json (Export lesson) into a gallery lesson
// under gallery/items/<slug>/, add it to gallery/gallery.json, and check it the way the gallery build will.
//
//   npm run add-lesson -- <file.lesson.json> --category "Enterprise process" [options]
//
// Options
//   --category <name>   the subject it is filed under in Get inspired (required; one of the page's GAL_CATS)
//   --title <text>      card title (default: the spec's title)
//   --slug <slug>       folder name (default: from the title)
//   --after <slug>      position in the gallery (default: after the last lesson of the same subject)
//   --versions A,C      which versions to publish (default: all; at least two)
//   --form B="line chart"  set or correct a version's chart form (repeatable); forms must be in AUTHORING.md's table
//   --expect "<expr>"   expectAtDefaults when the spec has none: a JS expression over m (model output) and p
//   --replace           overwrite a lesson with the same slug
//   --no-verify         skip building and verifying the versions in Chromium (the gallery build still does it)
//   --repo <dir>        repository root (default: this repository; used by the tests)
//
// The lesson only reaches the published site after a commit and push: CI tests it and rebuilds the gallery, then the
// pages workflow deploys. Importing the same file in a browser (Import lesson) is temporary and only for that browser.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const FLAGS = ['--replace', '--no-verify'];
const file = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--') && !FLAGS.includes(args[i - 1])));
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const opts = k => args.flatMap((a, i) => a === k ? [args[i + 1]] : []);
const flag = k => args.includes(k);
const root = path.resolve(opt('--repo') || path.join(here, '..'));
const fail = (msg, extra) => { console.error('add-lesson: ' + msg + (extra ? '\n' + extra : '')); process.exit(1); };
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const slugify = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);

if (!file) fail('give the exported lesson file: npm run add-lesson -- my-lesson.lesson.json --category "Enterprise process"');
let data; try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { fail('cannot read ' + file + ' as JSON: ' + e.message); }
const L = data && data.visualizationLab ? data.lesson : (data && data.spec && data.versions ? data : null);
if (!L || !L.spec) fail(file + ' is not a Visualization Lab lesson (Export lesson in the lab writes one).');
const spec = Object.assign({}, L.spec);
for (const k of ['title', 'objective', 'params', 'modelCode', 'checkCode']) if (!spec[k]) fail('the spec has no ' + k + '; draft and check the spec in the lab before publishing.');

// What the gallery accepts: libraries, chart forms and subjects come from their single sources
const libIds = JSON.parse(read('kit/libraries.json')).libraries.map(l => l.id);
const formsBlock = read('AUTHORING.md').match(/<!-- lab:forms -->\n([\s\S]*?)<!-- \/lab -->/);
const forms = formsBlock ? formsBlock[1].split('\n').filter(l => l.startsWith('| ') && !l.startsWith('| Form') && !l.startsWith('| ---')).map(l => l.split('|')[1].trim()) : [];
const catsMatch = read('src/vislab.html').match(/const GAL_CATS = (\[[^\]]*\]);/);
const cats = catsMatch ? JSON.parse(catsMatch[1]).filter(c => c !== 'All') : [];
const category = opt('--category');
if (!category || !cats.includes(category)) fail((category ? '"' + category + '" is not a gallery subject.' : 'choose a subject with --category.') + ' Subjects: ' + cats.join(', ') + '.');

// Versions
const pick = opt('--versions') ? opt('--versions').toUpperCase().split(',').map(s => s.trim()).filter(Boolean) : null;
let versions = (L.versions || []).filter(v => v && /^[A-F]$/.test(v.id) && typeof v.code === 'string' && v.code.trim()).sort((a, b) => a.id.localeCompare(b.id));
if (pick) { const missing = pick.filter(id => !versions.some(v => v.id === id)); if (missing.length) fail('the file has no version ' + missing.join(', ') + '.'); versions = versions.filter(v => pick.includes(v.id)); }
if (versions.length < 2) fail('a gallery lesson needs at least two versions to compare; this one has ' + versions.length + '.');
const formFix = Object.fromEntries(opts('--form').map(s => { const m = String(s).match(/^([A-Fa-f])=(.+)$/); if (!m) fail('--form takes ID="form name", e.g. --form B="line chart"'); return [m[1].toUpperCase(), m[2].trim()]; }));
for (const v of versions) {
  if (!libIds.includes(v.lib)) fail('version ' + v.id + ' uses ' + v.lib + ', which is not in kit/libraries.json.');
  if (formFix[v.id]) v.form = formFix[v.id];
  if (!forms.includes(v.form)) fail('version ' + v.id + (v.form ? ' names the chart form "' + v.form + '", which is not in' : ' has no chart form from') + ' the table in AUTHORING.md. Give one with --form ' + v.id + '="…" (or add a row to the table first).',
    'Forms: ' + forms.join(', '));
}

// Spec: the gallery's quality gate needs expectAtDefaults; the lab's library choices follow the published versions
if (opt('--expect')) spec.expectAtDefaults = opt('--expect');
if (!spec.expectAtDefaults) { spec.expectAtDefaults = 'm && typeof m === "object"'; console.warn('add-lesson: the spec has no expectAtDefaults, so the defaults are only checked for data. Pass --expect "<expression over m and p>" to say what the defaults must show.'); }
spec.recommended = Object.assign({}, spec.recommended, { library: versions[0].lib });
spec.alternative = Object.assign({}, spec.alternative, { library: versions[1].lib });

const title = opt('--title') || spec.title;
const slug = slugify(opt('--slug') || title);
if (!slug) fail('cannot make a folder name from the title; pass --slug.');
const gj = JSON.parse(read('gallery/gallery.json'));
const dir = path.join(root, 'gallery/items', slug);
if ((fs.existsSync(dir) || gj.order.includes(slug)) && !flag('--replace')) fail('a gallery lesson called ' + slug + ' already exists. Pass --replace to overwrite it, or --slug to choose another name.');
if (gj.refs[slug]) fail(slug + ' is a built-in example; choose another --slug.');

// The spec check runs before anything is written
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'add-lesson-'));
fs.writeFileSync(path.join(tmp, 'spec.json'), JSON.stringify(spec, null, 2));
const cs = spawnSync(process.execPath, [path.join(root, 'kit/check_spec.mjs'), path.join(tmp, 'spec.json')], { encoding: 'utf8' });
if (cs.status !== 0) { let issues = []; try { issues = JSON.parse(cs.stdout).issues; } catch (e) {} fail('the spec does not pass kit/check_spec.mjs:', (issues.length ? issues : [cs.stdout + cs.stderr]).map(x => '  - ' + x).join('\n')); }

// Write the lesson
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'spec.json'), JSON.stringify(spec, null, 2) + '\n');
const meta = { slug, category, title, goal: String(L.goal || spec.objective) };
versions.forEach((v, i) => {
  const k = 'abcdef'[i];
  fs.writeFileSync(path.join(dir, k + '.js'), v.code.endsWith('\n') ? v.code : v.code + '\n');
  meta[k] = { lib: v.lib, form: v.form, explanation: String(v.explanation || '').trim() || 'Version ' + v.id + ' drawn with ' + v.lib + '.', caveats: Array.isArray(v.caveats) ? v.caveats.map(String) : [] };
});
fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');

// Place it in the gallery order
const catOf = s => gj.refs[s] ? gj.refs[s].category : (() => { try { return JSON.parse(read('gallery/items/' + s + '/meta.json')).category; } catch (e) { return null; } })();
const order = gj.order.filter(s => s !== slug);
let at = order.length;
if (opt('--after')) { const i = order.indexOf(opt('--after')); if (i < 0) fail('--after ' + opt('--after') + ' is not in the gallery.'); at = i + 1; }
else {
  // after the last lesson of the same subject; for a new subject, before the first lesson of a subject listed after it
  const cs = order.map(catOf), last = cs.lastIndexOf(category);
  if (last >= 0) at = last + 1;
  else { const later = cats.slice(cats.indexOf(category) + 1), i = cs.findIndex(c => later.includes(c)); if (i >= 0) at = i; }
}
order.splice(at, 0, slug);
gj.order = order;
fs.writeFileSync(path.join(root, 'gallery/gallery.json'), JSON.stringify(gj, null, 2) + '\n');
const relDir = path.relative(root, dir);
console.log('add-lesson: wrote ' + relDir + '/ (spec.json, meta.json, ' + versions.map((_, i) => 'abcdef'[i] + '.js').join(', ') + ') and placed it ' + (at === 0 ? 'first' : 'after ' + order[at - 1]) + ' in gallery/gallery.json.');
if (!(spec.assumptions || []).length) console.warn('add-lesson: the spec lists no assumptions; gallery lessons say there that their data is illustrative.');

// Verify every version the way the gallery build does
async function verify() {
  const missing = !fs.existsSync(path.join(root, '.cdn'));
  if (missing) { console.warn('add-lesson: no package mirror in .cdn/ (npm run mirror), so the versions were not verified here; the gallery build in CI will.'); return true; }
  const port = 8790 + Math.floor(Math.random() * 40);
  const server = spawn(process.execPath, [path.join(root, 'scripts/serve.mjs'), String(port)], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 700));
  try {
    const pages = [];
    for (const [i, v] of versions.entries()) {
      const k = 'abcdef'[i], out = path.join(tmp, slug + '__' + k + '.html');
      const extra = v.lib === 'story3d' ? ['--kit', path.join(root, 'kit/story3d_kit.js')] : v.lib === 'reactflow' ? ['--rfcss', path.join(root, 'kit/reactflow.css')] : [];
      const b = spawnSync(process.execPath, [path.join(root, 'kit/build.mjs'), path.join(dir, 'spec.json'), path.join(dir, k + '.js'), v.lib, 'studio', out, '--cdn', `http://localhost:${port}/.cdn/`, ...extra], { encoding: 'utf8' });
      if (b.status !== 0) { console.error(b.stderr); return false; }
      pages.push(out);
    }
    const r = spawnSync(process.execPath, [path.join(root, 'kit/verify.mjs'), path.join(tmp, 'shots'), ...pages], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    const results = r.stdout.split('\n').filter(l => l.startsWith('{')).map(l => JSON.parse(l));
    for (const [i, x] of results.entries()) {
      const id = versions[i].id, why = x.errors.join('; ') || (x.blank ? 'blank preview' : x.overflow ? 'overflows on a phone' : x.embedClipped ? 'scrolls inside the standard embed' : !x.check || !x.check.pass ? 'check fails' : (x.extremes || []).some(e => !e.check) ? 'check fails at a slider extreme' : '');
      console.log('  version ' + id + ' (' + versions[i].lib + '): ' + (x.pass && !x.overflow && !x.embedClipped ? 'passes' : 'FAILS: ' + why));
    }
    console.log('  screenshots: ' + path.join(tmp, 'shots'));
    return r.status === 0 && results.length === pages.length && results.every(x => x.pass && !x.overflow && !x.embedClipped);
  } finally { server.kill(); }
}
const ok = flag('--no-verify') ? true : await verify();
if (!ok) fail('a version does not pass. The files are written; fix the code in the lab (or in ' + relDir + '/) and run again with --replace.');
console.log(`
Next: this lesson is in your copy of the repository only.
  npm run build:gallery        optional: see it under Get inspired locally (npm run serve)
  git add gallery && git commit -m "Gallery: ${title.replace(/"/g, "'")}" && git push
After the push, CI tests it and rebuilds the gallery; when the test workflow is green, the pages workflow publishes it for everyone.`);

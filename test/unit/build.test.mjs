// The build is reproducible and the built page carries what the sources say.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { spawnSync } from 'child_process';
import { root, read, json } from '../helpers.mjs';

const build = () => { const r = spawnSync(process.execPath, [path.join(root, 'scripts/build.mjs')], { encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); };

test('build runs and is deterministic', () => {
  build(); const a = read('dist/vislab.html');
  build(); const b = read('dist/vislab.html');
  assert.equal(a, b, 'two builds produced different pages');
  assert.ok(a.length > 150000 && a.length < 400000, 'unexpected page size ' + a.length);
});

const page = () => read('dist/vislab.html');
const scripts = () => [...page().matchAll(/<script(?![^>]*(type="text\/plain"|importmap|type="module"))[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[2]);

test('built page: every inline script parses', () => {
  for (const s of scripts()) new Function(s);
  assert.ok(!/\/\*@[A-Z0-9_]+@\*\/|@@[A-Z_]+@@/.test(page()), 'placeholder left in the page');
});

test('built page: the gallery count the header and empty state show is the number of lessons in gallery.json, and the four examples are in the picker', () => {
  const n = json('gallery/gallery.json').order.length;
  assert.ok(page().includes('const GALLERY_COUNT = ' + n + ';'), 'GALLERY_COUNT');
  for (const k of ['projectile', 'rocket', 'pipeline', 'terms']) assert.ok(page().includes('<option value="' + k + '">'), k + ' in the example picker');
  assert.ok(!page().includes('id="btnExample"'), 'the old example buttons are gone');
});

// Evaluate the data section of the page (STARTERS through the built-in examples) without a DOM
const dataSection = () => {
  const src = page(), a = src.indexOf('const STARTERS = ['), b = src.indexOf('const HARNESS');
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext(src.slice(a, b) + ';this.OUT = { STARTERS, EXAMPLE, ROCKET, PIPELINE, TERMS };', ctx);
  return ctx.OUT;
};

test('built page: built-in lessons match the files in examples/', () => {
  const out = dataSection();
  for (const [name, dir] of [['EXAMPLE', 'projectile'], ['ROCKET', 'rocket'], ['PIPELINE', 'pipeline'], ['TERMS', 'terms']]) {
    const ex = json(`examples/${dir}/lesson.json`);
    assert.equal(out[name].spec.title, ex.spec.title);
    assert.equal(out[name].spec.modelCode.trim(), read(`examples/${dir}/model.js`).trim());
    assert.deepEqual([...out[name].versions.map(v => v.lib)], ex.versions.map(v => v.lib));
    for (const v of out[name].versions) assert.equal(v.code.trim(), read(`examples/${dir}/${v.id.toLowerCase()}.js`).trim());
  }
});

test('built page: library list, runtime notes and pairs come from libraries.json', () => {
  const libj = json('kit/libraries.json'), src = page();
  const a = src.indexOf('const JSD ='), b = src.indexOf('const LIB_IDS');
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext(src.slice(a, b) + ';this.OUT = { LIBS, RUNTIME };', ctx);
  assert.deepEqual([...Object.keys(ctx.OUT.LIBS)].sort(), libj.libraries.map(l => l.id).sort());
  for (const l of libj.libraries) { assert.equal(ctx.OUT.LIBS[l.id].notes, l.notes, l.id); assert.equal(ctx.OUT.RUNTIME[l.id], l.runtime, l.id); }
  const pm = src.match(/const PAIRS = (\[[\s\S]*?\n\]);/); assert.ok(pm);
  const pairs = JSON.parse(pm[1]);
  assert.deepEqual(pairs.map(p => [p.a, p.b]), libj.comparisons.map(c => [c.a, c.b]));
});

test('built page: prompts contain the rules from AUTHORING.md', () => {
  const src = page(), doc = read('AUTHORING.md');
  const firstLine = name => doc.match(new RegExp(`<!-- lab:${name} -->\\n([^\\n]+)`))[1].replace(/`/g, '\\`');
  const spec = src.slice(src.indexOf('const SPEC_PROMPT'), src.indexOf('function renderPrompt'));
  const render = src.slice(src.indexOf('function renderPrompt'), src.indexOf('let specBusy'));
  for (const n of ['spec-rules', 'model-rules', 'check-rules']) assert.ok(spec.includes(firstLine(n)), `spec prompt lacks ${n}`);
  for (const n of ['renderer-contract', 'look', 'phone']) assert.ok(render.includes(firstLine(n)), `renderer prompt lacks ${n}`);
  for (const l of json('kit/libraries.json').libraries) assert.ok(spec.includes(`${l.id} (${l.purpose})`), `spec prompt lacks library ${l.id}`);
});

test('docs: generated tables match libraries.json', () => {
  const libj = json('kit/libraries.json');
  const table = read('AUTHORING.md').match(/<!-- lab:libraries -->\n([\s\S]*?)<!-- \/lab -->/)[1];
  for (const l of libj.libraries) assert.ok(table.includes('| `' + l.id + '` |'), 'library table lacks ' + l.id);
  for (const f of ['README.md', 'AUTHORING.md']) {
    const t = read(f).match(/<!-- lab:comparisons -->\n([\s\S]*?)<!-- \/lab -->/)[1];
    for (const c of libj.comparisons) assert.ok(t.includes(c.kind), `${f} comparisons table lacks ${c.kind}`);
  }
});

test('dist: toolkit and examples are published next to the page', () => {
  for (const f of ['dist/kit/build.mjs', 'dist/kit/verify.mjs', 'dist/kit/check_spec.mjs', 'dist/kit/template.html', 'dist/kit/story3d_kit.js', 'dist/kit/libraries.json', 'dist/vendor/codemirror.min.js', 'dist/examples/rocket.spec.json', 'dist/README.md', 'dist/AUTHORING.md'])
    assert.ok(fs.existsSync(path.join(root, f)), f);
});

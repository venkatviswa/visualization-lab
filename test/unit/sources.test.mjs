// The single sources are well-formed and agree with each other.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { root, read, json } from '../helpers.mjs';

const libj = json('kit/libraries.json');
const ids = libj.libraries.map(l => l.id);

test('libraries.json: every library has the required fields', () => {
  for (const l of libj.libraries) {
    for (const k of ['id', 'name', 'dim', 'module', 'global', 'purpose', 'head', 'runtime', 'notes']) assert.ok(k in l, `${l.id} is missing ${k}`);
    assert.match(l.dim, /^(2D|3D|2D\/3D)$/);
    assert.ok(l.notes.length > 40, `${l.id} notes are too short`);
  }
  assert.equal(new Set(ids).size, ids.length, 'duplicate library ids');
});

test('libraries.json: comparisons reference known libraries and have a lesson line', () => {
  for (const c of libj.comparisons) {
    assert.ok(ids.includes(c.a) && ids.includes(c.b), `${c.kind} references an unknown library`);
    assert.notEqual(c.a, c.b);
    assert.ok(c.learn.length > 10 && c.when && c.kind);
  }
});

test('AUTHORING.md: every block the build reads is present and non-empty', () => {
  const doc = read('AUTHORING.md');
  for (const name of ['spec-rules', 'model-rules', 'check-rules', 'renderer-contract', 'look', 'phone', 'libraries', 'comparisons']) {
    const m = doc.match(new RegExp(`<!-- lab:${name} -->\\n([\\s\\S]*?)<!-- /lab -->`));
    assert.ok(m, `missing block ${name}`);
    assert.ok(m[1].trim().length > 20, `block ${name} is empty`);
  }
});

test('src/vislab.html: every build placeholder is present exactly once', () => {
  const src = read('src/vislab.html');
  for (const ph of ['/*@RFCSS@*/', '/*@LIBS@*/', '/*@STORY3D_KIT@*/', '/*@LOOK2D@*/', '/*@TEMPLATE@*/', '/*@LIBS_STORY3D_AND_RUNTIME@*/', '/*@STARTERS@*/', '/*@EXAMPLES@*/', '/*@PAIRS@*/', '@@SPEC_RULES@@', '@@RENDER_CONTRACT@@'])
    assert.equal(src.split(ph).length - 1, 1, ph);
});

test('examples: each built-in lesson has a lesson.json, model, check and one file per version', () => {
  for (const dir of ['projectile', 'rocket', 'pipeline', 'terms']) {
    const d = path.join(root, 'examples', dir);
    const ex = JSON.parse(fs.readFileSync(path.join(d, 'lesson.json'), 'utf8'));
    assert.ok(ex.constant && ex.spec && ex.versions.length >= 2, dir);
    for (const f of ['model.js', 'check.js', ...ex.versions.map(v => v.id.toLowerCase() + '.js')]) assert.ok(fs.existsSync(path.join(d, f)), `${dir}/${f}`);
    for (const v of ex.versions) assert.ok(ids.includes(v.lib), `${dir} version ${v.id} uses unknown library ${v.lib}`);
    assert.ok(!('modelCode' in ex.spec), `${dir}: modelCode belongs in model.js, not lesson.json`);
  }
});

test('gallery: gallery.json lists every item folder, and every item has the files the gallery build needs', () => {
  const gal = json('gallery/gallery.json');
  const folders = fs.readdirSync(path.join(root, 'gallery/items')).filter(f => fs.statSync(path.join(root, 'gallery/items', f)).isDirectory());
  for (const f of folders) assert.ok(gal.order.includes(f), `gallery.json does not list ${f}`);
  for (const slug of gal.order) {
    if (gal.refs[slug]) { assert.ok(fs.existsSync(path.join(root, 'examples', gal.refs[slug].example)), slug); continue; }
    const d = path.join(root, 'gallery/items', slug);
    assert.ok(fs.existsSync(d), `missing item folder ${slug}`);
    const meta = JSON.parse(fs.readFileSync(path.join(d, 'meta.json'), 'utf8'));
    assert.ok(meta.category && meta.title && meta.goal, `${slug}: meta needs category, title and goal`);
    for (const k of ['a', 'b', 'c']) if (meta[k]) {
      assert.ok(ids.includes(meta[k].lib), `${slug} ${k}: unknown library ${meta[k].lib}`);
      assert.ok(meta[k].explanation && meta[k].explanation.length > 60, `${slug} ${k}: explanation too short`);
      assert.ok(fs.existsSync(path.join(d, k + '.js')), `${slug}/${k}.js`);
    }
    assert.ok(meta.a && meta.b, `${slug}: a gallery lesson needs at least two versions`);
  }
});

test('chart forms: every gallery and example version names a form that is in the guide\'s forms table, and the page carries the vocabulary', () => {
  const guide = read('AUTHORING.md'), m = guide.match(/<!-- lab:forms -->\n([\s\S]*?)<!-- \/lab -->/);
  assert.ok(m, 'AUTHORING.md needs a <!-- lab:forms --> block');
  const rows = m[1].split('\n').filter(l => l.startsWith('| ') && !l.startsWith('| Form') && !l.startsWith('| ---')).map(l => l.split('|').slice(1, -1).map(c => c.trim()));
  const names = rows.map(r => r[0]);
  assert.ok(names.length >= 30, 'forms table is short');
  assert.equal(new Set(names).size, names.length, 'duplicate form names');
  for (const r of rows) assert.ok(r[1] && r[2], `form ${r[0]} needs a fit and a library list`);
  const gal = json('gallery/gallery.json'), used = new Set();
  for (const slug of gal.order) {
    if (gal.refs[slug]) continue;
    const meta = json(`gallery/items/${slug}/meta.json`);
    for (const k of ['a', 'b', 'c']) if (meta[k]) { assert.ok(meta[k].form, `${slug} ${k}: missing form`); assert.ok(names.includes(meta[k].form), `${slug} ${k}: form "${meta[k].form}" is not in the guide's forms table`); used.add(meta[k].form); }
  }
  for (const ex of fs.readdirSync(path.join(root, 'examples'))) {
    const lesson = json(`examples/${ex}/lesson.json`);
    for (const v of lesson.versions) { assert.ok(v.form, `${ex} ${v.id}: missing form`); assert.ok(names.includes(v.form), `${ex} ${v.id}: form "${v.form}" is not in the guide's forms table`); used.add(v.form); }
  }
  for (const r of rows) if (r[3] === 'planned' || r[3].startsWith('planned')) assert.ok(!used.has(r[0]), `form ${r[0]} is marked planned but a lesson uses it`);
  const page = read('dist/vislab.html');
  assert.ok(page.includes('Chart forms. Name the form each version should take'), 'the spec prompt carries the forms line');
  assert.ok(page.includes('Chart form names (use one of these for "form"'), 'the renderer prompt carries the form names');
  for (const n of ['Gantt timeline', 'swimlane', 'heatmap']) assert.ok(page.includes(n), n);
});

test('docs/SKILL.lesson-visual-bakeoff.md: every library is a contender with a notes row, and the kit files it names exist', () => {
  const skill = read('docs/SKILL.lesson-visual-bakeoff.md');
  const table = skill.slice(skill.indexOf('## 2. Choose three contenders'), skill.indexOf('## 3.'));
  const notes = skill.slice(skill.indexOf('Library notes (paste'), skill.indexOf('## 4.'));
  for (const id of ids) {
    assert.ok(table.includes('`' + id + '`'), `${id} is never offered as a contender`);
    assert.ok(notes.includes(`- **${id}**:`), `${id} has no library notes row`);
  }
  const setup = skill.slice(skill.indexOf('## 0.'), skill.indexOf('## 1.'));
  for (const f of fs.readdirSync(path.join(root, 'kit'))) assert.ok(setup.includes(f), `kit/${f} is not listed in the skill's setup section`);
  for (const f of fs.readdirSync(path.join(root, 'dist/examples'))) assert.ok(setup.includes(f), `examples/${f} is not listed in the skill's setup section`);
});

test('the page\'s scoring rubric is the bake-off skill\'s judge rubric (same criteria, weights summing to 100)', () => {
  const src = read('src/vislab.html');
  const m = src.match(/const RUBRIC = (\[[\s\S]*?\]);\n/); assert.ok(m, 'RUBRIC constant');
  const rubric = new Function('return ' + m[1])();
  assert.equal(rubric.reduce((t, r) => t + r.weight, 0), 100);
  const skill = read('docs/SKILL.lesson-visual-bakeoff.md');
  const rows = [...skill.matchAll(/^\| ([^|]+?) \| (\d+)% \| ([^|]+?) \|$/gm)].map(r => ({ label: r[1], weight: Number(r[2]), q: r[3] }));
  assert.equal(rows.length, rubric.length, 'judge table rows');
  rows.forEach((row, i) => { assert.equal(rubric[i].label, row.label); assert.equal(rubric[i].weight, row.weight); assert.equal(rubric[i].q, row.q); });
});

test('the embed rule is identical in verify.mjs, AUTHORING.md, README.md and the bake-off skill', () => {
  const m = read('kit/verify.mjs').match(/const EMBED_CSS = '([^']+)'/); assert.ok(m, 'EMBED_CSS in verify.mjs');
  for (const f of ['AUTHORING.md', 'README.md', 'docs/SKILL.lesson-visual-bakeoff.md']) assert.ok(read(f).includes(m[1]), `${f} does not carry the embed rule ${m[1]}`);
});

// scripts/add_lesson.mjs: an exported lesson becomes a gallery lesson, in a scratch copy of the repository's sources.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { root, read, json } from '../helpers.mjs';

// A scratch repository with what the script reads: the kit, the guide, the page (for the subjects) and the gallery list
function scratch() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'add-lesson-test-'));
  fs.cpSync(path.join(root, 'kit'), path.join(dir, 'kit'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'src')); fs.copyFileSync(path.join(root, 'src/vislab.html'), path.join(dir, 'src/vislab.html'));
  fs.copyFileSync(path.join(root, 'AUTHORING.md'), path.join(dir, 'AUTHORING.md'));
  fs.cpSync(path.join(root, 'gallery'), path.join(dir, 'gallery'), { recursive: true });
  return dir;
}
// The same shape as the lab's Export lesson, made from a gallery lesson
function exported(slug, dir) {
  const d = `gallery/items/${slug}/`, meta = json(d + 'meta.json'), spec = json(d + 'spec.json');
  const versions = ['a', 'b', 'c'].filter(k => meta[k]).map(k => ({ id: k.toUpperCase(), lib: meta[k].lib, form: meta[k].form, code: read(d + k + '.js'), explanation: meta[k].explanation, caveats: meta[k].caveats }));
  const f = path.join(dir, slug + '.lesson.json');
  fs.writeFileSync(f, JSON.stringify({ visualizationLab: 1, title: spec.title, lesson: { goal: meta.goal, view: '2D', libChoice: 'recommend', spec, versions, chat: [] } }));
  return f;
}
const run = (dir, args) => spawnSync(process.execPath, [path.join(root, 'scripts/add_lesson.mjs'), ...args, '--repo', dir, '--no-verify'], { encoding: 'utf8' });

test('add-lesson writes the lesson, files it under its subject and keeps the spec, versions and forms', () => {
  const dir = scratch(), f = exported('collisions', dir);
  const r = run(dir, [f, '--category', 'Physics', '--slug', 'carts-again', '--title', 'Carts, again']);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const d = path.join(dir, 'gallery/items/carts-again'), meta = JSON.parse(fs.readFileSync(path.join(d, 'meta.json'), 'utf8'));
  assert.deepEqual([meta.slug, meta.category, meta.title], ['carts-again', 'Physics', 'Carts, again']);
  assert.deepEqual([meta.a.lib, meta.a.form, meta.b.lib, meta.b.form], ['p5', '2D simulation', 'chartjs', 'line chart']);
  assert.equal(fs.readFileSync(path.join(d, 'a.js'), 'utf8'), read('gallery/items/collisions/a.js'));
  assert.equal(JSON.parse(fs.readFileSync(path.join(d, 'spec.json'), 'utf8')).modelCode, json('gallery/items/collisions/spec.json').modelCode);
  const order = JSON.parse(fs.readFileSync(path.join(dir, 'gallery/gallery.json'), 'utf8')).order;
  assert.equal(order[order.indexOf('carts-again') - 1], 'collisions', 'placed after the last Physics lesson');
  assert.match(r.stdout, /git push/, 'says what makes it permanent');
});

test('add-lesson picks versions, corrects a form, and places it where asked', () => {
  const dir = scratch(), f = exported('ea-record-flow', dir);
  const r = run(dir, [f, '--category', 'Enterprise architecture', '--versions', 'B,C', '--form', 'C=card grid', '--after', 'key-terms', '--slug', 'records-two']);
  assert.equal(r.status, 0, r.stderr);
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'gallery/items/records-two/meta.json'), 'utf8'));
  assert.deepEqual([meta.a.lib, meta.b.lib, meta.b.form, meta.c], ['d3sankey', 'story', 'card grid', undefined]);
  const order = JSON.parse(fs.readFileSync(path.join(dir, 'gallery/gallery.json'), 'utf8')).order;
  assert.equal(order[order.indexOf('records-two') - 1], 'key-terms');
});

test('add-lesson refuses what the gallery would reject, and writes nothing', () => {
  const dir = scratch(), f = exported('collisions', dir), before = fs.readFileSync(path.join(dir, 'gallery/gallery.json'), 'utf8');
  const cases = [
    [[f, '--category', 'Cooking'], /not a gallery subject/],
    [[f, '--category', 'Physics', '--form', 'A=pie of the day'], /not in the table in AUTHORING\.md/],
    [[f, '--category', 'Physics', '--slug', 'collisions'], /already exists/],
    [[f, '--category', 'Physics', '--versions', 'A'], /at least two versions/],
    [[f, '--category', 'Physics', '--slug', 'projectile-range'], /already exists|built-in example/]
  ];
  for (const [args, msg] of cases) { const r = run(dir, args); assert.notEqual(r.status, 0, args.join(' ')); assert.match(r.stderr, msg, args.join(' ')); }
  const broken = JSON.parse(fs.readFileSync(f, 'utf8')); broken.lesson.spec.checkCode = 'function check(p) { return { pass: false, detail: "never" }; }';
  fs.writeFileSync(f, JSON.stringify(broken));
  const r = run(dir, [f, '--category', 'Physics', '--slug', 'broken-carts']); assert.notEqual(r.status, 0); assert.match(r.stderr, /check_spec/);
  assert.equal(fs.readFileSync(path.join(dir, 'gallery/gallery.json'), 'utf8'), before, 'gallery.json unchanged');
  assert.ok(!fs.existsSync(path.join(dir, 'gallery/items/broken-carts')));
});

test('the gallery lesson about publishing was itself added with add-lesson and sits first under Using the lab', () => {
  const g = json('gallery/gallery.json'), meta = json('gallery/items/lesson-lifecycle/meta.json');
  assert.equal(meta.category, 'Using the lab');
  assert.equal(g.order[0], 'lesson-lifecycle');
  assert.deepEqual(['a', 'b', 'c'].map(k => meta[k].form), ['swimlane', 'Gantt timeline', 'flow chart']);
});

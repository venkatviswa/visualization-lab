// The toolkit builds standalone pages for every library from libraries.json and the pages pass verify in Chromium.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { root, startServer } from '../helpers.mjs';

let server;
before(async () => { server = await startServer(); });
after(() => server && server.close());

const work = path.join(root, '.work/toolkit'); fs.mkdirSync(work, { recursive: true });
const kit = f => path.join(root, 'kit', f);
const run = (script, args) => spawnSync(process.execPath, [kit(script), ...args], { encoding: 'utf8' });

test('build.mjs refuses an unknown library and story3d without --kit', () => {
  const spec = path.join(root, 'dist/examples/rocket.spec.json'), code = path.join(root, 'examples/rocket/a.js');
  assert.notEqual(run('build.mjs', [spec, code, 'nosuchlib', 'studio', path.join(work, 'x.html')]).status, 0);
  assert.notEqual(run('build.mjs', [spec, code, 'story3d', 'studio', path.join(work, 'x.html')]).status, 0);
});

test('build + verify: one page per library family passes', async () => {
  const cases = [
    ['rocket', 'a', 'p5'], ['rocket', 'b', 'chartjs'],
    ['projectile', 'b', 'three'],
    ['pipeline', 'a', 'story'], ['pipeline', 'b', 'reactflow'], ['pipeline', 'c', 'story3d'],
    ['terms', 'a', 'wordcloud']
  ];
  const pages = [];
  for (const [ex, v, lib] of cases) {
    const out = path.join(work, `${ex}_${lib}.html`);
    const extra = lib === 'story3d' ? ['--kit', kit('story3d_kit.js')] : lib === 'reactflow' ? ['--rfcss', kit('reactflow.css')] : [];
    const r = run('build.mjs', [path.join(root, 'dist/examples', ex + '.spec.json'), path.join(root, 'examples', ex, v + '.js'), lib, 'studio', out, '--cdn', server.cdn, ...extra]);
    assert.equal(r.status, 0, r.stderr);
    pages.push(out);
  }
  // d3 via the gallery's regional-hires B, plain svg via regression-outlier A
  for (const [slug, v, lib] of [['regional-hires', 'b', 'd3'], ['regression-outlier', 'a', 'svg']]) {
    const out = path.join(work, `${slug}_${lib}.html`);
    const r = run('build.mjs', [path.join(root, 'gallery/items', slug, 'spec.json'), path.join(root, 'gallery/items', slug, v + '.js'), lib, 'studio', out, '--cdn', server.cdn]);
    assert.equal(r.status, 0, r.stderr); pages.push(out);
  }
  const r = run('verify.mjs', [path.join(work, 'shots'), ...pages]);
  assert.equal(r.status, 0, r.stderr);
  const results = r.stdout.split('\n').filter(l => l.startsWith('{')).map(l => JSON.parse(l));
  assert.equal(results.length, pages.length);
  for (const x of results) assert.ok(x.pass, `${x.page}: ${x.errors.join('; ') || (x.blank ? 'blank' : JSON.stringify(x.check))}`);
  for (const x of results) assert.ok(x.timeline, `${x.page} has no timeline`);
  for (const x of results) assert.ok(!x.overflow, `${x.page} overflows on a phone`);
  for (const x of results) assert.equal(x.embedClipped, false, `${x.page} scrolls inside the standard embed`);
  for (const x of results) assert.ok(x.status.length > 10, `${x.page} has no text status line`);
  for (const x of results) assert.ok(x.extremes.length >= 4 && x.extremes.every(e => e.check), `${x.page}: check fails at a slider extreme ${JSON.stringify(x.extremes)}`);
  for (const x of results) assert.ok(x.shots.some(f => /x-\w+-min\.png$/.test(f)) && x.shots.some(f => /x-\w+-max\.png$/.test(f)), `${x.page} has no extreme screenshots`);
});

test('build.mjs applies the 2D look to story pages: night and blueprint build and pass, studio has no look stylesheet', () => {
  const spec = path.join(root, 'dist/examples/pipeline.spec.json'), code = path.join(root, 'examples/pipeline/a.js'), pages = [];
  for (const theme of ['studio', 'night', 'blueprint']) {
    const out = path.join(work, `pipeline_story_${theme}.html`);
    assert.equal(run('build.mjs', [spec, code, 'story', theme, out, '--cdn', server.cdn]).status, 0);
    const html = fs.readFileSync(out, 'utf8');
    assert.equal(html.includes('id="look2d"'), theme !== 'studio', theme);
    pages.push(out);
  }
  const r = run('verify.mjs', [path.join(work, 'shots'), ...pages]);
  for (const l of r.stdout.split('\n').filter(l => l.startsWith('{'))) { const x = JSON.parse(l); assert.ok(x.pass && !x.blank, x.page); }
});

test('build.mjs --course wraps the visual as a lesson page and it passes verify', () => {
  const out = path.join(work, 'rocket_course.html');
  assert.equal(run('build.mjs', [path.join(root, 'dist/examples/rocket.spec.json'), path.join(root, 'examples/rocket/a.js'), 'p5', 'studio', out, '--cdn', server.cdn, '--course']).status, 0);
  const html = fs.readFileSync(out, 'utf8');
  assert.ok(html.includes('const COURSE = {"title":"Rocket liftoff and escape"'), 'course json embedded');
  assert.ok(html.includes('"predict":'), 'predict prompt embedded');
  const r = run('verify.mjs', [path.join(work, 'shots'), out]);
  const x = JSON.parse(r.stdout.split('\n').find(l => l.startsWith('{')));
  assert.ok(x.pass && x.timeline && !x.overflow, JSON.stringify(x));
  assert.equal(x.embedClipped, null); assert.match(x.status, /Escapes/);
});

test('verify.mjs reports a broken renderer as failing', () => {
  const out = path.join(work, 'broken.html');
  fs.writeFileSync(path.join(work, 'broken.js'), 'window.lab = { mount() { throw new Error("boom"); }, update() {}, destroy() {} };');
  assert.equal(run('build.mjs', [path.join(root, 'dist/examples/rocket.spec.json'), path.join(work, 'broken.js'), 'svg', 'studio', out, '--cdn', server.cdn]).status, 0);
  const r = run('verify.mjs', [path.join(work, 'shots'), out]);
  const x = JSON.parse(r.stdout.split('\n').find(l => l.startsWith('{')));
  assert.equal(x.pass, false);
  assert.ok(x.errors.some(e => /boom/.test(e)));
  assert.notEqual(r.status, 0, 'a failing page makes verify exit 1');
});

test('verify.mjs fails a page that scrolls inside the standard embed, and reports the course page as not embedded', () => {
  // a renderer that forces the visual taller than any embed can be
  const tall = path.join(work, 'tall.html');
  fs.writeFileSync(path.join(work, 'tall.js'), "window.lab = { mount(root) { root.style.minHeight = '1400px'; const d = document.createElement('div'); d.textContent = 'tall'; d.style.cssText = 'height:1400px;background:linear-gradient(red,blue)'; root.append(d); }, update() {}, destroy() {} };");
  assert.equal(run('build.mjs', [path.join(root, 'dist/examples/rocket.spec.json'), path.join(work, 'tall.js'), 'svg', 'studio', tall, '--cdn', server.cdn]).status, 0);
  const course = path.join(work, 'tall_course.html');
  assert.equal(run('build.mjs', [path.join(root, 'dist/examples/rocket.spec.json'), path.join(work, 'tall.js'), 'svg', 'studio', course, '--cdn', server.cdn, '--course']).status, 0);
  const r = run('verify.mjs', [path.join(work, 'shots'), tall, course]);
  const [a, b] = r.stdout.split('\n').filter(l => l.startsWith('{')).map(l => JSON.parse(l));
  assert.equal(a.embedClipped, true); assert.equal(a.pass, false);
  assert.equal(b.embedClipped, null, 'course pages scroll by design and are not embed-tested');
  assert.notEqual(r.status, 0);
});

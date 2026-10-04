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
});

test('verify.mjs reports a broken renderer as failing', () => {
  const out = path.join(work, 'broken.html');
  fs.writeFileSync(path.join(work, 'broken.js'), 'window.lab = { mount() { throw new Error("boom"); }, update() {}, destroy() {} };');
  assert.equal(run('build.mjs', [path.join(root, 'dist/examples/rocket.spec.json'), path.join(work, 'broken.js'), 'svg', 'studio', out, '--cdn', server.cdn]).status, 0);
  const r = run('verify.mjs', [path.join(work, 'shots'), out]);
  const x = JSON.parse(r.stdout.split('\n').find(l => l.startsWith('{')));
  assert.equal(x.pass, false);
  assert.ok(x.errors.some(e => /boom/.test(e)));
});

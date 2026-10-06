// Slow: every gallery lesson, every version, built with the toolkit and verified in Chromium at the defaults
// and with every control at its minimum and at its maximum. Run with `npm run test:gallery`.
// Set GALLERY_ONLY=slug,slug to limit it. A lesson that passed with exactly the same inputs (scripts/lesson_hash.mjs: its
// files, the kit, this test) is skipped; GALLERY_FORCE=1 checks everything. Lessons run GALLERY_JOBS at a time
// (default: the number of CPUs, at most 4), each in its own verify process.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn, spawnSync } from 'child_process';
import { root, json, startServer } from '../helpers.mjs';
import { lessonHash } from '../../scripts/lesson_hash.mjs';

let server;
before(async () => { server = await startServer(); });
after(() => server && server.close());

const gal = json('gallery/gallery.json');
const slugs = gal.order.filter(s => !gal.refs[s]).filter(s => !process.env.GALLERY_ONLY || process.env.GALLERY_ONLY.split(',').includes(s));
const work = path.join(root, '.work/gallery-test'); fs.rmSync(work, { recursive: true, force: true }); fs.mkdirSync(work, { recursive: true });
const passedDir = path.join(root, '.work/gallery-passed'); fs.mkdirSync(passedDir, { recursive: true });
const jobs = Math.max(1, Number(process.env.GALLERY_JOBS) || Math.min(4, os.cpus().length));
const kit = f => path.join(root, 'kit', f);
const run = (script, args) => spawnSync(process.execPath, [kit(script), ...args], { encoding: 'utf8' });
const runAsync = (script, args) => new Promise(res => { const p = spawn(process.execPath, [kit(script), ...args]); let stdout = '', stderr = ''; p.stdout.on('data', d => { stdout += d; }); p.stderr.on('data', d => { stderr += d; }); p.on('close', status => res({ status, stdout, stderr })); });

describe('gallery', { concurrency: jobs }, () => {
for (const slug of slugs) {
  const hash = lessonHash(root, slug, gal, ['test/gallery/gallery.test.mjs', 'test/helpers.mjs', 'scripts/lesson_hash.mjs']);
  const record = path.join(passedDir, `${slug}.${hash}`);
  it(`gallery ${slug}: all versions pass at defaults, min and max`, async t => {
    if (!process.env.GALLERY_FORCE && fs.existsSync(record)) { t.skip('passed with these inputs on ' + fs.readFileSync(record, 'utf8').trim()); return; }
    const d = path.join(root, 'gallery/items', slug), meta = json(`gallery/items/${slug}/meta.json`), spec = json(`gallery/items/${slug}/spec.json`);
    const variants = { def: spec,
      min: { ...spec, params: spec.params.map(q => ({ ...q, value: q.min })), expectAtDefaults: undefined },
      max: { ...spec, params: spec.params.map(q => ({ ...q, value: q.max })), expectAtDefaults: undefined } };
    const pages = [];
    for (const [tag, sp] of Object.entries(variants)) {
      const specPath = path.join(work, `${slug}.${tag}.json`); fs.writeFileSync(specPath, JSON.stringify(sp));
      for (const k of ['a', 'b', 'c', 'd', 'e', 'f']) if (meta[k]) {
        const lib = meta[k].lib, out = path.join(work, `${slug}__${k}.${tag}.html`);
        const extra = lib === 'story3d' ? ['--kit', kit('story3d_kit.js')] : lib === 'reactflow' ? ['--rfcss', kit('reactflow.css')] : [];
        const r = run('build.mjs', [specPath, path.join(d, k + '.js'), lib, 'studio', out, '--cdn', server.cdn, ...extra]);
        assert.equal(r.status, 0, r.stderr); pages.push(out);
      }
    }
    const r = await runAsync('verify.mjs', [path.join(work, 'shots'), ...pages]);
    const results = r.stdout.split('\n').filter(l => l.startsWith('{')).map(l => JSON.parse(l));
    assert.equal(results.length, pages.length, r.stderr);
    const bad = results.filter(x => !x.pass || !x.timeline || x.overflow);
    assert.deepEqual(bad.map(x => `${x.page}: ${x.errors.join('; ') || (x.blank ? 'blank' : x.overflow ? 'overflow' : !x.timeline ? 'no timeline' : JSON.stringify(x.check))}`), []);
    assert.equal(r.status, 0, r.stderr);
    for (const f of fs.readdirSync(passedDir)) if (f.startsWith(slug + '.')) fs.rmSync(path.join(passedDir, f));
    fs.writeFileSync(record, new Date().toISOString() + '\n');
  });
}
});

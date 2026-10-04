// Slow: every gallery lesson, every version, built with the toolkit and verified in Chromium at the defaults
// and with every control at its minimum and at its maximum. Run with `npm run test:gallery`.
// Set GALLERY_ONLY=slug,slug to limit it.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { root, json, startServer } from '../helpers.mjs';

let server;
before(async () => { server = await startServer(); });
after(() => server && server.close());

const gal = json('gallery/gallery.json');
const slugs = gal.order.filter(s => !gal.refs[s]).filter(s => !process.env.GALLERY_ONLY || process.env.GALLERY_ONLY.split(',').includes(s));
const work = path.join(root, '.work/gallery-test'); fs.rmSync(work, { recursive: true, force: true }); fs.mkdirSync(work, { recursive: true });
const kit = f => path.join(root, 'kit', f);
const run = (script, args) => spawnSync(process.execPath, [kit(script), ...args], { encoding: 'utf8' });

for (const slug of slugs) {
  test(`gallery ${slug}: all versions pass at defaults, min and max`, async () => {
    const d = path.join(root, 'gallery/items', slug), meta = json(`gallery/items/${slug}/meta.json`), spec = json(`gallery/items/${slug}/spec.json`);
    const variants = { def: spec,
      min: { ...spec, params: spec.params.map(q => ({ ...q, value: q.min })), expectAtDefaults: undefined },
      max: { ...spec, params: spec.params.map(q => ({ ...q, value: q.max })), expectAtDefaults: undefined } };
    const pages = [];
    for (const [tag, sp] of Object.entries(variants)) {
      const specPath = path.join(work, `${slug}.${tag}.json`); fs.writeFileSync(specPath, JSON.stringify(sp));
      for (const k of ['a', 'b', 'c']) if (meta[k]) {
        const lib = meta[k].lib, out = path.join(work, `${slug}__${k}.${tag}.html`);
        const extra = lib === 'story3d' ? ['--kit', kit('story3d_kit.js')] : lib === 'reactflow' ? ['--rfcss', kit('reactflow.css')] : [];
        const r = run('build.mjs', [specPath, path.join(d, k + '.js'), lib, 'studio', out, '--cdn', server.cdn, ...extra]);
        assert.equal(r.status, 0, r.stderr); pages.push(out);
      }
    }
    const r = run('verify.mjs', [path.join(work, 'shots'), ...pages]);
    assert.equal(r.status, 0, r.stderr);
    const results = r.stdout.split('\n').filter(l => l.startsWith('{')).map(l => JSON.parse(l));
    assert.equal(results.length, pages.length);
    const bad = results.filter(x => !x.pass || !x.timeline || x.overflow);
    assert.deepEqual(bad.map(x => `${x.page}: ${x.errors.join('; ') || (x.blank ? 'blank' : x.overflow ? 'overflow' : !x.timeline ? 'no timeline' : JSON.stringify(x.check))}`), []);
  });
}

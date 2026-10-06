#!/usr/bin/env node
// Build dist/gallery/data.js and dist/gallery/thumbs/*.jpg from gallery/items/*/ and gallery/gallery.json.
// Every version is built with the toolkit and verified in headless Chromium; the build fails if any version fails.
// Usage: node scripts/build_gallery.mjs [--cdn URL] [--only slug,slug]   (default CDN: the local mirror in .cdn/ via a temporary server)
import fs from 'fs';
import path from 'path';
import { spawn, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const only = opt('--only') ? opt('--only').split(',') : null;
const gal = JSON.parse(fs.readFileSync(path.join(root, 'gallery/gallery.json'), 'utf8'));
const work = path.join(root, '.work/gallery-build'); fs.rmSync(work, { recursive: true, force: true }); fs.mkdirSync(work, { recursive: true });
const dist = path.join(root, 'dist/gallery'); fs.mkdirSync(path.join(dist, 'thumbs'), { recursive: true });

// A temporary static server so the pages can load libraries from the mirror
let server = null, cdn = opt('--cdn');
if (!cdn) {
  const port = 8770 + Math.floor(Math.random() * 20);
  server = spawn(process.execPath, [path.join(root, 'scripts/serve.mjs'), String(port)], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 600));
  cdn = `http://localhost:${port}/.cdn/`;
}
const run = (script, a, tolerate) => { const r = spawnSync(process.execPath, [path.join(root, 'kit', script), ...a], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); if (r.status && !tolerate) { console.error(r.stdout, r.stderr); throw new Error(script + ' failed: ' + a.join(' ')); } if (r.error) throw r.error; return r.stdout; };

// Items: specs, renderers and meta -> lab objects
const items = [], pages = [], failures = [];
const example = dir => {
  const d = path.join(root, 'examples', dir);
  const ex = JSON.parse(fs.readFileSync(path.join(d, 'lesson.json'), 'utf8'));
  const spec = { ...ex.spec, modelCode: fs.readFileSync(path.join(d, 'model.js'), 'utf8').trim(), checkCode: fs.readFileSync(path.join(d, 'check.js'), 'utf8').trim() };
  return { spec, versions: ex.versions.map(v => ({ ...v, code: fs.readFileSync(path.join(d, v.id.toLowerCase() + '.js'), 'utf8') })) };
};
for (const slug of gal.order) {
  if (only && !only.includes(slug)) continue;
  const ref = gal.refs[slug];
  let spec, versions, meta;
  if (ref) { ({ spec, versions } = example(ref.example)); meta = { category: ref.category, title: ref.title }; }
  else {
    const d = path.join(root, 'gallery/items', slug);
    meta = JSON.parse(fs.readFileSync(path.join(d, 'meta.json'), 'utf8'));
    spec = JSON.parse(fs.readFileSync(path.join(d, 'spec.json'), 'utf8'));
    versions = ['a', 'b', 'c', 'd', 'e', 'f'].filter(k => meta[k]).map(k => ({ id: k.toUpperCase(), lib: meta[k].lib, code: fs.readFileSync(path.join(d, k + '.js'), 'utf8'), form: meta[k].form || '', explanation: meta[k].explanation, caveats: meta[k].caveats || [] }));
    run('check_spec.mjs', [path.join(d, 'spec.json')]);
  }
  // build every version for verification; version A's end state becomes the thumbnail
  const specPath = path.join(work, slug + '.spec.json'); fs.writeFileSync(specPath, JSON.stringify(spec));
  for (const v of versions) {
    const code = path.join(work, `${slug}__${v.id}.js`); fs.writeFileSync(code, v.code);
    const out = path.join(work, `${slug}__${v.id.toLowerCase()}.html`);
    const extra = v.lib === 'story3d' ? ['--kit', path.join(root, 'kit/story3d_kit.js')] : v.lib === 'reactflow' ? ['--rfcss', path.join(root, 'kit/reactflow.css')] : [];
    run('build.mjs', [specPath, code, v.lib, 'studio', out, '--cdn', cdn, ...extra]);
    pages.push(out);
  }
  const lab = ref ? null : { goal: meta.goal, view: 'Auto', libChoice: 'recommend', spec: (({ expectAtDefaults, ...s }) => s)(spec), versions, chat: [] };
  items.push(ref ? { slug, category: ref.category, title: ref.title, ref: ref.constant, thumb: `gallery/thumbs/${slug}.jpg` }
    : { slug, category: meta.category, title: meta.title || spec.title, thumb: `gallery/thumbs/${slug}.jpg`, lab });
}

// Verify all pages at once
const out = run('verify.mjs', [path.join(work, 'shots'), ...pages], true);   // verify exits 1 when a page fails; the failures are listed below
for (const line of out.split('\n').filter(l => l.startsWith('{'))) { const r = JSON.parse(line); if (!r.pass) failures.push(r.page + ': ' + (r.errors.join('; ') || (r.blank ? 'blank' : r.overflow ? 'overflows at phone width' : r.embedClipped ? 'scrolls inside the standard embed' : r.extremes.some(e => !e.check) ? 'check fails at a slider extreme' : 'check failed'))); }

// Thumbnails: version A at the end of playback, clipped to the visual, at 0.56 scale (560x311)
const { chromium } = await import('playwright');
const exe = ['/opt/pw-browsers/chromium', process.env.CHROMIUM_PATH].find(p => p && fs.existsSync(p));
const browser = await chromium.launch(Object.assign({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }, exe ? { executablePath: exe } : {}));
const page = await browser.newPage({ viewport: { width: 1000, height: 640 }, deviceScaleFactor: 0.56 });
for (const it of items) {
  await page.goto('file://' + path.join(work, `${it.slug}__a.html`)); await page.waitForTimeout(2500);
  await page.evaluate(() => window.__seekFrac && window.__seekFrac(1)); await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(dist, 'thumbs', it.slug + '.jpg'), type: 'jpeg', quality: 82, clip: { x: 0, y: 0, width: 1000, height: 555 } });
}
await browser.close();
if (server) server.kill();

if (!only) fs.writeFileSync(path.join(dist, 'data.js'), 'window.GALLERY_DATA = ' + JSON.stringify(items).replace(/<\//g, '<\\/') + ';\n');
console.log(`gallery: ${items.length} lessons, ${pages.length} versions verified, ${failures.length} failures`);
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }

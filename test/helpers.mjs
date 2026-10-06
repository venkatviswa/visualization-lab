// Shared helpers for the test suite: repo paths, a static server on a free port, and a Chromium launcher.
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const read = p => fs.readFileSync(path.join(root, p), 'utf8');
export const json = p => JSON.parse(read(p));
export const exists = p => fs.existsSync(path.join(root, p));

export function startServer() {
  const port = 8800 + Math.floor(Math.random() * 100);
  const proc = spawn(process.execPath, [path.join(root, 'scripts/serve.mjs'), String(port)], { stdio: 'ignore' });
  const base = `http://localhost:${port}`;
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const tryOnce = () => fetch(base + '/package.json').then(() => resolve({ base, cdn: base + '/.cdn/', close: () => proc.kill() }))
      .catch(() => Date.now() - t0 > 5000 ? reject(new Error('server did not start')) : setTimeout(tryOnce, 100));
    tryOnce();
  });
}

// Outside Claude the lab's previews load libraries from lib/ beside the page first, then jsDelivr, then unpkg. Tests serve the
// page from .work/lab/ with lib/ linked to dist/lib, and point both CDNs at the local mirror. A test can drop lib/ (local: false)
// or point a CDN somewhere else (a missing folder plays a server that is down: Playwright's request routing does not see requests
// from the sandboxed preview frames, so blocking has to happen at the URL). Each `name` gets its own folder.
export function labUrlForTests(server, { primary = server.cdn, fallback = server.cdn, local = true, name } = {}) {
  const src = read('dist/vislab.html').replaceAll('https://cdn.jsdelivr.net/npm/', primary).replaceAll('https://unpkg.com/', fallback);
  const sub = name ? 'lab-' + name : 'lab', dir = path.join(root, '.work', sub); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'vislab.test.html'), src);
  // vendor/, gallery/, lib/ and the two guides are resolved relative to the page, so link them next to it
  for (const d of ['vendor', 'gallery', 'lib', 'README.md', 'AUTHORING.md']) {
    const l = path.join(dir, d); try { fs.unlinkSync(l); } catch (e) {}
    if (d !== 'lib' || local) fs.symlinkSync(path.join(root, 'dist', d), l);
  }
  return server.base + '/.work/' + sub + '/vislab.test.html';
}

export async function launch() {
  const { chromium } = await import('playwright');
  const exe = ['/opt/pw-browsers/chromium', process.env.CHROMIUM_PATH].find(p => p && fs.existsSync(p));
  return chromium.launch(Object.assign({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }, exe ? { executablePath: exe } : {}));
}

const readStatuses = page => page.$$eval('.pane', ns => ns.map(n => [n.dataset.vid, n.querySelector('[data-r=status]').innerText]));
// Pane statuses once every version has settled: a slower machine (a CI runner) takes longer to load libraries and run
// the check, so instead of trusting a fixed sleep this polls until no pane says Running or Generating (up to 30 s).
export async function statuses(page, timeout = 30000) {
  const t0 = Date.now(); let st = await readStatuses(page);
  while (Date.now() - t0 < timeout && (!st.length || st.some(([, s]) => s === '' || s === 'Running' || s === 'Generating'))) { await new Promise(r => setTimeout(r, 300)); st = await readStatuses(page); }
  return st;
}
export const sleep = ms => new Promise(r => setTimeout(r, ms));

// Accessibility audit with axe-core (WCAG 2.1 A and AA plus best practices) of the page as it is now; the sandboxed preview
// frames are skipped (their content is the lesson's own drawing; the Text tab and the downloaded pages' text version cover it).
export async function audit(page) {
  await page.addScriptTag({ path: path.join(root, 'node_modules/axe-core/axe.min.js') });
  return page.evaluate(async () => {
    const r = await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'], iframes: false });
    // CodeMirror's scroller holds a contenteditable that Tab reaches, which axe does not count as focusable content
    const vs = r.violations.map(v => v.id === 'scrollable-region-focusable' ? Object.assign({}, v, { nodes: v.nodes.filter(n => !/cm-scroller/.test(n.target.join(' '))) }) : v).filter(v => v.nodes.length);
    return vs.map(v => v.impact + ' ' + v.id + ': ' + v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | '));
  });
}

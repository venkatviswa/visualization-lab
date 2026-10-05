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

// The lab loads libraries from jsDelivr with unpkg as the fallback; tests point both at the local mirror instead.
// A test can point either server somewhere else (a missing folder plays a server that is down; Playwright's request routing
// does not see requests from the sandboxed preview frames, so blocking has to happen at the URL). `name` keeps variants apart.
export function labUrlForTests(server, { primary = server.cdn, fallback = server.cdn, name = 'vislab.test.html' } = {}) {
  const src = read('dist/vislab.html').replaceAll('https://cdn.jsdelivr.net/npm/', primary).replaceAll('https://unpkg.com/', fallback);
  const dir = path.join(root, '.work/lab'); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), src);
  // vendor/, gallery/ and the two guides are resolved relative to the page, so link them next to it
  for (const d of ['vendor', 'gallery', 'README.md', 'AUTHORING.md']) { const l = path.join(dir, d); try { fs.unlinkSync(l); } catch (e) {} fs.symlinkSync(path.join(root, 'dist', d), l); }
  return server.base + '/.work/lab/' + name;
}

export async function launch() {
  const { chromium } = await import('playwright');
  const exe = ['/opt/pw-browsers/chromium', process.env.CHROMIUM_PATH].find(p => p && fs.existsSync(p));
  return chromium.launch(Object.assign({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }, exe ? { executablePath: exe } : {}));
}

export const statuses = page => page.$$eval('.pane', ns => ns.map(n => [n.dataset.vid, n.querySelector('[data-r=status]').innerText]));
export const sleep = ms => new Promise(r => setTimeout(r, ms));

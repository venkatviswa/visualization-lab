// Verify built visuals in headless Chromium: errors, model check, blank-canvas test, and timeline screenshots.
// Usage: node verify.mjs <outDir> <page1.html> [page2.html ...]
// Writes <outDir>/<name>/{t00,t35,t70,t100,phone}.png and prints one JSON line per page.
import fs from 'fs';
import path from 'path';
let chromium;
try { ({ chromium } = await import('playwright')); } catch (e) { console.error('Install Playwright first: npm i playwright'); process.exit(1); }
const [outDir, ...pages] = process.argv.slice(2);
const exe = ['/opt/pw-browsers/chromium', process.env.CHROMIUM_PATH].find(p => p && fs.existsSync(p));
const browser = await chromium.launch(Object.assign({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }, exe ? { executablePath: exe } : {}));
for (const page of pages) {
  const name = path.basename(page, '.html'), dir = path.join(outDir, name);
  fs.mkdirSync(dir, { recursive: true });
  const p = await browser.newPage({ viewport: { width: 1000, height: 640 } });
  const consoleErrors = [];
  p.on('pageerror', e => consoleErrors.push(e.message));
  const url = page.startsWith('http') ? page : 'file://' + path.resolve(page);
  await p.goto(url); await p.waitForTimeout(3500);
  const st = await p.evaluate(() => ({ ready: !!window.__ready, errors: window.__errors || [], check: window.__check || null, timeline: !document.getElementById('transport').hidden }));
  const shots = [];
  for (const [f, tag] of [[0, 't00'], [0.35, 't35'], [0.7, 't70'], [1, 't100']]) {
    if (st.timeline || f === 0) { await p.evaluate(f => window.__seekFrac && window.__seekFrac(f), f); await p.waitForTimeout(700); const file = path.join(dir, tag + '.png'); await p.screenshot({ path: file }); shots.push(file); }
  }
  // Blank test: a screenshot of the visual area must show more than a couple of flat colors (works for WebGL too)
  const png = await p.locator('#root').screenshot();
  const blank = await p.evaluate(async b64 => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const g = document.createElement('canvas'); g.width = g.height = 48; const x = g.getContext('2d'); x.drawImage(img, 0, 0, 48, 48);
    const d = x.getImageData(0, 0, 48, 48).data, seen = new Set();
    for (let i = 0; i < d.length; i += 4) seen.add((d[i] >> 4) << 8 | (d[i + 1] >> 4) << 4 | (d[i + 2] >> 4));
    return seen.size < 4;
  }, png.toString('base64'));
  await p.setViewportSize({ width: 420, height: 800 }); await p.waitForTimeout(600);
  const phone = path.join(dir, 'phone.png'); await p.screenshot({ path: phone }); shots.push(phone);
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  const bytes = fs.existsSync(page) ? fs.statSync(page).size : null;
  const pass = st.ready && !st.errors.length && !consoleErrors.length && (!st.check || st.check.pass) && !blank;
  console.log(JSON.stringify({ page: name, pass, ready: st.ready, errors: st.errors.concat(consoleErrors), check: st.check, timeline: st.timeline, blank, overflow, kb: bytes && Math.round(bytes / 1024), shots }));
  await p.close();
}
await browser.close();

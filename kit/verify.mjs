// Verify built visuals in headless Chromium: errors, model check, blank-canvas test, phone overflow, embed clipping,
// the text status line, and screenshots along the timeline and at each slider's extremes.
// Usage: node verify.mjs <outDir> <page1.html> [page2.html ...]
// Writes <outDir>/<name>/{t00,t35,t70,t100,phone,x-<param>-min,x-<param>-max}.png and prints one JSON line per page.
// Exit code 1 when any page fails. A page passes when it is ready, has no errors, its check passes, the visual is not
// blank, nothing overflows at phone width and (unless it is a --course page) it fits the standard embed without scrolling.
import fs from 'fs';
import path from 'path';
let chromium;
try { ({ chromium } = await import('playwright')); } catch (e) { console.error('Install Playwright first: npm i playwright'); process.exit(1); }
const [outDir, ...pages] = process.argv.slice(2);
const exe = ['/opt/pw-browsers/chromium', process.env.CHROMIUM_PATH].find(p => p && fs.existsSync(p));
const browser = await chromium.launch(Object.assign({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }, exe ? { executablePath: exe } : {}));
// The embed rule a course must use (kept identical in AUTHORING.md and the bake-off skill)
const EMBED_CSS = '.lab-embed{display:block;width:100%;aspect-ratio:16/10;min-height:680px;max-height:85vh;border:0}';
let failed = 0;
for (const page of pages) {
  const name = path.basename(page, '.html'), dir = path.join(outDir, name);
  fs.mkdirSync(dir, { recursive: true });
  const p = await browser.newPage({ viewport: { width: 1000, height: 640 } });
  const consoleErrors = [];
  p.on('pageerror', e => consoleErrors.push(e.message));
  const url = page.startsWith('http') ? page : 'file://' + path.resolve(page);
  await p.goto(url); await p.waitForTimeout(3500);
  const st = await p.evaluate(() => ({ ready: !!window.__ready, errors: window.__errors || [], check: window.__check || null, timeline: !document.getElementById('transport').hidden,
    status: window.__status || '', course: document.body.classList.contains('course'), params: (typeof SPEC !== 'undefined' && SPEC.params || []).map(q => ({ id: q.id, min: q.min, max: q.max, value: q.value })) }));
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
  // Extreme states: each slider at its minimum and maximum (up to 4 sliders), at the end of the timeline, so the judge sees what a control does
  const extremes = [];
  if (st.ready && typeof st.params === 'object') for (const q of st.params.slice(0, 4)) {
    for (const [v, tag] of [[q.min, 'min'], [q.max, 'max']]) {
      await p.evaluate(([id, v]) => { window.__setParams && window.__setParams({ [id]: v }); window.__seekFrac && window.__seekFrac(1); }, [q.id, v]); await p.waitForTimeout(600);
      const file = path.join(dir, 'x-' + q.id + '-' + tag + '.png'); await p.screenshot({ path: file }); shots.push(file);
      extremes.push({ param: q.id, value: v, check: await p.evaluate(() => window.__check && window.__check.pass), status: await p.evaluate(() => window.__status || '') });
    }
    await p.evaluate(([id, v]) => window.__setParams && window.__setParams({ [id]: v }), [q.id, q.value]);
  }
  const errorsAfter = await p.evaluate(() => window.__errors || []);
  await p.setViewportSize({ width: 420, height: 800 }); await p.waitForTimeout(600);
  const phone = path.join(dir, 'phone.png'); await p.screenshot({ path: phone }); shots.push(phone);
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  await p.close();
  // Embed test: the page inside the standard embed, on a phone and in a 560 px column, must not scroll inside the frame.
  // Course pages are whole-page documents that scroll by design, so they are not embedded this way.
  let embedClipped = null;
  if (!st.course && fs.existsSync(page)) {
    const html = fs.readFileSync(page, 'utf8');
    embedClipped = false;
    for (const [w, h, col] of [[390, 844, null], [1440, 900, 560]]) {
      const host = await browser.newPage({ viewport: { width: w, height: h } });
      await host.setContent(`<!doctype html><style>body{margin:0;padding:16px}${EMBED_CSS}</style><div style="${col ? 'width:' + col + 'px' : ''}"><iframe class="lab-embed" sandbox="allow-scripts" title="lab"></iframe></div>`);
      await host.evaluate(h => { document.querySelector('iframe').srcdoc = h; }, html);
      await host.waitForTimeout(2500);
      const fr = host.frames().find(f => f !== host.mainFrame());
      const clipped = fr ? await fr.evaluate(() => document.documentElement.scrollHeight > innerHeight + 1 || document.documentElement.scrollWidth > innerWidth + 1).catch(() => true) : true;
      if (clipped) embedClipped = true;
      await host.close();
    }
  }
  const bytes = fs.existsSync(page) ? fs.statSync(page).size : null;
  // Chromium reports a benign warning when a ResizeObserver callback resizes its own target during a busy frame; it is not a page error
  const errors = errorsAfter.concat(consoleErrors).filter(e => !/ResizeObserver loop/.test(String(e)));
  const pass = st.ready && !errors.length && (!st.check || st.check.pass) && !blank && !overflow && !embedClipped;
  if (!pass) failed++;
  console.log(JSON.stringify({ page: name, pass, ready: st.ready, errors, check: st.check, timeline: st.timeline, blank, overflow, embedClipped, status: st.status, extremes, kb: bytes && Math.round(bytes / 1024), shots }));
}
await browser.close();
process.exitCode = failed ? 1 : 0;

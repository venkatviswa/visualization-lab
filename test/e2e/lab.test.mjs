// End-to-end tests of the lab page in headless Chromium, against the built dist/vislab.html and the local package mirror.
// Covers: examples load and pass their checks; shared sliders; host-owned playback and keyboard; the view/library mismatch flag;
// comparison lines; the code editor (run, errors with line jumps, undo, discard); the console; full screen; download availability;
// the gallery tab (load on demand, filters, surprise me, open, use this prompt, the replace guard); dark mode and phone width.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, labUrlForTests, launch, statuses, sleep } from '../helpers.mjs';

import fs from 'fs';
import path from 'path';
import { root } from '../helpers.mjs';
let server, browser, url;
before(async () => {
  if (!fs.existsSync(path.join(root, 'dist/gallery/data.js'))) throw new Error('dist/gallery is missing: run `npm run build:gallery` once before the e2e tests'); server = await startServer(); browser = await launch(); url = labUrlForTests(server); });
after(async () => { await browser?.close(); server?.close(); });

async function fresh(opts = {}) {
  // tall viewport: previews scrolled out of view pause their animation frames in headless Chromium
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 2600 }, ...opts });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(url); await page.evaluate(() => localStorage.clear()); await page.reload(); await sleep(500);
  return { ctx, page, errors };
}
const allPass = st => st.length > 0 && st.every(([, s]) => s === 'Check passed');

test('built-in examples load, every version passes its check, and the comparison line is shown', async () => {
  const { ctx, page, errors } = await fresh();
  for (const [btn, versions] of [['#btnExample', 2], ['#btnRocket', 2], ['#btnPipeline', 3], ['#btnTerms', 3]]) {
    await page.click(btn); await sleep(6000);
    const st = await statuses(page);
    assert.equal(st.length, versions, btn);
    assert.ok(allPass(st), btn + ': ' + JSON.stringify(st));
    assert.ok((await page.$eval('#compareBanner', n => n.hidden)) === false);
    assert.match(await page.$eval('#compareBanner .learn', n => n.innerText), /A vs B/);
  }
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('shared sliders update every version without regenerating; reset restores defaults', async () => {
  const { ctx, page } = await fresh();
  await page.click('#btnRocket'); await sleep(4000);
  const before = await page.$eval('.pane[data-vid="A"] [data-r=check]', n => n.textContent);
  const sl = await page.$('#sliders input[type=range]');
  await sl.evaluate(i => { i.value = i.min; i.dispatchEvent(new Event('input', { bubbles: true })); }); await sleep(1500);
  const after = await page.$eval('.pane[data-vid="A"] [data-r=check]', n => n.textContent);
  assert.notEqual(before, after, 'check detail should change with the slider');
  assert.equal(await page.$eval('.pane[data-vid="B"] [data-r=check]', n => n.textContent), after, 'both versions see the same params');
  await page.click('#btnReset'); await sleep(1500);
  assert.equal(await page.$eval('.pane[data-vid="A"] [data-r=check]', n => n.textContent), before);
  await ctx.close();
});

test('host-owned playback: pause, step, scrub and keyboard drive the versions in sync', async () => {
  const { ctx, page } = await fresh();
  await page.click('#btnRocket'); await sleep(4000);
  assert.equal(await page.$eval('#timeline', n => n.hidden), false);
  await page.click('#tlPlay'); await sleep(300);                           // pause
  const t1 = await page.$eval('#tlTime', n => n.textContent);
  await sleep(700);
  assert.equal(await page.$eval('#tlTime', n => n.textContent), t1, 'paused time must not advance');
  await page.click('#tlNext'); await sleep(400);
  assert.notEqual(await page.$eval('#tlTime', n => n.textContent), t1, 'step forward changes time');
  await page.evaluate(() => { const s = document.getElementById('tlScrub'); s.value = 1000; s.dispatchEvent(new Event('input', { bubbles: true })); }); await sleep(600);
  const end = await page.$eval('#tlTime', n => n.textContent);
  assert.match(end, /^(\d+\.\d) \/ \1 s$/, 'scrub to the end shows duration / duration');
  const paneTimes = await page.$$eval('.pane [data-r=ttime]', ns => ns.map(n => n.textContent));
  assert.ok(paneTimes.every(t => t === end), 'versions stay in sync: ' + paneTimes.join(' | '));
  await page.keyboard.press('ArrowLeft'); await sleep(400);
  assert.notEqual(await page.$eval('#tlTime', n => n.textContent), end, 'arrow key steps back');
  await ctx.close();
});

test('view/library mismatch is flagged in step 2 and for version A, with one-click fixes', async () => {
  const { ctx, page } = await fresh();
  assert.equal(await page.$eval('#libChoice', s => s.value), 'recommend', '"Recommend for me" is the default');
  await page.click('#viewSeg [data-v="2D"]'); await page.selectOption('#libChoice', 'three'); await sleep(200);
  assert.equal(await page.$eval('#viewWarn', n => n.hidden), false);
  await page.click('#viewWarn button:first-of-type'); await sleep(200);           // switch view to 3D
  assert.equal(await page.$eval('#viewSeg [aria-pressed="true"]', b => b.dataset.v), '3D');
  assert.equal(await page.$eval('#viewWarn', n => n.hidden), true);
  await page.selectOption('#libChoice', 'plotly'); await sleep(200);
  assert.equal(await page.$eval('#viewWarn', n => n.hidden), true, 'Plotly draws both, never flagged');
  await page.click('#btnRocket'); await sleep(1500); await page.click('#viewSeg [data-v="2D"]'); await sleep(300);
  await page.selectOption('#libA', 'story3d'); await sleep(200);
  assert.equal(await page.$eval('#flagA', n => n.hidden), false, 'version A flagged');
  await page.selectOption('#libB', 'three'); await sleep(200);
  assert.equal(await page.$$eval('[id^=flag]', ns => ns.filter(n => !n.hidden).length), 1, 'B is a comparison, never flagged');
  await ctx.close();
});

test('comparison lines follow the libraries actually chosen, and the default pairs table is present', async () => {
  const { ctx, page } = await fresh();
  await page.click('#btnTerms'); await sleep(1500);
  assert.equal(await page.$$eval('table.pairs tr', r => r.length - 1), 4);
  await page.selectOption('#libA', 'p5'); await page.selectOption('#libB', 'three'); await sleep(200);
  assert.match(await page.$eval('#lessonLines', n => n.innerText), /A vs B: Whether depth adds useful information/);
  await page.selectOption('#libA', 'chartjs'); await page.selectOption('#libB', 'd3'); await sleep(200);
  assert.match(await page.$eval('#lessonLines', n => n.innerText), /Standard configuration versus custom control/);
  await ctx.close();
});

test('code editor: edit, run, error with line jump, undo, discard', async () => {
  const { ctx, page } = await fresh();
  await page.click('#btnRocket'); await sleep(4000);
  const A = '.pane[data-vid="A"]';
  await page.click(`${A} [data-tab="source"]`); await sleep(1500);
  assert.equal(await page.$$eval(`${A} .cm-editor`, n => n.length), 1, 'CodeMirror loaded');
  await page.evaluate(() => {
    const ed = CM.EditorView.findFromDOM(document.querySelector('.pane[data-vid="A"] .cm-editor'));
    const t = ed.state.doc.toString(), i = t.indexOf('mount(root, params) {') + 'mount(root, params) {'.length;
    ed.dispatch({ changes: { from: i, insert: "\n    console.log('edit ran');\n    notDefinedYet();" } });
  });
  assert.match(await page.$eval(`${A} [data-tab="source"]`, n => n.textContent), /•/, 'unsaved marker');
  assert.equal(await page.$eval(`${A} [data-r=discard]`, n => n.hidden), false);
  await page.click(`${A} .cm-content`); await page.keyboard.press('Control+Enter'); await sleep(3000);
  assert.equal(await page.$eval(`${A} [aria-selected=true]`, n => n.textContent), 'Preview', 'run returns to the preview');
  const problems = await page.$eval(`${A} [data-r=problems]`, n => n.innerText);
  assert.match(problems, /notDefinedYet/); assert.match(problems, /Line \d+/);
  await page.click(`${A} [data-r=console] summary`);
  const con = await page.$eval(`${A} [data-r=clog]`, n => n.textContent);
  assert.match(con, /edit ran/); assert.match(con, /notDefinedYet/);
  await page.click(`${A} .linkbtn`); await sleep(800);
  assert.equal(await page.$eval(`${A} [aria-selected=true]`, n => n.textContent), 'Edit code');
  assert.deepEqual(await page.$$eval(`${A} .cm-errline`, n => n.map(x => x.textContent.trim())), ['notDefinedYet();']);
  await page.click(`${A} [data-r=undo]`); await sleep(3000);
  assert.equal((await statuses(page)).find(([id]) => id === 'A')[1], 'Check passed', 'undo restores a working version');
  // discard: an edit that is not run is thrown away
  await page.click(`${A} [data-tab="source"]`); await sleep(1200);
  await page.evaluate(() => { const ed = CM.EditorView.findFromDOM(document.querySelector('.pane[data-vid="A"] .cm-editor')); ed.dispatch({ changes: { from: 0, insert: '// scratch\n' } }); });
  await page.click(`${A} [data-r=discard]`); await sleep(800);
  assert.doesNotMatch(await page.$eval(`${A} [data-tab="source"]`, n => n.textContent), /•/);
  await ctx.close();
});

test('full screen: the button toggles, Escape closes the overlay; download is available in the lab', async () => {
  const { ctx, page } = await fresh();
  await page.click('#btnExample'); await sleep(3000);
  await page.click('.pane[data-vid="A"] [data-r=fs]'); await sleep(400);
  const maxed = await page.evaluate(() => !!document.fullscreenElement || document.querySelector('.pane[data-vid="A"]').classList.contains('max'));
  assert.ok(maxed, 'pane is full screen or maximised');
  assert.equal(await page.$eval('.pane[data-vid="A"] [data-r=fs]', b => b.textContent), 'Exit full screen');
  await page.click('.pane[data-vid="A"] [data-r=fs]'); await sleep(500);
  assert.equal(await page.evaluate(() => document.querySelector('.pane[data-vid="A"]').classList.contains('max') || !!document.fullscreenElement), false, 'the button exits');
  // the overlay fallback also closes on Escape
  await page.evaluate(() => { const n = document.querySelector('.pane[data-vid="A"]'); n.classList.add('max'); document.body.classList.add('has-max'); });
  await page.keyboard.press('Escape'); await sleep(300);
  assert.equal(await page.evaluate(() => document.querySelector('.pane[data-vid="A"]').classList.contains('max')), false, 'Escape closes the overlay');
  assert.equal(await page.$eval('.pane[data-vid="A"] [data-r=dl]', b => b.textContent), 'Download HTML');
  await ctx.close();
});

test('gallery: loads on demand, filters, surprise me, open in lab, use this prompt, replace guard', async () => {
  const { ctx, page, errors } = await fresh();
  const galleryRequests = []; page.on('request', r => { if (/gallery\/(data|thumbs)/.test(r.url())) galleryRequests.push(r.url()); });
  await page.click('#btnExample'); await sleep(1000);
  assert.equal(galleryRequests.length, 0, 'the gallery is not fetched until the tab opens');
  await page.click('#pageSeg [data-page="inspire"]'); await sleep(2500);
  assert.ok(galleryRequests.some(u => u.includes('data.js')));
  assert.equal(await page.$eval('main.grid', n => n.hidden), true);
  const count = await page.$$eval('.gcard', n => n.length);
  assert.ok(count >= 20, 'expected at least 20 cards, got ' + count);
  assert.match(await page.$eval('#galCount', n => n.textContent), new RegExp(`^${count} lessons$`));
  assert.ok(await page.$eval('.gcard img', i => i.complete && i.naturalWidth > 0), 'thumbnails render');
  // filters
  await page.click('#galCats button:nth-child(2)'); await sleep(200);
  const cat = await page.$eval('#galCats button:nth-child(2)', b => b.firstChild.textContent);
  assert.ok(await page.$$eval('.gcard .eyebrow', (ns, cat) => ns.length > 0 && ns.every(n => n.textContent === cat), cat));
  await page.selectOption('#galLib', 'd3'); await sleep(200);
  assert.ok(await page.$$eval('.gcard', ns => ns.every(n => n.textContent.includes('D3'))));
  await page.click('#galCats button:nth-child(1)'); await page.selectOption('#galLib', 'all'); await sleep(200);
  // surprise me
  await page.click('#btnSurprise'); await sleep(600);
  assert.equal(await page.$$eval('.gcard.pulse', n => n.length), 1);
  // open in lab (example state is not "own work", so no guard)
  await page.click('.gcard[data-slug="ea-phi-flow"] .gact .primary'); await sleep(7000);
  assert.equal(await page.$eval('main.grid', n => n.hidden), false);
  assert.equal(await page.$eval('#specBox h3', n => n.textContent), 'Where does PHI travel?');
  assert.ok(allPass(await statuses(page)), JSON.stringify(await statuses(page)));
  // make it "own work" by running an edit, then the guard appears
  await page.click('.pane[data-vid="A"] [data-tab="source"]'); await sleep(1200);
  await page.evaluate(() => { const ed = CM.EditorView.findFromDOM(document.querySelector('.pane[data-vid="A"] .cm-editor')); ed.dispatch({ changes: { from: 0, insert: '// mine\n' } }); });
  await page.click('.pane[data-vid="A"] [data-r=run]'); await sleep(1500);
  await page.click('#pageSeg [data-page="inspire"]'); await sleep(500);
  await page.click('.gcard[data-slug="git-branches"] .gact .primary'); await sleep(300);
  assert.match(await page.$eval('.gcard[data-slug="git-branches"] .gact .primary', b => b.textContent), /Replace your current lesson/);
  assert.equal(await page.$eval('#inspire', n => n.hidden), false, 'first click only arms');
  await page.click('.gcard[data-slug="git-branches"] .gact .primary'); await sleep(6000);
  assert.equal(await page.$eval('#specBox h3', n => n.textContent), 'Branches: a safe place to try ideas');
  // use this prompt starts a fresh lesson with the goal filled in
  await page.click('#pageSeg [data-page="inspire"]'); await sleep(300);
  const btn = '.gcard[data-slug="simpsons-paradox"] .gact button:nth-child(2)';
  await page.click(btn); await sleep(500);          // a gallery lesson is not "own work", so no guard this time
  assert.match(await page.$eval('#goal', t => t.value), /Simpson/);
  assert.equal(await page.$$eval('.pane', n => n.length), 0);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('gallery failure path shows a message instead of a blank tab', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
  const page = await ctx.newPage(); await page.route('**/gallery/data.js', r => r.abort());
  await page.goto(url); await page.evaluate(() => localStorage.clear()); await page.reload(); await sleep(400);
  await page.click('#pageSeg [data-page="inspire"]'); await sleep(1000);
  assert.match(await page.$eval('#galGrid', n => n.innerText), /couldn't load/);
  await ctx.close();
});

test('phone width and dark mode: no horizontal overflow, examples still pass', async () => {
  const { ctx, page, errors } = await fresh({ viewport: { width: 420, height: 900 }, colorScheme: 'dark' });
  await page.click('#btnTerms'); await sleep(6000);
  assert.ok(allPass(await statuses(page)));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'page overflows at 420px');
  await page.click('#pageSeg [data-page="inspire"]'); await sleep(2500);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'gallery overflows at 420px');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('state survives a reload, including the page you were on', async () => {
  const { ctx, page } = await fresh();
  await page.click('#btnPipeline'); await sleep(2000);
  await page.click('#pageSeg [data-page="inspire"]'); await sleep(1500);
  await page.reload(); await sleep(2500);
  assert.equal(await page.$eval('#inspire', n => n.hidden), false, 'reopens on Get inspired');
  await page.click('#pageSeg [data-page="lab"]'); await sleep(4000);
  assert.equal(await page.$eval('#specBox h3', n => n.textContent), 'Agentic delivery pipeline');
  assert.ok(allPass(await statuses(page)));
  await ctx.close();
});

test('guide: opens from the header and the "?" key, renders both docs, the spec help deep-links, Escape closes', async () => {
  const { ctx, page, errors } = await fresh();
  assert.equal(await page.$eval('#guide', n => n.hidden), true);
  await page.click('#btnGuide'); await sleep(800);
  assert.equal(await page.$eval('#guide', n => n.hidden), false);
  assert.equal(await page.$eval('#btnGuide', b => b.getAttribute('aria-expanded')), 'true');
  const h1 = await page.$eval('#guideBody h1', n => n.textContent);
  assert.match(h1, /Visualization Lab/);
  assert.ok(await page.$$eval('#guideBody table', t => t.length) >= 3, 'README tables render');
  assert.ok(await page.$$eval('#guideBody h2', h => h.some(x => /Gotchas/.test(x.textContent))));
  await page.click('#guideTabs [data-doc="AUTHORING.md"]'); await sleep(600);
  assert.match(await page.$eval('#guideBody h1', n => n.textContent), /authoring guide/i);
  assert.ok(await page.$$eval('#guideBody pre', p => p.length) >= 1, 'code blocks render');
  assert.ok(await page.$$eval('#guideBody table td code', c => c.some(x => x.textContent === 'wordcloud')), 'generated library table present');
  await page.keyboard.press('Escape'); await sleep(200);
  assert.equal(await page.$eval('#guide', n => n.hidden), true);
  // "?" next to Draft spec opens the authoring guide at the spec rules
  await page.click('#btnSpecHelp'); await sleep(800);
  assert.equal(await page.$eval('#guideTabs [aria-selected="true"]', b => b.dataset.doc), 'AUTHORING.md');
  assert.ok(await page.$eval('#guideBody .target', n => /Spec rules/.test(n.textContent)), 'scrolled to the spec rules heading');
  await page.click('#btnGuideClose'); await sleep(200);
  // keyboard shortcut
  await page.keyboard.press('?'); await sleep(600);
  assert.equal(await page.$eval('#guide', n => n.hidden), false);
  await page.click('#guideBackdrop', { position: { x: 20, y: 20 } }); await sleep(200);
  assert.equal(await page.$eval('#guide', n => n.hidden), true);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('replace guard: New lab and Draft spec ask for a second click when the lesson is the designer\'s own work', async () => {
  const { ctx, page } = await fresh();
  await page.click('#btnRocket'); await sleep(3000);
  // an example is not own work: New lab acts at once
  await page.click('#btnNew'); await sleep(300);
  assert.equal(await page.$$eval('.pane', n => n.length), 0);
  // open the example again and make it own work by running an edit
  await page.click('#btnRocket'); await sleep(3000);
  await page.click('.pane[data-vid="A"] [data-tab="source"]'); await sleep(1200);
  await page.evaluate(() => { const ed = CM.EditorView.findFromDOM(document.querySelector('.pane[data-vid="A"] .cm-editor')); ed.dispatch({ changes: { from: 0, insert: '// mine\n' } }); });
  await page.click('.pane[data-vid="A"] [data-r=run]'); await sleep(1500);
  await page.click('#btnNew'); await sleep(200);
  assert.match(await page.$eval('#btnNew', b => b.textContent), /Replace your current lesson/);
  assert.equal(await page.$$eval('.pane', n => n.length), 2, 'first click only arms');
  // Draft spec is disabled without Claude in the viewer, but shares the same guard; arming New lab leaves it alone
  assert.equal(await page.$eval('#btnSpec', b => b.disabled), true);
  await sleep(4300);
  assert.equal(await page.$eval('#btnNew', b => b.textContent), 'New lab', 'the arm times out');
  await page.click('#btnNew'); await sleep(200); await page.click('#btnNew'); await sleep(400);
  assert.equal(await page.$$eval('.pane', n => n.length), 0, 'second click within the window acts');
  await ctx.close();
});

test('export and import: a lesson round-trips through a JSON file; bad files are refused', async () => {
  const fs = await import('fs'); const os = await import('os'); const path = await import('path');
  const { ctx, page } = await fresh({ acceptDownloads: true });
  await page.click('#btnPipeline'); await sleep(3000);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btnExport')]);
  assert.match(dl.suggestedFilename(), /agentic-delivery-pipeline\.lesson\.json$/);
  const file = path.join(os.tmpdir(), 'vl-export.json'); await dl.saveAs(file);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(data.visualizationLab, 1);
  assert.equal(data.lesson.spec.title, 'Agentic delivery pipeline');
  assert.deepEqual(data.lesson.versions.map(v => v.id + ':' + v.lib), ['A:story', 'B:reactflow', 'C:story3d']);
  assert.ok(data.lesson.versions.every(v => v.code.includes('window.lab')));
  // import into an empty lab
  await page.click('#btnNew'); await sleep(300);
  assert.equal(await page.$$eval('.pane', n => n.length), 0);
  await page.click('#btnImport'); await page.setInputFiles('#importFile', file); await sleep(7000);
  assert.equal(await page.$eval('#specBox h3', n => n.textContent), 'Agentic delivery pipeline');
  assert.ok(allPass(await statuses(page)), JSON.stringify(await statuses(page)));
  // an imported lesson counts as the designer's work: New lab asks first
  await page.click('#btnNew'); await sleep(200);
  assert.match(await page.$eval('#btnNew', b => b.textContent), /Replace your current lesson/);
  await page.click('#btnNew'); await sleep(300);
  // bad files
  const bad = path.join(os.tmpdir(), 'vl-bad.json'); fs.writeFileSync(bad, '{"hello": 1}');
  await page.click('#btnImport'); await page.setInputFiles('#importFile', bad); await sleep(500);
  assert.match(await page.$eval('#specBox .banner.bad', n => n.textContent), /Import failed/);
  const unknownLib = path.join(os.tmpdir(), 'vl-unknown.json');
  fs.writeFileSync(unknownLib, JSON.stringify({ visualizationLab: 1, lesson: { ...data.lesson, versions: [{ id: 'A', lib: 'nosuchlib', code: 'window.lab = {}' }] } }));
  await page.click('#btnImport'); await page.setInputFiles('#importFile', unknownLib); await sleep(500);
  assert.match(await page.$eval('#specBox .banner.bad', n => n.textContent), /nosuchlib/);
  await ctx.close();
});

test('look: switching Night sky / Studio / Blueprint re-colours 2D story versions', async () => {
  const { ctx, page } = await fresh();
  await page.click('#btnPipeline'); await sleep(4000);
  const inkFill = async () => {
    const h = await page.$('.pane[data-vid="A"] iframe'); const f = await h.contentFrame();
    return f.evaluate(() => { const el = document.querySelector('#root svg [fill="#1d2433"], #root svg [fill="rgb(29, 36, 51)"]'); return el ? getComputedStyle(el).fill : 'none'; });
  };
  const rootBg = async () => { const h = await page.$('.pane[data-vid="A"] iframe'); const f = await h.contentFrame(); return f.evaluate(() => getComputedStyle(document.body).backgroundColor); };
  assert.equal(await page.$eval('#themeSel', s => s.value), 'night');
  assert.equal(await rootBg(), 'rgb(12, 17, 48)', 'night background on a 2D story');
  assert.equal(await inkFill(), 'rgb(238, 240, 250)', 'ink remapped to the night palette');
  await page.selectOption('#themeSel', 'studio'); await sleep(3500);
  assert.equal(await rootBg(), 'rgb(255, 255, 255)', 'studio keeps the white look');
  assert.equal(await inkFill(), 'rgb(29, 36, 51)');
  await page.selectOption('#themeSel', 'blueprint'); await sleep(3500);
  assert.equal(await rootBg(), 'rgb(11, 37, 69)');
  assert.ok(allPass(await statuses(page)), 'stories still pass their check after re-theming');
  await ctx.close();
});

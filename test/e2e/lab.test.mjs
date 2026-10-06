// End-to-end tests of the lab page in headless Chromium, against the built dist/vislab.html and the local package mirror.
// Covers: examples load and pass their checks; shared sliders; host-owned playback and keyboard; the view/library mismatch flag;
// comparison lines; the scoring rubric; up to six versions; the code editor (run, errors with line jumps, undo, discard); the console; full screen; download availability;
// the gallery tab (load on demand, filters, surprise me, open, use this prompt, the replace guard); dark mode and phone width.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, labUrlForTests, launch, statuses, sleep, audit } from '../helpers.mjs';

import fs from 'fs';
import path from 'path';
import { root } from '../helpers.mjs';
let server, browser, url;
before(async () => {
  if (!fs.existsSync(path.join(root, 'dist/gallery/data.js'))) throw new Error('dist/gallery is missing: run `npm run build:gallery` once before the e2e tests'); server = await startServer(); browser = await launch(); url = labUrlForTests(server); });
after(async () => { await browser?.close(); server?.close(); });

// Opens a version's Edit code tab and waits until CodeMirror is loaded (it loads lazily, and on a slow CI runner it takes
// longer than any fixed pause).
async function openEditor(page, vid = 'A') {
  await page.click(`.pane[data-vid="${vid}"] [data-tab="source"]`);
  await page.waitForFunction(v => window.CM && window.CM.EditorView && document.querySelector(`.pane[data-vid="${v}"] .cm-editor`), vid, { timeout: 30000 });
}

async function fresh(opts = {}) {
  // tall viewport: previews scrolled out of view pause their animation frames in headless Chromium
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 2600 }, ...opts });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(url); await page.evaluate(() => localStorage.clear()); await page.reload(); await sleep(500);
  return { ctx, page, errors };
}
const allPass = st => st.length > 0 && st.every(([, s]) => s === 'Check passed');
// Text nodes that are exactly "null" or "undefined": a value leaked into the page (DOM append() writes null as text)
const strayText = page => page.evaluate(() => { const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), out = []; let n; while ((n = w.nextNode())) { const t = n.textContent.trim(); if (t === 'null' || t === 'undefined') out.push((n.parentElement && n.parentElement.className) || '?'); } return out; });
// The built-in examples load from the header's example picker (the four buttons became one select)
const EX = { '#btnExample': 'projectile', '#btnRocket': 'rocket', '#btnPipeline': 'pipeline', '#btnTerms': 'terms' };
const loadExample = (page, key) => page.selectOption('#examplePick', EX[key] || key);

test('a first visit opens on the gallery opener; built-in examples load, every version passes its check, and the comparison line is shown', async () => {
  const { ctx, page, errors } = await fresh();
  await sleep(6000);                                   // the opener (From spaghetti to hub) is inlined, so it renders with no gallery download
  assert.match(await page.$eval('#nowTitle', n => n.textContent), /spaghetti/i);
  assert.match(await page.$eval('#nowSub', n => n.textContent), /3 versions · from the gallery/);
  const opener = await statuses(page);
  assert.equal(opener.length, 3, 'opener versions');
  assert.ok(allPass(opener), 'opener: ' + JSON.stringify(opener));
  assert.deepEqual(await strayText(page), [], 'no "null" or "undefined" printed in the page');
  await page.click('#btnRubric'); await sleep(300); await page.click('#btnRubric'); await sleep(300);
  assert.deepEqual(await strayText(page), [], 'none after showing and hiding the scores either');
  for (const [btn, versions] of [['projectile', 2], ['rocket', 2], ['pipeline', 3], ['terms', 3]]) {
    await loadExample(page, btn); await sleep(6000);
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
  await loadExample(page, '#btnRocket'); await sleep(4000);
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
  await loadExample(page, '#btnRocket'); await sleep(4000);
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
  await loadExample(page, '#btnRocket'); await sleep(1500); await page.click('#viewSeg [data-v="2D"]'); await sleep(300);
  await page.selectOption('#libA', 'story3d'); await sleep(200);
  assert.equal(await page.$eval('#flagA', n => n.hidden), false, 'version A flagged');
  await page.selectOption('#libB', 'three'); await sleep(200);
  assert.equal(await page.$$eval('[id^=flag]', ns => ns.filter(n => !n.hidden).length), 1, 'B is a comparison, never flagged');
  await ctx.close();
});

test('comparison lines follow the libraries actually chosen, and the default pairs table is present', async () => {
  const { ctx, page } = await fresh();
  await loadExample(page, '#btnTerms'); await sleep(1500);
  assert.equal(await page.$$eval('table.pairs tr', r => r.length - 1), 4);
  await page.selectOption('#libA', 'p5'); await page.selectOption('#libB', 'three'); await sleep(200);
  assert.match(await page.$eval('#lessonLines', n => n.innerText), /A vs B: Whether depth adds useful information/);
  await page.selectOption('#libA', 'chartjs'); await page.selectOption('#libB', 'd3'); await sleep(200);
  assert.match(await page.$eval('#lessonLines', n => n.innerText), /Standard configuration versus custom control/);
  await ctx.close();
});

test('code editor: edit, run, error with line jump, undo, discard', async () => {
  const { ctx, page } = await fresh();
  await loadExample(page, '#btnRocket'); await sleep(4000);
  const A = '.pane[data-vid="A"]';
  await openEditor(page, 'A');
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
  await openEditor(page, 'A');
  await page.evaluate(() => { const ed = CM.EditorView.findFromDOM(document.querySelector('.pane[data-vid="A"] .cm-editor')); ed.dispatch({ changes: { from: 0, insert: '// scratch\n' } }); });
  await page.click(`${A} [data-r=discard]`); await sleep(800);
  assert.doesNotMatch(await page.$eval(`${A} [data-tab="source"]`, n => n.textContent), /•/);
  await ctx.close();
});

test('full screen: the button toggles, Escape closes the overlay; download is available in the lab', async () => {
  const { ctx, page } = await fresh();
  await loadExample(page, '#btnExample'); await sleep(3000);
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
  await loadExample(page, '#btnExample'); await sleep(1000);
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
  // chart form filter: cards show "library · form" and the filter keeps only lessons with a version of that form
  assert.ok(await page.$$eval('.gcard .glib', ns => ns.length > 0 && ns.every(n => / · \S/.test(n.textContent))), 'every version chip names its form');
  await page.selectOption('#galForm', 'Gantt timeline'); await sleep(200);
  assert.ok(await page.$$eval('.gcard', ns => ns.length >= 1 && ns.length < 5 && ns.every(n => n.textContent.includes('Gantt timeline'))), 'the form filter narrows to the Gantt lessons');
  assert.match(await page.$eval('#galCount', n => n.textContent), /^\d+ of \d+ lessons$/);
  await page.selectOption('#galForm', 'all'); await sleep(200);
  // search: free text over title, topic, library and form; Escape clears it
  await page.fill('#galSearch', 'swimlane'); await sleep(300);
  assert.ok(await page.$$eval('.gcard', ns => ns.length >= 1 && ns.length < 5 && ns.every(n => /swimlane/i.test(n.textContent))), 'search narrows to the swimlane lessons');
  await page.fill('#galSearch', 'no such lesson xyz'); await sleep(300);
  assert.match(await page.$eval('#galGrid', n => n.textContent), /No lessons match/);
  await page.press('#galSearch', 'Escape'); await sleep(300);
  assert.match(await page.$eval('#galCount', n => n.textContent), new RegExp(`^${count} lessons$`));
  // surprise me
  await page.click('#btnSurprise'); await sleep(600);
  assert.equal(await page.$$eval('.gcard.pulse', n => n.length), 1);
  // open in lab (example state is not "own work", so no guard)
  await page.click('.gcard[data-slug="ea-phi-flow"] .gact .primary'); await sleep(7000);
  assert.equal(await page.$eval('main.grid', n => n.hidden), false);
  assert.equal(await page.$eval('#specBox h3', n => n.textContent), 'Where does PHI travel?');
  assert.ok(allPass(await statuses(page)), JSON.stringify(await statuses(page)));
  // make it "own work" by running an edit, then the guard appears
  await openEditor(page, 'A');
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

test('empty state offers the examples; the header shows the current lesson; typing in search opens Get inspired', async () => {
  const { ctx, page, errors } = await fresh();
  // the lab opens on the gallery opener, so the chip names it; New lab clears to the empty state with its example chips
  assert.match(await page.$eval('#nowTitle', n => n.textContent), /spaghetti/i);
  await page.click('#btnNew'); await sleep(400);
  assert.ok(await page.$eval('#nowLesson', n => n.hidden), 'no lesson chip in an empty lab');
  assert.equal(await page.$$eval('#versions .empty [data-example]', ns => ns.length), 4, 'four example chips in the empty state');
  await page.click('#versions .empty [data-example="rocket"]'); await sleep(3000);
  assert.ok(await page.$eval('#nowLesson', n => !n.hidden));
  assert.match(await page.$eval('#nowTitle', n => n.textContent), /Rocket/);
  assert.match(await page.$eval('#nowSub', n => n.textContent), /2 versions · built-in example/);
  assert.equal(await page.$$eval('#examplePick option', ns => ns.length), 5);
  await page.fill('#galSearch', 'heatmap'); await sleep(1500);
  assert.ok(await page.$eval('#inspire', n => !n.hidden), 'search switches to Get inspired');
  assert.ok(await page.$$eval('.gcard', ns => ns.length >= 1 && ns.every(n => /heatmap/i.test(n.textContent))));
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
  await loadExample(page, '#btnTerms'); await sleep(6000);
  assert.ok(allPass(await statuses(page)));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'page overflows at 420px');
  await page.click('#pageSeg [data-page="inspire"]'); await sleep(2500);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'gallery overflows at 420px');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('state survives a reload, including the page you were on', async () => {
  const { ctx, page } = await fresh();
  await loadExample(page, '#btnPipeline'); await sleep(2000);
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
  await loadExample(page, '#btnRocket'); await sleep(3000);
  // an example is not own work: New lab acts at once
  await page.click('#btnNew'); await sleep(300);
  assert.equal(await page.$$eval('.pane', n => n.length), 0);
  // open the example again and make it own work by running an edit
  await loadExample(page, '#btnRocket'); await sleep(3000);
  await openEditor(page, 'A');
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
  await loadExample(page, '#btnPipeline'); await sleep(3000);
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

test('scoring rubric: score versions 1-5, weighted totals and the winner, stale scores drop on a code change, scores export and import', async () => {
  const fs = await import('fs'); const os = await import('os'); const path = await import('path');
  const { ctx, page } = await fresh({ acceptDownloads: true });
  await loadExample(page, '#btnRocket'); await sleep(4000);
  assert.equal(await page.$('#rubric'), null, 'rubric is closed by default');
  await page.click('#btnRubric'); await sleep(200);
  assert.equal(await page.$$eval('table.rubric select', n => n.length), 12, '6 criteria x 2 versions');
  assert.equal(await page.$eval('#btnRubricClaude', b => b.disabled), true, 'Claude pass needs the Claude connection, which tests do not have');
  assert.deepEqual(await page.$$eval('[data-total]', n => n.map(x => x.textContent)), ['–', '–']);
  const keys = await page.$$eval('table.rubric select', ns => ns.map(n => n.dataset.score));
  for (const k of keys) await page.selectOption(`[data-score="${k}"]`, k.startsWith('A') ? '4' : '3');
  await sleep(200);
  assert.deepEqual(await page.$$eval('[data-total]', n => n.map(x => x.textContent)), ['80 ✓', '60']);
  assert.match(await page.$eval('#rubricVerdict', n => n.textContent), /Winner so far: A/);
  // a partial column has no total; a tie says so
  await page.selectOption('[data-score="B:teach"]', '5'); await page.selectOption('[data-score="B:faithful"]', '5'); await page.selectOption('[data-score="B:clarity"]', '5'); await page.selectOption('[data-score="B:interaction"]', '5');
  await page.selectOption('[data-score="B:visual"]', '4'); await page.selectOption('[data-score="B:robustness"]', '1'); await sleep(200);
  // B = (5*30+5*20+5*15+5*15+4*10+1*10)/5 = 90
  assert.deepEqual(await page.$$eval('[data-total]', n => n.map(x => x.textContent)), ['80', '90 ✓']);
  for (const k of ['A:robustness']) await page.selectOption(`[data-score="${k}"]`, '5');
  await sleep(200); assert.deepEqual(await page.$$eval('[data-total]', n => n.map(x => x.textContent)), ['82', '90 ✓']);
  // scores survive a reload with the rubric still open
  await page.reload(); await sleep(4000);
  assert.deepEqual(await page.$$eval('[data-total]', n => n.map(x => x.textContent)), ['82', '90 ✓']);
  // export carries the scores; a fresh import restores them
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btnExport')]);
  const file = path.join(os.tmpdir(), 'vl-scored.json'); await dl.saveAs(file);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(data.lesson.scores.A.robustness, 5); assert.equal(data.lesson.scores.B.teach, 5); assert.equal(data.lesson.scores.A.by, 'designer');
  // editing a version's code drops its scores (they were about the old code), the other column stays
  const A = '.pane[data-vid="A"]';
  await openEditor(page, 'A');
  await page.evaluate(() => { const ed = CM.EditorView.findFromDOM(document.querySelector('.pane[data-vid="A"] .cm-editor')); ed.dispatch({ changes: { from: 0, insert: '// reviewed\n' } }); });
  await page.click(`${A} .cm-content`); await page.keyboard.press('Control+Enter'); await sleep(3000);
  assert.deepEqual(await page.$$eval('[data-total]', n => n.map(x => x.textContent)), ['–', '90 ✓']);
  await page.click('#btnNew'); await sleep(200); await page.click('#btnNew'); await sleep(300);
  await page.click('#btnImport'); await page.setInputFiles('#importFile', file); await sleep(7000);
  assert.deepEqual(await page.$$eval('[data-total]', n => n.map(x => x.textContent)), ['82', '90 ✓'], 'imported scores shown, rubric opened');
  await page.click('#btnRubricClear'); await sleep(200);
  assert.deepEqual(await page.$$eval('[data-total]', n => n.map(x => x.textContent)), ['–', '–']);
  await ctx.close();
});

test('more than three versions: rows D to F are added on request, a six-version lesson imports, runs, compares and scores; removing a version frees its row', async () => {
  const fs = await import('fs'); const os = await import('os'); const path = await import('path');
  const { ctx, page } = await fresh({ acceptDownloads: true });
  await loadExample(page, '#btnRocket'); await sleep(4000);
  // step 4 shows A, B, C and an "Add another version" button; each click adds the next row up to F
  assert.deepEqual(await page.$$eval('.gen-row select', ns => ns.map(n => n.id)), ['libA', 'libB', 'libC']);
  assert.match(await page.$eval('#btnAddSlot', b => b.textContent), /Add another version \(D\)/);
  await page.click('#btnAddSlot'); await sleep(200);
  assert.ok(await page.$('#libD')); assert.match(await page.$eval('#btnGenD', b => b.textContent), /Add version D/);
  assert.match(await page.$eval('#btnAddSlot', b => b.textContent), /\(E\)/);
  assert.equal(await page.$eval('#lessonLines', n => n.textContent.match(/A vs [A-F]/g).length), 3, 'a comparison line per row beyond A');
  await page.click('#btnAddSlot'); await sleep(200); await page.click('#btnAddSlot'); await sleep(200);
  assert.equal(await page.$('#btnAddSlot'), null, 'no more rows after F');
  assert.ok(await page.$('#libF'));
  await page.reload(); await sleep(3000);
  assert.ok(await page.$('#libF'), 'added rows survive a reload');
  await page.click('[aria-label="Remove row F"]'); await sleep(200);
  assert.equal(await page.$('#libF'), null); assert.match(await page.$eval('#btnAddSlot', b => b.textContent), /\(F\)/);
  // a lesson with six versions imports and runs: the rocket's two renderers, each used three times
  const lesson = JSON.parse(fs.readFileSync(path.join(root, 'examples/rocket/lesson.json'), 'utf8'));
  const spec = { ...lesson.spec, modelCode: fs.readFileSync(path.join(root, 'examples/rocket/model.js'), 'utf8'), checkCode: fs.readFileSync(path.join(root, 'examples/rocket/check.js'), 'utf8') };
  const a = fs.readFileSync(path.join(root, 'examples/rocket/a.js'), 'utf8'), b = fs.readFileSync(path.join(root, 'examples/rocket/b.js'), 'utf8');
  const six = ['A', 'B', 'C', 'D', 'E', 'F'].map((id, i) => ({ id, lib: i % 2 ? 'chartjs' : 'p5', code: i % 2 ? b : a, explanation: 'copy ' + id, caveats: [] }));
  const file = path.join(os.tmpdir(), 'vl-six.json');
  fs.writeFileSync(file, JSON.stringify({ visualizationLab: 1, lesson: { ...lesson, spec, versions: six, chat: [], scores: { F: { teach: 5, faithful: 5, clarity: 5, interaction: 5, visual: 5, robustness: 5, why: 'the sixth', by: 'designer' } } } }));
  await page.click('#btnImport'); await page.setInputFiles('#importFile', file); await sleep(9000);
  const st = await statuses(page);
  assert.deepEqual(st.map(([id]) => id), ['A', 'B', 'C', 'D', 'E', 'F'], 'six panes in order');
  assert.ok(allPass(st), JSON.stringify(st));
  assert.deepEqual(await page.$$eval('#compareBanner .compare .tag', ns => ns.map(n => n.textContent)), ['A', 'B', 'C', 'D', 'E', 'F']);
  assert.equal(await page.$$eval('#compareBanner .learn > div', ns => ns.length), 5, 'A vs each other version');
  assert.equal(await page.$$eval('table.rubric select', n => n.length), 36, '6 criteria x 6 versions');
  assert.deepEqual(await page.$$eval('[data-total]', n => n.map(x => x.textContent)), ['–', '–', '–', '–', '–', '100 ✓']);
  assert.match(await page.$eval('#btnGenF', b => b.textContent), /Regenerate F/);
  // phone width: six panes and the rubric must not overflow the page
  await page.setViewportSize({ width: 420, height: 2600 }); await sleep(500);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false, 'no horizontal overflow at 420px');
  await page.setViewportSize({ width: 1500, height: 2600 }); await sleep(300);
  // removing D frees its row, keeps the others, and the keyboard still drives playback from the lead version
  await page.click('.pane[data-vid="D"] button:has-text("Remove D")'); await sleep(500);
  assert.deepEqual((await statuses(page)).map(([id]) => id), ['A', 'B', 'C', 'E', 'F']);
  assert.equal(await page.$('#libD'), null); assert.match(await page.$eval('#btnAddSlot', b => b.textContent), /\(D\)/);
  assert.deepEqual(await page.$$eval('[data-total]', n => n.map(x => x.textContent)), ['–', '–', '–', '–', '100 ✓']);
  // export keeps all five
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btnExport')]);
  const out = path.join(os.tmpdir(), 'vl-five.json'); await dl.saveAs(out);
  assert.deepEqual(JSON.parse(fs.readFileSync(out, 'utf8')).lesson.versions.map(v => v.id), ['A', 'B', 'C', 'E', 'F']);
  await ctx.close();
});

test('look: switching Night sky / Studio / Blueprint re-colours 2D story versions', async () => {
  const { ctx, page } = await fresh();
  await loadExample(page, '#btnPipeline'); await sleep(4000);
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
  await page.selectOption('#themeSel', 'paper'); await sleep(3500);
  assert.equal(await rootBg(), 'rgb(246, 241, 231)', 'paper is a light look');
  assert.equal(await page.$$eval('#themeSel option', o => o.length), 7);
  assert.ok(allPass(await statuses(page)), 'stories still pass their check after re-theming');
  await ctx.close();
});

test('Export for course and Download HTML produce standalone pages that run on their own', async () => {
  const fs = await import('fs'); const os = await import('os'); const path = await import('path');
  const { ctx, page } = await fresh({ acceptDownloads: true });
  await loadExample(page, '#btnRocket'); await sleep(3500);
  await page.selectOption('#themeSel', 'paper'); await sleep(500);
  const sl = await page.$('#sliders input[type=range]'); await sl.evaluate(i => { i.value = 20; i.dispatchEvent(new Event('input', { bubbles: true })); }); await sleep(600);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('.pane[data-vid="A"] [data-r=course]')]);
  assert.equal(dl.suggestedFilename(), 'rocket-liftoff-and-escape.course.html');
  const file = path.join(os.tmpdir(), 'vl-course.html'); await dl.saveAs(file);
  const html = fs.readFileSync(file, 'utf8');
  assert.ok(html.includes('const COURSE = {"title":"Rocket liftoff and escape"') && html.includes('"predict":"Lower the propellant share'), 'course wrapper with the learner prompts');
  assert.ok(html.includes('window.LAB_THEME = "paper"'), 'current look carried over');
  assert.ok(html.includes('"value":20') , 'current slider value carried over');
  const [dl2] = await Promise.all([page.waitForEvent('download'), page.click('.pane[data-vid="B"] [data-r=dl]')]);
  assert.equal(dl2.suggestedFilename(), 'rocket-liftoff-and-escape-B-chartjs.html');
  const plain = path.join(os.tmpdir(), 'vl-plain.html'); await dl2.saveAs(plain);
  assert.ok(fs.readFileSync(plain, 'utf8').includes('const COURSE = null;'), 'Download HTML has no course wrapper');
  // the exported pages run on their own (served from the test server so libraries resolve via the mirror)
  const dir = path.join(root, '.work/lab'); fs.copyFileSync(file, path.join(dir, 'course.html')); fs.copyFileSync(plain, path.join(dir, 'plain.html'));
  for (const [name, course] of [['course.html', true], ['plain.html', false]]) {
    const src = fs.readFileSync(path.join(dir, name), 'utf8').replaceAll('https://cdn.jsdelivr.net/npm/', server.cdn); fs.writeFileSync(path.join(dir, name), src);
    const p2 = await ctx.newPage(); await p2.goto(url.replace('vislab.test.html', name)); await sleep(3500);
    const st = await p2.evaluate(() => ({ ready: !!window.__ready, errors: window.__errors, check: window.__check, timeline: !document.getElementById('transport').hidden, course: document.body.classList.contains('course'), h1: document.querySelector('.course-head h1')?.textContent, checkLine: document.getElementById('checkLine')?.textContent }));
    assert.ok(st.ready && !st.errors.length, name + ': ' + st.errors.join('; '));
    assert.ok(st.check && st.check.pass, name + ' check');
    assert.ok(st.timeline, name + ' has the transport bar');
    assert.equal(st.course, course, name + ' course wrapper');
    if (course) { assert.equal(st.h1, 'Rocket liftoff and escape'); assert.match(st.checkLine, /What the model confirms/); }
    await p2.close();
  }
  await ctx.close();
});

test('without Claude in the viewer the chat and the Claude-only buttons are hidden and the versions get the room; with Claude they are back', async () => {
  const { ctx, page, errors } = await fresh();
  await sleep(1500);
  assert.ok(await page.$eval('body', b => b.classList.contains('no-claude')));
  assert.ok(await page.$eval('.chat', n => getComputedStyle(n).display === 'none'), 'chat hidden');
  assert.equal(await page.$eval('.grid', g => getComputedStyle(g).gridTemplateColumns.split(' ').length), 2, 'two columns: setup and versions');
  assert.ok(await page.$eval('#genNote', n => !n.hidden && /opened in Claude/.test(n.textContent)));
  assert.equal(await page.$$eval('[data-claude]', ns => ns.filter(n => n.offsetParent !== null).length), 0, 'no Claude-only button is visible');
  assert.ok(await page.$eval('#compareBanner', n => !n.hidden), 'the comparison itself stays');
  await ctx.close();
  const ctx2 = await browser.newContext({ viewport: { width: 1500, height: 2600 } });
  await ctx2.addInitScript(() => { window.claude = { use: async () => ({}) }; });
  const page2 = await ctx2.newPage();
  await page2.goto(url); await page2.evaluate(() => localStorage.clear()); await page2.reload(); await sleep(1500);
  assert.ok(!(await page2.$eval('body', b => b.classList.contains('no-claude'))));
  assert.ok(await page2.$eval('.chat', n => getComputedStyle(n).display !== 'none'), 'chat shown with Claude');
  assert.equal(await page2.$eval('.grid', g => getComputedStyle(g).gridTemplateColumns.split(' ').length), 3);
  assert.deepEqual(errors, []);
  await ctx2.close();
});

test('a library that cannot load is explained in plain words with Retry (no Fix errors), and Retry recovers', async () => {
  // both library servers are folders that do not exist yet; Retry is pressed after the first one "comes back"
  const flaky = path.join(root, '.work/cdn-flaky'); try { fs.unlinkSync(flaky); } catch (e) {}
  const u = labUrlForTests(server, { primary: server.base + '/.work/cdn-flaky/', fallback: server.base + '/.work/cdn-gone/', local: false, name: 'down' });
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 2600 } });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(u); await page.evaluate(() => localStorage.clear()); await page.reload(); await sleep(500);
  await loadExample(page, 'rocket'); await sleep(5000);
  const st = await statuses(page);
  assert.deepEqual(st.map(([, s]) => s), ["Couldn't load", "Couldn't load"], JSON.stringify(st));
  const msg = await page.$eval('.pane[data-vid="A"] [data-r=libfail]', n => n.innerText);
  assert.match(msg, /Couldn't load p5/); assert.match(msg, /tried this site, then jsDelivr, then unpkg/); assert.doesNotMatch(msg, /is not defined|mount\(\)/);
  assert.ok(await page.$eval('.pane[data-vid="A"] [data-r=repair]', n => n.hidden), 'no Fix errors for a missing library');
  assert.ok(await page.$eval('.pane[data-vid="A"] [data-r=problems]', n => n.hidden), 'the technical detail stays in the console');
  assert.deepEqual(await audit(page), [], 'the failure message passes axe');
  fs.symlinkSync(path.join(root, '.cdn'), flaky);                                   // the first server is back
  try {
    await page.click('.pane[data-vid="A"] [data-r=retry]'); await sleep(5000);
    assert.ok(allPass(await statuses(page)), 'Retry reloads every version that failed, starting from the first server');
  } finally { fs.unlinkSync(flaky); }
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('when the first library server is unreachable the previews fall back to the second', async () => {
  const u = labUrlForTests(server, { primary: server.base + '/.work/cdn-gone/', local: false, name: 'fallback' });
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 2600 } });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(u); await page.evaluate(() => localStorage.clear()); await page.reload(); await sleep(500);
  await loadExample(page, 'terms'); await sleep(8000);                               // word cloud, Chart.js and a three.js module import
  const st = await statuses(page);
  assert.ok(allPass(st), JSON.stringify(st));
  const log = await page.$eval('.pane[data-vid="C"] [data-r=clog]', n => n.textContent);
  assert.match(log, /load from unpkg because this site and jsDelivr could not be reached/, 'the console says which server is in use');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('outside Claude the previews load their libraries from lib/ beside the page', async () => {
  const { ctx, page, errors } = await fresh();
  await loadExample(page, 'projectile'); await sleep(5000);
  assert.ok(allPass(await statuses(page)));
  const srcs = await page.$$eval('.pane iframe', fs => fs.map(f => f.srcdoc));
  for (const d of srcs) assert.match(d, /\/\.work\/lab\/lib\/(p5|three)@/, 'loads from lib/ beside the page');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('"Works offline" downloads run with the network switched off (classic scripts and a three.js import map)', async () => {
  const { ctx, page, errors } = await fresh({ acceptDownloads: true });
  await loadExample(page, 'projectile'); await sleep(4000);
  await page.check('.pane[data-vid="A"] [data-r=offline]');
  assert.ok(await page.$eval('.pane[data-vid="B"] [data-r=offline]', c => c.checked), 'one setting for every version');
  const files = [];
  for (const [id, course] of [['A', false], ['B', false], ['B', true]]) {
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click(`.pane[data-vid="${id}"] [data-r=${course ? 'course' : 'dl'}]`)]);
    assert.match(dl.suggestedFilename(), course ? /\.offline\.course\.html$/ : /\.offline\.html$/);
    const f = path.join(root, '.work', 'dl-' + dl.suggestedFilename()); await dl.saveAs(f); files.push(f);
  }
  await ctx.close();
  const off = await browser.newContext({ viewport: { width: 900, height: 700 } });
  const net = []; await off.route(/^https?:/, q => { if (!/fonts\.g/.test(q.request().url())) net.push(q.request().url()); q.abort(); });
  for (const f of files) {
    const p = await off.newPage(); const pe = []; p.on('pageerror', e => pe.push(e.message));
    await p.goto('file://' + f); await sleep(3000);
    const st = await p.evaluate(() => ({ ready: !!window.__ready, errors: window.__errors, pass: !!(window.__check && window.__check.pass) }));
    assert.deepEqual(st, { ready: true, errors: [], pass: true }, path.basename(f) + ' ' + JSON.stringify(pe));
    await p.close();
  }
  assert.deepEqual(net, [], 'nothing was fetched from the network');
  assert.deepEqual(errors, []);
  await off.close();
});

test('accessibility: no axe violations in the lab (light, dark, phone), with the scores and the Text tab open, and in Get inspired', async () => {
  for (const opts of [{ colorScheme: 'light' }, { colorScheme: 'dark' }, { viewport: { width: 420, height: 1600 }, colorScheme: 'light' }]) {
    const { ctx, page, errors } = await fresh(opts);
    await sleep(4000);
    assert.deepEqual(await audit(page), [], 'lab ' + JSON.stringify(opts));
    await page.click('#btnRubric'); await page.click('.pane[data-vid="A"] [data-tab=text]'); await sleep(500);
    assert.deepEqual(await audit(page), [], 'scores and Text tab ' + JSON.stringify(opts));
    await page.click('#pageSeg [data-page=inspire]'); await sleep(2500);
    assert.deepEqual(await audit(page), [], 'Get inspired ' + JSON.stringify(opts));
    if (opts.colorScheme === 'light' && !opts.viewport) {
      await page.click('#pageSeg [data-page=lab]'); await sleep(500);
      await page.click('.pane[data-vid="A"] [data-tab=how]'); await sleep(400);
      assert.deepEqual(await audit(page), [], 'How it works');
      await page.click('.pane[data-vid="A"] [data-tab=source]'); await sleep(2500);
      assert.deepEqual(await audit(page), [], 'Edit code');
      await page.click('#btnGuide'); await sleep(1500);
      assert.deepEqual(await audit(page), [], 'Guide');
      await page.click('#btnGuideClose'); await page.click('#btnNew'); await sleep(500);
      assert.deepEqual(await audit(page), [], 'empty lab');
    }
    assert.deepEqual(errors, []);
    await ctx.close();
  }
});

test('the Text tab reads the lesson from the model, tabs work from the keyboard, and steps are announced', async () => {
  const { ctx, page, errors } = await fresh();
  await loadExample(page, 'pipeline'); await sleep(4000);
  await page.click('.pane[data-vid="A"] [data-tab=text]'); await sleep(300);
  const txt = await page.$eval('.pane[data-vid="A"] .textview', n => n.innerText);
  assert.match(txt, /build cycles/); assert.match(txt, /STEP BY STEP|Step by step/i); assert.match(txt, /What the model confirms/);
  assert.equal(await page.$eval('.pane[data-vid="A"] [data-tab=text]', b => b.getAttribute('aria-selected')), 'true');
  await page.focus('.pane[data-vid="A"] [data-tab=text]'); await page.keyboard.press('ArrowRight'); await sleep(200);
  assert.equal(await page.evaluate(() => document.activeElement.dataset.tab), 'source', 'ArrowRight moves to the next tab');
  await page.keyboard.press('Home'); await sleep(200);
  assert.equal(await page.evaluate(() => document.activeElement.dataset.tab), 'preview');
  assert.equal(await page.$$eval('.pane[data-vid="A"] [role=tab]', ts => ts.filter(t => t.tabIndex === 0).length), 1, 'one tab in the Tab order');
  await page.click('#tlPause').catch(() => {}); await page.click('body'); await page.keyboard.press('ArrowRight'); await sleep(900);
  assert.match(await page.$eval('#announce', n => n.textContent), /^Step \d+ of \d+: /);
  assert.match(await page.$eval('.pane[data-vid="A"] iframe', f => f.title), /Version A preview: Agentic delivery pipeline/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('downloaded pages: a skip link opens the text version, steps are announced, and axe finds nothing (plain and course)', async () => {
  const { ctx, page } = await fresh({ acceptDownloads: true });
  await loadExample(page, 'pipeline'); await sleep(3000);
  const files = [];
  for (const sel of ['[data-r=dl]', '[data-r=course]']) {
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('.pane[data-vid="A"] ' + sel)]);
    const f = path.join(root, '.work', 'a11y-' + dl.suggestedFilename()); await dl.saveAs(f); files.push(f);
  }
  await ctx.close();
  const c2 = await browser.newContext({ viewport: { width: 900, height: 700 } });
  for (const f of files) {
    const p = await c2.newPage(); const pe = []; p.on('pageerror', e => pe.push(e.message));
    await p.goto(server.base + '/.work/' + path.basename(f)); await sleep(3500);
    assert.deepEqual(await audit(p), [], path.basename(f));
    await p.keyboard.press('Tab');
    assert.equal(await p.evaluate(() => document.activeElement.id), 'textLink', 'the first Tab stop is the text version');
    await p.keyboard.press('Enter'); await sleep(300);
    const course = /course/.test(f);
    const text = await p.$eval(course ? '#courseText' : '#textPanel', n => n.innerText);
    assert.match(text, /build cycles/); assert.match(text, /Step by step/i);
    if (!course) { await p.keyboard.press('Escape'); await sleep(200); assert.ok(await p.$eval('#textPanel', n => n.hidden)); }
    await p.evaluate(() => window.__seekFrac(0.5)); await sleep(700);
    assert.match(await p.$eval('#stepStatus', n => n.textContent), /^Step \d+ of \d+: /);
    assert.equal(await p.$eval('#root', n => n.getAttribute('role')), 'figure');
    assert.deepEqual(pe, []);
    await p.close();
  }
  await c2.close();
});

test('a lesson exported from the lab imports as "in this browser only", and add-lesson turns the same file into a gallery lesson', async () => {
  const { ctx, page, errors } = await fresh({ acceptDownloads: true });
  await loadExample(page, 'rocket'); await sleep(2500);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btnExport')]);
  const file = path.join(root, '.work', 'roundtrip-' + dl.suggestedFilename()); await dl.saveAs(file);
  await page.click('#btnNew'); await sleep(300);
  await page.click('#btnImport'); await page.setInputFiles('#importFile', file); await sleep(5000);
  assert.match(await page.$eval('#nowSub', n => n.textContent), /2 versions · imported, in this browser only/);
  assert.ok(allPass(await statuses(page)));
  assert.deepEqual(errors, []);
  await ctx.close();
  // the permanent way: the same file through add-lesson, into a scratch copy of the sources
  const repo = fs.mkdtempSync(path.join(root, '.work', 'repo-'));
  for (const d of ['kit', 'gallery']) fs.cpSync(path.join(root, d), path.join(repo, d), { recursive: true });
  fs.mkdirSync(path.join(repo, 'src')); fs.copyFileSync(path.join(root, 'src/vislab.html'), path.join(repo, 'src/vislab.html')); fs.copyFileSync(path.join(root, 'AUTHORING.md'), path.join(repo, 'AUTHORING.md'));
  const { spawnSync } = await import('child_process');
  const r = spawnSync(process.execPath, [path.join(root, 'scripts/add_lesson.mjs'), file, '--category', 'Physics', '--slug', 'rocket-roundtrip', '--repo', repo, '--no-verify'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const meta = JSON.parse(fs.readFileSync(path.join(repo, 'gallery/items/rocket-roundtrip/meta.json'), 'utf8'));
  assert.deepEqual([meta.a.lib, meta.b.lib], ['p5', 'chartjs']);
  fs.rmSync(repo, { recursive: true, force: true });
});

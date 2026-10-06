#!/usr/bin/env node
// Assemble dist/vislab.html from src/, kit/, examples/ and the docs, and regenerate the generated doc tables.
// Single sources: AUTHORING.md (rules in <!-- lab:* --> blocks), kit/libraries.json (libraries + comparisons),
// examples/*/ (built-in lessons), kit/story3d_kit.js, kit/reactflow.css, src/starters.json.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { libraryFiles } from './libfiles.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const esc = s => String(s).replace(/<\/script/gi, '<\\/script');
const js = v => JSON.stringify(v).replace(/<\//g, '<\\/');
// A JS template literal whose {{CDN}} becomes the page's JSD constant
const tpl = s => '`' + s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${').replaceAll('{{CDN}}', '${JSD}').replace(/<\/script>/g, '<\\/script>') + '`';
const inLiteral = s => s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

const libj = JSON.parse(read('kit/libraries.json'));
const libs = libj.libraries, comps = libj.comparisons;
let doc = read('AUTHORING.md');
let readme = read('README.md');
const block = name => {
  const m = doc.match(new RegExp(`<!-- lab:${name} -->\\n([\\s\\S]*?)<!-- /lab -->`));
  if (!m) throw new Error('AUTHORING.md is missing the <!-- lab:' + name + ' --> block');
  return m[1].trim();
};
const setBlock = (text, name, body) => text.replace(new RegExp(`(<!-- lab:${name} -->\\n)[\\s\\S]*?(<!-- /lab -->)`), (_, a, b) => a + body + '\n' + b);

// ---- generated doc tables
const names = Object.fromEntries(libs.map(l => [l.id, l.name]));
const cell = s => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const libTable = ['| id | Library | View | Global | Purpose | Notes and traps |', '| --- | --- | --- | --- | --- | --- |',
  ...libs.map(l => `| \`${l.id}\` | ${l.name} | ${l.dim} | ${cell(l.global)} | ${cell(l.purpose)} | ${cell(l.notes)} |`)].join('\n');
const compTable = ['| Concept | Version A | Version B | What it teaches |', '| --- | --- | --- | --- |',
  ...comps.map(c => `| ${c.kind} | ${names[c.a]} | ${names[c.b]} | ${c.learn} |`)].join('\n');
doc = setBlock(setBlock(doc, 'libraries', libTable), 'comparisons', compTable);
readme = setBlock(readme, 'comparisons', compTable);
fs.writeFileSync(path.join(root, 'AUTHORING.md'), doc);
fs.writeFileSync(path.join(root, 'README.md'), readme);

// ---- page pieces
const plain = libs.filter(l => l.id !== 'story3d');
const LIBS = 'const LIBS = {\n' + plain.map(l => `  ${l.id}: { name: ${js(l.name)}, dim: ${js(l.dim)}, module: ${l.module},\n    head: ${l.head ? tpl(l.head) : '""'},\n    notes: ${js(l.notes)} }`).join(',\n') + '\n};\n// Generated from kit/libraries.json by scripts/build.mjs.\n';
const s3 = libs.find(l => l.id === 'story3d');
const [pre, post] = s3.head.replace('{{THREE_HEAD}}', '').split('{{STORY3D_KIT}}');
const STORY3D = `LIBS.story3d = { name: ${js(s3.name)}, dim: ${js(s3.dim)}, module: true,\n  head: LIBS.three.head + ${tpl(pre)} + STORY3D_KIT + ${tpl(post)},\n  notes: ${js(s3.notes)} };\n`
  + 'const RUNTIME = {\n' + libs.map(l => `  ${l.id}: ${js(l.runtime)}`).join(',\n') + '\n};\n';
const KIT = 'const STORY3D_KIT = ' + js(read('kit/story3d_kit.js')) + ';';
const STARTERS = 'const STARTERS = ' + JSON.stringify(JSON.parse(read('src/starters.json')), null, 2) + ';\n';
const PAIRS = 'const PAIRS = ' + JSON.stringify(comps.map(({ when, ...c }) => c), null, 2) + ';\n// Generated from kit/libraries.json ("comparisons").\n';

const EXAMPLES = ['projectile', 'rocket', 'pipeline', 'terms'].map(dir => {
  const d = 'examples/' + dir + '/';
  const ex = JSON.parse(read(d + 'lesson.json'));
  const name = ex.constant; delete ex.constant;
  ex.spec.modelCode = read(d + 'model.js').replace(/\n$/, '');
  ex.spec.checkCode = read(d + 'check.js').replace(/\n$/, '');
  for (const v of ex.versions) v.code = read(d + v.id.toLowerCase() + '.js');
  return `const ${name} = ${js(ex)};`;
}).join('\n') + '\n';

// The opener: the gallery lesson the lab shows on a first visit (gallery.json "opener"), inlined so the first paint needs no gallery download.
// Same shape as the lab objects scripts/build_gallery.mjs puts in gallery/data.js.
const gallery = JSON.parse(read('gallery/gallery.json'));
const openerSlug = gallery.opener;
if (!gallery.order.includes(openerSlug) || gallery.refs[openerSlug]) throw new Error('gallery.json "opener" must name a gallery lesson in "order" that is not a built-in example');
const OPENER = (() => {
  const d = 'gallery/items/' + openerSlug + '/';
  const meta = JSON.parse(read(d + 'meta.json')), { expectAtDefaults, ...spec } = JSON.parse(read(d + 'spec.json'));
  const versions = ['a', 'b', 'c', 'd', 'e', 'f'].filter(k => meta[k]).map(k => ({ id: k.toUpperCase(), lib: meta[k].lib, code: read(d + k + '.js'), form: meta[k].form || '', explanation: meta[k].explanation, caveats: meta[k].caveats || [] }));
  return `const OPENER_SLUG = ${js(openerSlug)};\nconst OPENER = ${js({ goal: meta.goal, view: 'Auto', libChoice: 'recommend', spec, versions, chat: [] })};\n`;
})();

const specRules = 'Rules that matter most (from the lesson authoring guide):\n' + block('spec-rules') + '\n\nModel rules:\n' + block('model-rules') + '\n\nCheck rules:\n' + block('check-rules')
  + '\n\nLibrary ids: ' + libs.map(l => `${l.id} (${l.purpose})`).join('; ') + '.\n'
  + 'Default comparisons, used for "alternative" unless the request clearly calls for something else: '
  + comps.map(c => `${c.when} -> recommended ${c.a}, alternative ${c.b} (${c.learn.replace(/\.$/, '')})`).join('; ') + '.';
// Chart forms: the vocabulary table in the guide becomes one line for the spec prompt (names and what each fits) and the renderer prompt (names only)
const forms = block('forms').split('\n').filter(l => l.startsWith('| ') && !l.startsWith('| Form') && !l.startsWith('| ---'))
  .map(l => l.split('|').slice(1, -1).map(c => c.trim())).map(([name, fits, libs, where]) => ({ name, fits, libs, where }));
if (forms.length < 20) throw new Error('AUTHORING.md forms table looks truncated');
const formsLine = 'Chart forms. Name the form each version should take in recommended.why and alternative.why, using these names: ' + forms.map(f => `${f.name} (${f.fits})`).join('; ') + '.';
const renderContract = 'Contract (mandatory, from the lesson authoring guide):\n' + block('renderer-contract') + '\n\nLook:\n' + block('look') + '\n\nPhone:\n' + block('phone')
  + '\n\nChart form names (use one of these for "form" when it fits, otherwise two to four plain words): ' + forms.map(f => f.name).join(', ') + '.';

let page = read('src/vislab.html');
const fill = (ph, val) => { if (!page.includes(ph)) throw new Error('src/vislab.html is missing ' + ph); page = page.replace(ph, () => val); };
fill('/*@RFCSS@*/', read('kit/reactflow.css').replace(/<\/script/gi, '<\\/script'));
fill('/*@LIBS@*/\n', LIBS);
fill('/*@STORY3D_KIT@*/\n', KIT + '\n');
fill('/*@TEMPLATE@*/\n', '// kit/template.html (inlined by scripts/build.mjs)\nconst KIT_TEMPLATE = ' + js(read('kit/template.html')) + ';\n');
fill('/*@LOOK2D@*/\n', '// kit/look2d.js (inlined by scripts/build.mjs)\n' + read('kit/look2d.js') + '\n');
// inlined kit code must not close the page's <script> element
const inlineJs = f => read(f).replace(/<\/script/gi, '<\\/script');
fill('/*@OFFLINE@*/\n', '// kit/offline.js (inlined by scripts/build.mjs)\n' + inlineJs('kit/offline.js') + '\n');
// kit/textview.js runs here (the Text tab, step announcements) and inside every preview frame and downloaded page, so it goes in twice: as code and as a string
fill('/*@TEXTVIEW@*/\n', '// kit/textview.js (inlined by scripts/build.mjs)\n' + inlineJs('kit/textview.js') + '\nconst TEXTVIEW_SRC = ' + js(read('kit/textview.js').replace(/<\/script/gi, '<\\/script')) + ';\n');
fill('/*@LIBS_STORY3D_AND_RUNTIME@*/\n', STORY3D);
fill('/*@STARTERS@*/\n', STARTERS);
fill('/*@EXAMPLES@*/\n', EXAMPLES);
fill('/*@OPENER@*/\n', OPENER);
fill('/*@GALLERY_COUNT@*/\n', `const GALLERY_COUNT = ${gallery.order.length}; // from gallery/gallery.json at build time\n`);
fill('/*@PAIRS@*/\n', PAIRS);
fill('@@SPEC_RULES@@', inLiteral(specRules + '\n\n' + formsLine));
fill('@@RENDER_CONTRACT@@', inLiteral(renderContract));
if (/\/\*@[A-Z0-9_]+@\*\/|@@[A-Z_]+@@/.test(page)) throw new Error('Unfilled placeholder: ' + page.match(/\/\*@[A-Z0-9_]+@\*\/|@@[A-Z_]+@@/)[0]);

const dist = path.join(root, 'dist');
fs.mkdirSync(path.join(dist, 'vendor'), { recursive: true });
fs.mkdirSync(path.join(dist, 'kit'), { recursive: true });
fs.writeFileSync(path.join(dist, 'vislab.html'), page);
fs.copyFileSync(path.join(root, 'vendor/codemirror.min.js'), path.join(dist, 'vendor/codemirror.min.js'));
for (const f of ['template.html', 'build.mjs', 'verify.mjs', 'check_spec.mjs', 'story3d_kit.js', 'reactflow.css', 'libraries.json', 'look2d.js', 'offline.js', 'textview.js']) fs.copyFileSync(path.join(root, 'kit', f), path.join(dist, 'kit', f));
// The library files themselves, beside the page in dist/lib/ (from the mirror in .cdn/): a hosted copy loads its previews from
// here first, and "Works offline" downloads inline them from here, so neither depends on a CDN. Skipped with a warning without a mirror.
const libFiles = libraryFiles(libs), haveMirror = libFiles.every(f => fs.existsSync(path.join(root, '.cdn', f)));
// Raw control characters and U+FFFD (Plotly carries both inside string literals) are written as \u escapes, which mean the
// same in a JS string, so the files are plain text wherever they are published.
if (haveMirror) for (const f of libFiles) {
  const to = path.join(dist, 'lib', f); fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.writeFileSync(to, fs.readFileSync(path.join(root, '.cdn', f), 'utf8').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\ufffd]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')));
}
else console.warn('warning: .cdn/ is incomplete (run npm run mirror), so dist/lib/ was not written; hosted previews and offline downloads will use the CDN');
for (const f of ['README.md', 'AUTHORING.md']) fs.copyFileSync(path.join(root, f), path.join(dist, f));
// examples for the published toolkit
const exd = path.join(dist, 'examples'); fs.mkdirSync(exd, { recursive: true });
for (const dir of ['projectile', 'rocket', 'pipeline', 'terms']) {
  const d = 'examples/' + dir + '/', ex = JSON.parse(read(d + 'lesson.json'));
  const spec = { ...ex.spec, modelCode: read(d + 'model.js').replace(/\n$/, ''), checkCode: read(d + 'check.js').replace(/\n$/, '') };
  fs.writeFileSync(path.join(exd, dir + '.spec.json'), JSON.stringify(spec, null, 2));
  for (const v of ex.versions) fs.copyFileSync(path.join(root, d + v.id.toLowerCase() + '.js'), path.join(exd, `${dir}_${v.lib}.js`));
}
console.log(`built dist/vislab.html (${Math.round(page.length / 1024)} KB), kit, examples and docs`);

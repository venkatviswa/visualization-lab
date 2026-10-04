// Build one standalone visual page from the shared spec and one renderer.
// Usage: node build.mjs <spec.json> <renderer.js> <lib> <theme> <out.html> [--kit story3d_kit.js] [--rfcss reactflow.css] [--cdn https://cdn.jsdelivr.net/npm/] [--course]
//   --course wraps the visual as a lesson page: title, objective, predict prompt, check line, explain prompt, assumptions.
// spec.json holds {title, params, modelCode, checkCode, ...}; lib is one of the keys in HEADS below.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const [specPath, codePath, lib, theme = 'night', outPath, ...rest] = process.argv.slice(2);
const opt = k => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : null; };
const flag = k => rest.includes(k);
const CDN = opt('--cdn') || 'https://cdn.jsdelivr.net/npm/';
const here = path.dirname(fileURLToPath(import.meta.url));
const tpl = fs.readFileSync(path.join(here, 'template.html'), 'utf8');
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const code = fs.readFileSync(codePath, 'utf8');
const esc = s => String(s).replace(/<\/script/gi, '<\\/script');

// Library heads come from libraries.json (the single source shared with the lab page and AUTHORING.md).
const LIBJ = JSON.parse(fs.readFileSync(path.join(here, 'libraries.json'), 'utf8')).libraries;
const THREE_HEAD = (LIBJ.find(l => l.id === 'three') || {}).head || '';
const HEADS = {};
for (const l of LIBJ) {
  let head = l.head.replaceAll('{{CDN}}', CDN).replace('{{THREE_HEAD}}', THREE_HEAD.replaceAll('{{CDN}}', CDN));
  if (head.includes('{{STORY3D_KIT}}')) head = head.replace('{{STORY3D_KIT}}', () => opt('--kit') ? esc(fs.readFileSync(opt('--kit'), 'utf8')) : '');
  if (l.id === 'reactflow' && opt('--rfcss')) head += '<style>' + fs.readFileSync(opt('--rfcss'), 'utf8') + '</style>';
  HEADS[l.id] = [head, !!l.module];
}
if (!HEADS[lib]) { console.error('Unknown lib ' + lib + '. Use one of: ' + Object.keys(HEADS).join(', ')); process.exit(1); }
if (lib === 'story3d' && !opt('--kit')) { console.error('story3d needs --kit <path to story3d_kit.js>'); process.exit(1); }
const [head, isModule] = HEADS[lib];
const specLite = Object.assign({}, spec); delete specLite.modelCode; delete specLite.checkCode;
const look2d = (lib === 'story' && theme !== 'studio') ? (() => { new Function(fs.readFileSync(path.join(here, 'look2d.js'), 'utf8'))(); return '<style id="look2d">' + globalThis.look2dCss(code, theme) + '</style>'; })() : '';
const html = tpl
  .replace('{{TITLE}}', String(spec.title || 'Lesson visual').replace(/[<&]/g, ''))
  .replace('{{THEME}}', theme)
  .replace('{{ROOT_BG}}', (lib === 'story3d' || (lib === 'story' && theme !== 'studio')) ? 'var(--bg)' : '#ffffff')
  .replace('{{HEAD}}', () => head + look2d)
  .replace('{{SPEC_JSON}}', () => esc(JSON.stringify(specLite)))
  .replace('{{COURSE_JSON}}', () => flag('--course') ? esc(JSON.stringify({ title: spec.title, objective: spec.objective || '', predict: spec.learnerPrompts && spec.learnerPrompts.predict || '', explain: spec.learnerPrompts && spec.learnerPrompts.explain || '', assumptions: spec.assumptions || [], units: spec.units || [], library: (LIBJ.find(l => l.id === lib) || {}).name || lib })) : 'null')
  .replace('{{MODEL}}', () => esc(spec.modelCode))
  .replace('{{CHECK}}', () => esc(spec.checkCode || ''))
  .replace('{{CODE}}', () => esc(code))
  .replaceAll('{{CODE_TYPE}}', isModule ? 'module' : 'text/javascript');
fs.writeFileSync(outPath, html);
console.log('wrote ' + outPath + ' (' + Math.round(html.length / 1024) + ' KB, ' + lib + ', ' + theme + ')');

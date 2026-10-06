// A fingerprint of everything a gallery lesson's check depends on, so a build or a test can skip a lesson that already
// passed with exactly these inputs: the lesson's own files (or, for a built-in example, its examples/ folder and its
// gallery.json entry), the whole kit (template, build, verify, libraries, story kit, ...) and the script doing the work.
// Change any of them and the lesson is checked again. Used by scripts/build_gallery.mjs and test/gallery/.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const filesUnder = dir => fs.existsSync(dir) ? fs.readdirSync(dir, { recursive: true }).map(String).filter(f => fs.statSync(path.join(dir, f)).isFile()).sort() : [];
function hashFiles(h, root, rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) { h.update('missing:' + rel); return; }
  if (fs.statSync(full).isDirectory()) for (const f of filesUnder(full)) { h.update(rel + '/' + f + '\0'); h.update(fs.readFileSync(path.join(full, f))); }
  else { h.update(rel + '\0'); h.update(fs.readFileSync(full)); }
}
// extra: further files or folders (relative to root) the caller's result depends on, e.g. the test file itself
export function lessonHash(root, slug, gallery, extra = []) {
  const h = crypto.createHash('sha256');
  const ref = gallery.refs && gallery.refs[slug];
  if (ref) { h.update(JSON.stringify(ref)); hashFiles(h, root, 'examples/' + ref.example); }
  else hashFiles(h, root, 'gallery/items/' + slug);
  for (const rel of ['kit', ...extra]) hashFiles(h, root, rel);
  return h.digest('hex').slice(0, 16);
}

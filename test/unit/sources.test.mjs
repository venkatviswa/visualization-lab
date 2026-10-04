// The single sources are well-formed and agree with each other.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { root, read, json } from '../helpers.mjs';

const libj = json('kit/libraries.json');
const ids = libj.libraries.map(l => l.id);

test('libraries.json: every library has the required fields', () => {
  for (const l of libj.libraries) {
    for (const k of ['id', 'name', 'dim', 'module', 'global', 'purpose', 'head', 'runtime', 'notes']) assert.ok(k in l, `${l.id} is missing ${k}`);
    assert.match(l.dim, /^(2D|3D|2D\/3D)$/);
    assert.ok(l.notes.length > 40, `${l.id} notes are too short`);
  }
  assert.equal(new Set(ids).size, ids.length, 'duplicate library ids');
});

test('libraries.json: comparisons reference known libraries and have a lesson line', () => {
  for (const c of libj.comparisons) {
    assert.ok(ids.includes(c.a) && ids.includes(c.b), `${c.kind} references an unknown library`);
    assert.notEqual(c.a, c.b);
    assert.ok(c.learn.length > 10 && c.when && c.kind);
  }
});

test('AUTHORING.md: every block the build reads is present and non-empty', () => {
  const doc = read('AUTHORING.md');
  for (const name of ['spec-rules', 'model-rules', 'check-rules', 'renderer-contract', 'look', 'phone', 'libraries', 'comparisons']) {
    const m = doc.match(new RegExp(`<!-- lab:${name} -->\\n([\\s\\S]*?)<!-- /lab -->`));
    assert.ok(m, `missing block ${name}`);
    assert.ok(m[1].trim().length > 20, `block ${name} is empty`);
  }
});

test('src/vislab.html: every build placeholder is present exactly once', () => {
  const src = read('src/vislab.html');
  for (const ph of ['/*@RFCSS@*/', '/*@LIBS@*/', '/*@STORY3D_KIT@*/', '/*@LOOK2D@*/', '/*@TEMPLATE@*/', '/*@LIBS_STORY3D_AND_RUNTIME@*/', '/*@STARTERS@*/', '/*@EXAMPLES@*/', '/*@PAIRS@*/', '@@SPEC_RULES@@', '@@RENDER_CONTRACT@@'])
    assert.equal(src.split(ph).length - 1, 1, ph);
});

test('examples: each built-in lesson has a lesson.json, model, check and one file per version', () => {
  for (const dir of ['projectile', 'rocket', 'pipeline', 'terms']) {
    const d = path.join(root, 'examples', dir);
    const ex = JSON.parse(fs.readFileSync(path.join(d, 'lesson.json'), 'utf8'));
    assert.ok(ex.constant && ex.spec && ex.versions.length >= 2, dir);
    for (const f of ['model.js', 'check.js', ...ex.versions.map(v => v.id.toLowerCase() + '.js')]) assert.ok(fs.existsSync(path.join(d, f)), `${dir}/${f}`);
    for (const v of ex.versions) assert.ok(ids.includes(v.lib), `${dir} version ${v.id} uses unknown library ${v.lib}`);
    assert.ok(!('modelCode' in ex.spec), `${dir}: modelCode belongs in model.js, not lesson.json`);
  }
});

test('gallery: gallery.json lists every item folder, and every item has the files the gallery build needs', () => {
  const gal = json('gallery/gallery.json');
  const folders = fs.readdirSync(path.join(root, 'gallery/items')).filter(f => fs.statSync(path.join(root, 'gallery/items', f)).isDirectory());
  for (const f of folders) assert.ok(gal.order.includes(f), `gallery.json does not list ${f}`);
  for (const slug of gal.order) {
    if (gal.refs[slug]) { assert.ok(fs.existsSync(path.join(root, 'examples', gal.refs[slug].example)), slug); continue; }
    const d = path.join(root, 'gallery/items', slug);
    assert.ok(fs.existsSync(d), `missing item folder ${slug}`);
    const meta = JSON.parse(fs.readFileSync(path.join(d, 'meta.json'), 'utf8'));
    assert.ok(meta.category && meta.title && meta.goal, `${slug}: meta needs category, title and goal`);
    for (const k of ['a', 'b', 'c']) if (meta[k]) {
      assert.ok(ids.includes(meta[k].lib), `${slug} ${k}: unknown library ${meta[k].lib}`);
      assert.ok(meta[k].explanation && meta[k].explanation.length > 60, `${slug} ${k}: explanation too short`);
      assert.ok(fs.existsSync(path.join(d, k + '.js')), `${slug}/${k}.js`);
    }
    assert.ok(meta.a && meta.b, `${slug}: a gallery lesson needs at least two versions`);
  }
});

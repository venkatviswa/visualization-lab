// Every spec in the repo passes check_spec (model + check at defaults and at every control's min and max),
// and the built-in models behave as their lessons claim.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { root, json } from '../helpers.mjs';

const checkSpec = specPath => {
  const r = spawnSync(process.execPath, [path.join(root, 'kit/check_spec.mjs'), specPath], { encoding: 'utf8' });
  return { ok: r.status === 0, out: r.stdout + r.stderr };
};
const exampleSpec = dir => {
  const d = path.join(root, 'examples', dir), ex = JSON.parse(fs.readFileSync(path.join(d, 'lesson.json'), 'utf8'));
  return { ...ex.spec, modelCode: fs.readFileSync(path.join(d, 'model.js'), 'utf8'), checkCode: fs.readFileSync(path.join(d, 'check.js'), 'utf8') };
};
const load = spec => new Function(spec.modelCode + '\n' + spec.checkCode + '\nreturn { model, check };')();
const defaults = spec => Object.fromEntries(spec.params.map(q => [q.id, q.value]));

const work = path.join(root, '.work/specs'); fs.mkdirSync(work, { recursive: true });

for (const dir of ['projectile', 'rocket', 'pipeline', 'terms']) {
  test(`example ${dir}: check_spec ok (defaults, extremes and expectAtDefaults)`, () => {
    const spec = exampleSpec(dir);
    assert.ok(spec.expectAtDefaults, `${dir} needs expectAtDefaults: the examples are what the skill tells builders to copy`);
    const p = path.join(work, dir + '.spec.json'); fs.writeFileSync(p, JSON.stringify(spec));
    const r = checkSpec(p);
    assert.ok(r.ok, r.out.slice(0, 800));
  });
}

const gal = json('gallery/gallery.json');
for (const slug of gal.order.filter(s => !gal.refs[s])) {
  test(`gallery ${slug}: check_spec ok`, () => {
    const r = checkSpec(path.join(root, 'gallery/items', slug, 'spec.json'));
    assert.ok(r.ok, r.out.slice(0, 800));
  });
}

test('check_spec rejects a spec whose defaults show nothing', () => {
  const bad = { title: 'bad', objective: 'x', params: [{ id: 'n', label: 'n', min: 0, max: 10, step: 1, value: 0, unit: '' }],
    modelCode: 'function model(p) { return { points: [] }; }', checkCode: 'function check(p) { return { pass: true, detail: "ok" }; }', expectAtDefaults: 'm.points.length > 0' };
  const p = path.join(work, 'bad.spec.json'); fs.writeFileSync(p, JSON.stringify(bad));
  const r = checkSpec(p);
  assert.ok(!r.ok, 'a spec with empty data at defaults must fail');
  assert.match(r.out, /empty|expectAtDefaults/);
  // empties at a slider's extreme are warnings, NaN there is still an issue
  const edge = { ...bad, modelCode: 'function model(p) { return { points: p.n === 0 ? [] : [1, 2], v: p.n === 10 ? NaN : 1 }; }', params: [{ ...bad.params[0], value: 5 }] };
  const pe = path.join(work, 'edge.spec.json'); fs.writeFileSync(pe, JSON.stringify(edge));
  const re = checkSpec(pe);
  assert.ok(!re.ok); assert.match(re.out, /n=10: result.v contains NaN/); assert.match(re.out, /"warnings": \[\s*"n=0: result.points is empty"/);
});

test('models are deterministic: two calls with the same params give identical output', () => {
  for (const dir of ['projectile', 'rocket', 'pipeline', 'terms']) {
    const spec = exampleSpec(dir), { model } = load(spec), P = defaults(spec);
    assert.equal(JSON.stringify(model(P)), JSON.stringify(model(P)), dir);
  }
  for (const slug of gal.order.filter(s => !gal.refs[s])) {
    const spec = json(`gallery/items/${slug}/spec.json`), { model } = load(spec), P = defaults(spec);
    assert.equal(JSON.stringify(model(P)), JSON.stringify(model(P)), slug);
  }
});

test('lesson claims: rocket escapes at defaults; with little thrust, a heavy rocket and little propellant it never lifts off', () => {
  const spec = exampleSpec('rocket'), { model } = load(spec), P = defaults(spec);
  assert.equal(model(P).outcome, 'escape');
  assert.equal(model({ ...P, thrustMN: spec.params[0].min, massT: spec.params[1].max, propFraction: spec.params[2].min }).outcome, 'no-liftoff');
  assert.equal(model({ ...P, thrustMN: spec.params[0].min, massT: spec.params[1].max }).outcome, 'falls-back', 'with lots of propellant it lifts off late and falls back');
});

test('lesson claims: projectile range peaks at 45 degrees and 30/60 land together', () => {
  const spec = exampleSpec('projectile'), { model } = load(spec), P = defaults(spec);
  const range = a => model({ ...P, angle: a }).range;
  assert.ok(range(45) > range(30) && range(45) > range(60));
  assert.ok(Math.abs(range(30) - range(60)) < 1e-6);
});

test('lesson claims: key terms are unique, in weight order, and the count follows the control', () => {
  const spec = exampleSpec('terms'), { model } = load(spec), P = defaults(spec);
  for (const n of [6, 12, 20]) {
    const m = model({ ...P, topN: n });
    assert.equal(m.terms.length, n);
    assert.equal(new Set(m.terms.map(t => t.text)).size, n);
    assert.ok(m.terms.every((t, i) => i === 0 || m.terms[i - 1].weight >= t.weight));
  }
});

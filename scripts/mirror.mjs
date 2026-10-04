#!/usr/bin/env node
// Download the pinned library files into .cdn/ so tests and offline work never depend on jsDelivr.
// The list is derived from kit/libraries.json (every src="{{CDN}}..." and import-map URL) plus the three.js addons used.
// Usage: node scripts/mirror.mjs            (skips files already present)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, '.cdn');
const BASE = 'https://cdn.jsdelivr.net/npm/';
const libs = JSON.parse(fs.readFileSync(path.join(root, 'kit/libraries.json'), 'utf8')).libraries;
const files = new Set(['three@0.169.0/examples/jsm/controls/OrbitControls.js', 'three@0.169.0/examples/jsm/geometries/RoundedBoxGeometry.js']);
for (const l of libs) for (const m of (l.head || '').matchAll(/\{\{CDN\}\}([^"'\s}]+)/g)) if (!m[1].endsWith('/')) files.add(m[1]);

let ok = 0, skipped = 0, failed = 0;
for (const f of files) {
  const dest = path.join(out, f);
  if (fs.existsSync(dest)) { skipped++; continue; }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  try {
    const r = await fetch(BASE + f);
    if (!r.ok) throw new Error(r.status + ' ' + r.statusText);
    fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer())); ok++;
    console.log('fetched', f);
  } catch (e) { failed++; console.error('FAILED', f, e.message); }
}
console.log(`mirror: ${ok} fetched, ${skipped} already present, ${failed} failed -> ${out}`);
if (failed) process.exit(1);

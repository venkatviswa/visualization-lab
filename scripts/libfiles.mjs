// The library files the lessons load at run time, as paths under the CDN (e.g. "p5@1.9.4/lib/p5.min.js").
// Derived from kit/libraries.json (every src="{{CDN}}..." and import-map URL) plus the three.js addons the kit and
// examples use. Shared by scripts/mirror.mjs (downloads them into .cdn/) and scripts/build.mjs (copies them into dist/lib/).
// three.module.js (r160 and later) imports ./three.core.js, so that file is listed beside it.
export const THREE_ADDONS = ['examples/jsm/controls/OrbitControls.js', 'examples/jsm/geometries/RoundedBoxGeometry.js', 'build/three.core.js'];
export function libraryFiles(libraries) {
  const three = (libraries.find(l => l.id === 'three') || {}).head || '';
  const v = (three.match(/three@([\d.]+)\//) || [])[1];
  const files = new Set(v ? THREE_ADDONS.map(f => 'three@' + v + '/' + f) : []);
  for (const l of libraries) for (const m of (l.head || '').matchAll(/\{\{CDN\}\}([^"'\s}]+)/g)) if (!m[1].endsWith('/')) files.add(m[1]);
  return [...files];
}

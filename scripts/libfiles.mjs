// The library files the lessons load at run time, as paths under the CDN (e.g. "p5@1.9.4/lib/p5.min.js").
// Derived from kit/libraries.json (every src="{{CDN}}..." and import-map URL) plus the three.js addons the kit and
// examples use. Shared by scripts/mirror.mjs (downloads them into .cdn/) and scripts/build.mjs (copies them into dist/lib/).
export const THREE_ADDONS = ['three@0.169.0/examples/jsm/controls/OrbitControls.js', 'three@0.169.0/examples/jsm/geometries/RoundedBoxGeometry.js'];
export function libraryFiles(libraries) {
  const files = new Set(THREE_ADDONS);
  for (const l of libraries) for (const m of (l.head || '').matchAll(/\{\{CDN\}\}([^"'\s}]+)/g)) if (!m[1].endsWith('/')) files.add(m[1]);
  return [...files];
}

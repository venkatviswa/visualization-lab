// Offline copies: replace the library tags of a lesson page with the library files themselves, so the page works
// with no internet. Shared by the lab page (Download HTML / Export for course with "Works offline") and kit/build.mjs --offline.
// Plain script, no imports: the page inlines it at build time and Node loads it with new Function (see kit/build.mjs).
//
// labOffline.inline(html, { cdn, fetchText }) -> Promise<{ html, inlined: [path], missing: [path] }>
//   cdn        the base URL the page's library tags use, e.g. "https://cdn.jsdelivr.net/npm/"
//   fetchText  async (path) => file text, for a path under the CDN such as "p5@1.9.4/lib/p5.min.js"; throw if unavailable
// Classic <script src> tags become inline scripts. ES modules in an import map (three.js) become data: URLs; for a prefix
// entry such as "three/addons/" every specifier the page uses under it gets its own entry, relative imports included.
// A file that cannot be fetched keeps its URL (the page still works online) and is listed in `missing`.
(function (g) {
  const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Text inside an inline <script> must not close the element or open an HTML comment
  const safe = t => t.replace(/<\/(script)/gi, '<\\/$1').replace(/<!--/g, '<\\!--');
  function base64(text) {
    if (typeof Buffer !== 'undefined') return Buffer.from(text, 'utf8').toString('base64');
    const bytes = new TextEncoder().encode(text); let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  const dataUrl = t => 'data:text/javascript;base64,' + base64(t);
  const dirOf = p => p.slice(0, p.lastIndexOf('/') + 1);
  function resolve(dir, rel) {                 // 'a/b/' + '../c.js' -> 'a/c.js'
    const out = dir.split('/').filter(Boolean);
    for (const part of rel.split('/')) { if (part === '..') out.pop(); else if (part !== '.' && part) out.push(part); }
    return out.join('/');
  }

  async function inline(html, { cdn, fetchText }) {
    const inlined = [], missing = [], cache = {};
    const get = p => cache[p] || (cache[p] = Promise.resolve().then(() => fetchText(p)).then(t => { inlined.push(p); return t; }, () => { missing.push(p); return null; }));

    // 1. classic scripts
    const tagRe = new RegExp('<script src="' + escRe(cdn) + '([^"]+)"></script>', 'g');
    const paths = [...new Set([...html.matchAll(tagRe)].map(m => m[1]))];
    const texts = {}; await Promise.all(paths.map(async p => { texts[p] = await get(p); }));
    html = html.replace(tagRe, (m, p) => texts[p] == null ? m : '<script data-inlined="' + p + '">' + safe(texts[p]) + '\n<' + '/script>');

    // 2. import maps
    const maps = [...html.matchAll(/<script type="importmap">([\s\S]*?)<\/script>/g)];
    for (const m of maps) {
      let map; try { map = JSON.parse(m[1]); } catch (e) { continue; }
      const imports = map.imports || {}, add = {};
      const prefixes = Object.entries(imports).filter(([k, u]) => k.endsWith('/') && u.startsWith(cdn)).map(([k, u]) => [k, u.slice(cdn.length)]);
      // a module's relative imports become specifiers under the same prefix, so the import map can resolve them
      const moduleText = async (spec, path) => {
        if (add[spec]) return;
        add[spec] = 'pending';
        let t = await get(path);
        if (t == null) { delete add[spec]; return; }
        const pre = prefixes.find(([, pp]) => path.startsWith(pp));
        const deps = [];
        t = t.replace(/((?:import|export)\s[^'"]*?from\s*|import\s*\(?\s*)(['"])(\.\.?\/[^'"]+)\2/g, (all, head, q, rel) => {
          const target = resolve(dirOf(path), rel);
          if (!pre || !target.startsWith(pre[1])) return all;
          const s = pre[0] + target.slice(pre[1].length); deps.push([s, target]);
          return head + q + s + q;
        });
        for (const [s, p] of deps) await moduleText(s, p);
        add[spec] = dataUrl(t);
      };
      for (const [spec, url] of Object.entries(imports)) if (!spec.endsWith('/') && url.startsWith(cdn)) await moduleText(spec, url.slice(cdn.length));
      for (const [pre, pp] of prefixes) {
        const used = new Set([...html.matchAll(new RegExp('[\'"](' + escRe(pre) + '[^\'"\\s]+)[\'"]', 'g'))].map(x => x[1]));
        for (const s of used) await moduleText(s, pp + s.slice(pre.length));
      }
      for (const k in add) if (add[k] !== 'pending') imports[k] = add[k];
      map.imports = imports;
      html = html.replace(m[0], () => '<script type="importmap">' + JSON.stringify(map).replace(/<\//g, '<\\/') + '<' + '/script>');
    }
    return { html, inlined, missing };
  }
  g.labOffline = { inline };
})(typeof globalThis !== 'undefined' ? globalThis : window);

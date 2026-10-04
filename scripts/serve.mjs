#!/usr/bin/env node
// Static server for local development and tests. Serves the repo root with CORS, so dist/vislab.html,
// dist/gallery/*, and the package mirror in .cdn/ are all reachable from one origin.
// Usage: node scripts/serve.mjs [port]   (default 8766)
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.argv[2] || process.env.PORT || 8766);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.md': 'text/markdown', '.woff2': 'font/woff2' };

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const file = path.normalize(path.join(root, url));
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Access-Control-Allow-Origin': '*' }); return res.end('not found: ' + url); }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-cache' });
    fs.createReadStream(file).pipe(res);
  });
});
server.listen(port, () => console.log(`serving ${root} at http://localhost:${port}/  (lab: /dist/vislab.html)`));

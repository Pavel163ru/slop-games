import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('./dist/', import.meta.url));
const PORT = process.env.PORT || 4173;
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webp': 'image/webp'
};

createServer(async (req, res) => {
  try {
    let url = decodeURIComponent(req.url.split('?')[0]);
    if (url.endsWith('/')) url += 'index.html';
    url = url.replace(/^\/+/, '');
    const filePath = normalize(join(ROOT, url));
    if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    const data = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': TYPES[extname(filePath)] || 'application/octet-stream', 'Cache-Control': 'no-cache, no-store, must-revalidate' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}).listen(PORT, () => console.log(`Serving dist/ at http://localhost:${PORT}`));

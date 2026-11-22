import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, relative, extname } from 'node:path';
const args = process.argv.slice(2);
const option = (key, fallback) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
const root = resolve(option('--directory', 'dist'));
const port = Number(option('--port', '4173'));
const base = option('--base', '/');
if (!base.startsWith('/') || !base.endsWith('/')) throw new Error('--base debe comenzar y terminar con /.');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.png': 'image/png', '.json': 'application/json' };
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const path = decodeURIComponent(url.pathname);
    if (!path.startsWith(base) || !['GET', 'HEAD'].includes(request.method)) { response.writeHead(404); response.end('No encontrado'); return; }
    const file = resolve(root, path.slice(base.length) || 'index.html');
    if (relative(root, file).startsWith('..') || !(await stat(file)).isFile()) { response.writeHead(404); response.end('No encontrado'); return; }
    response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-cache' });
    response.end(request.method === 'HEAD' ? undefined : await readFile(file));
  } catch { response.writeHead(404); response.end('No encontrado'); }
});
server.listen(port, process.env.HOST ?? '127.0.0.1', () => console.log(`Alero: http://localhost:${port}${base}`));

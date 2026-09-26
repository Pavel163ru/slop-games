import { readdir, readFile, writeFile, copyFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, 'dist');

const EXCLUDE = new Set(['.git', 'node_modules', '.claude', '.env.local', 'dist', 'game.json', 'README.md']);

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  function formatDate(value) {
    if (!value) return '';
    const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/.exec(value);
    if (!m) return String(value);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const y = m[1];
    const mo = m[2] ? months[Number(m[2]) - 1] : null;
    const d = m[3];
    if (mo && d) return `${d} ${mo} ${y}`;
    if (mo) return `${mo} ${y}`;
    return y;
  }

async function copyDir(src, dest, exclude) {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  for (const e of entries) {
    if (exclude.has(e.name)) continue;
    const s = join(src, e.name);
    const d = join(dest, e.name);
    if (e.isDirectory()) await copyDir(s, d, exclude);
    else if (e.isFile()) await copyFile(s, d);
  }
}

async function rewritePaths(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { await rewritePaths(p); continue; }
    if (!/\.(html|css|js|mjs|json)$/.test(e.name)) continue;
    const content = await readFile(p, 'utf8');
    const fixed = content
      .replace(/(href|src)\s*=\s*(["'])\//g, '$1=$2./')
      .replace(/(["'(])\/assets\//g, '$1./assets/');
    if (fixed !== content) await writeFile(p, fixed);
  }
}

async function build() {
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });

  const projects = [];
  const dirents = await readdir(ROOT, { withFileTypes: true });
  for (const dirent of dirents) {
    if (!dirent.isDirectory()) continue;
    const gjPath = join(ROOT, dirent.name, 'game.json');
    if (!existsSync(gjPath)) continue;

    let meta;
    try { meta = JSON.parse(await readFile(gjPath, 'utf8')); }
    catch (err) { console.warn(`Skip ${dirent.name}: invalid game.json (${err.message})`); continue; }

    const slug = meta.slug || dirent.name;
    const outDir = join(DIST, slug);

    if (meta.type === 'build') {
      const src = join(ROOT, dirent.name, 'dist');
      if (!existsSync(src)) { console.warn(`Skip ${slug}: build type but no dist/ folder found`); continue; }
      await copyDir(src, outDir, new Set());
      await rewritePaths(outDir);
    } else {
      await copyDir(join(ROOT, dirent.name), outDir, EXCLUDE);
    }

    projects.push({
      slug,
      title: meta.title || slug,
      description: meta.description || '',
      entry: meta.entry || 'index.html',
      accent: meta.accent || '#6366f1',
      model: meta.model || '',
      date: meta.date || '',
      order: typeof meta.order === 'number' ? meta.order : 999
    });
    console.log(`+ ${slug} -> dist/${slug}/${meta.entry || 'index.html'}`);
  }

  projects.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

  const cards = projects.map((p) => {
    const metaParts = [];
    if (p.model) metaParts.push(`Made with ${esc(p.model)}`);
    if (p.date) { const fd = formatDate(p.date); if (fd) metaParts.push(esc(fd)); }
    const metaHtml = metaParts.length ? `<div class="meta">${metaParts.join(' &middot; ')}</div>` : '';
    return `
      <a class="card" href="./${esc(p.slug)}/${esc(p.entry)}" target="_blank" rel="noopener noreferrer" style="--accent:${esc(p.accent)}">
        <div class="thumb"><span class="thumb-title">${esc(p.title)}</span></div>
        <div class="body">
          <h2>${esc(p.title)}</h2>
          <p>${esc(p.description)}</p>
          ${metaHtml}
          <span class="play">Play &rarr;</span>
        </div>
      </a>`;
  }).join('');

  const now = new Date().toLocaleString('ru-RU', { timeZone: 'UTC' });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">
<title>Slop Games</title>
<style>
:root{--bg:#0a0b10;--panel:#12141d;--text:#e7e9f0;--muted:#8b90a3;--line:rgba(255,255,255,.08);}
*{box-sizing:border-box;}
html,body{margin:0;padding:0;}
body{background:radial-gradient(1200px 600px at 50% -10%,#161a2b,var(--bg));color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;min-height:100vh;}
header{max-width:1100px;margin:0 auto;padding:64px 24px 24px;text-align:center;}
header h1{font-size:clamp(34px,6vw,56px);margin:0;letter-spacing:-.02em;background:linear-gradient(90deg,#fff,#9aa6ff);-webkit-background-clip:text;background-clip:text;color:transparent;}
header p{color:var(--muted);margin:10px 0 0;font-size:16px;}
.grid{max-width:1100px;margin:0 auto;padding:24px;display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px;}
.card{display:flex;flex-direction:column;background:var(--panel);border:1px solid var(--line);border-radius:16px;overflow:hidden;text-decoration:none;color:inherit;transition:transform .15s ease,border-color .15s ease,box-shadow .15s ease;}
.card:hover{transform:translateY(-4px);border-color:var(--accent);box-shadow:0 18px 50px rgba(0,0,0,.45);}
.thumb{height:150px;background:linear-gradient(135deg,var(--accent),#0b0d16 75%);display:grid;place-items:center;position:relative;overflow:hidden;}
.thumb::after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 30% 20%,rgba(255,255,255,.18),transparent 55%);}
.thumb-title{font-size:24px;font-weight:800;letter-spacing:-.01em;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.5);padding:0 16px;text-align:center;z-index:1;}
.body{padding:18px;display:flex;flex-direction:column;gap:10px;flex:1;}
.body h2{margin:0;font-size:19px;}
.body p{margin:0;color:var(--muted);font-size:14px;line-height:1.5;flex:1;}
  .play{color:var(--accent);font-weight:700;font-size:14px;letter-spacing:.02em;}
  .meta{color:var(--muted);font-size:12px;letter-spacing:.01em;}
  footer{max-width:1100px;margin:0 auto;padding:24px;text-align:center;color:var(--muted);font-size:13px;}
  .build-info{margin-top:40px;padding:20px;background:var(--panel);border:1px solid var(--line);border-radius:16px;text-align:center;}
  .build-info h3{margin:0 0 8px;color:var(--accent);font-size:18px;}
  .build-info p{margin:0;color:var(--muted);font-size:14px;}
</style>
</head>
<body>
<header>
  <h1>Slop Games</h1>
  <p>A collection of small browser games.</p>
</header>
<main class="grid">${cards}
</main>
<footer>Built with build.mjs &middot; ${projects.length} game${projects.length === 1 ? '' : 's'}</footer>
<div class="build-info">
  <h3>Сборка завершена</h3>
  <p>Время: ${now} &middot; Игр: ${projects.length}</p>
</div>
</body>
</html>
`;

  await writeFile(join(DIST, 'index.html'), html);
  console.log(`\nBuilt dist/index.html with ${projects.length} game(s).`);
}

build().catch((err) => { console.error(err); process.exit(1); });

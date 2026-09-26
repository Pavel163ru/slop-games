import pkg from 'basic-ftp';
import { readFileSync, existsSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, posix } from 'node:path';

const { Client, FileType } = pkg;
const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, 'dist');

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, 'utf8');
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnvFile(join(ROOT, '.env'));

const HOST = process.env.FTP_HOST;
const PORT = Number(process.env.FTP_PORT) || 21;
const USER = process.env.FTP_USER;
const PASSWORD = process.env.FTP_PASSWORD;
const REMOTE_DIR = process.env.FTP_REMOTE_DIR || '/';
const SECURE = process.env.FTP_SECURE === 'true';
const REJECT_UNAUTHORIZED = process.env.FTP_REJECT_UNAUTHORIZED !== 'false';

function fail(msg) {
  console.error('Deploy failed: ' + msg);
  process.exit(1);
}

if (!HOST) fail('FTP_HOST is not set. Copy .env.example to .env and fill it in.');
if (!USER) fail('FTP_USER is not set.');
if (!PASSWORD) fail('FTP_PASSWORD is not set.');
if (!existsSync(DIST)) fail('dist/ not found. Run the build first (build.bat or npm run build).');

async function walk(dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(full));
    else if (e.isFile()) out.push(full);
  }
  return out;
}

async function listRemote(client, relDir) {
  const out = { files: [], dirs: [] };
  let entries;
  try { entries = await client.list(relDir || '.'); }
  catch { return out; }
  for (const e of entries) {
    if (e.name === '.' || e.name === '..') continue;
    const rel = relDir ? `${relDir}/${e.name}` : e.name;
    if (e.type === FileType.Directory) {
      out.dirs.push(rel);
      const sub = await listRemote(client, rel);
      out.files.push(...sub.files);
      out.dirs.push(...sub.dirs);
    } else {
      out.files.push({ path: rel, size: e.size });
    }
  }
  return out;
}

async function cdRemoteDir(client, dir) {
  if (!dir || dir === '/' || dir === '.') return;
  try { await client.cd(dir); } catch { /* will be created on first upload */ }
}

async function makeRemoteDir(client, dir) {
  if (!dir || dir === '/' || dir === '.') return;
  const parts = dir.split('/').filter(Boolean);
  let path = '';
  for (const part of parts) {
    path = path ? `${path}/${part}` : part;
    try { await client.send('MKD ' + path); } catch { /* already exists */ }
  }
}

async function deploy() {
  const localFiles = await walk(DIST);
  const localRel = new Set();
  const localDirs = new Set();
  const localMap = new Map();
  for (const f of localFiles) {
    const rel = posix.join(...relative(DIST, f).split(/[\\/]/));
    localRel.add(rel);
    localDirs.add(posix.dirname(rel));
    localMap.set(rel, (await stat(f)).size);
  }

  const client = new Client();
  client.ftp.timeout = 30000;
  console.log(`Connecting to ${HOST}:${PORT} (secure=${SECURE})...`);
  await client.access({
    host: HOST,
    port: PORT,
    user: USER,
    password: PASSWORD,
    secure: SECURE,
    secureOptions: { rejectUnauthorized: REJECT_UNAUTHORIZED }
  });
  console.log(`Ensuring remote dir ${REMOTE_DIR}...`);
  await cdRemoteDir(client, REMOTE_DIR);

  const remote = await listRemote(client, '');
  const remoteMap = new Map(remote.files.map((f) => [f.path, f.size]));
  const remoteDirSet = new Set(remote.dirs);

  let uploaded = 0;
  let deleted = 0;

  for (const f of localFiles) {
    const rel = posix.join(...relative(DIST, f).split(/[\\/]/));
    const localSize = localMap.get(rel);
    const remoteSize = remoteMap.get(rel);
    if (remoteSize === undefined || remoteSize !== localSize) {
      const dir = posix.dirname(rel);
      if (dir !== '.') await makeRemoteDir(client, dir);
      await client.uploadFrom(f, rel);
      uploaded++;
      console.log(`  upload ${rel} (${localSize} bytes)`);
    }
  }

  for (const f of remote.files) {
    if (!localRel.has(f.path)) {
      await client.remove(f.path);
      deleted++;
      console.log(`  delete ${f.path}`);
    }
  }

  for (const d of [...remoteDirSet].sort((a, b) => b.length - a.length)) {
    if (!localDirs.has(d)) {
      try { await client.removeDir(d); console.log(`  remove dir ${d}`); }
      catch { /* not empty or already gone */ }
    }
  }

  await client.close();
  console.log(`\nDone. Uploaded ${uploaded}, deleted ${deleted}.`);
}

deploy().catch((err) => { console.error(err); process.exit(1); });

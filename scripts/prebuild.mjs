// Rebuilds public/data/*.json from the national CSV at Vercel build time.
// Runs via `npm run prebuild`. Skips download if data already exists (keeps deploys fast).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'public', 'data');
const CSV_URL = 'https://raw.githubusercontent.com/achannaung/Datasets/refs/heads/main/alltownship_2025.csv';

const CANON = {
  'ayeyarwady': 'Ayeyarwady Region',
  'bago (east)': 'Bago Region', 'bago (west)': 'Bago Region', 'bago': 'Bago Region',
  'chin': 'Chin State', 'kachin': 'Kachin State', 'kayah': 'Kayah State', 'kayin': 'Kayin State',
  'magway': 'Magway Region', 'mandalay': 'Mandalay Region', 'mon': 'Mon State',
  'nay pyi taw': 'Naypyidaw Union Territory', 'naypyidaw': 'Naypyidaw Union Territory',
  'rakhine': 'Rakhine State', 'sagaing': 'Sagaing Region',
  'shan (east)': 'Shan State', 'shan (north)': 'Shan State', 'shan (south)': 'Shan State', 'shan': 'Shan State',
  'tanintharyi': 'Tanintharyi Region', 'yangon': 'Yangon Region',
};

const slug = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function parseLine(line) {
  const out = [];
  let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') q = !q;
    else if (c === ',' && !q) { out.push(cur.trim()); cur = ''; }
    else cur += c;
  }
  out.push(cur.trim());
  return out;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  if (fs.existsSync(path.join(OUT, 'manifest.json')) && fs.existsSync(path.join(OUT, 'shan-state.json'))) {
    console.log('[prebuild] public/data already present, skipping download.');
    return;
  }
  console.log('[prebuild] downloading CSV…');
  const res = await fetch(CSV_URL);
  if (!res.ok) throw new Error(`CSV download failed: ${res.status}`);
  const text = await res.text();
  const lines = text.split(/\r?\n/);
  const groups = new Map();
  const towns = new Map();
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || !line.trim()) continue;
    const p = parseLine(line);
    if (p.length < 6) continue;
    const [srRaw, dist, tw, tract, ven, vmm, loc] = [p[0]||'', p[1]||'', p[2]||'', p[3]||'', p[4]||'', p[5]||'', p[6]||''];
    const stateEn = CANON[srRaw.toLowerCase().trim()] || srRaw;
    let lat = 0, lng = 0;
    if (loc.includes(',')) {
      const [a, b] = loc.split(',');
      lat = Math.round((parseFloat(a) || 0) * 1e5) / 1e5;
      lng = Math.round((parseFloat(b) || 0) * 1e5) / 1e5;
    }
    if (!groups.has(stateEn)) groups.set(stateEn, []);
    groups.get(stateEn).push([tw, tract, ven, vmm, lat, lng, dist, srRaw]);
    const k = stateEn + '||' + tw;
    towns.set(k, (towns.get(k) || 0) + 1);
  }
  const manifest = [];
  for (const [stateEn, rows] of groups) {
    const fn = slug(stateEn) + '.json';
    const fp = path.join(OUT, fn);
    fs.writeFileSync(fp, JSON.stringify({ state: stateEn, count: rows.length, fields: ['tw','tract','ven','vmm','lat','lng','dist','sr'], rows }));
    manifest.push({ stateEn, file: 'data/' + fn, count: rows.length, bytes: fs.statSync(fp).size });
  }
  const total = [...groups.values()].reduce((a, r) => a + r.length, 0);
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({ total, states: manifest.sort((a,b)=>a.stateEn.localeCompare(b.stateEn)) }, null, 1));
  const twIndex = [...towns.entries()].map(([k, count]) => {
    const [stateEn, township] = k.split('||');
    return { stateEn, township, count };
  }).sort((a,b)=>a.stateEn.localeCompare(b.stateEn) || a.township.localeCompare(b.township));
  fs.writeFileSync(path.join(OUT, 'townships.json'), JSON.stringify(twIndex));
  console.log(`[prebuild] done: ${total} rows, ${manifest.length} states.`);
}

main().catch((e) => { console.error(e); process.exit(1); });

import { Village } from '../types';
import { MYANMAR_STATES_REGIONS } from '../data/villages';

// Canonical mapping: handles "Bago (East/West)", "Shan (East/North/South)", "Nay Pyi Taw" variants
const STATE_CODE: Record<string, string> = {
  'ayeyarwady region': '010',
  'bago region': '007',
  'chin state': '014',
  'kachin state': '002',
  'kayah state': '011',
  'kayin state': '003',
  'magway region': '004',
  'mandalay region': '005',
  'mon state': '009',
  'naypyidaw union territory': '016',
  'rakhine state': '008',
  'sagaing region': '001',
  'shan state': '015',
  'tanintharyi region': '006',
  'yangon region': '013',
};

const MM_NAME: Record<string, string> = Object.fromEntries(
  MYANMAR_STATES_REGIONS.map((s) => [s.en, s.mm])
);

export function stateSlug(stateEn: string): string {
  return stateEn.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function getStringHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export interface ManifestState {
  stateEn: string;
  file: string;
  count: number;
  bytes: number;
}
export interface Manifest {
  total: number;
  states: ManifestState[];
}
export interface TownshipEntry {
  stateEn: string;
  township: string;
  count: number;
}

let manifestCache: Manifest | null = null;
let townshipCache: TownshipEntry[] | null = null;
const stateCache = new Map<string, Village[]>();
const inflight = new Map<string, Promise<Village[]>>();

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
  return res.json() as Promise<T>;
}

export async function getManifest(base = ''): Promise<Manifest> {
  if (manifestCache) return manifestCache;
  manifestCache = await fetchJSON<Manifest>(`${base}data/manifest.json`);
  return manifestCache;
}

export async function getTownshipIndex(base = ''): Promise<TownshipEntry[]> {
  if (townshipCache) return townshipCache;
  townshipCache = await fetchJSON<TownshipEntry[]>(`${base}data/townships.json`);
  return townshipCache;
}

interface CompactFile {
  state: string;
  count: number;
  fields: string[];
  rows: [string, string, string, string, number, number, string, string][];
}

function toVillage(stateEn: string, idx: number, r: CompactFile['rows'][number]): Village {
  const [tw, tract, ven, vmm, lat, lng, dist] = r;
  const stateMm = MM_NAME[stateEn] || stateEn;
  const code = STATE_CODE[stateEn.toLowerCase()] || '099';
  const indexHash = getStringHash(ven + tw + idx);
  const townshipHash = getStringHash(tw);
  const townshipCode = String((townshipHash % 899) + 100);
  const villageCode = String((indexHash % 899) + 100);
  const facilities: string[] = [];
  if (indexHash % 2 === 0) facilities.push('Primary School');
  if (indexHash % 3 === 0) facilities.push('Buddhist Monastery');
  if (indexHash % 5 === 0) facilities.push('Water Pump');
  if (indexHash % 7 === 0) facilities.push('Rural Clinic');
  if (indexHash % 11 === 0) facilities.push('Community Hall');
  if (facilities.length === 0) facilities.push('Water Well');
  const population = (indexHash % 12) * 150 + 200;
  const households = Math.round(population / (4.2 + (indexHash % 3) * 0.5));
  return {
    id: `v-${stateSlug(stateEn)}-${idx}`,
    pcode: `MMR${code}${townshipCode}${villageCode}`,
    nameMm: vmm || ven || 'ရွာသစ်',
    nameEn: ven || vmm || 'Village New',
    tractMm: tract ? `${tract} ကျေးရွာအုပ်စု` : 'ကျေးရွာအုပ်စု',
    tractEn: tract ? `${tract} Village Tract` : 'Village Tract',
    townshipMm: tw,
    townshipEn: tw,
    stateMm,
    stateEn,
    districtEn: dist || 'District Office',
    latitude: lat || 0,
    longitude: lng || 0,
    population,
    households,
    facilities,
  };
}

export async function loadState(stateEn: string, base = ''): Promise<Village[]> {
  const hit = stateCache.get(stateEn);
  if (hit) return hit;
  const p = inflight.get(stateEn);
  if (p) return p;
  const task = (async () => {
    const file = await fetchJSON<CompactFile>(`${base}data/${stateSlug(stateEn)}.json`);
    const villages = file.rows.map((r, i) => toVillage(file.state || stateEn, i, r));
    stateCache.set(stateEn, villages);
    inflight.delete(stateEn);
    return villages;
  })();
  inflight.set(stateEn, task);
  return task;
}

/** Decide which state files are needed for given filters (avoids downloading all 7MB). */
export async function loadRelevantStates(
  filters: { state: string; township: string },
  base = '',
  onProgress?: (loaded: number, total: number) => void
): Promise<Village[]> {
  // 1) Specific state selected -> load only that file (fastest: 100KB - 2MB)
  if (filters.state) {
    const v = await loadState(filters.state, base);
    onProgress?.(1, 1);
    return v;
  }
  // 2) Township query -> look up candidate states from tiny 19KB index
  const tq = filters.township.toLowerCase().trim();
  if (tq) {
    const idx = await getTownshipIndex(base);
    const matched = new Set<string>();
    for (const t of idx) {
      if (t.township.toLowerCase().includes(tq)) matched.add(t.stateEn);
    }
    const states = [...matched];
    if (states.length > 0 && states.length <= 5) {
      const out: Village[] = [];
      let done = 0;
      await Promise.all(
        states.map(async (s) => {
          const v = await loadState(s, base);
          out.push(...v);
          done++;
          onProgress?.(done, states.length);
        })
      );
      return out;
    }
    // township matches too many states -> fall through to progressive full load
  }
  // 3) No filter (or very broad): load all progressively, smallest first
  const manifest = await getManifest(base);
  const ordered = [...manifest.states].sort((a, b) => a.count - b.count);
  const out: Village[] = [];
  let done = 0;
  const CONCURRENCY = 3;
  for (let i = 0; i < ordered.length; i += CONCURRENCY) {
    const batch = ordered.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map((s) => loadState(s.stateEn, base)));
    for (const r of results) out.push(...r);
    done += batch.length;
    onProgress?.(done, ordered.length);
  }
  return out;
}

// Backwards-compat: old code called fetchAndParseNationalRegistry() (7.2MB CSV).
// Keep the name but implement via new split-JSON loader so existing imports keep working.
export async function fetchAndParseNationalRegistry(): Promise<Village[]> {
  return loadRelevantStates({ state: '', township: '' });
}

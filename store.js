// Local persistence: records + sync state in localStorage, photos in IndexedDB.
const LS = {
  get(k, d) { try { const v = localStorage.getItem('somm.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('somm.' + k, JSON.stringify(v)); } catch (e) { console.error(e); window.dispatchEvent(new CustomEvent('somm-storage-error')); } },
  del(k) { try { localStorage.removeItem('somm.' + k); } catch {} },
};
export { LS };

export const DEFAULT_SETTINGS = { owner: 'luisvital01', repo: 'somm-data', token: '' };
export const getSettings = () => ({ ...DEFAULT_SETTINGS, ...LS.get('settings', {}) });
export const saveSettings = (s) => LS.set('settings', s);

// records: [{...fields, id, created_at, updated_at, _dirty, _synced, _rev}]
export const getRecords = () => LS.get('records', []);
export const saveRecords = (rs) => LS.set('records', rs);
export const getRecord = (id) => getRecords().find((r) => r.id === id);

// sync bookkeeping
export const getState = () => ({ tombstones: [], photoDeletes: [], lastIds: {}, lastSync: null, lastError: null, photoShas: {}, ...LS.get('state', {}) });
export const saveState = (s) => LS.set('state', s);

export function pendingCount() {
  const st = getState();
  return getRecords().filter((r) => r._dirty).length + st.tombstones.length + st.photoDeletes.length;
}

export function nextId(year) {
  const st = getState();
  let max = st.lastIds[year] || 0;
  for (const r of getRecords()) if (String(r.id).startsWith(String(year))) max = Math.max(max, parseInt(String(r.id).slice(4), 10) || 0);
  for (const t of st.tombstones) if (String(t).startsWith(String(year))) max = Math.max(max, parseInt(String(t).slice(4), 10) || 0);
  return `${year}${String(max + 1).padStart(4, '0')}`;
}

export function upsertRecord(rec) {
  const rs = getRecords();
  const i = rs.findIndex((r) => r.id === rec.id);
  const now = new Date().toISOString();
  const r = { ...rec, updated_at: now, created_at: rec.created_at || now, _dirty: true, _rev: (rec._rev || 0) + 1 };
  if (i >= 0) rs[i] = r; else rs.push(r);
  saveRecords(rs);
  const st = getState();
  const y = String(r.id).slice(0, 4), n = parseInt(String(r.id).slice(4), 10);
  st.lastIds[y] = Math.max(st.lastIds[y] || 0, n);
  saveState(st);
  return r;
}

export async function deleteRecord(id) {
  const rs = getRecords();
  const r = rs.find((x) => x.id === id);
  saveRecords(rs.filter((x) => x.id !== id));
  const st = getState();
  if (r && r._synced) st.tombstones.push(id);
  if (!st.photoDeletes.includes(id)) st.photoDeletes.push(id);
  saveState(st);
  await Photos.del(id);
}

// ---------- IndexedDB for photos ----------
let dbp;
function db() {
  if (!dbp) dbp = new Promise((res, rej) => {
    const q = indexedDB.open('somm', 1);
    q.onupgradeneeded = () => q.result.createObjectStore('photos');
    q.onsuccess = () => res(q.result);
    q.onerror = () => rej(q.error);
  });
  return dbp;
}
async function tx(mode, fn) {
  const d = await db();
  return new Promise((res, rej) => {
    const t = d.transaction('photos', mode);
    const s = t.objectStore('photos');
    const out = fn(s);
    t.oncomplete = () => res(out && 'result' in out ? out.result : undefined);
    t.onerror = () => rej(t.error);
  });
}
// value: { dataUrl, pending: bool, sha }
export const Photos = {
  get: (id) => tx('readonly', (s) => s.get(id)).catch(() => undefined),
  put: (id, v) => tx('readwrite', (s) => s.put(v, id)),
  del: (id) => tx('readwrite', (s) => s.delete(id)).catch(() => {}),
  keys: () => tx('readonly', (s) => s.getAllKeys()).catch(() => []),
  clear: () => tx('readwrite', (s) => s.clear()).catch(() => {}),
};

export async function clearAll() {
  ['records', 'state', 'draft'].forEach(LS.del);
  await Photos.clear();
}

// GitHub sync using the Git Data API: every sync is ONE commit with all changes.
import { getSettings, getRecords, saveRecords, getState, saveState, Photos } from './store.js';
import { toCSV, fromCSV } from './csv.js';

const API = 'https://api.github.com';
const CSV_PATH = 'tastings.csv';
const META_PATH = 'meta.json';

export class GHError extends Error {
  constructor(status, msg) { super(msg); this.status = status; }
}

async function gh(path, opts = {}) {
  const { owner, repo, token } = getSettings();
  if (!token) throw new GHError(0, 'No GitHub token. Add it in Settings.');
  const url = API + path.replace('{repo}', `/repos/${owner}/${repo}`);
  let res;
  try {
    res = await fetch(url, {
      ...opts,
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch (e) {
    throw new GHError(-1, 'Network error (offline?)');
  }
  if (!res.ok) {
    let m = res.statusText;
    try { m = (await res.json()).message || m; } catch {}
    const hint = res.status === 401 ? ' — token invalid or expired' : res.status === 404 ? ' — repo not found or token has no access' : res.status === 403 ? ' — token lacks permission (Contents: Read and write)' : '';
    throw new GHError(res.status, `GitHub ${res.status}: ${m}${hint}`);
  }
  return res.status === 204 ? null : res.json();
}

// ---- base64 helpers (UTF-8 safe) ----
export function b64ToBytes(b64) {
  const bin = atob(b64.replace(/\s/g, ''));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const b64ToText = (b64) => new TextDecoder().decode(b64ToBytes(b64));

export async function testConnection() {
  const r = await gh('{repo}');
  return { name: r.full_name, private: r.private, canWrite: !!(r.permissions && r.permissions.push), branch: r.default_branch };
}

async function head() {
  const repo = await gh('{repo}');
  const branch = repo.default_branch;
  const ref = await gh(`{repo}/git/ref/heads/${encodeURIComponent(branch)}`);
  const commitSha = ref.object.sha;
  const commit = await gh(`{repo}/git/commits/${commitSha}`);
  const tree = await gh(`{repo}/git/trees/${commit.tree.sha}?recursive=1`);
  const files = {};
  for (const t of tree.tree) if (t.type === 'blob') files[t.path] = t.sha;
  return { branch, commitSha, treeSha: commit.tree.sha, files };
}

async function blobText(sha) {
  const b = await gh(`{repo}/git/blobs/${sha}`);
  return b.encoding === 'base64' ? b64ToText(b.content) : b.content;
}

export async function fetchPhoto(id) {
  const st = getState();
  const sha = st.photoShas[id];
  if (!sha) return null;
  const b = await gh(`{repo}/git/blobs/${sha}`);
  const dataUrl = 'data:image/jpeg;base64,' + b.content.replace(/\s/g, '');
  await Photos.put(id, { dataUrl, pending: false, sha });
  return dataUrl;
}

const clean = (r) => { const o = { ...r }; delete o._dirty; delete o._synced; delete o._rev; return o; };

let running = null;
export function sync() {
  if (!running) running = doSync().finally(() => { running = null; });
  return running;
}

async function doSync(attempt = 0) {
  const startRecs = getRecords();
  const startRev = Object.fromEntries(startRecs.map((r) => [r.id, r._rev]));
  const st = getState();
  const h = await head();

  const remoteCsv = h.files[CSV_PATH] ? await blobText(h.files[CSV_PATH]) : '';
  const remoteRecs = fromCSV(remoteCsv);
  let remoteMeta = { lastIds: {} };
  if (h.files[META_PATH]) { try { remoteMeta = JSON.parse(await blobText(h.files[META_PATH])); } catch {} }

  const result = new Map(remoteRecs.map((r) => [r.id, r]));
  const lastIds = { ...remoteMeta.lastIds };
  for (const [y, n] of Object.entries(st.lastIds)) lastIds[y] = Math.max(lastIds[y] || 0, n);
  const bump = (id) => { const y = id.slice(0, 4), n = parseInt(id.slice(4), 10) || 0; lastIds[y] = Math.max(lastIds[y] || 0, n); };
  for (const id of result.keys()) bump(id);

  for (const id of st.tombstones) result.delete(id);

  const renamed = {};
  const local = [...startRecs];
  for (const r of local) {
    if (!r._dirty) continue;
    const other = result.get(r.id);
    if (!r._synced && other && other.created_at !== r.created_at) {
      // ID collision with a tasting created on another device: give this one a new ID
      const y = r.id.slice(0, 4);
      const n = (lastIds[y] || 0) + 1;
      lastIds[y] = n;
      const newId = `${y}${String(n).padStart(4, '0')}`;
      renamed[r.id] = newId;
      const p = await Photos.get(r.id);
      if (p) { await Photos.put(newId, p); await Photos.del(r.id); }
      r.id = newId;
    }
    bump(r.id);
    result.set(r.id, clean(r));
  }

  // Build commit entries
  const entries = [];
  const newCsv = toCSV([...result.values()]);
  if (newCsv !== remoteCsv) entries.push({ path: CSV_PATH, mode: '100644', type: 'blob', content: newCsv });
  const newMeta = JSON.stringify({ lastIds }, null, 2) + '\n';
  if (JSON.stringify(lastIds) !== JSON.stringify(remoteMeta.lastIds || {})) entries.push({ path: META_PATH, mode: '100644', type: 'blob', content: newMeta });

  const uploaded = [];
  const keys = await Photos.keys();
  for (const id of keys) {
    const p = await Photos.get(id);
    if (!p || !p.pending || !result.has(id)) continue;
    const b64 = p.dataUrl.split(',')[1];
    const blob = await gh('{repo}/git/blobs', { method: 'POST', body: { content: b64, encoding: 'base64' } });
    entries.push({ path: `photos/${id}.jpg`, mode: '100644', type: 'blob', sha: blob.sha });
    uploaded.push([id, blob.sha]);
  }
  const uploadedIds = new Set(uploaded.map((u) => u[0]));
  for (const id of st.photoDeletes) {
    const path = `photos/${id}.jpg`;
    if (h.files[path] && !uploadedIds.has(id) && !(result.get(id) || {}).photo) entries.push({ path, mode: '100644', type: 'blob', sha: null });
  }

  let finalFiles = h.files;
  if (entries.length) {
    const tree = await gh('{repo}/git/trees', { method: 'POST', body: { base_tree: h.treeSha, tree: entries } });
    const n = getRecords().filter((r) => r._dirty).length;
    const msg = `Sync: ${n} tasting(s) updated${st.tombstones.length ? `, ${st.tombstones.length} deleted` : ''}`;
    const commit = await gh('{repo}/git/commits', { method: 'POST', body: { message: msg, tree: tree.sha, parents: [h.commitSha] } });
    try {
      await gh(`{repo}/git/refs/heads/${encodeURIComponent(h.branch)}`, { method: 'PATCH', body: { sha: commit.sha, force: false } });
    } catch (e) {
      if ((e.status === 422 || e.status === 409) && attempt < 2) return doSync(attempt + 1); // someone pushed meanwhile
      throw e;
    }
    finalFiles = { ...h.files };
    for (const e of entries) { if (e.sha === null) delete finalFiles[e.path]; }
    for (const [id, sha] of uploaded) finalFiles[`photos/${id}.jpg`] = sha;
  }

  // Apply result locally, keeping edits made while syncing
  const nowRecs = getRecords();
  const out = [];
  const seen = new Set();
  for (const r of nowRecs) {
    const origId = r.id;
    const id = renamed[origId] || origId;
    seen.add(id);
    if (startRev[origId] !== undefined && startRev[origId] !== r._rev) { out.push({ ...r, id }); continue; } // changed during sync
    if (result.has(id)) out.push({ ...result.get(id), _synced: true, _dirty: false, _rev: r._rev });
    else if (startRev[origId] === undefined) out.push(r); // created during sync
    // else: deleted remotely
  }
  for (const [id, r] of result) if (!seen.has(id)) out.push({ ...r, _synced: true, _dirty: false, _rev: 0 });
  saveRecords(out);

  for (const [id, sha] of uploaded) {
    const p = await Photos.get(id);
    if (p) await Photos.put(id, { ...p, pending: false, sha });
  }
  const photoShas = {};
  for (const [path, sha] of Object.entries(finalFiles)) {
    const m = path.match(/^photos\/(\d+)\.jpg$/);
    if (m) photoShas[m[1]] = sha;
  }
  // drop cached photos whose remote version changed
  for (const id of await Photos.keys()) {
    const p = await Photos.get(id);
    if (p && !p.pending && p.sha && photoShas[id] && p.sha !== photoShas[id]) await Photos.del(id);
  }
  const st2 = getState();
  saveState({
    ...st2,
    tombstones: st2.tombstones.filter((t) => !st.tombstones.includes(t)),
    photoDeletes: st2.photoDeletes.filter((t) => !st.photoDeletes.includes(t)),
    lastIds: (() => { const m = { ...lastIds }; for (const [y, n] of Object.entries(st2.lastIds)) m[y] = Math.max(m[y] || 0, n); return m; })(),
    photoShas,
    lastSync: new Date().toISOString(),
    lastError: null,
  });
  return { committed: entries.length > 0, renamed };
}

import {
  SECTIONS, FIELD, DATA_FIELDS, MULTI_KINDS, GRAPES, COUNTRIES, QUALITY, TYPES, MODES,
  optionsFor, isVisible, stepsFor, autoScore, splitList, grapeKey, countryKey,
} from './schema.js';
import {
  LS, getSettings, saveSettings, getRecords, getRecord, upsertRecord, deleteRecord, nextId,
  getState, saveState, pendingCount, Photos, clearAll,
} from './store.js';
import { sync, testConnection, fetchPhoto } from './github.js';
import { toCSV } from './csv.js';

const $ = (s, el = document) => el.querySelector(s);
const view = $('#view');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const arr = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const has = (v) => (Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && String(v).trim() !== '');

// ---------------- UI helpers ----------------
function toast(msg, kind = '') {
  const t = document.createElement('div');
  t.className = 'toast ' + kind;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2600);
}

function modal(html, onMount) {
  const m = document.createElement('div');
  m.className = 'modal';
  m.innerHTML = `<div class="modal-box">${html}</div>`;
  document.body.appendChild(m);
  const close = () => m.remove();
  m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('[data-close]')) close(); });
  onMount && onMount(m, close);
  return close;
}

function confirmTyped({ title, text, word, button }) {
  return new Promise((resolve) => {
    modal(`
      <h3>${esc(title)}</h3>
      <p>${text}</p>
      <input class="input" id="cf" autocomplete="off" autocapitalize="off" placeholder="${esc(word)}" inputmode="${/^\d+$/.test(word) ? 'numeric' : 'text'}">
      <div class="row gap end">
        <button class="btn ghost" data-close>Cancel</button>
        <button class="btn danger" id="cfok" disabled>${esc(button)}</button>
      </div>`, (m, close) => {
      const inp = $('#cf', m), ok = $('#cfok', m);
      inp.focus();
      inp.addEventListener('input', () => { ok.disabled = inp.value.trim() !== word; });
      ok.addEventListener('click', () => { close(); resolve(true); });
      m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('[data-close]')) resolve(false); });
    });
  });
}

function lightbox(src) {
  modal(`<img src="${src}" class="lightbox-img" alt="Label"><div class="row end"><button class="btn ghost" data-close>Close</button></div>`);
}

async function resizeImage(file, max = 1280, q = 0.72) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', q);
  } finally { URL.revokeObjectURL(url); }
}

async function photoSrc(id) {
  const p = await Photos.get(id);
  if (p && p.dataUrl) return p.dataUrl;
  if (!navigator.onLine || !getSettings().token) return null;
  try { return await fetchPhoto(id); } catch { return null; }
}

const wineTitle = (r) => {
  const t = [r.w_producer, r.w_name].filter(Boolean).join(' · ');
  return t ? `${t}${r.w_vintage ? ' ' + r.w_vintage : ''}` : r.mode === 'Blind' ? 'Not revealed yet' : 'Unnamed wine';
};
const typeClass = (t) => (t === 'Red' ? 'red' : t === 'White' ? 'white' : t === 'Rosé' ? 'rose' : '');

// ---------------- Sync status ----------------
let syncing = false;
function renderStatus() {
  const el = $('#sync');
  const st = getState();
  const n = pendingCount();
  let cls = 'ok', txt = 'Synced';
  if (!getSettings().token) { cls = 'warn'; txt = 'Not connected'; }
  else if (syncing) { cls = 'busy'; txt = 'Syncing…'; }
  else if (!navigator.onLine) { cls = 'warn'; txt = n ? `Offline · ${n} pending` : 'Offline'; }
  else if (st.lastError) { cls = 'err'; txt = n ? `Sync error · ${n} pending` : 'Sync error'; }
  else if (n) { cls = 'warn'; txt = `${n} pending`; }
  el.className = 'sync ' + cls;
  el.innerHTML = `<span class="dot"></span>${txt}`;
}

async function runSync({ quiet = true } = {}) {
  if (!getSettings().token || !navigator.onLine || syncing) { renderStatus(); return; }
  syncing = true; renderStatus();
  try {
    const r = await sync();
    if (Object.keys(r.renamed || {}).length) toast('Some IDs were renumbered to avoid duplicates');
    if (!quiet) toast(r.committed ? 'Synced to GitHub' : 'Already up to date', 'good');
  } catch (e) {
    const st = getState(); st.lastError = e.message; saveState(st);
    if (!quiet || e.status !== -1) toast(e.message, 'bad');
  } finally {
    syncing = false; renderStatus();
    const route = location.hash.split('/')[1] || 'home';
    if (['home', 'list', 't', 'summary', 'settings'].includes(route)) render();
  }
}

// ---------------- Router ----------------
const routes = { home: viewHome, new: viewForm, edit: viewForm, list: viewList, t: viewDetail, summary: viewSummary, settings: viewSettings };
function render() {
  const [, route = 'home', arg] = location.hash.split('/');
  document.querySelectorAll('.tabbar a').forEach((a) => a.classList.toggle('on', a.dataset.r === route || (route === 't' && a.dataset.r === 'list') || (route === 'edit' && a.dataset.r === 'new')));
  (routes[route] || viewHome)(arg ? decodeURIComponent(arg) : undefined);
  renderStatus();
}
window.addEventListener('hashchange', () => { window.scrollTo(0, 0); render(); });

// =============================================================
// FORM (new / edit)
// =============================================================
let D = null; // { rec, step, isEdit }
const openGroups = new Set();
let saveT;
const persistDraft = () => { clearTimeout(saveT); saveT = setTimeout(() => LS.set('draft', D), 250); };

function viewForm(id) {
  const isEdit = !!id;
  const saved = LS.get('draft', null);
  if (isEdit) {
    if (saved && saved.isEdit && saved.rec.id === id) D = saved;
    else {
      const r = getRecord(id);
      if (!r) { view.innerHTML = '<p class="empty">Tasting not found.</p>'; return; }
      D = { rec: JSON.parse(JSON.stringify(r)), step: 0, isEdit: true };
    }
  } else if (saved && !saved.isEdit) {
    D = saved;
  } else {
    D = { rec: { date: today() }, step: 0, isEdit: false };
  }
  persistDraft();
  drawForm();
}

function steps() { return stepsFor(D.rec.mode || 'Blind'); }

function drawForm() {
  const st = steps();
  D.step = Math.min(D.step, st.length - 1);
  const sec = st[D.step];
  const r = D.rec;
  const idLabel = D.isEdit ? r.id : `${nextId((r.date || today()).slice(0, 4))} <small>(on save)</small>`;
  const last = D.step === st.length - 1;
  const ready = r.mode && r.type;
  view.innerHTML = `
    <div class="form-head">
      <div class="row between">
        <div><div class="muted small">${D.isEdit ? 'Editing' : 'New tasting'}</div><div class="h-id">#${idLabel}</div></div>
        <div class="row gap">
          ${r.type ? `<span class="badge ${typeClass(r.type)}">${esc(r.type)}</span>` : ''}
          ${r.mode ? `<span class="badge">${esc(r.mode)}</span>` : ''}
        </div>
      </div>
      <nav class="steps">${st.map((s, i) => `<button class="step ${i === D.step ? 'on' : ''} ${i < D.step ? 'done' : ''}" data-step="${i}" ${!ready && i > 0 ? 'disabled' : ''}>${i + 1}. ${esc(s.title)}</button>`).join('')}</nav>
    </div>
    <section class="card" id="sec">${renderSection(sec)}</section>
    ${D.step === 0 && !D.isEdit && (r.mode || r.type || has(r.clarity)) ? '<button class="btn ghost small full" id="discard">Discard this draft</button>' : ''}
    ${D.isEdit ? '<button class="btn ghost small full" id="canceledit">Cancel editing</button>' : ''}
    <div class="footer-bar">
      <button class="btn ghost" id="back" ${D.step === 0 ? 'disabled' : ''}>Back</button>
      ${last ? '<button class="btn primary" id="save">Save tasting</button>' : `<button class="btn primary" id="next" ${!ready ? 'disabled' : ''}>Next</button>`}
      ${!last && D.isEdit ? '<button class="btn" id="save">Save</button>' : ''}
    </div>`;
  if (sec.id === 'wine') loadPhotoPreview();
  const active = $('.step.on', view);
  active && active.scrollIntoView({ block: 'nearest', inline: 'center' });
}

function renderSection(sec) {
  const r = D.rec;
  if (sec.id === 'wine' && r.mode === 'Blind') {
    const a = autoScore(r);
    for (const k of Object.keys(a)) if (!has(r[k])) r[k] = a[k];
  }
  let h = `<h2>${esc(sec.title)}</h2>`;
  if (sec.id === 'wine' && r.mode === 'Blind') h += '<p class="muted small">Reveal what the wine actually was.</p>';
  if (sec.id === 'wine' && r.mode === 'Study') h += '<p class="muted small">You know the wine — record it first, then taste.</p>';
  for (const f of sec.fields) {
    if (!isVisible(f, r, !!sec.blindOnly)) continue;
    h += renderField(f);
  }
  return h;
}

function renderField(f) {
  const r = D.rec;
  const v = r[f.key];
  if (f.kind === 'header') {
    let extra = '';
    if (f.copyFromNose) extra = '<button class="btn ghost small" data-act="copynose">Copy from nose</button>';
    if (f.key === '_h_score') extra = '<button class="btn ghost small" data-act="autoscore">Recalculate</button>';
    return `<div class="sub-h row between"><h3>${esc(f.label)}</h3>${extra}</div>`;
  }
  const label = `<label class="f-label">${esc(f.label)}${f.required ? ' <span class="req">*</span>' : ''}</label>`;
  switch (f.kind) {
    case 'single':
    case 'multi': {
      const opts = optionsFor(f, r);
      if (!opts.length) return `<div class="field">${label}<p class="muted small">Choose the wine type first.</p></div>`;
      const sel = arr(v);
      return `<div class="field">${label}<div class="chips">${opts.map((o) => `<button type="button" class="chip ${sel.includes(o) ? 'on' : ''}" data-k="${f.key}" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div></div>`;
    }
    case 'grouped': {
      const groups = f.groups(r.type);
      const sel = arr(v);
      const summary = sel.length ? `<div class="picked">${sel.map((s) => `<button type="button" class="chip on mini" data-k="${f.key}" data-v="${esc(s)}">${esc(s)} ✕</button>`).join('')}</div>` : '';
      const gs = Object.entries(groups).map(([g, items]) => {
        const n = items.filter((i) => sel.includes(i)).length;
        const gid = `${f.key}:${g}`;
        return `<details class="grp" data-g="${esc(gid)}" ${openGroups.has(gid) ? 'open' : ''}><summary>${esc(g)}${n ? ` <span class="cnt">${n}</span>` : ''}</summary><div class="chips">${items.map((o) => `<button type="button" class="chip ${sel.includes(o) ? 'on' : ''}" data-k="${f.key}" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div></details>`;
      }).join('');
      return `<div class="field">${label}${summary}${gs}</div>`;
    }
    case 'text':
    case 'number':
      return `<div class="field">${label}<input class="input" data-in="${f.key}" type="${f.kind === 'number' ? 'number' : 'text'}" ${f.kind === 'number' ? 'inputmode="numeric"' : ''} ${f.inputmode ? `inputmode="${f.inputmode}"` : ''} ${f.list ? `list="${f.list}"` : ''} placeholder="${esc(f.placeholder || '')}" value="${esc(v || '')}" autocomplete="off"></div>`;
    case 'date':
      return `<div class="field">${label}<input class="input" data-in="${f.key}" type="date" value="${esc(v || '')}"></div>`;
    case 'textarea':
      return `<div class="field">${label}<textarea class="input" data-in="${f.key}" rows="${f.rows || 3}" placeholder="${esc(f.placeholder || '')}">${esc(v || '')}</textarea></div>`;
    case 'photo':
      return `<div class="field">${label}
        <div class="photo-box"><img id="photo-prev" alt="" hidden><div id="photo-empty" class="muted small">No photo</div></div>
        <div class="row gap wrap">
          <label class="btn">📷 Take photo<input type="file" accept="image/*" capture="environment" data-photo hidden></label>
          <label class="btn ghost">🖼 Library<input type="file" accept="image/*" data-photo hidden></label>
          <button type="button" class="btn ghost" data-act="rmphoto" id="rmphoto" hidden>Remove</button>
        </div></div>`;
    default: return '';
  }
}

async function loadPhotoPreview() {
  const img = $('#photo-prev'), empty = $('#photo-empty'), rm = $('#rmphoto');
  if (!img) return;
  let src = D.rec._photoData || null;
  if (!src && D.isEdit && D.rec.photo && !D.rec._photoRemoved) { empty.textContent = 'Loading…'; src = await photoSrc(D.rec.id); }
  if (src) { img.src = src; img.hidden = false; empty.hidden = true; rm.hidden = false; }
  else { img.hidden = true; empty.hidden = false; empty.textContent = D.rec.photo && !D.rec._photoRemoved ? 'Photo not available offline' : 'No photo'; rm.hidden = !(D.rec.photo && !D.rec._photoRemoved); }
}

function rerenderSection() {
  const st = steps();
  $('#sec').innerHTML = renderSection(st[D.step]);
  if (st[D.step].id === 'wine') loadPhotoPreview();
}

view.addEventListener('click', async (e) => {
  if (!D || !$('#sec')) return;
  const chip = e.target.closest('.chip[data-k]');
  if (chip) {
    const f = FIELD[chip.dataset.k], val = chip.dataset.v, r = D.rec;
    if (f.kind === 'single') {
      r[f.key] = r[f.key] === val ? '' : val;
      if (f.key === 'mode' || f.key === 'type') { persistDraft(); drawForm(); return; }
    } else {
      const s = arr(r[f.key]);
      r[f.key] = s.includes(val) ? s.filter((x) => x !== val) : [...s, val];
    }
    persistDraft();
    const y = window.scrollY;
    rerenderSection();
    window.scrollTo(0, y);
    return;
  }
  const stepBtn = e.target.closest('[data-step]');
  if (stepBtn && !stepBtn.disabled) { D.step = +stepBtn.dataset.step; persistDraft(); drawForm(); window.scrollTo(0, 0); return; }
  const act = e.target.closest('[data-act]');
  if (act) {
    const a = act.dataset.act;
    if (a === 'copynose') {
      for (const f of DATA_FIELDS.filter((x) => x.noseKey)) {
        const src = arr(f.noseKey).flatMap((k) => arr(D.rec[k]));
        D.rec[f.key] = [...new Set([...arr(D.rec[f.key]), ...src])];
      }
      toast('Copied nose descriptors to palate');
    } else if (a === 'autoscore') {
      Object.assign(D.rec, { s_grape: '', s_country: '', s_region: '', s_vintage: '' }, autoScore(D.rec));
      toast('Score recalculated');
    } else if (a === 'rmphoto') {
      delete D.rec._photoData;
      if (D.rec.photo) D.rec._photoRemoved = true;
    }
    persistDraft();
    const y = window.scrollY; rerenderSection(); window.scrollTo(0, y);
    return;
  }
  if (e.target.id === 'next') { D.step++; persistDraft(); drawForm(); window.scrollTo(0, 0); return; }
  if (e.target.id === 'back') { D.step = Math.max(0, D.step - 1); persistDraft(); drawForm(); window.scrollTo(0, 0); return; }
  if (e.target.id === 'save') { await saveForm(); return; }
  if (e.target.id === 'discard') {
    if (await confirmTyped({ title: 'Discard draft?', text: 'Type <b>DISCARD</b> to clear this unsaved tasting.', word: 'DISCARD', button: 'Discard' })) {
      LS.del('draft'); D = { rec: { date: today() }, step: 0, isEdit: false }; drawForm();
    }
    return;
  }
  if (e.target.id === 'canceledit') { const id = D.rec.id; LS.del('draft'); location.hash = `#/t/${id}`; }
});

view.addEventListener('toggle', (e) => {
  const d = e.target;
  if (d.matches && d.matches('details.grp')) { d.open ? openGroups.add(d.dataset.g) : openGroups.delete(d.dataset.g); }
}, true);

view.addEventListener('input', (e) => {
  const k = e.target.dataset && e.target.dataset.in;
  if (!k || !D) return;
  D.rec[k] = e.target.value;
  persistDraft();
});

view.addEventListener('change', async (e) => {
  if (!e.target.matches('[data-photo]') || !D) return;
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  try {
    D.rec._photoData = await resizeImage(file);
    delete D.rec._photoRemoved;
    persistDraft();
    loadPhotoPreview();
  } catch { toast('Could not read this image', 'bad'); }
});

async function saveForm() {
  const r = { ...D.rec };
  if (!r.mode || !r.type) { toast('Choose mode and wine type first', 'bad'); D.step = 0; drawForm(); return; }
  if (!r.date) r.date = today();
  // drop selections that are no longer valid (e.g. after changing wine type) and hidden fields
  for (const f of DATA_FIELDS) {
    const sec = SECTIONS.find((s) => s.id === f.section);
    if (!isVisible(f, r, !!sec.blindOnly)) { if (f.kind !== 'photo') delete r[f.key]; continue; }
    if (f.kind === 'single' || MULTI_KINDS.has(f.kind)) {
      const ok = new Set(optionsFor(f, r));
      if (f.kind === 'single') { if (r[f.key] && !ok.has(r[f.key])) delete r[f.key]; }
      else r[f.key] = arr(r[f.key]).filter((x) => ok.has(x));
    }
  }
  if (r.mode === 'Blind') { const a = autoScore(r); for (const k of Object.keys(a)) if (!has(r[k])) r[k] = a[k]; }
  if (!D.isEdit) r.id = nextId(r.date.slice(0, 4));
  if (r._photoData) {
    await Photos.put(r.id, { dataUrl: r._photoData, pending: true });
    r.photo = true;
  } else if (r._photoRemoved) {
    await Photos.del(r.id);
    r.photo = false;
    const st = getState(); if (!st.photoDeletes.includes(r.id)) st.photoDeletes.push(r.id); saveState(st);
  }
  delete r._photoData; delete r._photoRemoved;
  upsertRecord(r);
  LS.del('draft');
  D = null;
  toast(`Saved #${r.id}`, 'good');
  location.hash = `#/t/${r.id}`;
  runSync();
}

// =============================================================
// LIST
// =============================================================
// =============================================================
// HOME
// =============================================================
function viewHome() {
  D = null;
  const all = getRecords().sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.id).localeCompare(String(a.id)));
  const draft = LS.get('draft', null);
  const hasDraft = draft && !draft.isEdit && (draft.rec.mode || draft.rec.type);
  const year = String(new Date().getFullYear());
  const thisYear = all.filter((r) => String(r.id).startsWith(year)).length;
  const gb = all.filter((r) => r.mode === 'Blind' && r.s_grape);
  const grapeAcc = gb.length ? Math.round((gb.filter((r) => r.s_grape === 'Correct').length / gb.length) * 100) + '%' : '—';
  const kpi = (n, l) => `<div class="kpi"><div class="kpi-n">${n}</div><div class="kpi-l">${l}</div></div>`;
  view.innerHTML = `
    <div class="hero"><img src="icon-192.png" alt="" class="hero-icon"><h1>Somm</h1><p class="muted">Deductive Tasting Log</p></div>
    ${!getSettings().token ? '<a class="card warn-banner" href="#/settings">⚠ Not connected to GitHub yet — tap to add your token in Settings</a>' : ''}
    ${hasDraft
      ? `<a class="btn primary big full" href="#/new">✎ Continue tasting<small>${esc([draft.rec.type, draft.rec.mode].filter(Boolean).join(' · '))}</small></a>`
      : '<a class="btn primary big full" href="#/new">＋ New tasting</a>'}
    <div class="kpis">${kpi(all.length, 'Wines')}${kpi(thisYear, year)}${kpi(grapeAcc, 'Blind grape')}</div>
    ${all.length ? `<div class="row between"><h3>Recent</h3><a href="#/list" class="small muted">See all →</a></div>${all.slice(0, 3).map(cardHTML).join('')}` : '<p class="empty">No tastings yet. Tap <b>New tasting</b> to start.</p>'}
    <div class="row gap home-links"><a class="btn full" href="#/list">☰ Tastings</a><a class="btn full" href="#/summary">▥ Summary</a></div>`;
}

const listState = { q: '', type: '', mode: '', year: '' };
function viewList() {
  D = null;
  const all = getRecords().sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.id).localeCompare(String(a.id)));
  const years = [...new Set(all.map((r) => String(r.id).slice(0, 4)))].sort().reverse();
  const q = listState.q.toLowerCase();
  const rs = all.filter((r) =>
    (!listState.type || r.type === listState.type) &&
    (!listState.mode || r.mode === listState.mode) &&
    (!listState.year || String(r.id).startsWith(listState.year)) &&
    (!q || [r.id, r.w_producer, r.w_name, r.w_grapes, r.w_country, r.w_region, r.w_appellation, r.fc_grape, r.general_notes].join(' ').toLowerCase().includes(q)));
  const draft = LS.get('draft', null);
  view.innerHTML = `
    ${draft && !draft.isEdit && (draft.rec.mode || draft.rec.type) ? '<a class="card draft-banner" href="#/new">✎ You have an unsaved tasting — continue</a>' : ''}
    <div class="filters">
      <input class="input" id="q" type="search" placeholder="Search producer, grape, country…" value="${esc(listState.q)}">
      <div class="row gap">
        <select class="input" id="ft"><option value="">All types</option>${TYPES.map((t) => `<option ${listState.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
        <select class="input" id="fm"><option value="">All modes</option>${MODES.map((t) => `<option ${listState.mode === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
        <select class="input" id="fy"><option value="">All years</option>${years.map((t) => `<option ${listState.year === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
      </div>
    </div>
    <p class="muted small">${rs.length} tasting${rs.length === 1 ? '' : 's'}</p>
    <div class="list">${rs.map(cardHTML).join('') || `<p class="empty">${all.length ? 'No tastings match.' : 'No tastings yet. Tap <b>New</b> to start.'}</p>`}</div>`;
  const upd = () => { listState.q = $('#q').value; listState.type = $('#ft').value; listState.mode = $('#fm').value; listState.year = $('#fy').value; };
  $('#q').addEventListener('input', () => { upd(); const pos = $('#q').selectionStart; viewList(); const q2 = $('#q'); q2.focus(); q2.setSelectionRange(pos, pos); });
  ['#ft', '#fm', '#fy'].forEach((s) => $(s).addEventListener('change', () => { upd(); viewList(); }));
}

function scoreIcons(r) {
  if (r.mode !== 'Blind') return '';
  const i = (k, l) => (r[k] ? `<span class="sc ${r[k] === 'Correct' ? 'y' : 'n'}">${l}</span>` : '');
  return `<div class="scores">${i('s_grape', 'Grape')}${i('s_country', 'Country')}${i('s_region', 'Region')}${has(r.s_vintage) ? `<span class="sc ${+r.s_vintage === 0 ? 'y' : +r.s_vintage <= 2 ? 'm' : 'n'}">±${esc(r.s_vintage)}y</span>` : ''}</div>`;
}

function cardHTML(r) {
  const sub = [r.w_grapes, [r.w_region, r.w_country].filter(Boolean).join(', ')].filter(Boolean).join(' — ');
  return `<a class="card item" href="#/t/${esc(r.id)}">
    <div class="row between"><span class="muted small">#${esc(r.id)} · ${esc(r.date || '')}</span>
      <span class="row gap"><span class="badge ${typeClass(r.type)}">${esc(r.type || '?')}</span><span class="badge">${esc(r.mode || '')}</span>${r._dirty ? '<span class="badge pend" title="Not synced yet">●</span>' : ''}</span></div>
    <div class="item-title">${esc(wineTitle(r))}</div>
    ${sub ? `<div class="muted small">${esc(sub)}</div>` : ''}
    ${r.mode === 'Blind' && r.fc_grape ? `<div class="small">My call: ${esc([r.fc_grape, r.fc_country, r.fc_vintage].filter(Boolean).join(', '))}</div>` : ''}
    ${scoreIcons(r)}
  </a>`;
}

// =============================================================
// DETAIL
// =============================================================
function valHTML(f, v) {
  if (Array.isArray(v)) return `<div class="chips ro">${v.map((x) => `<span class="chip on mini">${esc(x)}</span>`).join('')}</div>`;
  if (f.kind === 'textarea') return `<div class="pre">${esc(v)}</div>`;
  return esc(v);
}

function viewDetail(id) {
  D = null;
  const r = getRecord(id);
  if (!r) { view.innerHTML = '<p class="empty">Tasting not found. It may have been deleted on another device.</p><a class="btn" href="#/list">Back to list</a>'; return; }
  let h = `
    <div class="row between top-actions"><a href="#/list" class="btn ghost small">← Tastings</a>
      <div class="row gap"><a class="btn small" href="#/edit/${esc(r.id)}">Edit</a><button class="btn danger small" id="del">Delete</button></div></div>
    <div class="card">
      <div class="muted small">#${esc(r.id)} · ${esc(r.date || '')}${r._dirty ? ' · <span class="pendtxt">not synced yet</span>' : ''}</div>
      <h2 class="wine-title">${esc(wineTitle(r))}</h2>
      <div class="row gap wrap"><span class="badge ${typeClass(r.type)}">${esc(r.type)}</span><span class="badge">${esc(r.mode)}</span>
      ${r.w_appellation ? `<span class="badge ghost">${esc(r.w_appellation)}</span>` : ''}</div>
      ${r.photo ? '<div class="photo-box detail"><img id="dphoto" alt="Label" hidden><div id="dphoto-msg" class="muted small">Loading photo…</div></div>' : ''}
    </div>`;
  if (r.mode === 'Blind') {
    const rows = [
      ['Grape', r.fc_grape, r.w_grapes, r.s_grape],
      ['Country', r.fc_country, r.w_country, r.s_country],
      ['Region', r.fc_region, [r.w_region, r.w_appellation].filter(Boolean).join(' / '), r.s_region],
      ['Vintage', r.fc_vintage, r.w_vintage, has(r.s_vintage) ? `±${r.s_vintage}y` : ''],
      ['Quality', r.fc_quality, r.w_appellation, ''],
    ];
    h += `<div class="card"><h3>My call vs actual</h3><table class="cmp"><thead><tr><th></th><th>My call</th><th>Actual</th><th></th></tr></thead><tbody>
      ${rows.map(([l, a, b, s]) => `<tr><th>${l}</th><td>${esc(a || '—')}</td><td>${esc(b || '—')}</td><td>${s === 'Correct' ? '<span class="sc y">✓</span>' : s === 'Wrong' ? '<span class="sc n">✗</span>' : s ? `<span class="sc ${parseInt(s.slice(1)) === 0 ? 'y' : parseInt(s.slice(1)) <= 2 ? 'm' : 'n'}">${esc(s)}</span>` : ''}</td></tr>`).join('')}
      </tbody></table></div>`;
  }
  for (const sec of stepsFor(r.mode)) {
    if (sec.id === 'setup') continue;
    const items = sec.fields.filter((f) => f.kind !== 'header' && f.kind !== 'photo' && !f.key.startsWith('s_') && isVisible(f, r, !!sec.blindOnly) && has(r[f.key]));
    if (!items.length) continue;
    h += `<div class="card"><h3>${esc(sec.title)}</h3><dl class="dl">${items.map((f) => `<dt>${esc(f.label)}</dt><dd>${valHTML(f, r[f.key])}</dd>`).join('')}</dl></div>`;
  }
  h += `<p class="muted small center">Created ${esc((r.created_at || '').slice(0, 16).replace('T', ' '))} · Updated ${esc((r.updated_at || '').slice(0, 16).replace('T', ' '))}</p>`;
  view.innerHTML = h;

  if (r.photo) {
    photoSrc(r.id).then((src) => {
      const img = $('#dphoto'), msg = $('#dphoto-msg');
      if (!img) return;
      if (src) { img.src = src; img.hidden = false; msg.hidden = true; img.onclick = () => lightbox(src); }
      else msg.textContent = 'Photo not available (offline or not synced yet)';
    });
  }
  $('#del').addEventListener('click', async () => {
    const ok = await confirmTyped({ title: `Delete #${r.id}?`, text: `This removes the tasting and its label photo. Type the wine ID <b>${esc(r.id)}</b> to confirm.`, word: r.id, button: 'Delete' });
    if (!ok) return;
    await deleteRecord(r.id);
    toast(`Deleted #${r.id}`);
    location.hash = '#/list';
    runSync();
  });
}

// =============================================================
// SUMMARY
// =============================================================
let sumYear = '';
let sumGrape = '';
function bars(entries, total, cls = '') {
  if (!entries.length) return '<p class="muted small">No data yet.</p>';
  const max = Math.max(...entries.map((e) => e[1]));
  return `<div class="bars">${entries.map(([k, n, extra]) => `<div class="bar-row"><div class="bar-l">${esc(k)}</div><div class="bar-t"><div class="bar-f ${cls}" style="width:${(n / max) * 100}%"></div></div><div class="bar-n">${n}${total ? ` <span class="muted">${Math.round((n / total) * 100)}%</span>` : ''}${extra || ''}</div></div>`).join('')}</div>`;
}
const countBy = (rs, fn) => {
  const m = new Map();
  for (const r of rs) for (const k of arr(fn(r))) if (k) m.set(k, (m.get(k) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};
const pct = (a, b) => (b ? Math.round((a / b) * 100) + '%' : '—');
const mostCommon = (vals) => { const c = countBy(vals.map((v) => ({ v })), (x) => x.v); return c.length ? c[0][0] : '—'; };
const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

function viewSummary() {
  D = null;
  const all = getRecords();
  const years = [...new Set(all.map((r) => String(r.id).slice(0, 4)))].sort().reverse();
  const rs = all.filter((r) => !sumYear || String(r.id).startsWith(sumYear));
  const blind = rs.filter((r) => r.mode === 'Blind');
  const tot = rs.length;
  const kpi = (n, l) => `<div class="kpi"><div class="kpi-n">${n}</div><div class="kpi-l">${l}</div></div>`;

  // accuracy
  const acc = (k) => { const s = blind.filter((r) => r[k]); return { n: s.filter((r) => r[k] === 'Correct').length, of: s.length }; };
  const ag = acc('s_grape'), ac = acc('s_country'), ar = acc('s_region');
  const vd = blind.filter((r) => has(r.s_vintage)).map((r) => +r.s_vintage);
  const avgV = vd.length ? (vd.reduce((a, b) => a + b, 0) / vd.length).toFixed(1) : '—';

  // by month
  const byMonth = countBy(rs, (r) => (r.date || '').slice(0, 7)).sort((a, b) => a[0].localeCompare(b[0]));
  // accuracy over time (by month)
  const months = [...new Set(blind.map((r) => (r.date || '').slice(0, 7)))].sort();
  const accRows = months.map((m) => {
    const b = blind.filter((r) => (r.date || '').startsWith(m));
    const f = (k) => { const s = b.filter((r) => r[k]); return pct(s.filter((r) => r[k] === 'Correct').length, s.length); };
    return `<tr><th>${m}</th><td>${b.length}</td><td>${f('s_grape')}</td><td>${f('s_country')}</td><td>${f('s_region')}</td></tr>`;
  }).join('');

  // grapes (actual), normalized
  const grapeName = new Map();
  const gk = (g) => { const k = grapeKey(g); if (!grapeName.has(k)) grapeName.set(k, g); return k; };
  const topGrapes = countBy(rs, (r) => [...new Set(splitList(r.w_grapes).map(gk))]).slice(0, 10).map(([k, n]) => [grapeName.get(k) || titleCase(k), n, k]);
  const topCountries = countBy(rs, (r) => r.w_country && countryKey(r.w_country)).slice(0, 10).map(([k, n]) => [titleCase(k === 'usa' ? 'USA' : k), n]);
  const topRegions = countBy(rs, (r) => r.w_region && r.w_region.trim()).slice(0, 10);

  // per-grape profile
  if (sumGrape && !topGrapes.find((g) => g[2] === sumGrape)) sumGrape = '';
  if (!sumGrape && topGrapes.length) sumGrape = topGrapes[0][2];
  let profile = '<p class="muted small">Reveal or record grapes to build profiles.</p>';
  if (sumGrape) {
    const g = rs.filter((r) => splitList(r.w_grapes).map(grapeKey).includes(sumGrape));
    const descr = countBy(g, (r) => [...new Set([...arr(r.n_fruit), ...arr(r.n_nonfruit), ...arr(r.n_secondary), ...arr(r.n_orgmin), ...arr(r.n_tertiary), ...arr(r.p_fruit), ...arr(r.p_nonfruit), ...arr(r.p_secondary), ...arr(r.p_tertiary)])]).slice(0, 12);
    const struct = ['sweetness', 'tannin', 'acid', 'alcohol', 'length', 'complexity'].map((k) => [FIELD[k].label, mostCommon(g.map((r) => r[k]).filter(Boolean))]);
    const gBlind = g.filter((r) => r.mode === 'Blind' && r.s_grape);
    profile = `
      <p class="muted small">${g.length} tasting${g.length === 1 ? '' : 's'} · blind grape accuracy ${pct(gBlind.filter((r) => r.s_grape === 'Correct').length, gBlind.length)}</p>
      <h4>Typical structure</h4><dl class="dl compact">${struct.map(([l, v]) => `<dt>${esc(l)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
      <h4>Descriptors you use most</h4>${bars(descr, g.length, 'alt')}`;
  }

  // most common misses (blind): actual grape -> what I said
  const misses = countBy(blind.filter((r) => r.s_grape === 'Wrong'), (r) => `${splitList(r.w_grapes).join('/') || '?'} → ${r.fc_grape || '?'}`).slice(0, 6);

  view.innerHTML = `
    <div class="row between"><h2>Summary</h2>
      <select class="input auto" id="sy"><option value="">All years</option>${years.map((y) => `<option ${sumYear === y ? 'selected' : ''}>${y}</option>`).join('')}</select></div>
    <div class="kpis">${kpi(tot, 'Wines')}${kpi(blind.length, 'Blind')}${kpi(tot - blind.length, 'Study')}</div>
    <div class="card"><h3>By type</h3>${bars(TYPES.map((t) => [t, rs.filter((r) => r.type === t).length]).filter((e) => e[1]), tot)}</div>
    <div class="card"><h3>Blind performance</h3>
      ${blind.length ? `<div class="kpis four">${kpi(pct(ag.n, ag.of), `Grape<br><small>${ag.n}/${ag.of}</small>`)}${kpi(pct(ac.n, ac.of), `Country<br><small>${ac.n}/${ac.of}</small>`)}${kpi(pct(ar.n, ar.of), `Region<br><small>${ar.n}/${ar.of}</small>`)}${kpi(avgV, 'Avg vintage<br><small>error (yrs)</small>')}</div>
      ${months.length > 1 ? `<h4>Over time</h4><div class="scroll-x"><table class="cmp"><thead><tr><th>Month</th><th>#</th><th>Grape</th><th>Country</th><th>Region</th></tr></thead><tbody>${accRows}</tbody></table></div>` : ''}
      ${misses.length ? `<h4>Most common grape misses <span class="muted small">(actual → my call)</span></h4>${bars(misses, 0, 'bad')}` : ''}` : '<p class="muted small">No blind tastings yet.</p>'}
    </div>
    <div class="card"><h3>Tastings per month</h3>${bars(byMonth, 0)}</div>
    <div class="card"><h3>Top grapes</h3>${bars(topGrapes.map((g) => [g[0], g[1]]), tot)}</div>
    <div class="card"><h3>Top countries</h3>${bars(topCountries, tot)}</div>
    <div class="card"><h3>Top regions</h3>${bars(topRegions, tot)}</div>
    <div class="card"><div class="row between"><h3>Grape profile</h3>
      ${topGrapes.length ? `<select class="input auto" id="sg">${topGrapes.map((g) => `<option value="${esc(g[2])}" ${g[2] === sumGrape ? 'selected' : ''}>${esc(g[0])}</option>`).join('')}</select>` : ''}</div>
      ${profile}</div>`;
  $('#sy').addEventListener('change', (e) => { sumYear = e.target.value; viewSummary(); });
  const sg = $('#sg'); if (sg) sg.addEventListener('change', (e) => { sumGrape = e.target.value; viewSummary(); });
}

// =============================================================
// SETTINGS
// =============================================================
function viewSettings() {
  D = null;
  const s = getSettings();
  const st = getState();
  view.innerHTML = `
    <h2>Settings</h2>
    <div class="card">
      <h3>GitHub data repository</h3>
      <div class="field"><label class="f-label">Owner</label><input class="input" id="s-owner" value="${esc(s.owner)}" autocapitalize="off"></div>
      <div class="field"><label class="f-label">Repository (private)</label><input class="input" id="s-repo" value="${esc(s.repo)}" autocapitalize="off"></div>
      <div class="field"><label class="f-label">Fine-grained token</label>
        <input class="input" id="s-token" type="password" value="${esc(s.token)}" placeholder="github_pat_…" autocomplete="off" autocapitalize="off" spellcheck="false">
        <p class="muted small">Stored only on this device. Give it access to <b>${esc(s.repo)}</b> only, with <i>Contents: Read and write</i>.</p></div>
      <div class="row gap wrap"><button class="btn primary" id="s-save">Save</button><button class="btn" id="s-test">Test connection</button></div>
      <div id="s-out" class="small"></div>
    </div>
    <div class="card">
      <h3>Sync</h3>
      <p class="small">Last sync: <b>${st.lastSync ? new Date(st.lastSync).toLocaleString() : 'never'}</b><br>Pending changes: <b>${pendingCount()}</b>
      ${st.lastError ? `<br><span class="bad-txt">Last error: ${esc(st.lastError)}</span>` : ''}</p>
      <button class="btn" id="s-sync">Sync now</button>
    </div>
    <div class="card">
      <h3>Data</h3>
      <p class="small muted">${getRecords().length} tastings on this device.</p>
      <div class="row gap wrap"><button class="btn" id="s-export">Download CSV</button><button class="btn danger" id="s-reset">Clear this device</button></div>
      <p class="muted small">"Clear this device" only removes the local copy. Synced data stays on GitHub and comes back on next sync.</p>
    </div>
    <p class="muted small center">Somm · Deductive Tasting Log</p>`;
  const read = () => ({ owner: $('#s-owner').value.trim(), repo: $('#s-repo').value.trim(), token: $('#s-token').value.trim() });
  $('#s-save').addEventListener('click', () => {
    const before = getSettings();
    const n = read();
    if (before.owner !== n.owner || before.repo !== n.repo) { const st2 = getState(); st2.photoShas = {}; saveState(st2); }
    saveSettings(n); toast('Saved', 'good'); runSync({ quiet: false });
  });
  $('#s-test').addEventListener('click', async () => {
    saveSettings(read());
    const out = $('#s-out');
    out.textContent = 'Testing…';
    try {
      const t = await testConnection();
      out.innerHTML = `<p class="good-txt">✓ Connected to <b>${esc(t.name)}</b> (${t.private ? 'private' : '<b>public!</b>'}) · ${t.canWrite ? 'write access OK' : '<b>no write access</b>'}</p>`;
    } catch (e) { out.innerHTML = `<p class="bad-txt">${esc(e.message)}</p>`; }
  });
  $('#s-sync').addEventListener('click', () => runSync({ quiet: false }));
  $('#s-export').addEventListener('click', () => {
    const blob = new Blob([toCSV(getRecords())], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `tastings-${today()}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $('#s-reset').addEventListener('click', async () => {
    const n = pendingCount();
    const ok = await confirmTyped({ title: 'Clear this device?', text: `${n ? `<b>${n} change(s) are not synced and will be lost.</b> ` : ''}Type <b>CLEAR</b> to confirm.`, word: 'CLEAR', button: 'Clear' });
    if (!ok) return;
    await clearAll(); toast('Local data cleared'); render(); runSync();
  });
}

// ---------------- Boot ----------------
function fillDatalists() {
  const dl = (id, items) => `<datalist id="${id}">${items.map((i) => `<option value="${esc(i)}">`).join('')}</datalist>`;
  $('#datalists').innerHTML = dl('dl-grapes', GRAPES) + dl('dl-countries', COUNTRIES) + dl('dl-quality', QUALITY);
}

fillDatalists();
$('#sync').addEventListener('click', () => { location.hash = '#/settings'; });
window.addEventListener('online', () => runSync());
window.addEventListener('offline', renderStatus);
const flushDraft = () => { if (D) { clearTimeout(saveT); LS.set('draft', D); } };
window.addEventListener('pagehide', flushDraft);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushDraft(); });
window.addEventListener('somm-storage-error', () => toast('Could not save on this device (storage full?)', 'bad'));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && !location.hash.startsWith('#/new') && !location.hash.startsWith('#/edit')) runSync(); });
if (!location.hash || location.hash === '#' || location.hash === '#/') location.hash = '#/home';
render();
runSync();

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});

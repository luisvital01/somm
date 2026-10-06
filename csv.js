import { COLUMNS, MULTI_KINDS } from './schema.js';

const SEP = '|'; // separator for multi-choice values inside one cell

function parseRaw(text) {
  text = text.replace(/^﻿/, '');
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else q = false;
      } else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c !== ''));
}

const quote = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

export function toCSV(records) {
  const head = COLUMNS.map((c) => quote(c.col)).join(',');
  const sorted = [...records].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const lines = sorted.map((r) =>
    COLUMNS.map((c) => {
      let v = r[c.key];
      if (c.key === 'photo') v = r.photo ? `photos/${r.id}.jpg` : '';
      else if (MULTI_KINDS.has(c.kind)) v = Array.isArray(v) ? v.join(SEP) : v || '';
      return quote(v);
    }).join(','));
  return '﻿' + [head, ...lines].join('\r\n') + '\r\n';
}

export function fromCSV(text) {
  const rows = parseRaw(text || '');
  if (!rows.length) return [];
  const head = rows[0];
  const byCol = Object.fromEntries(COLUMNS.map((c) => [c.col, c]));
  const map = head.map((h) => byCol[h.trim()] || null);
  return rows.slice(1).map((cells) => {
    const r = {};
    map.forEach((c, i) => {
      if (!c) return;
      const v = cells[i] ?? '';
      if (c.key === 'photo') r.photo = v ? true : false;
      else if (MULTI_KINDS.has(c.kind)) r[c.key] = v ? v.split(SEP).filter(Boolean) : [];
      else r[c.key] = v;
    });
    return r;
  }).filter((r) => r.id);
}

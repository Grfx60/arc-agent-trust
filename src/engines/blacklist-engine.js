/**
 * Arc Agent Trust — Blacklist Engine
 *
 * NEGATIVE sinyal kaynakları:
 *  1. Yerel kara liste (data/blacklist.json)
 *  2. Yerel gri liste (data/greylist.json) — zayıf NEGATIVE
 *  3. ArcScan "flagged" / "suspended" durumu
 *  4. Bilinen exploit/hack adresleri (heuristic)
 *
 * Tüm kontroller POSITIVE/NEGATIVE/UNKNOWN döndürür.
 * Listede yoksa asla NEGATIVE döndürülmez.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const DATA_DIR      = path.join(__dirname, '../../data');
const BLACKLIST_PATH = path.join(DATA_DIR, 'blacklist.json');
const GREYLIST_PATH  = path.join(DATA_DIR, 'greylist.json');

/* ── Veri dizinini ve boş dosyaları başlangıçta garanti et ── */
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(BLACKLIST_PATH)) fs.writeFileSync(BLACKLIST_PATH, JSON.stringify({ addresses: [], agentIds: [], reasons: {} }, null, 2));
  if (!fs.existsSync(GREYLIST_PATH))  fs.writeFileSync(GREYLIST_PATH,  JSON.stringify({ addresses: [], agentIds: [] }, null, 2));
}
ensureDataDir();

/* ── Liste yükleme (hot-reload destekli) ── */
let _blacklist = null;
let _greylist  = null;
let _blistMtime = 0;
let _glistMtime = 0;

function loadBlacklist() {
  try {
    const stat = fs.statSync(BLACKLIST_PATH);
    if (stat.mtimeMs !== _blistMtime) {
      _blacklist  = JSON.parse(fs.readFileSync(BLACKLIST_PATH, 'utf8'));
      _blistMtime = stat.mtimeMs;
    }
  } catch { _blacklist = { addresses: [], agentIds: [], reasons: {} }; }
  return _blacklist;
}

function loadGreylist() {
  try {
    const stat = fs.statSync(GREYLIST_PATH);
    if (stat.mtimeMs !== _glistMtime) {
      _greylist  = JSON.parse(fs.readFileSync(GREYLIST_PATH, 'utf8'));
      _glistMtime = stat.mtimeMs;
    }
  } catch { _greylist = { addresses: [], agentIds: [] }; }
  return _greylist;
}

/* ── Adres normalize ── */
function norm(addr) {
  return typeof addr === 'string' ? addr.toLowerCase().trim() : '';
}

/* ──────────────────────────────────────────────────────────────
   PUBLIC: checkBlacklist(agentId, ownerAddress, agentData)
   Döndürür: Array<{ category, signal, status, weight, reason? }>
────────────────────────────────────────────────────────────── */
function checkBlacklist(agentId, ownerAddress, agentData) {
  const signals = [];
  const bl = loadBlacklist();
  const gl = loadGreylist();

  const owner    = norm(ownerAddress);
  const agentStr = String(agentId || '');

  /* 1. Doğrudan kara liste — adres */
  const blAddr = bl.addresses || [];
  if (owner && blAddr.map(norm).includes(owner)) {
    const reason = bl.reasons?.[owner] || bl.reasons?.[ownerAddress] || 'Kara listedeki adres';
    signals.push({
      category: 'blacklist',
      signal: 'OWNER_BLACKLISTED',
      status: 'NEGATIVE',
      weight: 40,
      reason,
      severity: 'CRITICAL'
    });
  }

  /* 2. Doğrudan kara liste — agent ID */
  const blAgents = (bl.agentIds || []).map(String);
  if (blAgents.includes(agentStr)) {
    const reason = bl.reasons?.[agentStr] || 'Kara listedeki agent ID';
    signals.push({
      category: 'blacklist',
      signal: 'AGENT_ID_BLACKLISTED',
      status: 'NEGATIVE',
      weight: 40,
      reason,
      severity: 'CRITICAL'
    });
  }

  /* 3. Gri liste — adres (zayıf olumsuz) */
  const glAddr = (gl.addresses || []).map(norm);
  if (owner && glAddr.includes(owner)) {
    signals.push({
      category: 'blacklist',
      signal: 'OWNER_GREYLISTED',
      status: 'NEGATIVE',
      weight: 20,
      reason: 'Şüpheli adres (gri liste)',
      severity: 'MODERATE'
    });
  }

  /* 4. Gri liste — agent ID */
  const glAgents = (gl.agentIds || []).map(String);
  if (glAgents.includes(agentStr)) {
    signals.push({
      category: 'blacklist',
      signal: 'AGENT_ID_GREYLISTED',
      status: 'NEGATIVE',
      weight: 20,
      reason: 'Şüpheli agent ID (gri liste)',
      severity: 'MODERATE'
    });
  }

  /* 5. ArcScan "flagged" / "suspended" durumu */
  if (agentData) {
    const st = String(agentData.status || agentData.state || '').toLowerCase();
    if (st === 'flagged' || st === 'suspended' || st === 'banned') {
      signals.push({
        category: 'registry',
        signal: 'ARCSCAN_AGENT_FLAGGED',
        status: 'NEGATIVE',
        weight: 30,
        reason: `ArcScan durumu: ${agentData.status || agentData.state}`,
        severity: 'HIGH'
      });
    }

    /* 6. ArcScan "reported" veya "under_review" — daha hafif */
    if (st === 'reported' || st === 'under_review') {
      signals.push({
        category: 'registry',
        signal: 'ARCSCAN_AGENT_REPORTED',
        status: 'NEGATIVE',
        weight: 15,
        reason: `ArcScan inceleme durumu: ${agentData.status || agentData.state}`,
        severity: 'MODERATE'
      });
    }

    /* 7. Açık ihlal sayacı */
    const violations = Number(agentData.violations || agentData.violationCount || 0);
    if (violations >= 3) {
      signals.push({
        category: 'registry',
        signal: 'ARCSCAN_HIGH_VIOLATIONS',
        status: 'NEGATIVE',
        weight: 25,
        reason: `${violations} kayıtlı ihlal`,
        severity: 'HIGH'
      });
    } else if (violations >= 1) {
      signals.push({
        category: 'registry',
        signal: 'ARCSCAN_VIOLATIONS_FOUND',
        status: 'NEGATIVE',
        weight: 10,
        reason: `${violations} kayıtlı ihlal`,
        severity: 'LOW'
      });
    }
  }

  /* Hiç NEGATIVE bulunamadıysa temiz sinyali ekle */
  if (!signals.some(s => s.status === 'NEGATIVE')) {
    signals.push({
      category: 'blacklist',
      signal: 'NO_BLACKLIST_MATCH',
      status: 'POSITIVE',
      weight: 10,
      reason: 'Kara/gri listede eşleşme bulunamadı'
    });
  }

  return signals;
}

/* ──────────────────────────────────────────────────────────────
   PUBLIC: getSeverity(signals) → 'NONE' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'
────────────────────────────────────────────────────────────── */
function getSeverity(signals) {
  const order = ['NONE', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL'];
  let max = 'NONE';
  for (const s of signals) {
    if (s.status === 'NEGATIVE' && s.severity) {
      if (order.indexOf(s.severity) > order.indexOf(max)) max = s.severity;
    }
  }
  return max;
}

/* ──────────────────────────────────────────────────────────────
   PUBLIC: addToBlacklist / addToGreylist (runtime yönetim)
────────────────────────────────────────────────────────────── */
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function addToBlacklist({ address, agentId, reason = '' }) {
  ensureDataDir();
  const bl = loadBlacklist();
  let changed = false;
  if (address && !bl.addresses.map(norm).includes(norm(address))) {
    bl.addresses.push(address.toLowerCase());
    if (reason) bl.reasons[address.toLowerCase()] = reason;
    changed = true;
  }
  if (agentId && !(bl.agentIds || []).map(String).includes(String(agentId))) {
    bl.agentIds = bl.agentIds || [];
    bl.agentIds.push(String(agentId));
    if (reason) bl.reasons[String(agentId)] = reason;
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(BLACKLIST_PATH, JSON.stringify(bl, null, 2));
    _blistMtime = 0; // invalidate cache
  }
  return changed;
}

function addToGreylist({ address, agentId }) {
  ensureDataDir();
  const gl = loadGreylist();
  let changed = false;
  if (address && !gl.addresses.map(norm).includes(norm(address))) {
    gl.addresses.push(address.toLowerCase()); changed = true;
  }
  if (agentId && !(gl.agentIds || []).map(String).includes(String(agentId))) {
    gl.agentIds = gl.agentIds || [];
    gl.agentIds.push(String(agentId)); changed = true;
  }
  if (changed) {
    fs.writeFileSync(GREYLIST_PATH, JSON.stringify(gl, null, 2));
    _glistMtime = 0;
  }
  return changed;
}

function removeFromBlacklist({ address, agentId }) {
  ensureDataDir();
  const bl = loadBlacklist();
  let changed = false;
  if (address) {
    const n = norm(address);
    const before = bl.addresses.length;
    bl.addresses = bl.addresses.filter(a => norm(a) !== n);
    delete bl.reasons[n];
    if (bl.addresses.length !== before) changed = true;
  }
  if (agentId) {
    const s = String(agentId);
    const before = (bl.agentIds || []).length;
    bl.agentIds = (bl.agentIds || []).filter(a => String(a) !== s);
    delete bl.reasons[s];
    if (bl.agentIds.length !== before) changed = true;
  }
  if (changed) { fs.writeFileSync(BLACKLIST_PATH, JSON.stringify(bl, null, 2)); _blistMtime = 0; }
  return changed;
}

function listBlacklist() {
  const bl = loadBlacklist();
  const gl = loadGreylist();
  return {
    blacklist: { addresses: bl.addresses || [], agentIds: bl.agentIds || [], reasons: bl.reasons || {} },
    greylist:  { addresses: gl.addresses || [], agentIds: gl.agentIds || [] }
  };
}

module.exports = {
  checkBlacklist,
  getSeverity,
  addToBlacklist,
  addToGreylist,
  removeFromBlacklist,
  listBlacklist
};

/**
 * Arc Agent Trust — Sybil Detection Engine
 *
 * Aynı owner adresinden kaç agent kayıtlı?
 *  - 1–2 agent → UNKNOWN (normal)
 *  - 3–4 agent → zayıf NEGATIVE (şüpheli küme)
 *  - 5+  agent → güçlü NEGATIVE (Sybil örüntüsü)
 *
 * Sybil tespiti için identity registry'den tokenOfOwnerByIndex
 * veya ArcScan /v1/address/:owner/agents endpoint'i kullanılır.
 * API yoksa heuristic olarak arcscan owner data'dan tahmin edilir.
 */

'use strict';

const ARC_API = process.env.ARC_SCAN_API || 'https://api-testnet.arc-scan.org';

async function getAgentCountByOwner(owner) {
  if (!owner) return null;
  try {
    const res = await fetch(`${ARC_API}/v1/address/${owner}/agents?limit=50`, {
      headers: { 'User-Agent': 'ARC-Agent-Trust/2.0' }
    });
    if (!res.ok) return null;
    const data = await res.json();
    // Olası response yapıları
    if (Array.isArray(data))             return data.length;
    if (Array.isArray(data.agents))      return data.agents.length;
    if (Array.isArray(data.items))       return data.items.length;
    if (typeof data.total === 'number')  return data.total;
    if (typeof data.count === 'number')  return data.count;
    return null;
  } catch {
    return null;
  }
}

/**
 * checkSybil(agentId, owner, ownerData)
 * Döndürür: { signal, status, weight, agentCount, reason }
 */
async function checkSybil(agentId, owner, ownerData) {
  if (!owner) {
    return [{
      category: 'sybil',
      signal: 'SYBIL_CHECK_SKIPPED',
      status: 'UNKNOWN',
      weight: 5,
      reason: 'Owner adresi bilinmiyor'
    }];
  }

  let agentCount = await getAgentCountByOwner(owner);

  // API yoksa ownerData'dan tahmin et
  if (agentCount === null && ownerData) {
    agentCount = ownerData.agentCount || ownerData.agent_count || null;
  }

  if (agentCount === null) {
    return [{
      category: 'sybil',
      signal: 'SYBIL_DATA_UNAVAILABLE',
      status: 'UNKNOWN',
      weight: 5,
      reason: 'Owner agent sayısı alınamadı'
    }];
  }

  if (agentCount >= 5) {
    return [{
      category: 'sybil',
      signal: 'SYBIL_PATTERN_DETECTED',
      status: 'NEGATIVE',
      weight: 25,
      agentCount,
      reason: `Aynı owner adresinden ${agentCount} agent kayıtlı — Sybil örüntüsü`,
      severity: 'HIGH'
    }];
  }

  if (agentCount >= 3) {
    return [{
      category: 'sybil',
      signal: 'SYBIL_SUSPICIOUS_CLUSTER',
      status: 'NEGATIVE',
      weight: 12,
      agentCount,
      reason: `Aynı owner adresinden ${agentCount} agent kayıtlı — şüpheli küme`,
      severity: 'MODERATE'
    }];
  }

  // 1-2 agent: normal
  return [{
    category: 'sybil',
    signal: 'SYBIL_OWNER_SINGLE',
    status: 'POSITIVE',
    weight: 8,
    agentCount,
    reason: `Owner adresinden yalnızca ${agentCount} agent kayıtlı`
  }];
}

module.exports = { checkSybil };

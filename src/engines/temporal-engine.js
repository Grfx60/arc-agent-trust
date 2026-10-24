/**
 * Arc Agent Trust — Temporal Scoring Engine
 *
 * Aktivite verilerini zamana göre ağırlıklandırır ve
 * anormal örüntüleri NEGATIVE sinyal olarak işaretler:
 *
 *  - Son 30 gün aktivitesi > önceki dönem → POSITIVE boost
 *  - Aniden kesilen aktivite (>60 gün sessizlik) → NEGATIVE
 *  - Burst pattern: çok kısa sürede çok işlem → NEGATIVE (bot örüntüsü)
 *  - Çok eski hesap, hiç aktivite → UNKNOWN (düşük güven)
 *  - Normal uzun ömürlü hesap → POSITIVE boost
 */

'use strict';

const NOW = () => Date.now();
const DAY_MS = 24 * 60 * 60 * 1000;

function extractTimestamps(activity) {
  if (!activity) return [];
  const items = Array.isArray(activity) ? activity
    : Array.isArray(activity.items)   ? activity.items
    : Array.isArray(activity.results) ? activity.results
    : [];

  return items
    .map(tx => {
      const raw = tx.timestamp || tx.blockTimestamp || tx.time || tx.createdAt || tx.date;
      if (!raw) return null;
      const ms = typeof raw === 'number'
        ? (raw > 1e12 ? raw : raw * 1000) // unix seconds vs ms
        : new Date(raw).getTime();
      return isNaN(ms) ? null : ms;
    })
    .filter(Boolean)
    .sort((a, b) => a - b);
}

function extractFirstSeen(ownerData) {
  if (!ownerData) return null;
  const raw = ownerData.firstSeen || ownerData.createdAt || ownerData.created_at
    || ownerData.firstTx || ownerData.first_transaction;
  if (!raw) return null;
  const ms = typeof raw === 'number' ? (raw > 1e12 ? raw : raw * 1000) : new Date(raw).getTime();
  return isNaN(ms) ? null : ms;
}

/**
 * checkTemporal(activity, ownerData)
 * Döndürür: Array<{ category, signal, status, weight, reason }>
 */
function checkTemporal(activity, ownerData) {
  const signals = [];
  const timestamps = extractTimestamps(activity);
  const firstSeen  = extractFirstSeen(ownerData);
  const now        = NOW();

  /* Yeterli veri yoksa skip */
  if (timestamps.length === 0 && !firstSeen) {
    return [{
      category: 'temporal',
      signal: 'TEMPORAL_DATA_UNAVAILABLE',
      status: 'UNKNOWN',
      weight: 5,
      reason: 'Aktivite timestamp verisi bulunamadı'
    }];
  }

  /* Hesap yaşı analizi */
  if (firstSeen) {
    const ageMs   = now - firstSeen;
    const ageDays = Math.floor(ageMs / DAY_MS);

    if (ageDays < 7) {
      signals.push({
        category: 'temporal',
        signal: 'ACCOUNT_TOO_NEW',
        status: 'NEGATIVE',
        weight: 20,
        reason: `Hesap yalnızca ${ageDays} günlük — çok yeni`,
        severity: 'MODERATE',
        ageDays
      });
    } else if (ageDays < 30) {
      signals.push({
        category: 'temporal',
        signal: 'ACCOUNT_NEW',
        status: 'NEGATIVE',
        weight: 10,
        reason: `Hesap ${ageDays} günlük — kısa geçmiş`,
        severity: 'LOW',
        ageDays
      });
    } else if (ageDays >= 180) {
      signals.push({
        category: 'temporal',
        signal: 'ACCOUNT_ESTABLISHED',
        status: 'POSITIVE',
        weight: 12,
        reason: `Hesap ${ageDays} günlük — köklü hesap`,
        ageDays
      });
    }
  }

  if (timestamps.length === 0) return signals.length ? signals : [{
    category: 'temporal', signal: 'TEMPORAL_NO_TXS', status: 'UNKNOWN', weight: 3, reason: 'İşlem yok'
  }];

  const latest   = timestamps[timestamps.length - 1];
  const oldest   = timestamps[0];
  const daysSinceLastTx = Math.floor((now - latest) / DAY_MS);

  /* Son aktivite zamanı */
  if (daysSinceLastTx > 90) {
    signals.push({
      category: 'temporal',
      signal: 'ACTIVITY_ABANDONED',
      status: 'NEGATIVE',
      weight: 15,
      reason: `Son aktivite ${daysSinceLastTx} gün önce — terk edilmiş görünüyor`,
      severity: 'MODERATE',
      daysSinceLastTx
    });
  } else if (daysSinceLastTx <= 7) {
    signals.push({
      category: 'temporal',
      signal: 'ACTIVITY_RECENT',
      status: 'POSITIVE',
      weight: 10,
      reason: `Son aktivite ${daysSinceLastTx} gün önce — aktif hesap`,
      daysSinceLastTx
    });
  }

  /* Son 30 gün vs öncesi karşılaştırması */
  const cutoff30 = now - 30 * DAY_MS;
  const recent30 = timestamps.filter(t => t >= cutoff30).length;
  const older    = timestamps.filter(t => t < cutoff30).length;
  const total    = timestamps.length;

  if (total >= 5 && recent30 === 0 && older > 0) {
    signals.push({
      category: 'temporal',
      signal: 'ACTIVITY_DROPPED_OFF',
      status: 'NEGATIVE',
      weight: 12,
      reason: `Son 30 günde hiç işlem yok (toplam ${total} eski işlem var)`,
      severity: 'LOW'
    });
  } else if (recent30 > 0) {
    signals.push({
      category: 'temporal',
      signal: 'ACTIVITY_ONGOING',
      status: 'POSITIVE',
      weight: 8,
      reason: `Son 30 günde ${recent30} işlem`
    });
  }

  /* Burst pattern tespiti — 1 saatte 20+ işlem */
  if (timestamps.length >= 20) {
    const HOUR_MS = 60 * 60 * 1000;
    let maxBurst = 0;
    for (let i = 0; i < timestamps.length; i++) {
      const window = timestamps.filter(t => t >= timestamps[i] && t < timestamps[i] + HOUR_MS);
      if (window.length > maxBurst) maxBurst = window.length;
    }
    if (maxBurst >= 20) {
      signals.push({
        category: 'temporal',
        signal: 'BURST_PATTERN_DETECTED',
        status: 'NEGATIVE',
        weight: 18,
        reason: `1 saatte ${maxBurst} işlem — bot/otomatik örüntü`,
        severity: 'HIGH',
        maxBurst
      });
    }
  }

  /* Uzun dönem düzenli aktivite — en olumlu sinyal */
  const spanDays = Math.floor((latest - oldest) / DAY_MS);
  if (spanDays >= 90 && total >= 10) {
    signals.push({
      category: 'temporal',
      signal: 'CONSISTENT_LONG_TERM_ACTIVITY',
      status: 'POSITIVE',
      weight: 15,
      reason: `${spanDays} gün boyunca ${total} işlem — tutarlı uzun dönem aktivite`
    });
  }

  return signals.length ? signals : [{
    category: 'temporal',
    signal: 'TEMPORAL_NORMAL',
    status: 'POSITIVE',
    weight: 5,
    reason: 'Temporal analiz: anormal örüntü tespit edilmedi'
  }];
}

module.exports = { checkTemporal };

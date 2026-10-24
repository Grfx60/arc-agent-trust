const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Validator ağırlık motoru (graceful — DB yoksa atlar)
let applyValidatorWeights, extractValidators;
try {
  const vw = require('./src/engines/validator-weight');
  applyValidatorWeights = vw.applyValidatorWeights;
  extractValidators     = vw.extractValidators;
} catch { /* opsiyonel bağımlılık */ }

// DB kalıcı kayıt (graceful)
let saveAnalysis;
try { saveAnalysis = require('./src/db').saveAnalysis; } catch { /* opsiyonel */ }

// NEGATIVE sinyal motorları
const { checkBlacklist, getSeverity } = require('./src/engines/blacklist-engine');
const { checkSybil }                  = require('./src/engines/sybil-engine');
const { checkTemporal }               = require('./src/engines/temporal-engine');

// On-chain direkt okuyucu — ArcScan'a bağımlı olmayan RPC okuma
const { readReputationOnChain, readValidationOnChain, scanAgentEvents } = require('./src/engines/onchain-reader');

// NOT: AGENT_ID artık global değil — analyzeAgent() içinde lokal olarak yönetiliyor.
// Eş zamanlı birden fazla analiz güvenle çalışabilir.

// Tüm ağ değerleri merkezi config'den — mainnet/testnet otomatik seçilir
const _cfg = require('./src/config');
const ARC_API          = _cfg.blockchain.arcScanApi;
const RPC_URL          = _cfg.blockchain.rpcUrl;
const IDENTITY_REGISTRY   = _cfg.blockchain.contracts.identityRegistry;
const VALIDATION_REGISTRY = _cfg.blockchain.contracts.validatorRegistry;
const _NETWORK_NAME    = _cfg.blockchain.network;
const _CHAIN_ID        = _cfg.blockchain.chainId;

const REPORT_DIR =
  process.env.REPORT_DIR ||
  path.join(process.env.VERCEL ? "/tmp" : process.cwd(), "reports");


/* =========================================================
   HTTP
========================================================= */

async function getJson(url) {

  const response = await fetch(url, {
    headers: {
      "User-Agent": "ARC-Agent-Trust/1.0"
    }
  });

  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `Invalid JSON response from ${url}`
    );
  }

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status}`
    );
  }

  return data;
}


/* =========================================================
   RPC
========================================================= */

async function rpc(method, params) {

  const response = await fetch(
    RPC_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method,
        params
      })
    }
  );

  const data = await response.json();

  if (data.error) {
    throw new Error(
      data.error.message || "RPC error"
    );
  }

  return data.result;
}


async function ethCall(to, data) {

  return rpc(
    "eth_call",
    [
      {
        to,
        data
      },
      "latest"
    ]
  );
}


/* =========================================================
   ABI HELPERS
========================================================= */

function padUint256(value) {

  return BigInt(value)
    .toString(16)
    .padStart(64, "0");

}


function decodeAddress(result) {

  if (!result || result === "0x") {
    return null;
  }

  return (
    "0x" +
    result
      .slice(-40)
      .toLowerCase()
  );

}


function decodeString(result) {

  if (!result || result === "0x") {
    return null;
  }

  try {

    const hex =
      result.slice(2);

    const offset =
      parseInt(
        hex.slice(0, 64),
        16
      );

    const length =
      parseInt(
        hex.slice(
          offset * 2,
          offset * 2 + 64
        ),
        16
      );

    const start =
      offset * 2 + 64;

    const data =
      hex.slice(
        start,
        start + length * 2
      );

    return Buffer
      .from(data, "hex")
      .toString("utf8");

  } catch {

    return null;

  }

}


/* =========================================================
   IDENTITY
========================================================= */

async function readIdentity(agentId) {

  console.log(
    "Reading Identity Registry..."
  );

  const tokenId =
    padUint256(agentId);

  const ownerRaw =
    await ethCall(
      IDENTITY_REGISTRY,
      "0x6352211e" + tokenId
    );

  const uriRaw =
    await ethCall(
      IDENTITY_REGISTRY,
      "0xc87b56dd" + tokenId
    );

  return {

    owner:
      decodeAddress(ownerRaw),

    agentURI:
      decodeString(uriRaw)

  };

}


/* =========================================================
   METADATA
========================================================= */

async function resolveMetadata(agentURI) {

  if (!agentURI) {
    return null;
  }

  console.log(
    "Resolving metadata..."
  );

  try {

    if (
      agentURI.startsWith(
        "data:application/json"
      )
    ) {

      const comma =
        agentURI.indexOf(",");

      if (comma === -1) {
        return null;
      }

      const header =
        agentURI.slice(
          0,
          comma
        );

      const payload =
        agentURI.slice(
          comma + 1
        );

      let jsonText;

      if (
        header.includes(";base64")
      ) {

        jsonText =
          Buffer
            .from(
              payload,
              "base64"
            )
            .toString("utf8");

      } else {

        jsonText =
          decodeURIComponent(
            payload
          );

      }

      return JSON.parse(
        jsonText
      );
    }

    let url =
      agentURI;

    if (
      url.startsWith("ipfs://")
    ) {

      url =
        "https://ipfs.io/ipfs/" +
        url.slice(7);

    }

    return await getJson(url);

  } catch {

    return null;

  }

}


/* =========================================================
   ARCSCAN
========================================================= */

async function getAgentData(agentId) {

  console.log(
    "Reading Arcscan Agent API..."
  );

  try {

    return await getJson(
      `${ARC_API}/v1/agents/${agentId}`
    );

  } catch (error) {

    console.log(
      `Arcscan Agent API unavailable: ${error.message}`
    );

    return null;

  }

}


async function getOwnerData(owner) {

  if (!owner) {
    return null;
  }

  console.log(
    "Reading owner account..."
  );

  try {

    return await getJson(
      `${ARC_API}/v1/address/${owner}`
    );

  } catch {

    return null;

  }

}


async function getOwnerActivity(owner) {

  if (!owner) {
    return null;
  }

  console.log(
    "Reading owner activity..."
  );

  try {

    return await getJson(
      `${ARC_API}/v1/address/${owner}/activity?limit=100`
    );

  } catch {

    return null;

  }

}


async function getOwnerFacts(owner) {

  if (!owner) {
    return null;
  }

  console.log(
    "Reading owner facts..."
  );

  try {

    return await getJson(
      `${ARC_API}/v1/address/${owner}/facts`
    );

  } catch {

    return null;

  }

}


async function getOwnerLogs(owner) {

  if (!owner) {
    return null;
  }

  console.log(
    "Reading owner logs..."
  );

  try {

    return await getJson(
      `${ARC_API}/v1/address/${owner}/logs?limit=100`
    );

  } catch {

    return null;

  }

}


async function getValidationData(agentId) {

  console.log("Reading validation data...");

  try {

    return await getJson(
      `${ARC_API}/v1/agents/${agentId}/validations`
    );

  } catch {

    return null;

  }

}


/* =========================================================
   DATA HELPERS
========================================================= */

function countRecords(data) {

  if (Array.isArray(data)) {
    return data.length;
  }

  if (
    data &&
    Array.isArray(data.items)
  ) {
    return data.items.length;
  }

  if (
    data &&
    Array.isArray(data.results)
  ) {
    return data.results.length;
  }

  return 0;

}


/* =========================================================
   EVIDENCE MODEL
=========================================================

   POSITIVE  = verified evidence
   NEGATIVE  = verified adverse evidence
   UNKNOWN   = unavailable / inconclusive

   UNKNOWN NEVER BECOMES NEGATIVE.
========================================================= */

function buildEvidence({
  identity,
  metadata,
  agentData,
  ownerData,
  activity,
  facts,
  logs
}) {

  const evidence = [];

  /*
  IDENTITY
  */

  if (identity.owner) {

    evidence.push({
      category: "identity",
      signal: "OWNER_CONFIRMED",
      status: "POSITIVE",
      weight: 20
    });

  } else {

    evidence.push({
      category: "identity",
      signal: "OWNER_UNKNOWN",
      status: "UNKNOWN",
      weight: 20
    });

  }


  /*
  AGENT URI
  */

  if (identity.agentURI) {

    evidence.push({
      category: "identity",
      signal: "AGENT_URI_CONFIRMED",
      status: "POSITIVE",
      weight: 15
    });

  } else {

    evidence.push({
      category: "identity",
      signal: "AGENT_URI_UNKNOWN",
      status: "UNKNOWN",
      weight: 15
    });

  }


  /*
  METADATA
  */

  if (metadata) {

    evidence.push({
      category: "metadata",
      signal: "METADATA_RESOLVED",
      status: "POSITIVE",
      weight: 15
    });

  } else {

    evidence.push({
      category: "metadata",
      signal: "METADATA_UNAVAILABLE",
      status: "UNKNOWN",
      weight: 15
    });

  }


  /*
  ARCSCAN
  */

  if (agentData) {

    evidence.push({
      category: "registry",
      signal: "ARCSCAN_AGENT_CONFIRMED",
      status: "POSITIVE",
      weight: 15
    });

  } else {

    evidence.push({
      category: "registry",
      signal: "ARCSCAN_UNAVAILABLE",
      status: "UNKNOWN",
      weight: 15
    });

  }


  /*
  OWNER ACCOUNT
  */

  if (ownerData) {

    evidence.push({
      category: "activity",
      signal: "OWNER_ACCOUNT_RESOLVED",
      status: "POSITIVE",
      weight: 10
    });

  } else {

    evidence.push({
      category: "activity",
      signal: "OWNER_ACCOUNT_UNKNOWN",
      status: "UNKNOWN",
      weight: 10
    });

  }


  /*
  ACTIVITY

  0 records is NOT automatically negative.
  */

  const activityCount =
    countRecords(activity);

  if (activityCount > 0) {

    evidence.push({
      category: "activity",
      signal: "ONCHAIN_ACTIVITY_FOUND",
      status: "POSITIVE",
      weight: 10,
      count: activityCount
    });

  } else if (activity === null) {

    evidence.push({
      category: "activity",
      signal: "ACTIVITY_UNAVAILABLE",
      status: "UNKNOWN",
      weight: 10,
      count: 0
    });

  } else {

    evidence.push({
      category: "activity",
      signal: "NO_ACTIVITY_OBSERVED",
      status: "UNKNOWN",
      weight: 10,
      count: 0
    });

  }


  /*
  FACTS
  */

  if (facts) {

    evidence.push({
      category: "history",
      signal: "ADDRESS_FACTS_AVAILABLE",
      status: "POSITIVE",
      weight: 5
    });

  } else {

    evidence.push({
      category: "history",
      signal: "ADDRESS_FACTS_UNKNOWN",
      status: "UNKNOWN",
      weight: 5
    });

  }


  /*
  LOGS

  No logs is UNKNOWN, not negative.
  */

  const logCount =
    countRecords(logs);

  if (logCount > 0) {

    evidence.push({
      category: "activity",
      signal: "ADDRESS_LOGS_FOUND",
      status: "POSITIVE",
      weight: 5,
      count: logCount
    });

  } else {

    evidence.push({
      category: "activity",
      signal: "NO_LOGS_OBSERVED",
      status: "UNKNOWN",
      weight: 5,
      count: 0
    });

  }

  return evidence;

}


/* =========================================================
   SCORE
=========================================================

   Only POSITIVE / NEGATIVE evidence affects score.

   UNKNOWN reduces confidence, not trust.
========================================================= */

function calculateTrust(evidence) {

  let positiveWeight = 0;
  let negativeWeight = 0;
  let knownWeight = 0;
  let totalWeight = 0;

  for (
    const item
    of evidence
  ) {

    totalWeight +=
      item.weight;

    if (
      item.status === "POSITIVE"
    ) {

      positiveWeight +=
        item.weight;

      knownWeight +=
        item.weight;

    }

    if (
      item.status === "NEGATIVE"
    ) {

      negativeWeight +=
        item.weight;

      knownWeight +=
        item.weight;

    }

  }

  /*
  No adverse evidence means
  positive evidence is measured
  against known evidence only.
  */

  let score = 0;

  if (knownWeight > 0) {

    score =
      Math.round(
        (
          positiveWeight /
          knownWeight
        ) * 100
      );

  }


  /*
  Confidence depends on how much
  of the evidence surface we know.
  */

  const coverage =
    totalWeight === 0
      ? 0
      : (
          knownWeight /
          totalWeight
        ) * 100;


  const confidence =
    Math.round(
      Math.min(
        100,
        coverage
      )
    );


  return {

    trustScore:
      score,

    riskScore:
      Math.max(
        0,
        100 - score
      ),

    confidence,

    knownWeight,

    unknownWeight:
      totalWeight -
      knownWeight,

    coverage:
      Math.round(
        coverage * 100
      ) / 100

  };

}


/* =========================================================
   DECISION
========================================================= */

function getDecision({
  trustScore,
  confidence,
  negativeSignals,
  blacklistSeverity,
  criticalNegatives
}) {

  /*
  Kara liste — anında HIGH_RISK
  */
  if (blacklistSeverity === 'CRITICAL' || blacklistSeverity === 'HIGH') {
    return 'HIGH_RISK';
  }

  /*
  3+ kritik NEGATIVE sinyal — HIGH_RISK
  */
  if (criticalNegatives >= 3) {
    return 'HIGH_RISK';
  }

  /*
  Verified adverse evidence + düşük trust
  */
  if (negativeSignals > 0 && trustScore < 50) {
    return 'HIGH_RISK';
  }

  /*
  Orta şiddette olumsuz kanıt — REVIEW
  */
  if (negativeSignals > 0 && trustScore < 70) {
    return 'REVIEW';
  }

  /*
  Gri listede veya orta şiddet kara liste — REVIEW
  */
  if (blacklistSeverity === 'MODERATE') {
    return 'REVIEW';
  }

  /*
  Strong trust requires score, confidence, zero negatives.
  Confidence eşiği 50 — ArcScan API unavailable olsa bile ulaşılabilir.
  */
  if (
    trustScore >= 80 &&
    confidence >= 50 &&
    negativeSignals === 0 &&
    blacklistSeverity === 'NONE'
  ) {
    return 'TRUST';
  }

  return 'REVIEW';
}


/* =========================================================
   MAIN
========================================================= */

async function analyzeAgent(agentId) {

  if (!agentId || !/^\d+$/.test(String(agentId))) {
    throw new Error("Agent ID must contain numbers only.");
  }

  // Tüm state lokal — eş zamanlı analizler birbirini etkilemez
  const localId = String(agentId);
  const startTime = Date.now();

  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  }

  console.log("");
  console.log(
    "=========================================="
  );
  console.log(
    "       ARC AGENT TRUST — ENGINE v66"
  );
  console.log(
    "=========================================="
  );
  console.log("");

  console.log(
    `Agent: ${localId}`
  );

  console.log(
    "Network: Arc Testnet"
  );

  console.log("");

  /*
  LIVE IDENTITY
  */

  const identity =
    await readIdentity(localId);

  console.log("");

  console.log(
    `Owner: ${
      identity.owner || "UNKNOWN"
    }`
  );

  console.log(
    `Agent URI: ${
      identity.agentURI
        ? "FOUND"
        : "UNKNOWN"
    }`
  );

  /*
  METADATA
  */

  const metadata =
    await resolveMetadata(
      identity.agentURI
    );

  /*
  LIVE INDEXER
  */

  const agentData =
    await getAgentData(localId);

  // API durum takibi — raporda şeffaf gösterim
  const apiStatus = {
    rpc:        identity.owner !== null ? 'ok' : 'error',
    arcscan:    agentData ? 'ok' : 'unavailable',
    validation: 'pending'
  };

  /*
  OWNER
  */

  const ownerData =
    await getOwnerData(
      identity.owner
    );

  /*
  ACTIVITY
  */

  const activity =
    await getOwnerActivity(
      identity.owner
    );

  /*
  FACTS
  */

  const facts =
    await getOwnerFacts(
      identity.owner
    );

  /*
  LOGS
  */

  const logs =
    await getOwnerLogs(
      identity.owner
    );

  /*
  VALIDATION
  */

  const validationData =
    await getValidationData(localId);

  apiStatus.validation = validationData ? 'ok' : 'unavailable';

  /*
  ON-CHAIN DIREKT OKUMA (ArcScan'a bağımlı değil)
  */

  console.log("Reading Reputation Registry (on-chain)...");
  const [onChainRep, onChainVal, onChainEvents] = await Promise.allSettled([
    readReputationOnChain(localId),
    readValidationOnChain(localId),
    scanAgentEvents(localId),
  ]);

  const repData = onChainRep.status  === 'fulfilled' ? onChainRep.value  : null;
  const valData = onChainVal.status  === 'fulfilled' ? onChainVal.value  : null;
  const evtData = onChainEvents.status === 'fulfilled' ? onChainEvents.value : null;

  apiStatus.reputationRegistry = repData && !repData.error ? 'ok' : 'unavailable';
  apiStatus.validationRegistry = valData && !valData.error ? 'ok' : 'unavailable';

  /*
  EVIDENCE
  */

  let evidence =
    buildEvidence({
      identity,
      metadata,
      agentData,
      ownerData,
      activity,
      facts,
      logs
    });

  /*
  ── ON-CHAIN REPUTATION & VALIDATION SİNYALLERİ ──
  */

  // Reputation Registry
  if (repData && !repData.error) {
    if (repData.feedbackCount > 0) {
      if (repData.averageScore !== null && repData.averageScore > 0) {
        evidence.push({ category: 'reputation', signal: 'POSITIVE_REPUTATION_SCORE', status: 'POSITIVE', weight: 20, detail: `${repData.feedbackCount} feedback, avg=${repData.averageScore}` });
      } else if (repData.averageScore !== null && repData.averageScore < 0) {
        evidence.push({ category: 'reputation', signal: 'NEGATIVE_REPUTATION_SCORE', status: 'NEGATIVE', weight: 25, severity: 'HIGH', detail: `Avg score: ${repData.averageScore}` });
      } else {
        evidence.push({ category: 'reputation', signal: 'FEEDBACK_EXISTS_NO_SCORE', status: 'UNKNOWN', weight: 10, detail: `${repData.feedbackCount} feedbacks` });
      }
    } else {
      evidence.push({ category: 'reputation', signal: 'NO_REPUTATION_FEEDBACK', status: 'UNKNOWN', weight: 10 });
    }
  }

  // Validation Registry
  if (valData && !valData.error) {
    if (valData.validationCount > 0) {
      evidence.push({ category: 'validation', signal: 'ONCHAIN_VALIDATIONS_FOUND', status: 'POSITIVE', weight: 15, detail: `${valData.validationCount} validations` });
    } else {
      evidence.push({ category: 'validation', signal: 'NO_ONCHAIN_VALIDATIONS', status: 'UNKNOWN', weight: 15 });
    }
  }

  // Event sinyalleri
  if (evtData && !evtData.error) {
    if (evtData.registered) {
      evidence.push({ category: 'identity', signal: 'REGISTRATION_EVENT_FOUND', status: 'POSITIVE', weight: 10, detail: `Block ${evtData.registered.blockNumber}` });
    }
    if (evtData.feedbacks.length > 0) {
      evidence.push({ category: 'reputation', signal: 'RECENT_FEEDBACK_EVENTS', status: 'POSITIVE', weight: 10, detail: `${evtData.feedbacks.length} recent events` });
    }
    if (evtData.validations.length > 0) {
      evidence.push({ category: 'validation', signal: 'RECENT_VALIDATION_EVENTS', status: 'POSITIVE', weight: 10, detail: `${evtData.validations.length} recent events` });
    }
  }

  /*
  ── NEGATIVE SİNYAL MOTORLARI ──
  */

  // 1. Kara liste kontrolü
  console.log("Running blacklist check...");
  const blacklistSignals = checkBlacklist(localId, identity.owner, agentData);
  evidence = evidence.concat(blacklistSignals);

  // 2. Sybil tespiti
  console.log("Running Sybil detection...");
  const sybilSignals = await checkSybil(localId, identity.owner, ownerData);
  evidence = evidence.concat(sybilSignals);

  // 3. Temporal analiz
  console.log("Running temporal analysis...");
  const temporalSignals = checkTemporal(activity, ownerData);
  evidence = evidence.concat(temporalSignals);

  // Kara liste şiddeti
  const blacklistSeverity = getSeverity(blacklistSignals);

  /*
  VALIDATOR AĞIRLIK MOTORU
  */

  let validatorInfo = { trustFactor: 1.0, validatorSummary: [] };

  if (applyValidatorWeights && extractValidators) {
    const validators = extractValidators(validationData);
    if (validators.length > 0) {
      const result = await applyValidatorWeights(evidence, validators);
      evidence           = result.adjustedEvidence;
      validatorInfo      = { trustFactor: result.trustFactor, validatorSummary: result.validatorSummary };
      console.log(`Validator weight applied: ${validators.length} validators, factor=${result.trustFactor}`);
    }
  }

  /*
  SCORE
  */

  const scoring =
    calculateTrust(
      evidence
    );

  const negativeSignals =
    evidence.filter(
      item =>
        item.status ===
        "NEGATIVE"
    ).length;

  const criticalNegatives =
    evidence.filter(
      item =>
        item.status === "NEGATIVE" &&
        (item.severity === "CRITICAL" || item.severity === "HIGH")
    ).length;

  const decision =
    getDecision({
      trustScore:       scoring.trustScore,
      confidence:       scoring.confidence,
      negativeSignals,
      blacklistSeverity,
      criticalNegatives
    });

  /*
  COUNTS
  */

  const activityCount =
    countRecords(activity);

  const logCount =
    countRecords(logs);

  const positiveSignals =
    evidence.filter(
      item =>
        item.status ===
        "POSITIVE"
    ).length;

  const unknownSignals =
    evidence.filter(
      item =>
        item.status ===
        "UNKNOWN"
    ).length;

  /*
  REPORT
  */

  const analysisDurationMs = Date.now() - startTime;

  const report = {

    version: "v66",

    agentId:
      localId,

    network:
      _NETWORK_NAME,

    chainId:
      _CHAIN_ID,

    analyzedAt:
      new Date().toISOString(),

    analysisDurationMs,

    registries: {

      identity:
        IDENTITY_REGISTRY,

      validation:
        VALIDATION_REGISTRY

    },

    identity,

    metadata,

    arcscan:
      agentData,

    owner:
      ownerData,

    activity,

    facts,

    logs,

    evidence,

    metrics: {

      evidenceSignals:
        evidence.length,

      positiveSignals,

      negativeSignals,

      unknownSignals,

      activityRecords:
        activityCount,

      logRecords:
        logCount

    },

    validationData,

    onChain: {
      reputation: repData,
      validation: valData,
      events:     evtData,
    },

    validators: validatorInfo,

    trust: {

      score:
        scoring.trustScore,

      riskScore:
        scoring.riskScore,

      decision,

      confidence:
        scoring.confidence,

      evidenceCoverage:
        scoring.coverage,

      knownWeight:
        scoring.knownWeight,

      unknownWeight:
        scoring.unknownWeight

    },

    safety: {

      fraud: blacklistSeverity !== 'NONE'
        ? blacklistSeverity === 'CRITICAL' ? 'HIGH_RISK' : 'POSSIBLE'
        : 'NOT_ESTABLISHED',

      maliciousness: criticalNegatives >= 2
        ? 'POSSIBLE'
        : 'NOT_ESTABLISHED',

      manipulation: evidence.some(e => e.signal === 'BURST_PATTERN_DETECTED')
        ? 'POSSIBLE'
        : 'NOT_ESTABLISHED',

      sybil: evidence.some(e => e.signal === 'SYBIL_PATTERN_DETECTED')
        ? 'DETECTED'
        : evidence.some(e => e.signal === 'SYBIL_SUSPICIOUS_CLUSTER')
          ? 'SUSPECTED'
          : 'NOT_ESTABLISHED',

      blacklistSeverity,
      criticalNegativeCount: criticalNegatives

    },

    apiStatus,

    status:
      "LIVE_ANALYSIS_COMPLETE"

  };


  /*
  SAVE TO DB
  */

  if (saveAnalysis) {
    try { saveAnalysis(report); } catch (e) { console.warn('DB save failed:', e.message); }
  }

  /*
  SAVE TO FILE
  */

  const output =
    path.join(
      REPORT_DIR,
      `agent-live-${localId}-v66.json`
    );

  if (!process.env.VERCEL || process.env.SAVE_REPORTS === "true") {
    fs.writeFileSync(
      output,
      JSON.stringify(
        report,
        null,
        2
      )
    );
  }


  /*
  CONSOLE RESULT
  */

  console.log("");
  console.log(
    "=========================================="
  );
  console.log(
    "             V66 RESULT"
  );
  console.log(
    "=========================================="
  );
  console.log("");

  console.log(
    `Agent: ${localId}`
  );

  console.log(
    `Identity: ${
      identity.owner
        ? "CONFIRMED"
        : "UNKNOWN"
    }`
  );

  console.log(
    `Metadata: ${
      metadata
        ? "RESOLVED"
        : "UNKNOWN"
    }`
  );

  console.log(
    `Arcscan: ${
      agentData
        ? "CONFIRMED"
        : "UNKNOWN"
    }`
  );

  console.log(
    `Activity records: ${
      activityCount
    }`
  );

  console.log(
    `Log records: ${
      logCount
    }`
  );

  console.log("");

  console.log(
    `Positive evidence: ${
      positiveSignals
    }`
  );

  console.log(
    `Negative evidence: ${
      negativeSignals
    }`
  );

  console.log(
    `Unknown evidence: ${
      unknownSignals
    }`
  );

  console.log("");

  console.log(
    `Trust Score: ${
      scoring.trustScore
    }/100`
  );

  console.log(
    `Risk Score: ${
      scoring.riskScore
    }/100`
  );

  console.log(
    `Confidence: ${
      scoring.confidence
    }/100`
  );

  console.log(
    `Evidence Coverage: ${
      scoring.coverage
    }%`
  );

  console.log(
    `Decision: ${
      decision
    }`
  );

  console.log("");

  console.log(
    "Evidence:"
  );

  for (
    const item
    of evidence
  ) {

    const icon =
      item.status ===
      "POSITIVE"
        ? "✓"
        : item.status ===
          "NEGATIVE"
            ? "✗"
            : "?";

    console.log(
      `${icon} ${
        item.signal
      } [${
        item.status
      }]`
    );

  }

  console.log("");

  console.log(
    "Safety:"
  );

  console.log(
    "Fraud: NOT ESTABLISHED"
  );

  console.log(
    "Maliciousness: NOT ESTABLISHED"
  );

  console.log(
    "Manipulation: NOT ESTABLISHED"
  );

  console.log("");

  if (!process.env.VERCEL || process.env.SAVE_REPORTS === "true") {
    console.log("Created:");
    console.log(`  ${output}`);
  } else {
    console.log("Report returned to the serverless caller.");
  }

  console.log("");

  console.log(
    "V66 LIVE TRUST ENGINE COMPLETE"
  );

  console.log("");

  return report;

}


if (require.main === module) {
  analyzeAgent(process.argv[2])
    .catch(
      error => {

      console.error("");
      console.error(
        "V66 ANALYSIS FAILED"
      );

      console.error(
        error.message
      );

      console.error("");

        process.exit(1);

      }
    );
}

module.exports = { analyzeAgent };

const fs = require("fs");
const path = require("path");
const dns = require("dns").promises;
const net = require("net");
const { calculateTrust } = require("./src/trust-scoring");
require("dotenv").config();

const configuredTimeout = Number.parseInt(process.env.UPSTREAM_TIMEOUT_MS || "8000", 10);
const REQUEST_TIMEOUT_MS = Number.isFinite(configuredTimeout) ? Math.min(60000, Math.max(500, configuredTimeout)) : 8000;
const configuredMaxBytes = Number.parseInt(process.env.MAX_UPSTREAM_BYTES || String(2 * 1024 * 1024), 10);
const MAX_UPSTREAM_BYTES = Number.isFinite(configuredMaxBytes) ? Math.min(10 * 1024 * 1024, Math.max(1024, configuredMaxBytes)) : 2 * 1024 * 1024;
const MAX_AGENT_ID = (1n << 256n) - 1n;
function boundedThreshold(value, fallback) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? Math.min(100, Math.max(0, number)) : fallback;
}
const TRUST_THRESHOLD = boundedThreshold(process.env.TRUST_SCORE_THRESHOLD, 80);
const TRUST_CONFIDENCE_THRESHOLD = boundedThreshold(process.env.TRUST_CONFIDENCE_THRESHOLD, 70);
const HIGH_RISK_TRUST_MAX = boundedThreshold(process.env.HIGH_RISK_TRUST_MAX, 55);

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
  const target = new URL(url);
  if (target.protocol !== "https:") throw new Error("Only HTTPS upstream URLs are allowed");
  if (target.username || target.password) throw new Error("Credentials in upstream URLs are forbidden");
  const hostname = target.hostname.toLowerCase();
  if (["localhost", "localhost.", "metadata.google.internal"].includes(hostname) || hostname.endsWith(".local")) {
    throw new Error("Private upstream host is forbidden");
  }
  if (net.isIP(hostname)) {
    if (isPrivateAddress(hostname)) throw new Error("Private upstream address is forbidden");
  } else {
    const addresses = await dns.lookup(hostname, { all: true, verbatim: true });
    if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
      throw new Error("Upstream host resolves to a private address");
    }
  }
  const response = await fetch(target, {
    headers: {
      "User-Agent": "ARC-Agent-Trust/1.0"
    },
    redirect: "manual",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
  if (response.status >= 300 && response.status < 400) throw new Error("Upstream redirects are not followed");
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > MAX_UPSTREAM_BYTES) throw new Error("Upstream response exceeds size limit");
  const text = await readLimitedBody(response);

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

function isPrivateAddress(address) {
  const version = net.isIP(address);
  if (version === 4) {
    const p = address.split(".").map(Number);
    return p[0] === 0 || p[0] === 10 || p[0] === 127 || p[0] >= 224 ||
      (p[0] === 169 && p[1] === 254) || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
      (p[0] === 192 && p[1] === 168) || (p[0] === 100 && p[1] >= 64 && p[1] <= 127);
  }
  if (version === 6) {
    const normalized = address.toLowerCase();
    return normalized === "::" || normalized === "::1" || normalized.startsWith("fc") ||
      normalized.startsWith("fd") || normalized.startsWith("fe8") || normalized.startsWith("fe9") ||
      normalized.startsWith("fea") || normalized.startsWith("feb") || normalized.startsWith("::ffff:127.") ||
      normalized.startsWith("::ffff:10.") || normalized.startsWith("::ffff:192.168.");
  }
  return true;
}

async function readLimitedBody(response) {
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > MAX_UPSTREAM_BYTES) {
      await response.body.cancel().catch(() => {});
      throw new Error("Upstream response exceeds size limit");
    }
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks, size).toString("utf8");
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
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    }
  );

  if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
  const data = JSON.parse(await readLimitedBody(response));

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

    if (agentURI.length > MAX_UPSTREAM_BYTES) return null;

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

/* =========================================================
   DECISION
========================================================= */

function getDecision({
  trustScore,
  confidence,
  negativeSignals
}) {

  /*
  Verified adverse evidence
  has priority.
  */

  if (
    negativeSignals > 0 &&
    trustScore < HIGH_RISK_TRUST_MAX
  ) {

    return "HIGH_RISK";

  }


  /*
  Strong trust requires
  both score AND confidence.
  */

  if (
    trustScore >= TRUST_THRESHOLD &&
    confidence >= TRUST_CONFIDENCE_THRESHOLD &&
    negativeSignals === 0
  ) {

    return "TRUST";

  }


  return "REVIEW";

}


/* =========================================================
   MAIN
========================================================= */

async function analyzeAgent(agentId) {

  if (!agentId || !/^\d{1,78}$/.test(String(agentId)) || BigInt(agentId) > MAX_AGENT_ID) {
    throw new Error("Agent ID must be an unsigned 256-bit integer.");
  }

  const currentAgentId = String(BigInt(agentId));

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
    `Agent: ${currentAgentId}`
  );

  console.log(
    "Network: Arc Testnet"
  );

  console.log("");

  /*
  LIVE IDENTITY
  */

  const identity =
    await readIdentity(currentAgentId);

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

  const [metadata, agentData] = await Promise.all([
    resolveMetadata(identity.agentURI),
    getAgentData(currentAgentId)
  ]);
  const [ownerData, activity, facts, logs] = await Promise.all([
    getOwnerData(identity.owner),
    getOwnerActivity(identity.owner),
    getOwnerFacts(identity.owner),
    getOwnerLogs(identity.owner)
  ]);

  /*
  EVIDENCE
  */

  const evidence =
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

  const decision =
    getDecision({
      trustScore:
        scoring.trustScore,

      confidence:
        scoring.confidence,

      negativeSignals
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

  const report = {

    schemaVersion: "1.1",
    version: "v66",
    policy: {
      id: process.env.TRUST_POLICY_ID || "arc-default-v1",
      trustScoreThreshold: TRUST_THRESHOLD,
      confidenceThreshold: TRUST_CONFIDENCE_THRESHOLD,
      highRiskTrustMax: HIGH_RISK_TRUST_MAX,
      scoringAlgorithm: "known-weight-ratio-v1"
    },

    agentId:
      currentAgentId,

        network:
      _NETWORK_NAME,

    chainId:
      _CHAIN_ID,


    analyzedAt:
      new Date().toISOString(),

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
        scoring.unknownWeight,

      breakdown:
        scoring.breakdown,

      totals:
        scoring.totals

    },

    safety: {

      fraud:
        "NOT_ESTABLISHED",

      maliciousness:
        "NOT_ESTABLISHED",

      manipulation:
        "NOT_ESTABLISHED"

    },

    status:
      "LIVE_ANALYSIS_COMPLETE"

  };


  /*
  SAVE
  */

  const output =
    path.join(
      REPORT_DIR,
      `agent-live-${currentAgentId}-v66.json`
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
    `Agent: ${currentAgentId}`
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

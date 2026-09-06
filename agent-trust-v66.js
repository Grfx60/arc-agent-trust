const fs = require("fs");
const path = require("path");

const AGENT_ID = process.argv[2];

const ARC_API = "https://api-testnet.arc-scan.org";
const RPC_URL = "https://rpc.testnet.arc.network";

const IDENTITY_REGISTRY =
  "0x8004A818BFB912233c491871b3d84c89A494BD9e";

const VALIDATION_REGISTRY =
  "0x8004Cb1BF31DAf7788923b405b754f57acEB4272";

const REPORT_DIR =
  path.join(process.cwd(), "reports");

if (!AGENT_ID || !/^\d+$/.test(AGENT_ID)) {
  console.error("");
  console.error("Usage:");
  console.error("node agent-trust-v66.js <AGENT_ID>");
  console.error("");
  process.exit(1);
}

if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}


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

async function readIdentity() {

  console.log(
    "Reading Identity Registry..."
  );

  const tokenId =
    padUint256(AGENT_ID);

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

async function getAgentData() {

  console.log(
    "Reading Arcscan Agent API..."
  );

  try {

    return await getJson(
      `${ARC_API}/v1/agents/${AGENT_ID}`
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
  negativeSignals
}) {

  /*
  Verified adverse evidence
  has priority.
  */

  if (
    negativeSignals > 0 &&
    trustScore < 55
  ) {

    return "HIGH_RISK";

  }


  /*
  Strong trust requires
  both score AND confidence.
  */

  if (
    trustScore >= 80 &&
    confidence >= 70 &&
    negativeSignals === 0
  ) {

    return "TRUST";

  }


  return "REVIEW";

}


/* =========================================================
   MAIN
========================================================= */

async function main() {

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
    `Agent: ${AGENT_ID}`
  );

  console.log(
    "Network: Arc Testnet"
  );

  console.log("");

  /*
  LIVE IDENTITY
  */

  const identity =
    await readIdentity();

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
    await getAgentData();

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

    version: "v66",

    agentId:
      AGENT_ID,

    network:
      "Arc Testnet",

    chainId:
      5042002,

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
        scoring.unknownWeight

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
      `agent-live-${AGENT_ID}-v66.json`
    );

  fs.writeFileSync(
    output,
    JSON.stringify(
      report,
      null,
      2
    )
  );


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
    `Agent: ${AGENT_ID}`
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

  console.log(
    "Created:"
  );

  console.log(
    `  ${output}`
  );

  console.log("");

  console.log(
    "V66 LIVE TRUST ENGINE COMPLETE"
  );

  console.log("");

}


main()
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
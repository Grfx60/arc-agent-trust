const fs = require("fs");
const https = require("https");
const http = require("http");

const INPUT_FILE = "agent-discovery-v18-1.json";
const OUTPUT_FILE = "agent-metadata-intelligence-v19.json";

const FETCH_TIMEOUT = 10000;
const MAX_RETRIES = 2;
const CONCURRENCY = 5;

const KNOWN_AGENT_ID = 845265;


// ============================================
// HELPERS
// ============================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


function classifyURI(uri) {
  if (!uri || typeof uri !== "string") {
    return "EMPTY";
  }

  const value = uri.trim();

  if (!value) return "EMPTY";

  if (value.startsWith("ipfs://")) {
    return "IPFS";
  }

  if (value.startsWith("https://")) {
    return "HTTPS";
  }

  if (value.startsWith("http://")) {
    return "HTTP";
  }

  if (value.startsWith("data:")) {
    return "DATA";
  }

  if (
    value.includes("localhost") ||
    value.includes("127.0.0.1")
  ) {
    return "LOCALHOST";
  }

  if (
    value.startsWith("deai-") ||
    value.startsWith("arc-agent.")
  ) {
    return "CUSTOM";
  }

  return "OTHER";
}


function normalizeIPFS(uri) {
  if (!uri) return null;

  if (uri.startsWith("ipfs://")) {
    const path = uri.replace(
      "ipfs://",
      ""
    );

    return `https://ipfs.io/ipfs/${path}`;
  }

  return uri;
}


function safeJSONParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}


// ============================================
// HTTP FETCH
// ============================================

function fetchURL(url) {

  return new Promise((resolve) => {

    let parsed;

    try {
      parsed = new URL(url);
    } catch {
      resolve({
        success: false,
        status: null,
        error: "INVALID_URL"
      });
      return;
    }


    const protocol =
      parsed.protocol === "https:"
        ? https
        : http;


    const request =
      protocol.get(
        parsed,
        {
          timeout: FETCH_TIMEOUT,

          headers: {
            "User-Agent":
              "Arc-Agent-Intelligence/1.0",
            "Accept":
              "application/json,text/plain,*/*"
          }
        },

        response => {

          let body = "";

          response.setEncoding("utf8");

          response.on(
            "data",
            chunk => {
              body += chunk;
            }
          );

          response.on(
            "end",
            () => {

              resolve({
                success:
                  response.statusCode >= 200 &&
                  response.statusCode < 300,

                status:
                  response.statusCode,

                contentType:
                  response.headers[
                    "content-type"
                  ] || null,

                body
              });

            }
          );

        }
      );


    request.on(
      "timeout",
      () => {

        request.destroy();

        resolve({
          success: false,
          status: null,
          error: "TIMEOUT"
        });

      }
    );


    request.on(
      "error",
      error => {

        resolve({
          success: false,
          status: null,
          error:
            error.message ||
            "REQUEST_ERROR"
        });

      }
    );

  });

}


// ============================================
// RETRY FETCH
// ============================================

async function fetchWithRetry(url) {

  let lastResult = null;

  for (
    let attempt = 1;
    attempt <= MAX_RETRIES;
    attempt++
  ) {

    const result =
      await fetchURL(url);

    result.attempts = attempt;

    if (result.success) {
      return result;
    }

    lastResult = result;

    if (
      attempt < MAX_RETRIES
    ) {
      await sleep(
        1000 * attempt
      );
    }

  }

  return lastResult;
}


// ============================================
// METADATA ANALYSIS
// ============================================

async function analyzeAgent(agent) {

  const uri =
    agent.tokenURI || null;

  const uriType =
    classifyURI(uri);


  const result = {

    agentId:
      Number(agent.agentId),

    owner:
      agent.owner || null,

    tokenURI:
      uri,

    uriType,

    metadata: {

      fetchAttempted: false,

      accessible: false,

      status: null,

      contentType: null,

      validJSON: false,

      rawSize: 0,

      data: null,

      error: null,

      attempts: 0

    }

  };


  // ==========================================
  // NON-FETCHABLE
  // ==========================================

  if (
    uriType === "EMPTY" ||
    uriType === "CUSTOM" ||
    uriType === "OTHER" ||
    uriType === "DATA"
  ) {

    result.metadata.error =
      "URI_NOT_FETCHED";

    return result;

  }


  let fetchURLValue =
    normalizeIPFS(uri);


  if (!fetchURLValue) {

    result.metadata.error =
      "NO_FETCH_URL";

    return result;

  }


  result.metadata.fetchAttempted =
    true;


  const response =
    await fetchWithRetry(
      fetchURLValue
    );


  result.metadata.attempts =
    response?.attempts || 0;


  if (!response) {

    result.metadata.error =
      "NO_RESPONSE";

    return result;

  }


  result.metadata.status =
    response.status || null;

  result.metadata.contentType =
    response.contentType || null;


  if (
    !response.success
  ) {

    result.metadata.error =
      response.error ||
      `HTTP_${response.status}`;

    return result;

  }


  result.metadata.accessible =
    true;


  const body =
    response.body || "";


  result.metadata.rawSize =
    Buffer.byteLength(
      body,
      "utf8"
    );


  const parsed =
    safeJSONParse(body);


  if (
    parsed === null
  ) {

    result.metadata.validJSON =
      false;

    result.metadata.error =
      "INVALID_JSON";

    return result;

  }


  result.metadata.validJSON =
    true;


  // ==========================================
  // NORMALIZED METADATA
  // ==========================================

  result.metadata.data = {

    name:
      parsed.name ??
      null,

    description:
      parsed.description ??
      null,

    image:
      parsed.image ??
      null,

    capabilities:
      parsed.capabilities ??
      null,

    services:
      parsed.services ??
      null,

    endpoints:
      parsed.endpoints ??
      null,

    protocols:
      parsed.protocols ??
      null,

    version:
      parsed.version ??
      null,

    rawKeys:
      Object.keys(parsed)

  };


  return result;
}


// ============================================
// CONCURRENCY WORKER
// ============================================

async function processWithConcurrency(
  agents
) {

  const results =
    new Array(
      agents.length
    );

  let nextIndex = 0;


  async function worker() {

    while (true) {

      const index =
        nextIndex++;


      if (
        index >=
        agents.length
      ) {
        return;
      }


      const agent =
        agents[index];


      console.log(
        `🔎 [${index + 1}/${agents.length}] Agent ${agent.agentId}`
      );


      try {

        results[index] =
          await analyzeAgent(
            agent
          );

      } catch (error) {

        results[index] = {

          agentId:
            Number(agent.agentId),

          owner:
            agent.owner || null,

          tokenURI:
            agent.tokenURI || null,

          uriType:
            classifyURI(
              agent.tokenURI
            ),

          metadata: {

            fetchAttempted:
              false,

            accessible:
              false,

            status:
              null,

            contentType:
              null,

            validJSON:
              false,

            rawSize:
              0,

            data:
              null,

            error:
              error.message ||
              "ANALYSIS_ERROR",

            attempts:
              0

          }

        };

      }

    }

  }


  const workers =
    [];

  const workerCount =
    Math.min(
      CONCURRENCY,
      agents.length
    );


  for (
    let i = 0;
    i < workerCount;
    i++
  ) {

    workers.push(
      worker()
    );

  }


  await Promise.all(
    workers
  );


  return results;
}


// ============================================
// MAIN
// ============================================

async function main() {

  console.log("");
  console.log(
    "=========================================="
  );
  console.log(
    "      AGENT METADATA INTELLIGENCE v19"
  );
  console.log(
    "=========================================="
  );
  console.log("");


  // ==========================================
  // LOAD V18.1
  // ==========================================

  if (
    !fs.existsSync(
      INPUT_FILE
    )
  ) {

    throw new Error(
      `Input bulunamadı: ${INPUT_FILE}`
    );

  }


  const input =
    JSON.parse(
      fs.readFileSync(
        INPUT_FILE,
        "utf8"
      )
    );


  const agents =
    Array.isArray(
      input.agents
    )
      ? input.agents
      : [];


  const foundAgents =
    agents.filter(
      agent =>
        agent.status === "FOUND"
    );


  console.log(
    "Input:",
    INPUT_FILE
  );

  console.log(
    "Total records:",
    agents.length
  );

  console.log(
    "FOUND agents:",
    foundAgents.length
  );

  console.log(
    "Concurrency:",
    CONCURRENCY
  );

  console.log("");


  // ==========================================
  // URI CLASSIFICATION FIRST
  // ==========================================

  const uriStats = {

    HTTPS: 0,
    HTTP: 0,
    IPFS: 0,
    DATA: 0,
    LOCALHOST: 0,
    CUSTOM: 0,
    OTHER: 0,
    EMPTY: 0

  };


  for (
    const agent
    of foundAgents
  ) {

    const type =
      classifyURI(
        agent.tokenURI
      );

    if (
      uriStats[type] !== undefined
    ) {

      uriStats[type]++;

    }

  }


  console.log(
    "=========================================="
  );

  console.log(
    "          URI CLASSIFICATION"
  );

  console.log(
    "=========================================="
  );

  console.log("");


  for (
    const [
      type,
      count
    ]
    of Object.entries(
      uriStats
    )
  ) {

    console.log(
      `${type.padEnd(12)} ${count}`
    );

  }


  console.log("");


  // ==========================================
  // OWNER ANALYSIS
  // ==========================================

  const ownerMap =
    new Map();


  for (
    const agent
    of foundAgents
  ) {

    const owner =
      (
        agent.owner ||
        ""
      ).toLowerCase();


    if (!owner) {
      continue;
    }


    if (
      !ownerMap.has(owner)
    ) {

      ownerMap.set(
        owner,
        []
      );

    }


    ownerMap
      .get(owner)
      .push(
        Number(
          agent.agentId
        )
      );

  }


  const repeatedOwners =
    Array.from(
      ownerMap.entries()
    )
      .filter(
        (
          [, ids]
        ) =>
          ids.length > 1
      )
      .map(
        (
          [owner, ids]
        ) => ({

          owner,

          agentCount:
            ids.length,

          agentIds:
            ids.sort(
              (a, b) =>
                a - b
            )

        })
      )
      .sort(
        (
          a,
          b
        ) =>
          b.agentCount -
          a.agentCount
      );


  // ==========================================
  // METADATA ANALYSIS
  // ==========================================

  console.log(
    "=========================================="
  );

  console.log(
    "        METADATA COLLECTION"
  );

  console.log(
    "=========================================="
  );

  console.log("");


  const analyzed =
    await processWithConcurrency(
      foundAgents
    );


  // ==========================================
  // URI DUPLICATES
  // ==========================================

  const uriMap =
    new Map();


  for (
    const agent
    of analyzed
  ) {

    if (
      !agent.tokenURI
    ) {
      continue;
    }


    const uri =
      agent.tokenURI;


    if (
      !uriMap.has(uri)
    ) {

      uriMap.set(
        uri,
        []
      );

    }


    uriMap
      .get(uri)
      .push(
        agent.agentId
      );

  }


  const repeatedURIs =
    Array.from(
      uriMap.entries()
    )
      .filter(
        (
          [, ids]
        ) =>
          ids.length > 1
      )
      .map(
        (
          [uri, ids]
        ) => ({

          uri,

          agentCount:
            ids.length,

          agentIds:
            ids.sort(
              (a, b) =>
                a - b
            )

        })
      )
      .sort(
        (
          a,
          b
        ) =>
          b.agentCount -
          a.agentCount
      );


  // ==========================================
  // METADATA STATS
  // ==========================================

  const fetchAttempted =
    analyzed.filter(
      agent =>
        agent.metadata
          .fetchAttempted
    ).length;


  const accessible =
    analyzed.filter(
      agent =>
        agent.metadata
          .accessible
    ).length;


  const validJSON =
    analyzed.filter(
      agent =>
        agent.metadata
          .validJSON
    ).length;


  const inaccessible =
    analyzed.filter(
      agent =>
        agent.metadata
          .fetchAttempted &&
        !agent.metadata
          .accessible
    ).length;


  const invalidJSON =
    analyzed.filter(
      agent =>
        agent.metadata
          .accessible &&
        !agent.metadata
          .validJSON
    ).length;


  const agentsWithCapabilities =
    analyzed.filter(
      agent =>
        agent.metadata
          ?.data
          ?.capabilities !== null &&
        agent.metadata
          ?.data
          ?.capabilities !== undefined
    ).length;


  const agentsWithServices =
    analyzed.filter(
      agent =>
        agent.metadata
          ?.data
          ?.services !== null &&
        agent.metadata
          ?.data
          ?.services !== undefined
    ).length;


  const agentsWithEndpoints =
    analyzed.filter(
      agent =>
        agent.metadata
          ?.data
          ?.endpoints !== null &&
        agent.metadata
          ?.data
          ?.endpoints !== undefined
    ).length;


  // ==========================================
  // SUSPICIOUS / QUALITY SIGNALS
  // ==========================================

  const qualitySignals =
    [];


  for (
    const item
    of repeatedOwners
  ) {

    if (
      item.agentCount >= 10
    ) {

      qualitySignals.push({

        type:
          "HIGH_OWNER_CONCENTRATION",

        severity:
          "MEDIUM",

        owner:
          item.owner,

        agentCount:
          item.agentCount,

        agentIds:
          item.agentIds

      });

    }

  }


  for (
    const item
    of repeatedURIs
  ) {

    if (
      item.agentCount >= 5
    ) {

      qualitySignals.push({

        type:
          "SHARED_URI",

        severity:
          "MEDIUM",

        uri:
          item.uri,

        agentCount:
          item.agentCount,

        agentIds:
          item.agentIds

      });

    }

  }


  for (
    const agent
    of analyzed
  ) {

    if (
      agent.uriType ===
      "LOCALHOST"
    ) {

      qualitySignals.push({

        type:
          "LOCALHOST_URI",

        severity:
          "HIGH",

        agentId:
          agent.agentId,

        uri:
          agent.tokenURI

      });

    }


    if (
      agent.metadata.error ===
      "INVALID_JSON"
    ) {

      qualitySignals.push({

        type:
          "INVALID_METADATA_JSON",

        severity:
          "MEDIUM",

        agentId:
          agent.agentId,

        uri:
          agent.tokenURI

      });

    }

  }


  // ==========================================
  // KNOWN AGENT
  // ==========================================

  const knownAgent =
    analyzed.find(
      agent =>
        Number(
          agent.agentId
        ) ===
        KNOWN_AGENT_ID
    );


  // ==========================================
  // OUTPUT
  // ==========================================

  const output = {

    schemaVersion:
      "1.9",

    engine:
      "AGENT_METADATA_INTELLIGENCE",

    network:
      "Arc Testnet",

    generatedAt:
      new Date().toISOString(),

    source:
      INPUT_FILE,

    summary: {

      totalInputRecords:
        agents.length,

      foundAgents:
        foundAgents.length,

      uniqueOwners:
        ownerMap.size,

      repeatedOwners:
        repeatedOwners.length,

      repeatedURIs:
        repeatedURIs.length,

      fetchAttempted,

      accessible,

      inaccessible,

      validJSON,

      invalidJSON,

      agentsWithCapabilities,

      agentsWithServices,

      agentsWithEndpoints

    },

    uriStatistics:
      uriStats,

    ownerAnalysis: {

      uniqueOwners:
        ownerMap.size,

      repeatedOwners:
        repeatedOwners,

      topOwners:
        repeatedOwners
          .slice(0, 20)

    },

    uriAnalysis: {

      uniqueURIs:
        uriMap.size,

      repeatedURIs,

      topSharedURIs:
        repeatedURIs
          .slice(0, 20)

    },

    metadataStatistics: {

      fetchAttempted,

      accessible,

      inaccessible,

      validJSON,

      invalidJSON,

      accessibilityRate:
        foundAgents.length
          ? Number(
              (
                accessible /
                fetchAttempted
              ) *
              100
            ).toFixed(2)
          : 0,

      jsonValidityRate:
        accessible
          ? Number(
              (
                validJSON /
                accessible
              ) *
              100
            ).toFixed(2)
          : 0

    },

    qualitySignals,

    knownAgent: {

      agentId:
        KNOWN_AGENT_ID,

      found:
        Boolean(
          knownAgent
        ),

      analysis:
        knownAgent ||
        null

    },

    agents:
      analyzed

  };


  // ==========================================
  // WRITE
  // ==========================================

  fs.writeFileSync(

    OUTPUT_FILE,

    JSON.stringify(
      output,
      null,
      2
    ),

    "utf8"

  );


  // ==========================================
  // FINAL REPORT
  // ==========================================

  console.log("");
  console.log(
    "=========================================="
  );

  console.log(
    "          V19 FINAL RESULT"
  );

  console.log(
    "=========================================="
  );

  console.log("");

  console.log(
    "FOUND agents:",
    foundAgents.length
  );

  console.log(
    "Unique owners:",
    ownerMap.size
  );

  console.log(
    "Repeated owners:",
    repeatedOwners.length
  );

  console.log(
    "Unique URIs:",
    uriMap.size
  );

  console.log(
    "Repeated URIs:",
    repeatedURIs.length
  );

  console.log("");

  console.log(
    "Metadata fetch attempted:",
    fetchAttempted
  );

  console.log(
    "Accessible:",
    accessible
  );

  console.log(
    "Inaccessible:",
    inaccessible
  );

  console.log(
    "Valid JSON:",
    validJSON
  );

  console.log(
    "Invalid JSON:",
    invalidJSON
  );

  console.log("");

  console.log(
    "Capabilities:",
    agentsWithCapabilities
  );

  console.log(
    "Services:",
    agentsWithServices
  );

  console.log(
    "Endpoints:",
    agentsWithEndpoints
  );

  console.log("");

  console.log(
    "Quality signals:",
    qualitySignals.length
  );

  console.log("");

  // ==========================================
  // KNOWN AGENT
  // ==========================================

  console.log(
    "=========================================="
  );

  console.log(
    "          KNOWN AGENT 845265"
  );

  console.log(
    "=========================================="
  );

  console.log("");


  if (
    knownAgent
  ) {

    console.log(
      "🟢 Agent 845265 analyzed"
    );

    console.log(
      "Owner:",
      knownAgent.owner
    );

    console.log(
      "URI type:",
      knownAgent.uriType
    );

    console.log(
      "URI:",
      knownAgent.tokenURI
    );

    console.log(
      "Metadata accessible:",
      knownAgent.metadata.accessible
    );

    console.log(
      "Valid JSON:",
      knownAgent.metadata.validJSON
    );

  } else {

    console.log(
      "🔴 Agent 845265 bulunamadı."
    );

  }


  console.log("");

  console.log(
    "📁 Output:"
  );

  console.log(
    OUTPUT_FILE
  );

  console.log("");

  console.log(
    "=========================================="
  );

  console.log(
    "      AGENT METADATA INTELLIGENCE TAMAMLANDI"
  );

  console.log(
    "=========================================="
  );

}


main()
  .catch(
    error => {

      console.error("");
      console.error(
        "❌ V19 kritik hata:"
      );

      console.error(
        error.message ||
        error
      );

      console.error("");

      process.exit(1);

    }
  );
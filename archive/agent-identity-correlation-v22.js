const fs = require("fs");

const V19_FILE = "agent-metadata-intelligence-v19.json";
const V20_FILE = "agent-metadata-quality-v20.json";
const V21_FILE = "agent-shared-cluster-v21.json";

const OUTPUT_FILE = "agent-identity-correlation-v22.json";

const KNOWN_AGENT_ID = 845265;


// ============================================
// HELPERS
// ============================================

function normalize(value) {
  if (!value || typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase();
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function unique(array) {
  return [...new Set(array)];
}

function loadJSON(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`Dosya bulunamadı: ${file}`);
  }

  return JSON.parse(
    fs.readFileSync(file, "utf8")
  );
}


// ============================================
// MAIN
// ============================================

function main() {

  console.log("");
  console.log("==========================================");
  console.log("     AGENT IDENTITY CORRELATION v22");
  console.log("==========================================");
  console.log("");

  // ==========================================
  // LOAD SOURCES
  // ==========================================

  const v19 = loadJSON(V19_FILE);
  const v20 = loadJSON(V20_FILE);
  const v21 = loadJSON(V21_FILE);

  const agents =
    Array.isArray(v19.agents)
      ? v19.agents
      : [];

  console.log("V19 agents:", agents.length);
  console.log(
    "V20 loaded:",
    fs.existsSync(V20_FILE)
  );
  console.log(
    "V21 loaded:",
    fs.existsSync(V21_FILE)
  );

  console.log("");

  // ==========================================
  // BUILD AGENT INDEX
  // ==========================================

  const agentMap = new Map();

  for (const agent of agents) {

    const id =
      num(agent.agentId);

    if (!id) {
      continue;
    }

    agentMap.set(id, agent);
  }


  // ==========================================
  // OWNER → AGENTS
  // ==========================================

  const ownerMap = new Map();

  for (const agent of agents) {

    const owner =
      normalize(agent.owner);

    if (!owner) {
      continue;
    }

    if (!ownerMap.has(owner)) {
      ownerMap.set(owner, []);
    }

    ownerMap
      .get(owner)
      .push(num(agent.agentId));
  }


  // ==========================================
  // URI → AGENTS
  // ==========================================

  const uriMap = new Map();

  for (const agent of agents) {

    const uri =
      normalize(agent.tokenURI);

    if (!uri) {
      continue;
    }

    if (!uriMap.has(uri)) {
      uriMap.set(uri, []);
    }

    uriMap
      .get(uri)
      .push(num(agent.agentId));
  }


  // ==========================================
  // AGENT RELATIONSHIPS
  // ==========================================

  const relationships = [];


  for (const agent of agents) {

    const agentId =
      num(agent.agentId);

    const owner =
      normalize(agent.owner);

    const uri =
      normalize(agent.tokenURI);

    if (!agentId) {
      continue;
    }


    // ----------------------------------------
    // OWNER RELATIONSHIPS
    // ----------------------------------------

    const ownerAgents =
      ownerMap.get(owner) || [];

    const sameOwner =
      ownerAgents.filter(
        id =>
          id !== agentId
      );


    for (const relatedId of sameOwner) {

      relationships.push({

        source:
          agentId,

        target:
          relatedId,

        relation:
          "SHARED_OWNER",

        owner

      });

    }


    // ----------------------------------------
    // URI RELATIONSHIPS
    // ----------------------------------------

    const uriAgents =
      uriMap.get(uri) || [];

    const sameURI =
      uriAgents.filter(
        id =>
          id !== agentId
      );


    for (const relatedId of sameURI) {

      relationships.push({

        source:
          agentId,

        target:
          relatedId,

        relation:
          "SHARED_URI",

        uri

      });

    }

  }


  // ==========================================
  // DEDUPLICATE RELATIONSHIPS
  // ==========================================

  const relationshipMap =
    new Map();

  for (
    const relationship
    of relationships
  ) {

    const a =
      relationship.source;

    const b =
      relationship.target;

    const low =
      Math.min(a, b);

    const high =
      Math.max(a, b);

    const key =
      `${low}|${high}|${relationship.relation}`;

    if (!relationshipMap.has(key)) {

      relationshipMap.set(
        key,
        relationship
      );

    }

  }

  const uniqueRelationships =
    Array.from(
      relationshipMap.values()
    );


  // ==========================================
  // CORRELATION CLUSTERS
  // ==========================================

  const correlationMap =
    new Map();


  for (const agent of agents) {

    const agentId =
      num(agent.agentId);

    const owner =
      normalize(agent.owner);

    const uri =
      normalize(agent.tokenURI);

    if (!agentId) {
      continue;
    }


    const sameOwner =
      (
        ownerMap.get(owner) ||
        []
      );


    const sameURI =
      (
        uriMap.get(uri) ||
        []
      );


    const relatedAgents =
      unique(
        [
          ...sameOwner,
          ...sameURI
        ]
      )
        .filter(
          id =>
            id !== agentId
        );


    correlationMap.set(
      agentId,
      {

        agentId,

        owner,

        uri,

        ownerClusterSize:
          sameOwner.length,

        uriClusterSize:
          sameURI.length,

        relatedAgentCount:
          relatedAgents.length,

        relatedAgentIds:
          relatedAgents.sort(
            (a, b) =>
              a - b
          )

      }
    );

  }


  // ==========================================
  // IDENTITY RISK CLASSIFICATION
  // ==========================================

  const classifications = [];


  for (
    const profile
    of correlationMap.values()
  ) {

    let classification =
      "ISOLATED";


    if (
      profile.ownerClusterSize > 1
    ) {

      classification =
        "SHARED_OWNER";

    }


    if (
      profile.uriClusterSize > 1
    ) {

      classification =
        "SHARED_URI";

    }


    if (
      profile.ownerClusterSize > 1 &&
      profile.uriClusterSize > 1
    ) {

      classification =
        "OWNER_URI_CORRELATED";

    }


    if (
      profile.uriClusterSize >= 10
    ) {

      classification =
        "LARGE_URI_CORRELATED";

    }


    if (
      profile.ownerClusterSize >= 10
    ) {

      classification =
        "HIGH_OWNER_CORRELATION";

    }


    classifications.push({

      agentId:
        profile.agentId,

      classification,

      ownerClusterSize:
        profile.ownerClusterSize,

      uriClusterSize:
        profile.uriClusterSize,

      relatedAgentCount:
        profile.relatedAgentCount

    });

  }


  // ==========================================
  // KNOWN AGENT 845265
  // ==========================================

  const known =
    correlationMap.get(
      KNOWN_AGENT_ID
    );


  let knownAgent = null;


  if (known) {

    const related =
      known.relatedAgentIds
        .map(
          id =>
            agentMap.get(id)
        )
        .filter(Boolean);


    const sameOwner =
      related.filter(
        agent =>
          normalize(agent.owner) ===
          known.owner
      );


    const sameURI =
      related.filter(
        agent =>
          normalize(agent.tokenURI) ===
          known.uri
      );


    const crossOwnerSameURI =
      sameURI.filter(
        agent =>
          normalize(agent.owner) !==
          known.owner
      );


    knownAgent = {

      agentId:
        KNOWN_AGENT_ID,

      owner:
        known.owner,

      uri:
        known.uri,

      ownerClusterSize:
        known.ownerClusterSize,

      uriClusterSize:
        known.uriClusterSize,

      relatedAgentCount:
        known.relatedAgentCount,

      sameOwnerCount:
        sameOwner.length,

      sameURICount:
        sameURI.length,

      crossOwnerSameURICount:
        crossOwnerSameURI.length,

      crossOwnerSameURI:

        crossOwnerSameURI
          .map(
            agent =>
              num(agent.agentId)
          )
          .sort(
            (a, b) =>
              a - b
          ),

      classification:
        "LARGE_URI_CORRELATED"

    };

  }


  // ==========================================
  // URI CLUSTER OWNER STRUCTURE
  // ==========================================

  const uriClusterAnalysis = [];


  for (
    const cluster
    of (
      Array.isArray(
        v21.clusters
      )
        ? v21.clusters
        : []
    )
  ) {

    const uri =
      normalize(cluster.uri);

    if (!uri) {
      continue;
    }


    const clusterAgents =
      cluster.agentIds || [];


    const owners =
      unique(
        clusterAgents
          .map(
            id =>
              normalize(
                agentMap.get(id)
                  ?.owner
              )
          )
          .filter(Boolean)
      );


    uriClusterAnalysis.push({

      clusterIndex:
        cluster.clusterIndex,

      uri,

      agentCount:
        clusterAgents.length,

      ownerCount:
        owners.length,

      owners,

      isKnownAgentCluster:
        clusterAgents.includes(
          KNOWN_AGENT_ID
        ),

      structuralType:

        owners.length === 1
          ? "SINGLE_OWNER"
          : owners.length > 1
            ? "MULTI_OWNER"
            : "UNKNOWN"

    });

  }


  // ==========================================
  // KNOWN CLUSTER
  // ==========================================

  const knownCluster =
    uriClusterAnalysis.find(
      cluster =>
        cluster.isKnownAgentCluster
    ) || null;


  // ==========================================
  // GLOBAL COUNTS
  // ==========================================

  const classificationCounts = {};


  for (
    const item
    of classifications
  ) {

    classificationCounts[
      item.classification
    ] =
      (
        classificationCounts[
          item.classification
        ] ||
        0
      ) + 1;

  }


  // ==========================================
  // RELATIONSHIP TYPE COUNTS
  // ==========================================

  const relationshipCounts = {};


  for (
    const relationship
    of uniqueRelationships
  ) {

    relationshipCounts[
      relationship.relation
    ] =
      (
        relationshipCounts[
          relationship.relation
        ] ||
        0
      ) + 1;

  }


  // ==========================================
  // OUTPUT
  // ==========================================

  const output = {

    schemaVersion:
      "2.2",

    engine:
      "AGENT_IDENTITY_CORRELATION",

    network:
      v19.network ||
      "Arc Testnet",

    generatedAt:
      new Date().toISOString(),

    sources: {

      v19:
        V19_FILE,

      v20:
        V20_FILE,

      v21:
        V21_FILE

    },


    summary: {

      agents:
        agents.length,

      owners:
        ownerMap.size,

      uris:
        uriMap.size,

      relationships:
        uniqueRelationships.length,

      ownerRelationships:
        relationshipCounts
          .SHARED_OWNER ||
        0,

      uriRelationships:
        relationshipCounts
          .SHARED_URI ||
        0

    },


    relationshipCounts,


    classificationCounts,


    knownAgent:
      knownAgent,


    knownAgentCluster:
      knownCluster,


    uriClusterAnalysis,


    classifications,


    relationships:
      uniqueRelationships

  };


  // ==========================================
  // SAVE
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
  // TERMINAL REPORT
  // ==========================================

  console.log("");
  console.log("==========================================");
  console.log("          V22 FINAL RESULT");
  console.log("==========================================");
  console.log("");

  console.log(
    "Agents:",
    agents.length
  );

  console.log(
    "Unique owners:",
    ownerMap.size
  );

  console.log(
    "Unique URIs:",
    uriMap.size
  );

  console.log(
    "Identity relationships:",
    uniqueRelationships.length
  );

  console.log(
    "Shared owner relationships:",
    relationshipCounts.SHARED_OWNER || 0
  );

  console.log(
    "Shared URI relationships:",
    relationshipCounts.SHARED_URI || 0
  );

  console.log("");


  console.log("==========================================");
  console.log("        IDENTITY CLASSIFICATION");
  console.log("==========================================");
  console.log("");

  for (
    const [
      type,
      count
    ]
    of Object.entries(
      classificationCounts
    )
  ) {

    console.log(
      `${type}: ${count}`
    );

  }


  console.log("");

  console.log("==========================================");
  console.log("          KNOWN AGENT 845265");
  console.log("==========================================");
  console.log("");


  if (knownAgent) {

    console.log(
      "🟢 Agent 845265"
    );

    console.log(
      "Owner:",
      knownAgent.owner
    );

    console.log(
      "Owner cluster:",
      knownAgent.ownerClusterSize
    );

    console.log(
      "URI cluster:",
      knownAgent.uriClusterSize
    );

    console.log(
      "Related agents:",
      knownAgent.relatedAgentCount
    );

    console.log(
      "Same owner:",
      knownAgent.sameOwnerCount
    );

    console.log(
      "Same URI:",
      knownAgent.sameURICount
    );

    console.log(
      "Cross-owner same URI:",
      knownAgent.crossOwnerSameURICount
    );

    console.log(
      "Classification:",
      knownAgent.classification
    );

  } else {

    console.log(
      "🔴 Agent 845265 bulunamadı."
    );

  }


  console.log("");

  console.log("==========================================");
  console.log("          KNOWN AGENT CLUSTER");
  console.log("==========================================");
  console.log("");

  if (knownCluster) {

    console.log(
      "Cluster:",
      knownCluster.clusterIndex
    );

    console.log(
      "Agents:",
      knownCluster.agentCount
    );

    console.log(
      "Owners:",
      knownCluster.ownerCount
    );

    console.log(
      "Structure:",
      knownCluster.structuralType
    );

    console.log("");

    console.log(
      "Owners:"
    );

    for (
      const owner
      of knownCluster.owners
    ) {

      console.log(
        `  ${owner}`
      );

    }

  } else {

    console.log(
      "Known agent cluster bulunamadı."
    );

  }


  console.log("");
  console.log(
    "📁 Output:",
    OUTPUT_FILE
  );
  console.log("");

  console.log("==========================================");
  console.log(
    "       IDENTITY CORRELATION TAMAMLANDI"
  );
  console.log("==========================================");
}


// ============================================
// RUN
// ============================================

try {

  main();

} catch (error) {

  console.error("");
  console.error("❌ V22 kritik hata:");
  console.error(
    error.message || error
  );
  console.error("");

  process.exit(1);
}
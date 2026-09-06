const fs = require("fs");

const INPUT_FILE = "agent-metadata-quality-v20.json";
const OUTPUT_FILE = "agent-shared-cluster-v21.json";

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


// ============================================
// MAIN
// ============================================

function main() {

  console.log("");
  console.log("==========================================");
  console.log("       SHARED CLUSTER ANALYZER v21");
  console.log("==========================================");
  console.log("");

  // ==========================================
  // LOAD V20
  // ==========================================

  if (!fs.existsSync(INPUT_FILE)) {
    throw new Error(
      `Input bulunamadı: ${INPUT_FILE}`
    );
  }

  const input = JSON.parse(
    fs.readFileSync(
      INPUT_FILE,
      "utf8"
    )
  );

  console.log("Input:", INPUT_FILE);

  // V20 does not necessarily contain full agent
  // metadata records, so load the V19 source as
  // the detailed evidence dataset.

  const V19_FILE =
    "agent-metadata-intelligence-v19.json";

  if (!fs.existsSync(V19_FILE)) {
    throw new Error(
      `V19 input bulunamadı: ${V19_FILE}`
    );
  }

  const v19 = JSON.parse(
    fs.readFileSync(
      V19_FILE,
      "utf8"
    )
  );

  const agents =
    Array.isArray(v19.agents)
      ? v19.agents
      : [];

  console.log(
    "Detailed agents:",
    agents.length
  );

  console.log("");

  // ==========================================
  // BUILD URI CLUSTERS
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

    uriMap.get(uri).push(agent);
  }

  const sharedClusters =
    Array.from(uriMap.entries())
      .filter(
        ([, list]) =>
          list.length > 1
      )
      .map(
        ([uri, list]) => ({
          uri,
          agents: list
        })
      )
      .sort(
        (a, b) =>
          b.agents.length -
          a.agents.length
      );


  // ==========================================
  // CLUSTER ANALYSIS
  // ==========================================

  const clusterResults = [];

  for (
    let i = 0;
    i < sharedClusters.length;
    i++
  ) {

    const cluster =
      sharedClusters[i];

    const clusterAgents =
      cluster.agents;

    const owners =
      unique(
        clusterAgents
          .map(
            agent =>
              normalize(
                agent.owner
              )
          )
          .filter(Boolean)
      );


    const uriTypes =
      unique(
        clusterAgents
          .map(
            agent =>
              agent.uriType ||
              "UNKNOWN"
          )
      );


    const metadataAccessible =
      clusterAgents.filter(
        agent =>
          agent.metadata?.accessible === true
      ).length;


    const validJSON =
      clusterAgents.filter(
        agent =>
          agent.metadata?.validJSON === true
      ).length;


    const metadataErrors = {};

    for (const agent of clusterAgents) {

      const error =
        agent.metadata?.error ||
        "NONE";

      metadataErrors[error] =
        (
          metadataErrors[error] ||
          0
        ) + 1;
    }


    // Owner distribution
    const ownerMap = new Map();

    for (const agent of clusterAgents) {

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
        .push(
          num(agent.agentId)
        );
    }


    const ownerDistribution =
      Array.from(
        ownerMap.entries()
      )
        .map(
          ([owner, ids]) => ({
            owner,
            agentCount: ids.length,
            agentIds:
              ids.sort(
                (a, b) =>
                  a - b
              )
          })
        )
        .sort(
          (a, b) =>
            b.agentCount -
            a.agentCount
        );


    // Agent ID range
    const agentIds =
      clusterAgents
        .map(
          agent =>
            num(agent.agentId)
        )
        .sort(
          (a, b) =>
            a - b
        );


    const minAgentId =
      agentIds.length
        ? agentIds[0]
        : null;

    const maxAgentId =
      agentIds.length
        ? agentIds[
            agentIds.length - 1
          ]
        : null;


    // ========================================
    // KNOWN AGENT DETECTION
    // ========================================

    const containsKnownAgent =
      clusterAgents.some(
        agent =>
          num(agent.agentId) ===
          KNOWN_AGENT_ID
      );


    // ========================================
    // CLUSTER CLASSIFICATION
    // ========================================

    let classification =
      "SHARED_URI";


    if (
      clusterAgents.length >= 100
    ) {

      classification =
        "VERY_LARGE_SHARED_CLUSTER";

    } else if (
      clusterAgents.length >= 50
    ) {

      classification =
        "LARGE_SHARED_CLUSTER";

    }


    if (
      owners.length === 1 &&
      clusterAgents.length >= 10
    ) {

      classification =
        "SINGLE_OWNER_SHARED_CLUSTER";

    }


    if (
      owners.length > 1 &&
      clusterAgents.length >= 10
    ) {

      classification =
        "MULTI_OWNER_SHARED_CLUSTER";

    }


    if (
      containsKnownAgent
    ) {

      classification =
        "KNOWN_AGENT_CLUSTER";

    }


    clusterResults.push({

      clusterIndex:
        i + 1,

      uri:
        cluster.uri,

      agentCount:
        clusterAgents.length,

      ownerCount:
        owners.length,

      owners,

      uriTypes,

      minAgentId,

      maxAgentId,

      containsKnownAgent,

      classification,

      metadata: {

        accessible:
          metadataAccessible,

        inaccessible:
          clusterAgents.length -
          metadataAccessible,

        validJSON,

        invalidJSON:
          metadataAccessible -
          validJSON,

        errors:
          metadataErrors

      },

      ownerDistribution,

      agentIds

    });

  }


  // ==========================================
  // KNOWN AGENT CLUSTER
  // ==========================================

  const knownCluster =
    clusterResults.find(
      cluster =>
        cluster.containsKnownAgent
    ) || null;


  // ==========================================
  // OWNER SHARING ANALYSIS
  // ==========================================

  const multiOwnerClusters =
    clusterResults.filter(
      cluster =>
        cluster.ownerCount > 1
    );


  const singleOwnerClusters =
    clusterResults.filter(
      cluster =>
        cluster.ownerCount === 1
    );


  // ==========================================
  // METADATA CONSISTENCY
  // ==========================================

  const metadataConsistentClusters =
    clusterResults.filter(
      cluster => {

        const errors =
          Object.keys(
            cluster.metadata.errors
          );

        return errors.length <= 1;

      }
    );


  const metadataMixedClusters =
    clusterResults.filter(
      cluster => {

        const errors =
          Object.keys(
            cluster.metadata.errors
          );

        return errors.length > 1;

      }
    );


  // ==========================================
  // IMPORTANT SHARED CLUSTERS
  // ==========================================

  const largeClusters =
    clusterResults
      .filter(
        cluster =>
          cluster.agentCount >= 10
      );


  // ==========================================
  // CROSS OWNER SIGNALS
  // ==========================================

  const crossOwnerSignals =
    multiOwnerClusters.map(
      cluster => ({

        type:
          "MULTI_OWNER_SHARED_METADATA",

        severity:
          cluster.agentCount >= 50
            ? "HIGH"
            : "MEDIUM",

        clusterIndex:
          cluster.clusterIndex,

        uri:
          cluster.uri,

        agentCount:
          cluster.agentCount,

        ownerCount:
          cluster.ownerCount,

        owners:
          cluster.owners,

        agentIds:
          cluster.agentIds

      })
    );


  // ==========================================
  // KNOWN AGENT PROFILE
  // ==========================================

  let knownAgentProfile = null;

  const knownAgent =
    agents.find(
      agent =>
        num(agent.agentId) ===
        KNOWN_AGENT_ID
    );


  if (knownAgent) {

    const owner =
      normalize(
        knownAgent.owner
      );

    const uri =
      normalize(
        knownAgent.tokenURI
      );

    const ownerClusterAgents =
      agents.filter(
        agent =>
          normalize(
            agent.owner
          ) === owner
      );


    const sameURI =
      agents.filter(
        agent =>
          normalize(
            agent.tokenURI
          ) === uri
      );


    const sameOwnerAndURI =
      agents.filter(
        agent =>
          normalize(
            agent.owner
          ) === owner &&
          normalize(
            agent.tokenURI
          ) === uri
      );


    knownAgentProfile = {

      agentId:
        KNOWN_AGENT_ID,

      owner:
        knownAgent.owner,

      tokenURI:
        knownAgent.tokenURI,

      uriType:
        knownAgent.uriType,

      ownerAgentCount:
        ownerClusterAgents.length,

      sharedURIAgentCount:
        sameURI.length,

      sameOwnerAndURI:
        sameOwnerAndURI.length,

      sharedURIOwners:
        unique(
          sameURI
            .map(
              agent =>
                normalize(
                  agent.owner
                )
            )
            .filter(Boolean)
        ),

      sharedURIAgentIds:
        sameURI
          .map(
            agent =>
              num(agent.agentId)
          )
          .sort(
            (a, b) =>
              a - b
          ),

      metadata:

        knownAgent.metadata ||
        null

    };

  }


  // ==========================================
  // OUTPUT
  // ==========================================

  const output = {

    schemaVersion:
      "2.1",

    engine:
      "SHARED_CLUSTER_ANALYZER",

    network:
      v19.network ||
      "Arc Testnet",

    generatedAt:
      new Date().toISOString(),

    source: {

      v19:
        V19_FILE,

      v20:
        INPUT_FILE

    },


    summary: {

      totalAgents:
        agents.length,

      sharedURIClusters:
        clusterResults.length,

      largeClusters:
        largeClusters.length,

      multiOwnerClusters:
        multiOwnerClusters.length,

      singleOwnerClusters:
        singleOwnerClusters.length,

      metadataConsistentClusters:
        metadataConsistentClusters.length,

      metadataMixedClusters:
        metadataMixedClusters.length,

      crossOwnerSignals:
        crossOwnerSignals.length

    },


    clusters:
      clusterResults,


    largeClusters:
      largeClusters,


    crossOwnerSignals:
      crossOwnerSignals,


    knownAgent:
      knownAgentProfile

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
  console.log(
    "=========================================="
  );

  console.log(
    "          V21 FINAL RESULT"
  );

  console.log(
    "=========================================="
  );

  console.log("");

  console.log(
    "Total agents:",
    agents.length
  );

  console.log(
    "Shared URI clusters:",
    clusterResults.length
  );

  console.log(
    "Large clusters:",
    largeClusters.length
  );

  console.log(
    "Multi-owner clusters:",
    multiOwnerClusters.length
  );

  console.log(
    "Single-owner clusters:",
    singleOwnerClusters.length
  );

  console.log(
    "Mixed metadata clusters:",
    metadataMixedClusters.length
  );

  console.log(
    "Cross-owner signals:",
    crossOwnerSignals.length
  );

  console.log("");


  // ==========================================
  // TOP CLUSTERS
  // ==========================================

  console.log(
    "=========================================="
  );

  console.log(
    "          TOP SHARED CLUSTERS"
  );

  console.log(
    "=========================================="
  );

  console.log("");


  for (
    const cluster
    of clusterResults.slice(
      0,
      10
    )
  ) {

    console.log(
      `Cluster #${cluster.clusterIndex}`
    );

    console.log(
      `Agents: ${cluster.agentCount}`
    );

    console.log(
      `Owners: ${cluster.ownerCount}`
    );

    console.log(
      `Classification: ${cluster.classification}`
    );

    console.log(
      `URI: ${cluster.uri}`
    );

    console.log("");

  }


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


  if (knownAgentProfile) {

    console.log(
      "🟢 Agent 845265 bulundu."
    );

    console.log(
      "Owner:",
      knownAgentProfile.owner
    );

    console.log(
      "Owner agent count:",
      knownAgentProfile.ownerAgentCount
    );

    console.log(
      "Shared URI agent count:",
      knownAgentProfile.sharedURIAgentCount
    );

    console.log(
      "Shared URI owner count:",
      knownAgentProfile.sharedURIOwners.length
    );

    console.log(
      "Same owner + URI:",
      knownAgentProfile.sameOwnerAndURI
    );

    console.log(
      "URI:",
      knownAgentProfile.tokenURI
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
    "       SHARED CLUSTER ANALYZER TAMAMLANDI"
  );

  console.log(
    "=========================================="
  );

}


// ============================================
// RUN
// ============================================

try {

  main();

} catch (error) {

  console.error("");

  console.error(
    "❌ V21 kritik hata:"
  );

  console.error(
    error.message ||
    error
  );

  console.error("");

  process.exit(1);
}
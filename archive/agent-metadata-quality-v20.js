const fs = require("fs");

const INPUT_FILE =
  "agent-metadata-intelligence-v19.json";

const OUTPUT_FILE =
  "agent-metadata-quality-v20.json";

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


function unique(array) {
  return [...new Set(array)];
}


function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}


// ============================================
// MAIN
// ============================================

function main() {

  console.log("");
  console.log(
    "=========================================="
  );
  console.log(
    "     METADATA QUALITY & CLUSTER ENGINE v20"
  );
  console.log(
    "=========================================="
  );
  console.log("");


  // ==========================================
  // LOAD V19
  // ==========================================

  if (!fs.existsSync(INPUT_FILE)) {
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
    Array.isArray(input.agents)
      ? input.agents
      : [];


  console.log(
    "Input:",
    INPUT_FILE
  );

  console.log(
    "Agents:",
    agents.length
  );

  console.log("");


  // ==========================================
  // OWNER CLUSTERS
  // ==========================================

  const ownerMap =
    new Map();


  for (const agent of agents) {

    const owner =
      normalize(agent.owner);

    if (!owner) {
      continue;
    }

    if (!ownerMap.has(owner)) {
      ownerMap.set(
        owner,
        []
      );
    }

    ownerMap
      .get(owner)
      .push(
        safeNumber(agent.agentId)
      );
  }


  const ownerClusters =
    Array.from(
      ownerMap.entries()
    )
      .map(
        ([owner, agentIds]) => ({
          owner,

          agentCount:
            agentIds.length,

          agentIds:
            agentIds.sort(
              (a, b) => a - b
            ),

          concentration:
            agentIds.length >= 50
              ? "HIGH"
              : agentIds.length >= 10
                ? "MEDIUM"
                : agentIds.length > 1
                  ? "LOW"
                  : "UNIQUE"
        })
      )
      .sort(
        (a, b) =>
          b.agentCount -
          a.agentCount
      );


  // ==========================================
  // URI CLUSTERS
  // ==========================================

  const uriMap =
    new Map();


  for (const agent of agents) {

    const uri =
      normalize(agent.tokenURI);

    if (!uri) {
      continue;
    }

    if (!uriMap.has(uri)) {
      uriMap.set(
        uri,
        []
      );
    }

    uriMap
      .get(uri)
      .push(
        safeNumber(agent.agentId)
      );
  }


  const uriClusters =
    Array.from(
      uriMap.entries()
    )
      .map(
        ([uri, agentIds]) => ({
          uri,

          agentCount:
            agentIds.length,

          agentIds:
            agentIds.sort(
              (a, b) => a - b
            ),

          clusterType:
            agentIds.length >= 50
              ? "LARGE_SHARED_URI"
              : agentIds.length > 1
                ? "SHARED_URI"
                : "UNIQUE_URI"
        })
      )
      .sort(
        (a, b) =>
          b.agentCount -
          a.agentCount
      );


  // ==========================================
  // OWNER + URI CLUSTERS
  // ==========================================

  const ownerUriMap =
    new Map();


  for (const agent of agents) {

    const owner =
      normalize(agent.owner);

    const uri =
      normalize(agent.tokenURI);

    if (!owner || !uri) {
      continue;
    }

    const key =
      `${owner}|${uri}`;

    if (!ownerUriMap.has(key)) {
      ownerUriMap.set(
        key,
        []
      );
    }

    ownerUriMap
      .get(key)
      .push(
        safeNumber(agent.agentId)
      );
  }


  const ownerUriClusters =
    Array.from(
      ownerUriMap.entries()
    )
      .map(
        ([key, agentIds]) => {

          const separator =
            key.indexOf("|");

          return {

            owner:
              key.slice(
                0,
                separator
              ),

            uri:
              key.slice(
                separator + 1
              ),

            agentCount:
              agentIds.length,

            agentIds:
              agentIds.sort(
                (a, b) => a - b
              )

          };
        }
      )
      .sort(
        (a, b) =>
          b.agentCount -
          a.agentCount
      );


  // ==========================================
  // METADATA ERROR CLASSIFICATION
  // ==========================================

  const errorCounts = {};


  const metadataProfiles =
    agents.map(
      agent => {

        const metadata =
          agent.metadata || {};

        const error =
          normalize(
            metadata.error
          );


        let failureClass =
          "NONE";


        if (
          metadata.accessible === true
        ) {

          if (
            metadata.validJSON === true
          ) {

            failureClass =
              "ACCESSIBLE_VALID_JSON";

          } else {

            failureClass =
              "ACCESSIBLE_INVALID_JSON";

          }

        } else if (
          error.includes("timeout")
        ) {

          failureClass =
            "TIMEOUT";

        } else if (
          error.includes("enotfound") ||
          error.includes("dns")
        ) {

          failureClass =
            "DNS_FAILURE";

        } else if (
          error.includes("invalid_url")
        ) {

          failureClass =
            "INVALID_URL";

        } else if (
          error ===
          "uri_not_fetched"
        ) {

          failureClass =
            "NOT_FETCHED";

        } else if (
          error
        ) {

          failureClass =
            "OTHER_FAILURE";

        } else {

          failureClass =
            "NO_METADATA";

        }


        errorCounts[failureClass] =
          (
            errorCounts[failureClass] ||
            0
          ) + 1;


        return {

          agentId:
            safeNumber(
              agent.agentId
            ),

          owner:
            agent.owner ||
            null,

          tokenURI:
            agent.tokenURI ||
            null,

          uriType:
            agent.uriType ||
            "UNKNOWN",

          metadataAccessible:
            metadata.accessible === true,

          validJSON:
            metadata.validJSON === true,

          failureClass,

          metadataStatus:
            metadata.status ??
            null,

          metadataError:
            metadata.error ??
            null

        };
      }
    );


  // ==========================================
  // SHARED URI ANALYSIS
  // ==========================================

  const sharedURIClusters =
    uriClusters.filter(
      cluster =>
        cluster.agentCount > 1
    );


  const largeURIClusters =
    uriClusters.filter(
      cluster =>
        cluster.agentCount >= 10
    );


  // ==========================================
  // SHARED OWNER ANALYSIS
  // ==========================================

  const sharedOwnerClusters =
    ownerClusters.filter(
      cluster =>
        cluster.agentCount > 1
    );


  const highOwnerClusters =
    ownerClusters.filter(
      cluster =>
        cluster.agentCount >= 10
    );


  // ==========================================
  // CROSS-CLUSTER ANALYSIS
  // ==========================================

  const crossClusterSignals =
    [];


  for (
    const cluster
    of ownerUriClusters
  ) {

    if (
      cluster.agentCount >= 5
    ) {

      crossClusterSignals.push({

        type:
          "OWNER_SHARED_URI_CLUSTER",

        severity:
          cluster.agentCount >= 10
            ? "HIGH"
            : "MEDIUM",

        owner:
          cluster.owner,

        uri:
          cluster.uri,

        agentCount:
          cluster.agentCount,

        agentIds:
          cluster.agentIds

      });

    }
  }


  // ==========================================
  // KNOWN AGENT 845265
  // ==========================================

  const knownAgent =
    agents.find(
      agent =>
        safeNumber(
          agent.agentId
        ) ===
        KNOWN_AGENT_ID
    );


  let knownAgentProfile =
    null;


  if (knownAgent) {

    const owner =
      normalize(
        knownAgent.owner
      );

    const uri =
      normalize(
        knownAgent.tokenURI
      );


    const ownerCluster =
      ownerClusters.find(
        cluster =>
          cluster.owner ===
          owner
      );


    const uriCluster =
      uriClusters.find(
        cluster =>
          cluster.uri ===
          uri
      );


    const ownerUriCluster =
      ownerUriClusters.find(
        cluster =>
          cluster.owner ===
            owner &&
          cluster.uri ===
            uri
      );


    const metadata =
      knownAgent.metadata ||
      {};


    knownAgentProfile = {

      agentId:
        KNOWN_AGENT_ID,

      owner:
        knownAgent.owner,

      tokenURI:
        knownAgent.tokenURI,

      uriType:
        knownAgent.uriType,

      metadataAccessible:
        metadata.accessible === true,

      validJSON:
        metadata.validJSON === true,

      failureClass:
        metadataProfiles.find(
          profile =>
            profile.agentId ===
            KNOWN_AGENT_ID
        )?.failureClass ||
        "UNKNOWN",

      ownerCluster:
        ownerCluster ||
        null,

      uriCluster:
        uriCluster ||
        null,

      ownerUriCluster:
        ownerUriCluster ||
        null

    };

  }


  // ==========================================
  // QUALITY CLASSIFICATION
  // ==========================================

  function classifyAgent(agent) {

    const profile =
      metadataProfiles.find(
        p =>
          p.agentId ===
          safeNumber(
            agent.agentId
          )
      );


    const owner =
      normalize(
        agent.owner
      );

    const uri =
      normalize(
        agent.tokenURI
      );


    const ownerCluster =
      ownerClusters.find(
        cluster =>
          cluster.owner ===
          owner
      );


    const uriCluster =
      uriClusters.find(
        cluster =>
          cluster.uri ===
          uri
      );


    const signals = [];


    if (
      profile?.failureClass ===
      "ACCESSIBLE_VALID_JSON"
    ) {

      signals.push(
        "VALID_METADATA"
      );

    }


    if (
      profile?.failureClass ===
      "ACCESSIBLE_INVALID_JSON"
    ) {

      signals.push(
        "INVALID_METADATA_JSON"
      );

    }


    if (
      profile?.failureClass ===
      "TIMEOUT"
    ) {

      signals.push(
        "METADATA_TIMEOUT"
      );

    }


    if (
      profile?.failureClass ===
      "DNS_FAILURE"
    ) {

      signals.push(
        "METADATA_DNS_FAILURE"
      );

    }


    if (
      profile?.failureClass ===
      "NOT_FETCHED"
    ) {

      signals.push(
        "METADATA_NOT_FETCHED"
      );

    }


    if (
      ownerCluster &&
      ownerCluster.agentCount > 1
    ) {

      signals.push(
        "SHARED_OWNER"
      );

    }


    if (
      ownerCluster &&
      ownerCluster.agentCount >= 10
    ) {

      signals.push(
        "HIGH_OWNER_CONCENTRATION"
      );

    }


    if (
      uriCluster &&
      uriCluster.agentCount > 1
    ) {

      signals.push(
        "SHARED_URI"
      );

    }


    if (
      uriCluster &&
      uriCluster.agentCount >= 10
    ) {

      signals.push(
        "LARGE_SHARED_URI"
      );

    }


    let classification =
      "STANDARD";


    if (
      signals.includes(
        "VALID_METADATA"
      )
    ) {

      classification =
        "VERIFIED_METADATA";

    }


    if (
      signals.includes(
        "LARGE_SHARED_URI"
      )
    ) {

      classification =
        "SHARED_METADATA_CLUSTER";

    }


    if (
      signals.includes(
        "HIGH_OWNER_CONCENTRATION"
      )
    ) {

      classification =
        "OWNER_CONCENTRATION";

    }


    if (
      signals.includes(
        "INVALID_METADATA_JSON"
      )
    ) {

      classification =
        "INVALID_METADATA";

    }


    return {

      agentId:
        safeNumber(
          agent.agentId
        ),

      classification,

      signals,

      ownerClusterSize:
        ownerCluster?.agentCount ||
        0,

      uriClusterSize:
        uriCluster?.agentCount ||
        0

    };

  }


  const classifications =
    agents.map(
      classifyAgent
    );


  // ==========================================
  // CLASSIFICATION COUNTS
  // ==========================================

  const classificationCounts =
    {};


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
  // FINAL OUTPUT
  // ==========================================

  const output = {

    schemaVersion:
      "2.0",

    engine:
      "METADATA_QUALITY_CLUSTER",

    network:
      input.network ||
      "Arc Testnet",

    generatedAt:
      new Date().toISOString(),

    source:
      INPUT_FILE,


    summary: {

      agents:
        agents.length,

      uniqueOwners:
        ownerMap.size,

      sharedOwners:
        sharedOwnerClusters.length,

      highOwnerConcentration:
        highOwnerClusters.length,

      uniqueURIs:
        uriMap.size,

      sharedURIs:
        sharedURIClusters.length,

      largeSharedURIs:
        largeURIClusters.length,

      ownerUriClusters:
        ownerUriClusters.length,

      crossClusterSignals:
        crossClusterSignals.length

    },


    metadataFailures:
      errorCounts,


    ownerClusters: {

      total:
        ownerClusters.length,

      shared:
        sharedOwnerClusters.length,

      highConcentration:
        highOwnerClusters.length,

      top:
        ownerClusters.slice(
          0,
          50
        )

    },


    uriClusters: {

      total:
        uriClusters.length,

      shared:
        sharedURIClusters.length,

      large:
        largeURIClusters.length,

      top:
        uriClusters.slice(
          0,
          50
        )

    },


    ownerUriClusters: {

      total:
        ownerUriClusters.length,

      significant:
        ownerUriClusters.filter(
          cluster =>
            cluster.agentCount >= 5
        )

    },


    crossClusterSignals,


    classificationCounts,


    knownAgent:
      knownAgentProfile,


    agentProfiles:
      classifications

  };


  // ==========================================
  // WRITE FILE
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
    "          V20 FINAL RESULT"
  );

  console.log(
    "=========================================="
  );

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
    "Shared owners:",
    sharedOwnerClusters.length
  );

  console.log(
    "High owner concentration:",
    highOwnerClusters.length
  );

  console.log("");

  console.log(
    "Unique URIs:",
    uriMap.size
  );

  console.log(
    "Shared URIs:",
    sharedURIClusters.length
  );

  console.log(
    "Large shared URIs:",
    largeURIClusters.length
  );

  console.log("");

  console.log(
    "Owner + URI clusters:",
    ownerUriClusters.length
  );

  console.log(
    "Significant cross-clusters:",
    crossClusterSignals.length
  );

  console.log("");

  console.log(
    "=========================================="
  );

  console.log(
    "        METADATA FAILURE TYPES"
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
      errorCounts
    )
  ) {

    console.log(
      `${type}: ${count}`
    );

  }


  console.log("");

  console.log(
    "=========================================="
  );

  console.log(
    "        KNOWN AGENT 845265"
  );

  console.log(
    "=========================================="
  );

  console.log("");


  if (
    knownAgentProfile
  ) {

    console.log(
      "🟢 Agent 845265"
    );

    console.log(
      "Owner:",
      knownAgentProfile.owner
    );

    console.log(
      "URI:",
      knownAgentProfile.tokenURI
    );

    console.log(
      "URI Type:",
      knownAgentProfile.uriType
    );

    console.log(
      "Metadata:",
      knownAgentProfile.metadataAccessible
        ? "ACCESSIBLE"
        : "INACCESSIBLE"
    );

    console.log(
      "Failure class:",
      knownAgentProfile.failureClass
    );

    console.log(
      "Owner cluster:",
      knownAgentProfile
        .ownerCluster
        ?.agentCount ||
      0
    );

    console.log(
      "URI cluster:",
      knownAgentProfile
        .uriCluster
        ?.agentCount ||
      0
    );

    console.log(
      "Owner + URI cluster:",
      knownAgentProfile
        .ownerUriCluster
        ?.agentCount ||
      0
    );

  } else {

    console.log(
      "🔴 Agent 845265 bulunamadı."
    );

  }


  console.log("");

  console.log(
    "=========================================="
  );

  console.log(
    "📁 Output:"
  );

  console.log(
    OUTPUT_FILE
  );

  console.log(
    "=========================================="
  );

  console.log("");

  console.log(
    "V20 TAMAMLANDI"
  );

}


main();
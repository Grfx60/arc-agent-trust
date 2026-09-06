const fs = require("fs");

const INPUT_FILE = "agent-graph-component-v24.json";
const OUTPUT_FILE = "agent-component-forensics-v25.json";

const KNOWN_AGENT_ID = 845265;


// ============================================
// HELPERS
// ============================================

function loadJSON(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`Dosya bulunamadı: ${file}`);
  }

  return JSON.parse(
    fs.readFileSync(file, "utf8")
  );
}

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
  console.log("        AGENT COMPONENT FORENSICS v25");
  console.log("==========================================");
  console.log("");

  const input =
    loadJSON(INPUT_FILE);

  const components =
    Array.isArray(input.allComponents)
      ? input.allComponents
      : [];

  const known =
    input.knownAgent ||
    null;

  console.log(
    "Components:",
    components.length
  );

  console.log(
    "Known agent:",
    KNOWN_AGENT_ID
  );

  console.log("");


  // ==========================================
  // FIND KNOWN COMPONENT
  // ==========================================

  const knownComponent =
    components.find(
      component =>
        Array.isArray(
          component.agentIds
        ) &&
        component.agentIds.includes(
          KNOWN_AGENT_ID
        )
    );


  if (!knownComponent) {
    throw new Error(
      `Agent ${KNOWN_AGENT_ID} component içinde bulunamadı.`
    );
  }


  console.log(
    "Known component:",
    knownComponent.componentId
  );

  console.log(
    "Nodes:",
    knownComponent.nodeCount
  );

  console.log(
    "Agents:",
    knownComponent.agentCount
  );

  console.log(
    "Owners:",
    knownComponent.ownerCount
  );

  console.log(
    "URIs:",
    knownComponent.uriCount
  );

  console.log("");


  // ==========================================
  // AGENT PROFILES
  // ==========================================
  //
  // V24'ün component içindeki agentIds'lerinden
  // owner/URI bilgisi V23 node verisinden alınır.
  //

  const nodes =
    Array.isArray(
      input.knownAgent?.componentNodes
    )
      ? input.knownAgent.componentNodes
      : null;


  // V24 dosyasında component node detayları
  // ayrı tutulmadığı için top-level source graph
  // yeniden okunuyor.

  const graph =
    loadJSON(
      "agent-relationship-graph-v23.json"
    );

  const graphNodes =
    Array.isArray(graph.nodes)
      ? graph.nodes
      : [];

  const graphNodeMap =
    new Map();

  for (
    const node
    of graphNodes
  ) {

    if (node.id) {
      graphNodeMap.set(
        node.id,
        node
      );
    }

  }


  const agentProfiles = [];


  for (
    const agentId
    of knownComponent.agentIds
  ) {

    const node =
      graphNodeMap.get(
        `agent:${agentId}`
      );

    if (!node) {
      continue;
    }

    agentProfiles.push({

      agentId,

      owner:
        normalize(
          node.owner
        ),

      uri:
        normalize(
          node.uri
        ),

      isKnown:
        agentId ===
        KNOWN_AGENT_ID

    });

  }


  // ==========================================
  // OWNER GROUPS
  // ==========================================

  const ownerGroups =
    new Map();


  for (
    const agent
    of agentProfiles
  ) {

    if (!agent.owner) {
      continue;
    }

    if (
      !ownerGroups.has(
        agent.owner
      )
    ) {

      ownerGroups.set(
        agent.owner,
        []
      );

    }

    ownerGroups
      .get(agent.owner)
      .push(agent.agentId);

  }


  const ownerAnalysis =
    Array.from(
      ownerGroups.entries()
    )
      .map(
        ([owner, agentIds]) => {

          const ownerAgents =
            agentProfiles.filter(
              agent =>
                agent.owner ===
                owner
            );


          const uris =
            unique(
              ownerAgents
                .map(
                  agent =>
                    agent.uri
                )
                .filter(Boolean)
            );


          return {

            owner,

            agentCount:
              agentIds.length,

            agentIds:
              agentIds.sort(
                (a, b) =>
                  a - b
              ),

            uriCount:
              uris.length,

            uris

          };

        }
      )
      .sort(
        (a, b) =>
          b.agentCount -
          a.agentCount
      );


  // ==========================================
  // URI GROUPS
  // ==========================================

  const uriGroups =
    new Map();


  for (
    const agent
    of agentProfiles
  ) {

    if (!agent.uri) {
      continue;
    }

    if (
      !uriGroups.has(
        agent.uri
      )
    ) {

      uriGroups.set(
        agent.uri,
        []
      );

    }

    uriGroups
      .get(agent.uri)
      .push(agent.agentId);

  }


  const uriAnalysis =
    Array.from(
      uriGroups.entries()
    )
      .map(
        ([uri, agentIds]) => {

          const uriAgents =
            agentProfiles.filter(
              agent =>
                agent.uri ===
                uri
            );


          const owners =
            unique(
              uriAgents
                .map(
                  agent =>
                    agent.owner
                )
                .filter(Boolean)
            );


          return {

            uri,

            agentCount:
              agentIds.length,

            ownerCount:
              owners.length,

            agentIds:
              agentIds.sort(
                (a, b) =>
                  a - b
              ),

            owners

          };

        }
      )
      .sort(
        (a, b) =>
          b.agentCount -
          a.agentCount
      );


  // ==========================================
  // OWNER ↔ URI MATRIX
  // ==========================================

  const ownerUriMatrix =
    ownerAnalysis.map(
      ownerEntry => {

        const uriCounts = {};


        for (
          const agentId
          of ownerEntry.agentIds
        ) {

          const agent =
            agentProfiles.find(
              item =>
                item.agentId ===
                agentId
            );

          if (!agent || !agent.uri) {
            continue;
          }

          uriCounts[agent.uri] =
            (
              uriCounts[agent.uri] ||
              0
            ) + 1;

        }


        return {

          owner:
            ownerEntry.owner,

          agentCount:
            ownerEntry.agentCount,

          uriCount:
            Object.keys(
              uriCounts
            ).length,

          uriCounts

        };

      }
    );


  // ==========================================
  // CROSS-OWNER URI BRIDGES
  // ==========================================

  const crossOwnerURI =
    uriAnalysis
      .filter(
        uri =>
          uri.ownerCount > 1
      )
      .map(
        uri => ({

          uri:
            uri.uri,

          agentCount:
            uri.agentCount,

          ownerCount:
            uri.ownerCount,

          owners:
            uri.owners

        })
      );


  // ==========================================
  // OWNER CONCENTRATION
  // ==========================================

  const totalAgents =
    agentProfiles.length;


  const ownerConcentration =
    ownerAnalysis.map(
      owner => ({

        owner:
          owner.owner,

        agentCount:
          owner.agentCount,

        percentage:
          totalAgents > 0
            ? (
                owner.agentCount /
                totalAgents
              ) *
              100
            : 0

      })
    );


  // ==========================================
  // URI CONCENTRATION
  // ==========================================

  const uriConcentration =
    uriAnalysis.map(
      uri => ({

        uri:
          uri.uri,

        agentCount:
          uri.agentCount,

        percentage:
          totalAgents > 0
            ? (
                uri.agentCount /
                totalAgents
              ) *
              100
            : 0,

        ownerCount:
          uri.ownerCount

      })
    );


  // ==========================================
  // KNOWN AGENT
  // ==========================================

  const knownAgent =
    agentProfiles.find(
      agent =>
        agent.agentId ===
        KNOWN_AGENT_ID
    );


  const knownOwnerEntry =
    ownerAnalysis.find(
      owner =>
        owner.owner ===
        knownAgent?.owner
    );


  const knownURIEntry =
    uriAnalysis.find(
      uri =>
        uri.uri ===
        knownAgent?.uri
    );


  const knownOwnerAgents =
    knownOwnerEntry
      ? knownOwnerEntry.agentIds
      : [];


  const knownURIAgents =
    knownURIEntry
      ? knownURIEntry.agentIds
      : [];


  // ==========================================
  // KNOWN AGENT STRUCTURAL SIGNALS
  // ==========================================

  const knownSignals = {

    uniqueOwner:
      knownOwnerAgents.length === 1,

    sharedURI:
      knownURIAgents.length > 1,

    crossOwnerURI:
      knownURIEntry
        ? knownURIEntry.ownerCount > 1
        : false,

    ownerUsesMultipleURIs:
      knownOwnerEntry
        ? knownOwnerEntry.uriCount > 1
        : false,

    ownerConcentration:
      knownOwnerEntry
        ? knownOwnerEntry.agentCount
        : 0,

    uriConcentration:
      knownURIEntry
        ? knownURIEntry.agentCount
        : 0

  };


  // ==========================================
  // HUB ANALYSIS
  // ==========================================
  //
  // Hub = çok sayıda agentı aynı owner veya URI
  // üzerinden bağlayan yapı.
  //

  const hubOwners =
    ownerAnalysis
      .filter(
        owner =>
          owner.agentCount >= 5
      )
      .map(
        owner => ({

          owner:
            owner.owner,

          agents:
            owner.agentCount,

          uris:
            owner.uriCount

        })
      );


  const hubURIs =
    uriAnalysis
      .filter(
        uri =>
          uri.agentCount >= 5
      )
      .map(
        uri => ({

          uri:
            uri.uri,

          agents:
            uri.agentCount,

          owners:
            uri.ownerCount

        })
      );


  // ==========================================
  // COMPONENT CLASSIFICATION
  // ==========================================

  let classification =
    "NORMAL_COMPONENT";


  if (
    ownerAnalysis.length > 1 &&
    uriAnalysis.length <= 3 &&
    totalAgents >= 50
  ) {

    classification =
      "MULTI_OWNER_LOW_URI_COMPONENT";

  }


  if (
    crossOwnerURI.length > 0 &&
    totalAgents >= 50
  ) {

    classification =
      "CROSS_OWNER_URI_COMPONENT";

  }


  if (
    ownerAnalysis.length >= 10 &&
    totalAgents >= 50 &&
    uriAnalysis.length <= 3
  ) {

    classification =
      "HIGH_OWNER_LOW_URI_COMPONENT";

  }


  // ==========================================
  // KNOWN AGENT CLASSIFICATION
  // ==========================================

  let knownClassification =
    "ISOLATED_OWNER";


  if (
    knownSignals.sharedURI &&
    knownSignals.crossOwnerURI
  ) {

    knownClassification =
      "CROSS_OWNER_SHARED_URI";

  } else if (
    knownSignals.sharedURI
  ) {

    knownClassification =
      "SHARED_URI";

  }


  // ==========================================
  // OUTPUT
  // ==========================================

  const output = {

    schemaVersion:
      "2.5",

    engine:
      "AGENT_COMPONENT_FORENSICS",

    generatedAt:
      new Date().toISOString(),

    source:
      INPUT_FILE,

    knownAgent:
      KNOWN_AGENT_ID,

    component: {

      componentId:
        knownComponent.componentId,

      nodeCount:
        knownComponent.nodeCount,

      edgeCount:
        knownComponent.edgeCount,

      agentCount:
        knownComponent.agentCount,

      ownerCount:
        knownComponent.ownerCount,

      uriCount:
        knownComponent.uriCount,

      density:
        knownComponent.density,

      classification

    },

    ownerAnalysis,

    uriAnalysis,

    ownerUriMatrix,

    crossOwnerURI,

    ownerConcentration,

    uriConcentration,

    hubOwners,

    hubURIs,

    knownAgentAnalysis: {

      agentId:
        KNOWN_AGENT_ID,

      owner:
        knownAgent?.owner ||
        null,

      uri:
        knownAgent?.uri ||
        null,

      ownerAgentCount:
        knownOwnerAgents.length,

      ownerAgents:
        knownOwnerAgents,

      uriAgentCount:
        knownURIAgents.length,

      uriAgents:
        knownURIAgents,

      uriOwnerCount:
        knownURIEntry?.ownerCount ||
        0,

      uriOwners:
        knownURIEntry?.owners ||
        [],

      signals:
        knownSignals,

      classification:
        knownClassification

    },

    agentProfiles

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
  console.log("          V25 FINAL RESULT");
  console.log("==========================================");
  console.log("");

  console.log(
    "Component:",
    knownComponent.componentId
  );

  console.log(
    "Agents:",
    knownComponent.agentCount
  );

  console.log(
    "Owners:",
    knownComponent.ownerCount
  );

  console.log(
    "URIs:",
    knownComponent.uriCount
  );

  console.log(
    "Classification:",
    classification
  );

  console.log("");


  console.log("==========================================");
  console.log("           OWNER ANALYSIS");
  console.log("==========================================");
  console.log("");

  for (
    const owner
    of ownerAnalysis
  ) {

    console.log(
      `Owner: ${owner.owner}`
    );

    console.log(
      `Agents: ${owner.agentCount}`
    );

    console.log(
      `URIs: ${owner.uriCount}`
    );

    console.log("");

  }


  console.log("==========================================");
  console.log("             URI ANALYSIS");
  console.log("==========================================");
  console.log("");

  for (
    const uri
    of uriAnalysis
  ) {

    console.log(
      `URI: ${uri.uri}`
    );

    console.log(
      `Agents: ${uri.agentCount}`
    );

    console.log(
      `Owners: ${uri.ownerCount}`
    );

    console.log("");

  }


  console.log("==========================================");
  console.log("        CROSS-OWNER URI SIGNALS");
  console.log("==========================================");
  console.log("");

  console.log(
    "Cross-owner shared URIs:",
    crossOwnerURI.length
  );

  for (
    const item
    of crossOwnerURI
  ) {

    console.log(
      `Agents: ${item.agentCount} | Owners: ${item.ownerCount}`
    );

    console.log(
      `URI: ${item.uri}`
    );

    console.log("");

  }


  console.log("==========================================");
  console.log("          KNOWN AGENT 845265");
  console.log("==========================================");
  console.log("");

  console.log(
    "Owner:",
    knownAgent?.owner
  );

  console.log(
    "Owner agents:",
    knownOwnerAgents.length
  );

  console.log(
    "URI agents:",
    knownURIAgents.length
  );

  console.log(
    "URI owners:",
    knownURIEntry?.ownerCount ||
    0
  );

  console.log(
    "Owner uses multiple URIs:",
    knownSignals.ownerUsesMultipleURIs
  );

  console.log(
    "Cross-owner URI:",
    knownSignals.crossOwnerURI
  );

  console.log(
    "Classification:",
    knownClassification
  );

  console.log("");


  console.log("==========================================");
  console.log("              HUB ANALYSIS");
  console.log("==========================================");
  console.log("");

  console.log(
    "Hub owners:",
    hubOwners.length
  );

  console.log(
    "Hub URIs:",
    hubURIs.length
  );

  console.log("");


  console.log(
    "📁 Output:",
    OUTPUT_FILE
  );

  console.log("");

  console.log("==========================================");
  console.log(
    "       AGENT COMPONENT FORENSICS TAMAMLANDI"
  );
  console.log("==========================================");
  console.log("");

}


// ============================================
// RUN
// ============================================

try {

  main();

} catch (error) {

  console.error("");
  console.error("❌ V25 kritik hata:");
  console.error(
    error.message ||
    error
  );
  console.error("");

  process.exit(1);
}
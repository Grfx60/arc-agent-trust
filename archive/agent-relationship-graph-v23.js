const fs = require("fs");

const V19_FILE = "agent-metadata-intelligence-v19.json";
const V22_FILE = "agent-identity-correlation-v22.json";

const OUTPUT_FILE = "agent-relationship-graph-v23.json";

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
  console.log("       AGENT RELATIONSHIP GRAPH v23");
  console.log("==========================================");
  console.log("");

  // ==========================================
  // LOAD
  // ==========================================

  const v19 = loadJSON(V19_FILE);
  const v22 = loadJSON(V22_FILE);

  const agents =
    Array.isArray(v19.agents)
      ? v19.agents
      : [];

  const relationships =
    Array.isArray(v22.relationships)
      ? v22.relationships
      : [];

  console.log(
    "Agents:",
    agents.length
  );

  console.log(
    "Relationships:",
    relationships.length
  );

  console.log("");


  // ==========================================
  // AGENT INDEX
  // ==========================================

  const agentMap = new Map();

  for (const agent of agents) {

    const id =
      num(agent.agentId);

    if (!id) {
      continue;
    }

    agentMap.set(
      id,
      agent
    );
  }


  // ==========================================
  // GRAPH NODES
  // ==========================================

  const nodes = [];

  for (const agent of agents) {

    const id =
      num(agent.agentId);

    if (!id) {
      continue;
    }

    const owner =
      normalize(agent.owner);

    const uri =
      normalize(agent.tokenURI);

    nodes.push({

      id:
        `agent:${id}`,

      type:
        "AGENT",

      agentId:
        id,

      owner:
        owner || null,

      uri:
        uri || null,

      isKnownAgent:
        id === KNOWN_AGENT_ID

    });

  }


  // ==========================================
  // OWNER NODES
  // ==========================================

  const ownerSet =
    new Set();

  for (const agent of agents) {

    const owner =
      normalize(agent.owner);

    if (owner) {
      ownerSet.add(owner);
    }

  }


  for (const owner of ownerSet) {

    nodes.push({

      id:
        `owner:${owner}`,

      type:
        "OWNER",

      owner

    });

  }


  // ==========================================
  // URI NODES
  // ==========================================

  const uriSet =
    new Set();

  for (const agent of agents) {

    const uri =
      normalize(agent.tokenURI);

    if (uri) {
      uriSet.add(uri);
    }

  }


  for (const uri of uriSet) {

    nodes.push({

      id:
        `uri:${uri}`,

      type:
        "URI",

      uri

    });

  }


  // ==========================================
  // GRAPH EDGES
  // ==========================================

  const edges = [];
  const edgeSet = new Set();


  function addEdge(
    source,
    target,
    relation,
    metadata = {}
  ) {

    const key =
      `${source}|${target}|${relation}`;

    if (edgeSet.has(key)) {
      return;
    }

    edgeSet.add(key);

    edges.push({

      source,
      target,
      relation,
      ...metadata

    });

  }


  // ------------------------------------------
  // AGENT → OWNER
  // ------------------------------------------

  for (const agent of agents) {

    const id =
      num(agent.agentId);

    const owner =
      normalize(agent.owner);

    if (!id || !owner) {
      continue;
    }

    addEdge(

      `agent:${id}`,

      `owner:${owner}`,

      "OWNED_BY"

    );

  }


  // ------------------------------------------
  // AGENT → URI
  // ------------------------------------------

  for (const agent of agents) {

    const id =
      num(agent.agentId);

    const uri =
      normalize(agent.tokenURI);

    if (!id || !uri) {
      continue;
    }

    addEdge(

      `agent:${id}`,

      `uri:${uri}`,

      "USES_URI"

    );

  }


  // ------------------------------------------
  // V22 RELATIONSHIPS
  // ------------------------------------------

  for (
    const relationship
    of relationships
  ) {

    const source =
      num(
        relationship.source
      );

    const target =
      num(
        relationship.target
      );

    if (!source || !target) {
      continue;
    }

    addEdge(

      `agent:${source}`,

      `agent:${target}`,

      relationship.relation,

      {

        owner:
          relationship.owner ||
          null,

        uri:
          relationship.uri ||
          null

      }

    );

  }


  // ==========================================
  // ADJACENCY MAP
  // ==========================================

  const adjacency =
    new Map();


  function connect(a, b) {

    if (!adjacency.has(a)) {
      adjacency.set(
        a,
        new Set()
      );
    }

    adjacency
      .get(a)
      .add(b);

  }


  for (
    const edge
    of edges
  ) {

    connect(
      edge.source,
      edge.target
    );

    connect(
      edge.target,
      edge.source
    );

  }


  // ==========================================
  // AGENT-ONLY ADJACENCY
  // ==========================================

  const agentAdjacency =
    new Map();


  for (const edge of edges) {

    if (
      !edge.source.startsWith(
        "agent:"
      ) ||
      !edge.target.startsWith(
        "agent:"
      )
    ) {

      continue;

    }

    const a =
      edge.source;

    const b =
      edge.target;


    if (!agentAdjacency.has(a)) {

      agentAdjacency.set(
        a,
        new Set()
      );

    }


    if (!agentAdjacency.has(b)) {

      agentAdjacency.set(
        b,
        new Set()
      );

    }


    agentAdjacency
      .get(a)
      .add(b);

    agentAdjacency
      .get(b)
      .add(a);

  }


  // ==========================================
  // 1-HOP
  // ==========================================

  function getHop(
    startId,
    depth
  ) {

    const start =
      `agent:${startId}`;

    const visited =
      new Set([start]);

    let frontier =
      new Set([start]);

    const levels = [];


    for (
      let level = 1;
      level <= depth;
      level++
    ) {

      const next =
        new Set();

      for (
        const node
        of frontier
      ) {

        const neighbors =
          agentAdjacency.get(node) ||
          new Set();


        for (
          const neighbor
          of neighbors
        ) {

          if (
            !visited.has(
              neighbor
            )
          ) {

            visited.add(
              neighbor
            );

            next.add(
              neighbor
            );

          }

        }

      }

      levels.push({

        depth:
          level,

        agents:
          Array.from(next)
            .map(
              value =>
                num(
                  value.split(":")[1]
                )
            )
            .sort(
              (a, b) =>
                a - b
            )

      });

      frontier = next;

    }


    return {

      levels,

      total:
        visited.size - 1

    };

  }


  const knownHop =
    getHop(
      KNOWN_AGENT_ID,
      2
    );


  // ==========================================
  // KNOWN AGENT DIRECT GRAPH
  // ==========================================

  const knownNode =
    `agent:${KNOWN_AGENT_ID}`;


  const knownEdges =
    edges.filter(
      edge =>
        edge.source === knownNode ||
        edge.target === knownNode
    );


  const directNeighbors =
    unique(

      knownEdges
        .flatMap(
          edge => [
            edge.source,
            edge.target
          ]
        )
        .filter(
          node =>
            node !== knownNode
        )

    );


  // ==========================================
  // KNOWN AGENT OWNER / URI CONNECTIONS
  // ==========================================

  const knownAgent =
    agentMap.get(
      KNOWN_AGENT_ID
    );


  let knownOwner = null;
  let knownURI = null;


  if (knownAgent) {

    knownOwner =
      normalize(
        knownAgent.owner
      );

    knownURI =
      normalize(
        knownAgent.tokenURI
      );

  }


  const knownOwnerAgents =
    agents
      .filter(
        agent =>
          normalize(agent.owner) ===
          knownOwner
      )
      .map(
        agent =>
          num(agent.agentId)
      )
      .sort(
        (a, b) =>
          a - b
      );


  const knownURIAgents =
    agents
      .filter(
        agent =>
          normalize(agent.tokenURI) ===
          knownURI
      )
      .map(
        agent =>
          num(agent.agentId)
      )
      .sort(
        (a, b) =>
          a - b
      );


  // ==========================================
  // 2-HOP SHARED STRUCTURE
  // ==========================================

  const hop2Agents =
    knownHop.levels[1]
      ?.agents ||
    [];


  const hop2Profiles =
    hop2Agents
      .map(
        id =>
          agentMap.get(id)
      )
      .filter(Boolean)
      .map(
        agent => ({

          agentId:
            num(agent.agentId),

          owner:
            normalize(
              agent.owner
            ),

          uri:
            normalize(
              agent.tokenURI
            )

        })
      );


  const hop2Owners =
    unique(
      hop2Profiles
        .map(
          item =>
            item.owner
        )
        .filter(Boolean)
    );


  const hop2URIs =
    unique(
      hop2Profiles
        .map(
          item =>
            item.uri
        )
        .filter(Boolean)
    );


  // ==========================================
  // CLUSTER CONNECTION TYPES
  // ==========================================

  const connectionTypes = {

    directSharedOwner:
      0,

    directSharedURI:
      0,

    twoHopOwnerOverlap:
      0,

    twoHopURIOverlap:
      0

  };


  for (
    const edge
    of knownEdges
  ) {

    if (
      edge.relation ===
      "SHARED_OWNER"
    ) {

      connectionTypes
        .directSharedOwner++;

    }

    if (
      edge.relation ===
      "SHARED_URI"
    ) {

      connectionTypes
        .directSharedURI++;

    }

  }


  for (
    const profile
    of hop2Profiles
  ) {

    if (
      knownOwner &&
      profile.owner ===
      knownOwner
    ) {

      connectionTypes
        .twoHopOwnerOverlap++;

    }

    if (
      knownURI &&
      profile.uri ===
      knownURI
    ) {

      connectionTypes
        .twoHopURIOverlap++;

    }

  }


  // ==========================================
  // GRAPH METRICS
  // ==========================================

  const agentNodes =
    nodes.filter(
      node =>
        node.type ===
        "AGENT"
    ).length;

  const ownerNodes =
    nodes.filter(
      node =>
        node.type ===
        "OWNER"
    ).length;

  const uriNodes =
    nodes.filter(
      node =>
        node.type ===
        "URI"
    ).length;


  // ==========================================
  // OUTPUT
  // ==========================================

  const output = {

    schemaVersion:
      "2.3",

    engine:
      "AGENT_RELATIONSHIP_GRAPH",

    network:
      v19.network ||
      "Arc Testnet",

    generatedAt:
      new Date().toISOString(),

    sources: {

      v19:
        V19_FILE,

      v22:
        V22_FILE

    },


    graph: {

      nodes:
        nodes.length,

      edges:
        edges.length,

      agentNodes,

      ownerNodes,

      uriNodes

    },


    relationshipTypes: {

      sharedOwner:
        edges.filter(
          edge =>
            edge.relation ===
            "SHARED_OWNER"
        ).length,

      sharedURI:
        edges.filter(
          edge =>
            edge.relation ===
            "SHARED_URI"
        ).length,

      ownedBy:
        edges.filter(
          edge =>
            edge.relation ===
            "OWNED_BY"
        ).length,

      usesURI:
        edges.filter(
          edge =>
            edge.relation ===
            "USES_URI"
        ).length

    },


    knownAgent: {

      agentId:
        KNOWN_AGENT_ID,

      owner:
        knownOwner,

      uri:
        knownURI,

      directNeighbors:
        directNeighbors
          .map(
            value =>
              value.startsWith(
                "agent:"
              )
                ? num(
                    value.split(":")[1]
                  )
                : value
          ),

      directNeighborCount:
        directNeighbors.length,

      ownerAgents:
        knownOwnerAgents,

      ownerAgentCount:
        knownOwnerAgents.length,

      uriAgents:
        knownURIAgents,

      uriAgentCount:
        knownURIAgents.length,

      oneHop:
        knownHop.levels[0],

      twoHop:
        knownHop.levels[1],

      twoHopTotal:
        hop2Agents.length,

      twoHopOwners:
        hop2Owners,

      twoHopURIs:
        hop2URIs,

      connectionTypes

    },


    nodes,

    edges

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
  // REPORT
  // ==========================================

  console.log("");
  console.log("==========================================");
  console.log("          V23 FINAL RESULT");
  console.log("==========================================");
  console.log("");

  console.log(
    "Graph nodes:",
    nodes.length
  );

  console.log(
    "Graph edges:",
    edges.length
  );

  console.log(
    "Agent nodes:",
    agentNodes
  );

  console.log(
    "Owner nodes:",
    ownerNodes
  );

  console.log(
    "URI nodes:",
    uriNodes
  );

  console.log("");


  console.log("==========================================");
  console.log("        RELATIONSHIP TYPES");
  console.log("==========================================");
  console.log("");

  console.log(
    "SHARED_OWNER:",
    output.relationshipTypes.sharedOwner
  );

  console.log(
    "SHARED_URI:",
    output.relationshipTypes.sharedURI
  );

  console.log(
    "OWNED_BY:",
    output.relationshipTypes.ownedBy
  );

  console.log(
    "USES_URI:",
    output.relationshipTypes.usesURI
  );

  console.log("");


  console.log("==========================================");
  console.log("          KNOWN AGENT 845265");
  console.log("==========================================");
  console.log("");

  console.log(
    "Owner:",
    knownOwner
  );

  console.log(
    "URI:",
    knownURI
  );

  console.log(
    "Direct neighbors:",
    directNeighbors.length
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
    "1-hop agents:",
    knownHop.levels[0]?.agents.length || 0
  );

  console.log(
    "2-hop agents:",
    knownHop.levels[1]?.agents.length || 0
  );

  console.log("");


  console.log(
    "Connection types:"
  );

  console.log(
    "  Direct shared owner:",
    connectionTypes.directSharedOwner
  );

  console.log(
    "  Direct shared URI:",
    connectionTypes.directSharedURI
  );

  console.log(
    "  2-hop owner overlap:",
    connectionTypes.twoHopOwnerOverlap
  );

  console.log(
    "  2-hop URI overlap:",
    connectionTypes.twoHopURIOverlap
  );

  console.log("");


  console.log(
    "📁 Output:",
    OUTPUT_FILE
  );

  console.log("");

  console.log("==========================================");
  console.log(
    "       RELATIONSHIP GRAPH TAMAMLANDI"
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
  console.error("❌ V23 kritik hata:");
  console.error(
    error.message || error
  );
  console.error("");

  process.exit(1);
}
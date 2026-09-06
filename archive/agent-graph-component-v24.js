const fs = require("fs");

const INPUT_FILE = "agent-relationship-graph-v23.json";
const OUTPUT_FILE = "agent-graph-component-v24.json";

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
  console.log("      GRAPH COMPONENT INTELLIGENCE v24");
  console.log("==========================================");
  console.log("");

  const graph =
    loadJSON(INPUT_FILE);

  const nodes =
    Array.isArray(graph.nodes)
      ? graph.nodes
      : [];

  const edges =
    Array.isArray(graph.edges)
      ? graph.edges
      : [];

  console.log(
    "Graph nodes:",
    nodes.length
  );

  console.log(
    "Graph edges:",
    edges.length
  );

  console.log("");


  // ==========================================
  // NODE INDEX
  // ==========================================

  const nodeMap = new Map();

  for (const node of nodes) {
    if (node.id) {
      nodeMap.set(
        node.id,
        node
      );
    }
  }


  // ==========================================
  // UNDIRECTED ADJACENCY
  // ==========================================

  const adjacency = new Map();

  for (const node of nodes) {
    adjacency.set(
      node.id,
      new Set()
    );
  }


  for (const edge of edges) {

    if (
      !adjacency.has(edge.source) ||
      !adjacency.has(edge.target)
    ) {
      continue;
    }

    adjacency
      .get(edge.source)
      .add(edge.target);

    adjacency
      .get(edge.target)
      .add(edge.source);

  }


  // ==========================================
  // CONNECTED COMPONENTS
  // ==========================================

  const visited = new Set();
  const components = [];

  for (const node of nodes) {

    if (
      visited.has(node.id)
    ) {
      continue;
    }

    const queue = [node.id];
    const component = [];

    visited.add(node.id);

    while (queue.length > 0) {

      const current =
        queue.shift();

      component.push(current);

      const neighbors =
        adjacency.get(current) ||
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

          queue.push(
            neighbor
          );

        }

      }

    }

    components.push(
      component
    );

  }


  // ==========================================
  // COMPONENT METRICS
  // ==========================================

  const componentResults =
    components
      .map(
        (component, index) => {

          const componentSet =
            new Set(component);

          const componentNodes =
            component
              .map(
                id =>
                  nodeMap.get(id)
              )
              .filter(Boolean);


          const componentEdges =
            edges.filter(
              edge =>
                componentSet.has(
                  edge.source
                ) &&
                componentSet.has(
                  edge.target
                )
            );


          const agentNodes =
            componentNodes.filter(
              node =>
                node.type ===
                "AGENT"
            );

          const ownerNodes =
            componentNodes.filter(
              node =>
                node.type ===
                "OWNER"
            );

          const uriNodes =
            componentNodes.filter(
              node =>
                node.type ===
                "URI"
            );


          const degreeMap =
            new Map();


          for (
            const node
            of componentNodes
          ) {

            degreeMap.set(
              node.id,
              (
                adjacency.get(
                  node.id
                ) ||
                new Set()
              ).size
            );

          }


          const topNodes =
            componentNodes
              .map(
                node => ({

                  id:
                    node.id,

                  type:
                    node.type,

                  agentId:
                    node.agentId ||
                    null,

                  degree:
                    degreeMap.get(
                      node.id
                    ) || 0

                })
              )
              .sort(
                (a, b) =>
                  b.degree -
                  a.degree
              )
              .slice(
                0,
                20
              );


          return {

            componentId:
              index + 1,

            nodeCount:
              componentNodes.length,

            edgeCount:
              componentEdges.length,

            agentCount:
              agentNodes.length,

            ownerCount:
              ownerNodes.length,

            uriCount:
              uriNodes.length,

            density:
              componentNodes.length > 1
                ? (
                    2 *
                    componentEdges.length
                  ) /
                  (
                    componentNodes.length *
                    (
                      componentNodes.length -
                      1
                    )
                  )
                : 0,

            topNodes,

            agentIds:
              agentNodes
                .map(
                  node =>
                    num(node.agentId)
                )
                .sort(
                  (a, b) =>
                    a - b
                )

          };

        }
      )
      .sort(
        (a, b) =>
          b.nodeCount -
          a.nodeCount
      );


  // ==========================================
  // KNOWN AGENT COMPONENT
  // ==========================================

  const knownNodeId =
    `agent:${KNOWN_AGENT_ID}`;

  const knownComponent =
    componentResults.find(
      component =>
        component.agentIds.includes(
          KNOWN_AGENT_ID
        )
    ) ||
    null;


  let knownComponentNodeIds = [];

  if (knownComponent) {

    const originalComponent =
      components.find(
        component => {

          const set =
            new Set(component);

          return set.has(
            knownNodeId
          );

        }
      );

    knownComponentNodeIds =
      originalComponent || [];

  }


  // ==========================================
  // KNOWN COMPONENT DETAILED ANALYSIS
  // ==========================================

  let knownAnalysis = null;


  if (
    knownComponent &&
    knownComponentNodeIds.length
  ) {

    const componentSet =
      new Set(
        knownComponentNodeIds
      );


    const componentNodes =
      knownComponentNodeIds
        .map(
          id =>
            nodeMap.get(id)
        )
        .filter(Boolean);


    const componentEdges =
      edges.filter(
        edge =>
          componentSet.has(
            edge.source
          ) &&
          componentSet.has(
            edge.target
          )
      );


    // ----------------------------------------
    // NODE DEGREE
    // ----------------------------------------

    const degrees =
      componentNodes
        .map(
          node => ({

            id:
              node.id,

            type:
              node.type,

            agentId:
              node.agentId ||
              null,

            degree:
              (
                adjacency.get(
                  node.id
                ) ||
                new Set()
              ).size

          })
        )
        .sort(
          (a, b) =>
            b.degree -
            a.degree
        );


    // ----------------------------------------
    // AGENT DEGREE
    // ----------------------------------------

    const agentDegrees =
      degrees
        .filter(
          item =>
            item.type ===
            "AGENT"
        );


    // ----------------------------------------
    // OWNER DEGREE
    // ----------------------------------------

    const ownerDegrees =
      degrees
        .filter(
          item =>
            item.type ===
            "OWNER"
        );


    // ----------------------------------------
    // URI DEGREE
    // ----------------------------------------

    const uriDegrees =
      degrees
        .filter(
          item =>
            item.type ===
            "URI"
        );


    // ----------------------------------------
    // KNOWN AGENT DEGREE
    // ----------------------------------------

    const knownDegree =
      degrees.find(
        item =>
          item.id ===
          knownNodeId
      ) ||
      null;


    // ----------------------------------------
    // BRIDGE CANDIDATES
    // ----------------------------------------
    //
    // Exact betweenness centrality would require
    // a heavier algorithm. Here we identify
    // structural bridge candidates:
    //
    // nodes connecting many agents/owners/URIs.
    //

    const bridgeCandidates =
      degrees
        .filter(
          item =>
            item.degree >= 5
        )
        .slice(
          0,
          50
        );


    // ----------------------------------------
    // EDGE TYPES
    // ----------------------------------------

    const edgeTypeCounts = {};

    for (
      const edge
      of componentEdges
    ) {

      const type =
        edge.relation ||
        "UNKNOWN";

      edgeTypeCounts[type] =
        (
          edgeTypeCounts[type] ||
          0
        ) + 1;

    }


    // ----------------------------------------
    // AGENT → OWNER / URI STRUCTURE
    // ----------------------------------------

    const knownNeighbors =
      Array.from(
        adjacency.get(
          knownNodeId
        ) ||
        new Set()
      );


    const knownNeighborNodes =
      knownNeighbors
        .map(
          id =>
            nodeMap.get(id)
        )
        .filter(Boolean);


    const knownOwnerLinks =
      knownNeighborNodes
        .filter(
          node =>
            node.type ===
            "OWNER"
        );


    const knownURILinks =
      knownNeighborNodes
        .filter(
          node =>
            node.type ===
            "URI"
        );


    const knownAgentLinks =
      knownNeighborNodes
        .filter(
          node =>
            node.type ===
            "AGENT"
        );


    // ----------------------------------------
    // COMPONENT CLASSIFICATION
    // ----------------------------------------

    let classification =
      "SMALL_COMPONENT";


    if (
      knownComponent.nodeCount >= 100
    ) {

      classification =
        "LARGE_COMPONENT";

    }


    if (
      knownComponent.agentCount >= 50 &&
      knownComponent.ownerCount >= 5
    ) {

      classification =
        "MULTI_OWNER_AGENT_COMPONENT";

    }


    if (
      knownComponent.agentCount >= 50 &&
      knownComponent.uriCount >= 5
    ) {

      classification =
        "MULTI_URI_AGENT_COMPONENT";

    }


    // ----------------------------------------
    // KNOWN AGENT BRIDGE STATUS
    // ----------------------------------------

    let bridgeStatus =
      "LOW";


    if (
      knownDegree &&
      knownDegree.degree >= 10
    ) {

      bridgeStatus =
        "MEDIUM";

    }


    if (
      knownDegree &&
      knownDegree.degree >= 50
    ) {

      bridgeStatus =
        "HIGH";

    }


    knownAnalysis = {

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

      classification,

      knownAgentDegree:
        knownDegree?.degree ||
        0,

      knownAgentBridgeStatus:
        bridgeStatus,

      directOwnerLinks:
        knownOwnerLinks.length,

      directURILinks:
        knownURILinks.length,

      directAgentLinks:
        knownAgentLinks.length,

      edgeTypeCounts,

      topAgentNodes:
        agentDegrees.slice(
          0,
          20
        ),

      topOwnerNodes:
        ownerDegrees.slice(
          0,
          20
        ),

      topURINodes:
        uriDegrees.slice(
          0,
          20
        ),

      bridgeCandidates

    };

  }


  // ==========================================
  // GLOBAL COMPONENT SUMMARY
  // ==========================================

  const componentDistribution = {

    total:
      componentResults.length,

    isolatedNodes:
      componentResults.filter(
        component =>
          component.nodeCount === 1
      ).length,

    small:
      componentResults.filter(
        component =>
          component.nodeCount < 10
      ).length,

    medium:
      componentResults.filter(
        component =>
          component.nodeCount >= 10 &&
          component.nodeCount < 100
      ).length,

    large:
      componentResults.filter(
        component =>
          component.nodeCount >= 100
      ).length

  };


  // ==========================================
  // OUTPUT
  // ==========================================

  const output = {

    schemaVersion:
      "2.4",

    engine:
      "GRAPH_COMPONENT_INTELLIGENCE",

    generatedAt:
      new Date().toISOString(),

    source:
      INPUT_FILE,


    graph: {

      nodes:
        nodes.length,

      edges:
        edges.length

    },


    componentDistribution,


    largestComponents:
      componentResults.slice(
        0,
        25
      ),


    knownAgent:
      knownAnalysis,


    allComponents:
      componentResults

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
  console.log("          V24 FINAL RESULT");
  console.log("==========================================");
  console.log("");

  console.log(
    "Connected components:",
    componentResults.length
  );

  console.log(
    "Isolated nodes:",
    componentDistribution.isolatedNodes
  );

  console.log(
    "Small components:",
    componentDistribution.small
  );

  console.log(
    "Medium components:",
    componentDistribution.medium
  );

  console.log(
    "Large components:",
    componentDistribution.large
  );

  console.log("");


  console.log("==========================================");
  console.log("        LARGEST COMPONENTS");
  console.log("==========================================");
  console.log("");


  for (
    const component
    of componentResults.slice(
      0,
      10
    )
  ) {

    console.log(
      `Component #${component.componentId}`
    );

    console.log(
      `Nodes: ${component.nodeCount}`
    );

    console.log(
      `Edges: ${component.edgeCount}`
    );

    console.log(
      `Agents: ${component.agentCount}`
    );

    console.log(
      `Owners: ${component.ownerCount}`
    );

    console.log(
      `URIs: ${component.uriCount}`
    );

    console.log("");

  }


  console.log("==========================================");
  console.log("          KNOWN AGENT 845265");
  console.log("==========================================");
  console.log("");


  if (knownAnalysis) {

    console.log(
      "Component:",
      knownAnalysis.componentId
    );

    console.log(
      "Nodes:",
      knownAnalysis.nodeCount
    );

    console.log(
      "Edges:",
      knownAnalysis.edgeCount
    );

    console.log(
      "Agents:",
      knownAnalysis.agentCount
    );

    console.log(
      "Owners:",
      knownAnalysis.ownerCount
    );

    console.log(
      "URIs:",
      knownAnalysis.uriCount
    );

    console.log(
      "Density:",
      knownAnalysis.density
    );

    console.log(
      "Classification:",
      knownAnalysis.classification
    );

    console.log(
      "845265 degree:",
      knownAnalysis.knownAgentDegree
    );

    console.log(
      "845265 bridge status:",
      knownAnalysis.knownAgentBridgeStatus
    );

    console.log(
      "Direct owner links:",
      knownAnalysis.directOwnerLinks
    );

    console.log(
      "Direct URI links:",
      knownAnalysis.directURILinks
    );

    console.log(
      "Direct agent links:",
      knownAnalysis.directAgentLinks
    );

    console.log("");

    console.log(
      "Top bridge candidates:"
    );

    for (
      const candidate
      of knownAnalysis.bridgeCandidates.slice(
        0,
        10
      )
    ) {

      console.log(
        `  ${candidate.id} | ${candidate.type} | degree ${candidate.degree}`
      );

    }

  } else {

    console.log(
      "🔴 Agent 845265 component bulunamadı."
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
    "      GRAPH COMPONENT INTELLIGENCE TAMAMLANDI"
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
  console.error("❌ V24 kritik hata:");
  console.error(
    error.message ||
    error
  );
  console.error("");

  process.exit(1);
}
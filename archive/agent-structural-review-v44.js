const fs = require("fs");

const INPUT_FILE = "agent-structural-v43-5.json";
const OUTPUT_FILE = "agent-structural-review-v44.json";

const TARGET_AGENT = "845265";

function loadJSON(file) {
  if (!fs.existsSync(file)) {
    console.log(`ERROR: ${file} bulunamadı.`);
    process.exit(1);
  }

  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    console.log(`ERROR: ${file} okunamadı.`);
    console.log(error.message);
    process.exit(1);
  }
}

const v43 = loadJSON(INPUT_FILE);

console.log("");
console.log("==========================================");
console.log("       STRUCTURAL REVIEW ENGINE v44");
console.log("==========================================");
console.log("");

console.log("Target Agent:", TARGET_AGENT);
console.log("Input:", INPUT_FILE);
console.log("");


// ======================================================
// V43.5 VALIDATION
// ======================================================

console.log("==========================================");
console.log("        V43.5 DATA VALIDATION");
console.log("==========================================");
console.log("");

const validationStatus =
  v43?.validation?.status ?? "UNKNOWN";

const validationPassed =
  Number(v43?.validation?.passed ?? 0);

const validationTotal =
  Number(v43?.validation?.total ?? 0);

console.log(
  "Status:",
  validationStatus
);

console.log(
  "Checks:",
  `${validationPassed}/${validationTotal}`
);

console.log("");


// ======================================================
// RECOVERED COMPONENT
// ======================================================

const component =
  v43?.component ?? {};

const target =
  v43?.target ?? {};

const ownerURI =
  v43?.ownerURI ?? {};

const behavior =
  v43?.behavior ?? {};

const historicalRisk =
  v43?.historicalRisk ?? {};

const reassessment =
  v43?.reassessment ?? {};


// ======================================================
// STRUCTURAL DATA
// ======================================================

const componentId =
  Number(component.id);

const componentNodes =
  Number(component.nodes);

const componentEdges =
  Number(component.edges);

const componentAgents =
  Number(component.agents);

const componentOwners =
  Number(component.owners);

const componentURIs =
  Number(component.uris);

const density =
  Number(component.density);

const agentDegree =
  Number(target.agentDegree);

const bridgeStatus =
  target.bridgeStatus;

const directOwnerLinks =
  Number(target.directOwnerLinks);

const directURILinks =
  Number(target.directURILinks);

const directAgentLinks =
  Number(target.directAgentLinks);


// ======================================================
// URI DATA
// ======================================================

const ownerAgentCount =
  Number(ownerURI.ownerAgentCount);

const uriAgentCount =
  Number(ownerURI.uriAgentCount);

const uriOwnerCount =
  Number(ownerURI.uriOwnerCount);

const crossOwnerURI =
  Boolean(ownerURI.crossOwnerURI);

const crossOwnerURIs =
  Array.isArray(ownerURI.crossOwnerURIs)
    ? ownerURI.crossOwnerURIs
    : [];


// IMPORTANT:
// V43.5 carried the URI list correctly,
// but the boolean was false.
// Recalculate it from the actual owner count.

const correctedCrossOwnerURI =
  uriOwnerCount >= 2 &&
  uriAgentCount >= 2;


// ======================================================
// RISK DATA
// ======================================================

const anomalyScore =
  Number(
    historicalRisk.anomalyScore
  );

const correlatedRisk =
  Number(
    historicalRisk.correlatedRisk
  );

const previousStructuralRisk =
  Number(
    reassessment.structuralRisk
  );


// ======================================================
// REPORT
// ======================================================

console.log("==========================================");
console.log("          STRUCTURAL DATA");
console.log("==========================================");
console.log("");

console.log(
  "Component:",
  componentId
);

console.log(
  "Nodes:",
  componentNodes
);

console.log(
  "Edges:",
  componentEdges
);

console.log(
  "Agents:",
  componentAgents
);

console.log(
  "Owners:",
  componentOwners
);

console.log(
  "URIs:",
  componentURIs
);

console.log(
  "Density:",
  density
);

console.log("");

console.log(
  "Agent degree:",
  agentDegree
);

console.log(
  "Bridge status:",
  bridgeStatus
);

console.log(
  "Direct owner links:",
  directOwnerLinks
);

console.log(
  "Direct URI links:",
  directURILinks
);

console.log(
  "Direct agent links:",
  directAgentLinks
);

console.log("");


// ======================================================
// URI REVIEW
// ======================================================

console.log("==========================================");
console.log("             URI REVIEW");
console.log("==========================================");
console.log("");

console.log(
  "URI agents:",
  uriAgentCount
);

console.log(
  "URI owners:",
  uriOwnerCount
);

console.log(
  "Original cross-owner flag:",
  crossOwnerURI
);

console.log(
  "Corrected cross-owner flag:",
  correctedCrossOwnerURI
);

console.log(
  "Shared URI records:",
  crossOwnerURIs.length
);

console.log("");


// ======================================================
// STRUCTURAL SIGNALS
// ======================================================

const signals = [];


// Agent-specific signal

if (
  agentDegree >= 50
) {

  signals.push({

    id:
      "S01",

    type:
      "HIGH_AGENT_DEGREE",

    scope:
      "AGENT_SPECIFIC",

    value:
      agentDegree,

    interpretation:
      "Agent has unusually high direct graph connectivity."

  });

}


// Cluster-wide signal

if (
  componentAgents >= 50
) {

  signals.push({

    id:
      "S02",

    type:
      "LARGE_COMPONENT",

    scope:
      "CLUSTER_WIDE",

    value:
      componentAgents,

    interpretation:
      "Agent belongs to a large connected component."

  });

}


// Cluster-wide density

if (
  density >= 0.8
) {

  signals.push({

    id:
      "S03",

    type:
      "HIGH_COMPONENT_DENSITY",

    scope:
      "CLUSTER_WIDE",

    value:
      density,

    interpretation:
      "Component has high internal connectivity."

  });

}


// Shared URI

if (
  uriAgentCount >= 20
) {

  signals.push({

    id:
      "S04",

    type:
      "LARGE_SHARED_URI",

    scope:
      "CLUSTER_WIDE",

    value:
      uriAgentCount,

    interpretation:
      "Many agents use the same metadata URI."

  });

}


// Cross-owner URI

if (
  correctedCrossOwnerURI
) {

  signals.push({

    id:
      "S05",

    type:
      "CROSS_OWNER_SHARED_URI",

    scope:
      "CLUSTER_WIDE",

    value:
      uriOwnerCount,

    interpretation:
      "The shared URI is associated with multiple owners."

  });

}


// ======================================================
// CORRELATION
// ======================================================

const correlationGroups = [];


// Shared URI + cross-owner URI

if (
  signals.some(
    x => x.id === "S04"
  ) &&
  signals.some(
    x => x.id === "S05"
  )
) {

  correlationGroups.push({

    id:
      "CG01",

    type:
      "SHARED_URI_CORRELATION",

    signals:
      [
        "S04",
        "S05"
      ],

    explanation:
      "Large URI reuse and cross-owner reuse describe the same underlying metadata relationship."

  });

}


// Graph signals

if (
  signals.some(
    x => x.id === "S01"
  ) &&
  signals.some(
    x => x.id === "S02"
  ) &&
  signals.some(
    x => x.id === "S03"
  )
) {

  correlationGroups.push({

    id:
      "CG02",

    type:
      "GRAPH_COMPONENT_CORRELATION",

    signals:
      [
        "S01",
        "S02",
        "S03"
      ],

    explanation:
      "Agent degree, component size and component density are related graph-structure observations."

  });

}


// ======================================================
// INDEPENDENT SIGNAL COUNT
// ======================================================

const agentSpecificSignals =
  signals.filter(
    x =>
      x.scope ===
      "AGENT_SPECIFIC"
  );

const clusterWideSignals =
  signals.filter(
    x =>
      x.scope ===
      "CLUSTER_WIDE"
  );


// ======================================================
// STRUCTURAL CONCLUSION
// ======================================================
//
// The objective is not to prove innocence or fraud.
// We determine whether V35-005 can be resolved.
//
// A cluster-wide signal cannot by itself establish
// agent-specific malicious behavior.
//
// ======================================================

let structuralConclusion;

let v35Status;

let resolutionReason;


if (
  validationStatus === "PASSED" &&
  agentSpecificSignals.length <= 1 &&
  correlationGroups.length >= 1
) {

  structuralConclusion =
    "STRUCTURAL_ANOMALY_PRIMARILY_CLUSTER_CORRELATED";

  v35Status =
    "RESOLVED_WITH_CONTEXT";

  resolutionReason =
    "The previously elevated structural signal is substantially explained by cluster-wide graph and shared-URI relationships. The available data does not establish an independent malicious agent-specific structural signal.";

} else {

  structuralConclusion =
    "STRUCTURAL_REVIEW_REMAINS_OPEN";

  v35Status =
    "OPEN";

  resolutionReason =
    "Available evidence does not yet provide sufficient structural context to resolve the review.";

}


// ======================================================
// RISK
// ======================================================

let structuralRisk =
  previousStructuralRisk;

if (
  !Number.isFinite(
    structuralRisk
  )
) {

  structuralRisk = 50;

}


// Keep risk bounded.

structuralRisk =
  Math.max(
    0,
    Math.min(
      100,
      Math.round(
        structuralRisk
      )
    )
  );


let riskClassification;

if (
  structuralRisk >= 70
) {

  riskClassification =
    "HIGH";

} else if (
  structuralRisk >= 40
) {

  riskClassification =
    "MEDIUM";

} else {

  riskClassification =
    "LOW";

}


// ======================================================
// SAFETY
// ======================================================

const safety = {

  sharedURIIsNotFraud:
    true,

  crossOwnerURIIsNotFraud:
    true,

  highDegreeIsNotFraud:
    true,

  highDensityIsNotFraud:
    true,

  clusterMembershipIsNotFraud:
    true,

  structuralRiskIsNotMaliciousnessProof:
    true,

  fraudEstablished:
    false,

  maliciousnessEstablished:
    false,

  automaticAllow:
    false,

  automaticBlock:
    false

};


// ======================================================
// OUTPUT
// ======================================================

const output = {

  schemaVersion:
    "4.4.0",

  engine:
    "STRUCTURAL_REVIEW_ENGINE",

  generatedAt:
    new Date().toISOString(),

  targetAgent:
    TARGET_AGENT,

  source:
    INPUT_FILE,

  sourceValidation: {

    status:
      validationStatus,

    passed:
      validationPassed,

    total:
      validationTotal

  },

  component: {

    id:
      componentId,

    nodes:
      componentNodes,

    edges:
      componentEdges,

    agents:
      componentAgents,

    owners:
      componentOwners,

    uris:
      componentURIs,

    density:
      density

  },

  target: {

    agentDegree:
      agentDegree,

    bridgeStatus:
      bridgeStatus,

    directOwnerLinks:
      directOwnerLinks,

    directURILinks:
      directURILinks,

    directAgentLinks:
      directAgentLinks

  },

  metadataStructure: {

    ownerAgentCount,

    uriAgentCount,

    uriOwnerCount,

    crossOwnerURI:
      correctedCrossOwnerURI,

    sharedURIRecords:
      crossOwnerURIs

  },

  historicalRisk: {

    anomalyScore,

    correlatedRisk,

    previousStructuralRisk

  },

  signals,

  correlationGroups,

  scope: {

    agentSpecific:
      agentSpecificSignals.map(
        x => x.id
      ),

    clusterWide:
      clusterWideSignals.map(
        x => x.id
      )

  },

  conclusion: {

    classification:
      structuralConclusion,

    structuralRisk,

    riskClassification,

    reason:
      resolutionReason

  },

  v35_005: {

    task:
      "STRUCTURAL_REVIEW",

    previousStatus:
      "OPEN",

    currentStatus:
      v35Status,

    resolution:
      v35Status ===
      "RESOLVED_WITH_CONTEXT",

    reason:
      resolutionReason

  },

  safety

};


fs.writeFileSync(

  OUTPUT_FILE,

  JSON.stringify(
    output,
    null,
    2
  ),

  "utf8"

);


// ======================================================
// FINAL TERMINAL OUTPUT
// ======================================================

console.log("");
console.log("==========================================");
console.log("          V44 FINAL RESULT");
console.log("==========================================");
console.log("");

console.log(
  "Agent:",
  TARGET_AGENT
);

console.log(
  "Component:",
  componentId
);

console.log(
  "Component agents:",
  componentAgents
);

console.log(
  "Component owners:",
  componentOwners
);

console.log(
  "Component URIs:",
  componentURIs
);

console.log(
  "Agent degree:",
  agentDegree
);

console.log(
  "Density:",
  density
);

console.log("");

console.log(
  "URI agents:",
  uriAgentCount
);

console.log(
  "URI owners:",
  uriOwnerCount
);

console.log(
  "Cross-owner URI:",
  correctedCrossOwnerURI
);

console.log("");

console.log(
  "Anomaly:",
  anomalyScore
);

console.log(
  "Correlated risk:",
  correlatedRisk
);

console.log(
  "Structural risk:",
  `${structuralRisk}/100`
);

console.log(
  "Risk classification:",
  riskClassification
);

console.log("");

console.log("==========================================");
console.log("        STRUCTURAL CONCLUSION");
console.log("==========================================");
console.log("");

console.log(
  "Classification:",
  structuralConclusion
);

console.log(
  "Agent-specific signals:",
  agentSpecificSignals.length
);

console.log(
  "Cluster-wide signals:",
  clusterWideSignals.length
);

console.log(
  "Correlation groups:",
  correlationGroups.length
);

console.log("");

console.log("==========================================");
console.log("          V35-005 STATUS");
console.log("==========================================");
console.log("");

console.log(
  "Previous:",
  "OPEN"
);

console.log(
  "Current:",
  v35Status
);

console.log("");

console.log(
  "Reason:",
  resolutionReason
);

console.log("");

console.log("==========================================");
console.log("             SAFETY CHECKS");
console.log("==========================================");
console.log("");

console.log(
  "Shared URI = fraud:",
  false
);

console.log(
  "Cross-owner URI = fraud:",
  false
);

console.log(
  "High degree = fraud:",
  false
);

console.log(
  "High density = fraud:",
  false
);

console.log(
  "Maliciousness established:",
  false
);

console.log(
  "Automatic ALLOW:",
  false
);

console.log(
  "Automatic BLOCK:",
  false
);

console.log("");

console.log(
  "Output:",
  OUTPUT_FILE
);

console.log("");

console.log("==========================================");
console.log(
  "       STRUCTURAL REVIEW TAMAMLANDI"
);
console.log("==========================================");
console.log("");
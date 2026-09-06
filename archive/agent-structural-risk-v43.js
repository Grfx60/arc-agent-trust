const fs = require("fs");

const TARGET_AGENT = "845265";

const V24_FILE =
  "agent-graph-component-v24.json";

const V25_FILE =
  "agent-component-forensics-v25.json";

const V26_FILE =
  "agent-behavioral-profile-v26.json";

const V27_FILE =
  "agent-anomaly-detection-v27.json";

const V29_FILE =
  "agent-risk-correlation-v29.json";

const V32_FILE =
  "agent-evidence-calibration-v32.json";

const V35_FILE =
  "agent-evidence-gap-v35.json";

const V42_FILE =
  "agent-metadata-independence-v42.json";

const OUTPUT_FILE =
  "agent-structural-risk-v43.json";


function loadJSON(file) {

  if (!fs.existsSync(file)) {
    return null;
  }

  try {

    return JSON.parse(
      fs.readFileSync(
        file,
        "utf8"
      )
    );

  } catch {

    return null;

  }

}


function number(value, fallback = 0) {

  const n =
    Number(value);

  return Number.isFinite(n)
    ? n
    : fallback;

}


function bool(value) {

  return value === true;

}


function findKnownAgent(
  data,
  agentId
) {

  if (!data) {
    return null;
  }

  const target =
    String(agentId);

  const candidates = [

    data.agent,

    data.knownAgent,

    data.target,

    data.agentData,

    data.knownAgentData

  ];

  for (
    const item
    of candidates
  ) {

    if (
      item &&
      typeof item === "object"
    ) {

      const id =
        String(
          item.agentId ??
          item.id ??
          ""
        );

      if (
        id === target
      ) {

        return item;

      }

    }

  }

  return null;

}


console.log("");
console.log("==========================================");
console.log("       STRUCTURAL RISK REASSESSMENT v43");
console.log("==========================================");
console.log("");

console.log(
  "Target Agent:",
  TARGET_AGENT
);

console.log("");


// ==========================================
// LOAD SOURCES
// ==========================================

const v24 =
  loadJSON(V24_FILE);

const v25 =
  loadJSON(V25_FILE);

const v26 =
  loadJSON(V26_FILE);

const v27 =
  loadJSON(V27_FILE);

const v29 =
  loadJSON(V29_FILE);

const v32 =
  loadJSON(V32_FILE);

const v35 =
  loadJSON(V35_FILE);

const v42 =
  loadJSON(V42_FILE);


console.log("==========================================");
console.log("        DATA AVAILABILITY");
console.log("==========================================");
console.log("");

console.log(
  "V24:",
  v24 ? "OK" : "MISSING"
);

console.log(
  "V25:",
  v25 ? "OK" : "MISSING"
);

console.log(
  "V26:",
  v26 ? "OK" : "MISSING"
);

console.log(
  "V27:",
  v27 ? "OK" : "MISSING"
);

console.log(
  "V29:",
  v29 ? "OK" : "MISSING"
);

console.log(
  "V32:",
  v32 ? "OK" : "MISSING"
);

console.log(
  "V35:",
  v35 ? "OK" : "MISSING"
);

console.log(
  "V42:",
  v42 ? "OK" : "MISSING"
);

console.log("");


// ==========================================
// EXTRACT V24
// ==========================================

const v24Agent =
  findKnownAgent(
    v24,
    TARGET_AGENT
  ) ||
  v24?.knownAgent ||
  {};


const componentId =
  v24Agent.component ??
  v24Agent.componentId ??
  v24?.knownAgent?.component ??
  null;


const componentNodes =
  number(
    v24Agent.nodes ??
    v24Agent.componentNodes ??
    v24?.knownAgent?.nodes
  );


const componentEdges =
  number(
    v24Agent.edges ??
    v24Agent.componentEdges ??
    v24?.knownAgent?.edges
  );


const componentAgents =
  number(
    v24Agent.agents ??
    v24Agent.componentAgents ??
    v24?.knownAgent?.agents
  );


const componentOwners =
  number(
    v24Agent.owners ??
    v24Agent.componentOwners ??
    v24?.knownAgent?.owners
  );


const componentURIs =
  number(
    v24Agent.uris ??
    v24Agent.componentURIs
  );


const degree =
  number(
    v24Agent.degree ??
    v24Agent.knownAgentDegree
  );


const previousDensity =
  number(
    v24Agent.density
  );


const previousClassification =
  v24Agent.classification ||
  v24Agent.structuralProfile ||
  null;


// ==========================================
// V25
// ==========================================

const v25Agent =
  findKnownAgent(
    v25,
    TARGET_AGENT
  ) ||
  v25?.knownAgent ||
  {};


const v25Classification =
  v25Agent.classification ||
  null;


const crossOwnerURI =
  bool(
    v25Agent.crossOwnerURI ??
    v25Agent.crossOwnerUri ??
    v25?.knownAgent?.crossOwnerURI
  );


const ownerAgentCount =
  number(
    v25Agent.ownerAgents ??
    v25Agent.ownerAgentCount ??
    v25?.knownAgent?.ownerAgents
  );


const uriAgentCount =
  number(
    v25Agent.uriAgents ??
    v25Agent.uriAgentCount ??
    v25?.knownAgent?.uriAgents
  );


const uriOwnerCount =
  number(
    v25Agent.uriOwners ??
    v25Agent.uriOwnerCount ??
    v25?.knownAgent?.uriOwners
  );


// ==========================================
// V26
// ==========================================

const v26Agent =
  findKnownAgent(
    v26,
    TARGET_AGENT
  ) ||
  v26?.knownAgent ||
  {};


const ownerDeviation =
  number(
    v26Agent.ownerDeviation ??
    v26?.knownAgent?.ownerDeviation
  );


const uriDeviation =
  number(
    v26Agent.uriDeviation ??
    v26?.knownAgent?.uriDeviation
  );


const behavior =
  v26Agent.behavior ??
  v26?.knownAgent?.behavior ??
  null;


// ==========================================
// V27
// ==========================================

const v27Agent =
  findKnownAgent(
    v27,
    TARGET_AGENT
  ) ||
  v27?.knownAgent ||
  {};


const anomalyScore =
  number(
    v27Agent.anomalyScore ??
    v27?.anomalyScore ??
    v27?.knownAgent?.anomalyScore
  );


const anomalyClassification =
  v27Agent.classification ??
  v27?.classification ??
  v27?.knownAgent?.classification ??
  null;


const anomalySignals =
  v27Agent.signals ??
  v27?.signals ??
  v27?.anomalySignals ??
  [];


// ==========================================
// V29
// ==========================================

const v29Agent =
  findKnownAgent(
    v29,
    TARGET_AGENT
  ) ||
  v29?.knownAgent ||
  {};


const correlatedRisk =
  number(
    v29Agent.correlatedRisk ??
    v29?.correlatedRisk ??
    v29?.knownAgent?.correlatedRisk
  );


const riskClassification =
  v29Agent.riskClassification ??
  v29?.riskClassification ??
  null;


// ==========================================
// V32
// ==========================================

const v32Agent =
  findKnownAgent(
    v32,
    TARGET_AGENT
  ) ||
  v32?.knownAgent ||
  {};


const calibratedStructuralRisk =
  number(
    v32Agent.structuralRisk ??
    v32?.structuralRisk ??
    v32?.knownAgent?.structuralRisk
  );


// ==========================================
// V35
// ==========================================

const v35Agent =
  findKnownAgent(
    v35,
    TARGET_AGENT
  ) ||
  v35?.knownAgent ||
  {};


const structuralTask =
  v35?.tasks?.find?.(
    task =>
      task.id ===
      "V35-005"
  ) ||
  v35?.openTasks?.find?.(
    task =>
      task.id ===
      "V35-005"
  ) ||
  null;


// ==========================================
// V42 METADATA CONTEXT
// ==========================================

const metadataSharedAgents =
  number(
    v42?.sharedURI?.agents
  );


const metadataSharedOwners =
  number(
    v42?.sharedURI?.owners
  );


const metadataClassification =
  v42?.sharedURI?.classification ||
  null;


// ==========================================
// STRUCTURAL SIGNAL DECOMPOSITION
// ==========================================

console.log("==========================================");
console.log("      STRUCTURAL SIGNAL DECOMPOSITION");
console.log("==========================================");
console.log("");


const signals = [];


// ------------------------------------------
// SIGNAL 1 — LARGE COMPONENT
// ------------------------------------------

if (
  componentAgents >= 50
) {

  signals.push({

    id:
      "S01",

    type:
      "LARGE_COMPONENT",

    severity:
      "MEDIUM",

    observed:
      true,

    value:
      componentAgents,

    interpretation:
      "Agent belongs to a large connected component."

  });

}


// ------------------------------------------
// SIGNAL 2 — HIGH DENSITY
// ------------------------------------------

if (
  previousDensity >= 0.8
) {

  signals.push({

    id:
      "S02",

    type:
      "HIGH_COMPONENT_DENSITY",

    severity:
      "MEDIUM",

    observed:
      true,

    value:
      previousDensity,

    interpretation:
      "Component has high graph density."

  });

}


// ------------------------------------------
// SIGNAL 3 — HIGH DEGREE
// ------------------------------------------

if (
  degree >= 50
) {

  signals.push({

    id:
      "S03",

    type:
      "HIGH_AGENT_DEGREE",

    severity:
      "MEDIUM",

    observed:
      true,

    value:
      degree,

    interpretation:
      "Agent has many direct graph relationships."

  });

}


// ------------------------------------------
// SIGNAL 4 — SHARED URI
// ------------------------------------------

if (
  uriAgentCount >= 20
) {

  signals.push({

    id:
      "S04",

    type:
      "LARGE_SHARED_URI",

    severity:
      "HIGH",

    observed:
      true,

    value:
      uriAgentCount,

    interpretation:
      "Agent metadata URI is shared by many agents."

  });

}


// ------------------------------------------
// SIGNAL 5 — CROSS OWNER URI
// ------------------------------------------

if (
  crossOwnerURI &&
  uriOwnerCount >= 2
) {

  signals.push({

    id:
      "S05",

    type:
      "CROSS_OWNER_SHARED_URI",

    severity:
      "HIGH",

    observed:
      true,

    value:
      uriOwnerCount,

    interpretation:
      "Shared URI spans multiple owners."

  });

}


// ------------------------------------------
// SIGNAL 6 — OWNER DEVIATION
// ------------------------------------------

if (
  ownerDeviation >= 2
) {

  signals.push({

    id:
      "S06",

    type:
      "OWNER_DEVIATION",

    severity:
      "MEDIUM",

    observed:
      true,

    value:
      ownerDeviation,

    interpretation:
      "Owner relationship differs from local baseline."

  });

}


// ------------------------------------------
// SIGNAL 7 — URI DEVIATION
// ------------------------------------------

if (
  uriDeviation >= 2
) {

  signals.push({

    id:
      "S07",

    type:
      "URI_DEVIATION",

    severity:
      "HIGH",

    observed:
      true,

    value:
      uriDeviation,

    interpretation:
      "URI relationship is substantially above local baseline."

  });

}


// ==========================================
// DEPENDENCY / CORRELATION ANALYSIS
// ==========================================

console.log("");
console.log("==========================================");
console.log("      SIGNAL DEPENDENCY ANALYSIS");
console.log("==========================================");
console.log("");


const signalIds =
  new Set(
    signals.map(
      signal =>
        signal.id
    )
  );


const correlatedGroups = [];


if (
  signalIds.has("S04") &&
  signalIds.has("S05")
) {

  correlatedGroups.push({

    group:
      "SHARED_URI_STRUCTURE",

    signals: [
      "S04",
      "S05"
    ],

    explanation:
      "Large shared URI and cross-owner URI are observations of the same underlying URI structure.",

    independentSignalCount:
      1

  });

}


if (
  signalIds.has("S01") &&
  signalIds.has("S02") &&
  signalIds.has("S03")
) {

  correlatedGroups.push({

    group:
      "GRAPH_COMPONENT_STRUCTURE",

    signals: [
      "S01",
      "S02",
      "S03"
    ],

    explanation:
      "Component size, density and degree are related graph observations and should not be counted as fully independent risks.",

    independentSignalCount:
      1

  });

}


if (
  signalIds.has("S06") &&
  signalIds.has("S07")
) {

  correlatedGroups.push({

    group:
      "OWNER_URI_DEVIATION",

    signals: [
      "S06",
      "S07"
    ],

    explanation:
      "Owner and URI deviations may partially reflect the same component structure.",

    independentSignalCount:
      1

  });

}


console.log(
  "Correlated groups:",
  correlatedGroups.length
);

for (
  const group
  of correlatedGroups
) {

  console.log(
    group.group
  );

  console.log(
    "  Signals:",
    group.signals.join(", ")
  );

  console.log(
    "  Independent signal count:",
    group.independentSignalCount
  );

  console.log("");

}


// ==========================================
// METADATA-CONFOUND ANALYSIS
// ==========================================

const metadataConfound =
  (
    metadataSharedAgents >= 20 &&
    metadataSharedOwners >= 2
  );


let structuralConfound =
  false;


if (
  metadataConfound &&
  (
    signalIds.has("S04") ||
    signalIds.has("S05")
  )
) {

  structuralConfound =
    true;

}


console.log("==========================================");
console.log("       METADATA CONFOUND ANALYSIS");
console.log("==========================================");
console.log("");

console.log(
  "Shared metadata agents:",
  metadataSharedAgents
);

console.log(
  "Shared metadata owners:",
  metadataSharedOwners
);

console.log(
  "Metadata classification:",
  metadataClassification ||
  "UNKNOWN"
);

console.log(
  "Structural metadata confound:",
  structuralConfound
);

console.log("");


// ==========================================
// AGENT-SPECIFIC VS CLUSTER-WIDE SIGNALS
// ==========================================

const clusterWideSignals = [];
const agentSpecificSignals = [];


if (
  signalIds.has("S04")
) {

  clusterWideSignals.push(
    "S04"
  );

}

if (
  signalIds.has("S05")
) {

  clusterWideSignals.push(
    "S05"
  );

}

if (
  signalIds.has("S01")
) {

  clusterWideSignals.push(
    "S01"
  );

}

if (
  signalIds.has("S02")
) {

  clusterWideSignals.push(
    "S02"
  );

}

if (
  signalIds.has("S03")
) {

  clusterWideSignals.push(
    "S03"
  );

}

if (
  signalIds.has("S06")
) {

  agentSpecificSignals.push(
    "S06"
  );

}

if (
  signalIds.has("S07")
) {

  agentSpecificSignals.push(
    "S07"
  );

}


console.log("==========================================");
console.log("       SIGNAL SCOPE ANALYSIS");
console.log("==========================================");
console.log("");

console.log(
  "Cluster-wide signals:",
  clusterWideSignals.length
);

console.log(
  "Agent-specific candidate signals:",
  agentSpecificSignals.length
);

console.log("");


// ==========================================
// REASSESSMENT
// ==========================================

let reassessedRisk =
  0;


// Base structural observations.

if (
  componentAgents >= 50
) {

  reassessedRisk +=
    10;

}

if (
  previousDensity >= 0.8
) {

  reassessedRisk +=
    8;

}

if (
  degree >= 50
) {

  reassessedRisk +=
    8;

}


// Shared URI is important, but one underlying
// cause should not be double-counted.

if (
  uriAgentCount >= 20
) {

  reassessedRisk +=
    12;

}


// Cross-owner structure.

if (
  crossOwnerURI &&
  uriOwnerCount >= 2
) {

  reassessedRisk +=
    10;

}


// Deviations.

if (
  ownerDeviation >= 2
) {

  reassessedRisk +=
    8;

}

if (
  uriDeviation >= 2
) {

  reassessedRisk +=
    12;

}


// Correlation discount.

const correlatedSignalCount =
  correlatedGroups.reduce(
    (
      sum,
      group
    ) =>
      sum +
      group.signals.length -
      group.independentSignalCount,
    0
  );


reassessedRisk -=
  correlatedSignalCount * 5;


// Metadata confound discount.

if (
  structuralConfound
) {

  reassessedRisk -=
    10;

}


reassessedRisk =
  Math.max(
    0,
    Math.min(
      100,
      Math.round(
        reassessedRisk
      )
    )
  );


// ==========================================
// CLASSIFICATION
// ==========================================

let classification;

if (
  reassessedRisk >= 70
) {

  classification =
    "HIGH";

} else if (
  reassessedRisk >= 40
) {

  classification =
    "MEDIUM";

} else {

  classification =
    "LOW";

}


// ==========================================
// V35-005 STATUS
// ==========================================

let v35Status =
  "OPEN";


if (
  reassessedRisk < 60
) {

  v35Status =
    "CANDIDATE_FOR_RESOLUTION";

}


// ==========================================
// FINAL INTERPRETATION
// ==========================================

const interpretation = {

  clusterPresenceIsNotFraud:
    true,

  highDegreeIsNotFraud:
    true,

  sharedURIIsNotFraud:
    true,

  crossOwnerURIIsNotFraud:
    true,

  correlatedSignalsNotDoubleCounted:
    true,

  clusterWideSignalsRequireContext:
    true,

  agentSpecificSignalsMoreInformative:
    true,

  maliciousnessEstablished:
    false

};


// ==========================================
// OUTPUT
// ==========================================

const output = {

  schemaVersion:
    "4.3",

  engine:
    "STRUCTURAL_RISK_REASSESSMENT",

  generatedAt:
    new Date().toISOString(),

  agent:
    TARGET_AGENT,

  sourceAvailability: {

    V24:
      !!v24,

    V25:
      !!v25,

    V26:
      !!v26,

    V27:
      !!v27,

    V29:
      !!v29,

    V32:
      !!v32,

    V35:
      !!v35,

    V42:
      !!v42

  },

  previous: {

    component:
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

    degree,

    density:
      previousDensity,

    classification:
      previousClassification,

    v25Classification,

    anomalyScore,

    anomalyClassification,

    correlatedRisk,

    riskClassification,

    calibratedStructuralRisk

  },

  current: {

    ownerDeviation,

    uriDeviation,

    behavior,

    sharedURI: {

      agents:
        uriAgentCount,

      owners:
        uriOwnerCount,

      crossOwner:
        crossOwnerURI

    },

    metadataContext: {

      agents:
        metadataSharedAgents,

      owners:
        metadataSharedOwners,

      classification:
        metadataClassification

    }

  },

  signals,

  correlatedGroups,

  scope: {

    clusterWideSignals,

    agentSpecificSignals,

    structuralConfound

  },

  reassessment: {

    risk:
      reassessedRisk,

    classification,

    previousAnomaly:
      anomalyScore,

    previousCorrelatedRisk:
      correlatedRisk

  },

  v35_005: {

    task:
      "STRUCTURAL_REVIEW",

    status:
      v35Status,

    previousTarget:
      "< 60",

    currentRisk:
      reassessedRisk

  },

  interpretation,

  safety: {

    automaticAllow:
      false,

    automaticBlock:
      false,

    fraudEstablished:
      false,

    maliciousnessEstablished:
      false

  }

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


// ==========================================
// FINAL REPORT
// ==========================================

console.log("");
console.log("==========================================");
console.log("          V43 FINAL RESULT");
console.log("==========================================");
console.log("");

console.log(
  "Agent:",
  TARGET_AGENT
);

console.log(
  "Component:",
  componentId ??
  "UNKNOWN"
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
  degree
);

console.log(
  "Component density:",
  previousDensity
);

console.log("");

console.log(
  "Previous anomaly:",
  anomalyScore,
  "/100"
);

console.log(
  "Previous correlated risk:",
  correlatedRisk,
  "/100"
);

console.log("");

console.log("==========================================");
console.log("      STRUCTURAL REASSESSMENT");
console.log("==========================================");
console.log("");

console.log(
  "Reassessed structural risk:",
  reassessedRisk,
  "/100"
);

console.log(
  "Classification:",
  classification
);

console.log("");

console.log(
  "Cluster-wide signals:",
  clusterWideSignals.length
);

console.log(
  "Agent-specific candidate signals:",
  agentSpecificSignals.length
);

console.log(
  "Correlated groups:",
  correlatedGroups.length
);

console.log(
  "Metadata structural confound:",
  structuralConfound
);

console.log("");

console.log("==========================================");
console.log("          V35-005 STATUS");
console.log("==========================================");
console.log("");

console.log(
  "STRUCTURAL_REVIEW:",
  v35Status
);

console.log("");

console.log("==========================================");
console.log("             SAFETY CHECKS");
console.log("==========================================");
console.log("");

console.log(
  "Large component = fraud:",
  false
);

console.log(
  "High degree = fraud:",
  false
);

console.log(
  "Shared URI = fraud:",
  false
);

console.log(
  "Cross-owner URI = fraud:",
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
  "📁 Output:",
  OUTPUT_FILE
);

console.log("");

console.log("==========================================");
console.log(
  "      STRUCTURAL RISK REASSESSMENT TAMAMLANDI"
);
console.log("==========================================");
console.log("");
const fs = require("fs");

const TARGET_AGENT = "845265";

const FILES = {
  V24: "agent-graph-component-v24.json",
  V25: "agent-component-forensics-v25.json",
  V26: "agent-behavioral-profile-v26.json",
  V27: "agent-anomaly-detection-v27.json",
  V29: "agent-risk-correlation-v29.json",
  V32: "agent-evidence-calibration-v32.json",
  V42: "agent-metadata-independence-v42.json"
};

const OUTPUT_FILE =
  "agent-structural-v43-5.json";

function loadJSON(file) {
  if (!fs.existsSync(file)) return null;

  try {
    return JSON.parse(
      fs.readFileSync(file, "utf8")
    );
  } catch (error) {
    console.log(
      `ERROR: ${file} -> ${error.message}`
    );
    return null;
  }
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function valueOrNA(value) {
  return value === null ||
    value === undefined
    ? "NOT_FOUND"
    : value;
}

console.log("");
console.log("==========================================");
console.log("       STRUCTURAL RISK ENGINE v43.5");
console.log("==========================================");
console.log("");
console.log("Target Agent:", TARGET_AGENT);
console.log("");


// ======================================================
// LOAD FILES
// ======================================================

const data = {};

for (const [version, file] of Object.entries(FILES)) {
  data[version] = loadJSON(file);
}

console.log("==========================================");
console.log("        DATA AVAILABILITY");
console.log("==========================================");
console.log("");

for (const version of Object.keys(FILES)) {
  console.log(
    `${version}:`,
    data[version] ? "OK" : "MISSING"
  );
}

console.log("");


// ======================================================
// V24 — REAL STRUCTURE
// ======================================================

const v24 = data.V24;

let component = null;
let knownAgent = null;

if (v24) {

  if (Array.isArray(v24.largestComponents)) {
    component =
      v24.largestComponents.find(
        x =>
          String(
            x.componentId
          ) === "29"
      ) ??
      v24.largestComponents[0] ??
      null;
  }

  knownAgent =
    v24.knownAgent ??
    null;
}


// REAL V24 FIELD NAMES

const componentId =
  num(component?.componentId);

const componentNodes =
  num(component?.nodeCount);

const componentEdges =
  num(component?.edgeCount);

const componentAgents =
  num(component?.agentCount);

const componentOwners =
  num(component?.ownerCount);

const componentURIs =
  num(component?.uriCount);

const density =
  num(component?.density);


// V24 known-agent data

const knownAgentId =
  num(
    knownAgent?.agentId
  );

const knownAgentDegree =
  num(
    knownAgent?.knownAgentDegree
  );

const knownAgentBridgeStatus =
  knownAgent?.knownAgentBridgeStatus ??
  null;

const directOwnerLinks =
  num(
    knownAgent?.directOwnerLinks
  );

const directURILinks =
  num(
    knownAgent?.directURILinks
  );

const directAgentLinks =
  num(
    knownAgent?.directAgentLinks
  );


// ======================================================
// V25
// ======================================================

const v25 =
  data.V25;

const v25KnownAgent =
  v25?.knownAgentAnalysis ??
  null;

const ownerAgentCount =
  num(
    v25KnownAgent?.ownerAgentCount
  );

const uriAgentCount =
  num(
    v25KnownAgent?.uriAgentCount
  );

const uriOwnerCount =
  num(
    v25KnownAgent?.uriOwnerCount
  );

const crossOwnerURIs =
  Array.isArray(
    v25KnownAgent?.crossOwnerURIs
  )
    ? v25KnownAgent.crossOwnerURIs
    : [];

const crossOwnerURI =
  crossOwnerURIs.length > 0;


// ======================================================
// V26
// ======================================================

const v26 =
  data.V26;

const v26KnownAgent =
  v26?.knownAgent ??
  null;

const ownerDeviation =
  num(
    v26KnownAgent?.ownerDeviation
  );

const uriDeviation =
  num(
    v26KnownAgent?.uriDeviation
  );

const behavior =
  v26KnownAgent?.behavior ??
  null;


// ======================================================
// V27
// ======================================================

const v27 =
  data.V27;

const v27Anomaly =
  v27?.anomaly ??
  null;

const v27Baseline =
  v27?.baseline ??
  null;

const anomalyScore =
  num(
    v27Anomaly?.score
  ) ??
  num(
    v27Anomaly?.anomalyScore
  );

const anomalyClassification =
  v27Anomaly?.classification ??
  null;

const baselineOwnerAgents =
  num(
    v27Baseline?.ownerAgents
  );

const baselineURI =
  num(
    v27Baseline?.uriAgents
  );

const baselineURIOwners =
  num(
    v27Baseline?.uriOwners
  );


// ======================================================
// V29
// ======================================================

const v29 =
  data.V29;

const v29Inputs =
  v29?.inputs ??
  null;

const v29Risk =
  v29?.risk ??
  null;

const v29AnomalyScore =
  num(
    v29Inputs?.anomalyScore
  );

const correlatedRisk =
  num(
    v29Risk?.score
  ) ??
  num(
    v29Risk?.correlatedRisk
  );

const riskClassification =
  v29Risk?.classification ??
  null;


// ======================================================
// V32
// ======================================================

const v32 =
  data.V32;

const v32Risk =
  v32?.risk ??
  null;

const structuralRiskV32 =
  num(
    v32Risk?.structuralRisk
  ) ??
  num(
    v32Risk?.score
  );

const v32Classification =
  v32Risk?.classification ??
  null;


// ======================================================
// V42
// ======================================================

const v42 =
  data.V42;

const v42SharedURI =
  v42?.sharedURI ??
  null;

const v42Agents =
  num(
    v42SharedURI?.agents
  );

const v42Owners =
  num(
    v42SharedURI?.owners
  );

const v42Classification =
  v42SharedURI?.classification ??
  null;


// ======================================================
// RECOVERED DATA
// ======================================================

console.log("==========================================");
console.log("       RECOVERED V24 STRUCTURE");
console.log("==========================================");
console.log("");

console.log(
  "Component:",
  valueOrNA(componentId)
);

console.log(
  "Component nodes:",
  valueOrNA(componentNodes)
);

console.log(
  "Component edges:",
  valueOrNA(componentEdges)
);

console.log(
  "Component agents:",
  valueOrNA(componentAgents)
);

console.log(
  "Component owners:",
  valueOrNA(componentOwners)
);

console.log(
  "Component URIs:",
  valueOrNA(componentURIs)
);

console.log(
  "Density:",
  valueOrNA(density)
);

console.log("");

console.log(
  "Known agent degree:",
  valueOrNA(knownAgentDegree)
);

console.log(
  "Bridge status:",
  valueOrNA(knownAgentBridgeStatus)
);

console.log(
  "Direct owner links:",
  valueOrNA(directOwnerLinks)
);

console.log(
  "Direct URI links:",
  valueOrNA(directURILinks)
);

console.log(
  "Direct agent links:",
  valueOrNA(directAgentLinks)
);

console.log("");


// ======================================================
// V25
// ======================================================

console.log("==========================================");
console.log("             RECOVERED V25");
console.log("==========================================");
console.log("");

console.log(
  "Owner agents:",
  valueOrNA(ownerAgentCount)
);

console.log(
  "URI agents:",
  valueOrNA(uriAgentCount)
);

console.log(
  "URI owners:",
  valueOrNA(uriOwnerCount)
);

console.log(
  "Cross-owner URI:",
  crossOwnerURI
);

console.log("");


// ======================================================
// V26
// ======================================================

console.log("==========================================");
console.log("             RECOVERED V26");
console.log("==========================================");
console.log("");

console.log(
  "Owner deviation:",
  valueOrNA(ownerDeviation)
);

console.log(
  "URI deviation:",
  valueOrNA(uriDeviation)
);

console.log(
  "Behavior:",
  valueOrNA(behavior)
);

console.log("");


// ======================================================
// V27
// ======================================================

console.log("==========================================");
console.log("             RECOVERED V27");
console.log("==========================================");
console.log("");

console.log(
  "Anomaly score:",
  valueOrNA(anomalyScore)
);

console.log(
  "Classification:",
  valueOrNA(anomalyClassification)
);

console.log(
  "Baseline owner agents:",
  valueOrNA(baselineOwnerAgents)
);

console.log(
  "Baseline URI agents:",
  valueOrNA(baselineURI)
);

console.log(
  "Baseline URI owners:",
  valueOrNA(baselineURIOwners)
);

console.log("");


// ======================================================
// V29
// ======================================================

console.log("==========================================");
console.log("             RECOVERED V29");
console.log("==========================================");
console.log("");

console.log(
  "Anomaly input:",
  valueOrNA(v29AnomalyScore)
);

console.log(
  "Correlated risk:",
  valueOrNA(correlatedRisk)
);

console.log(
  "Classification:",
  valueOrNA(riskClassification)
);

console.log("");


// ======================================================
// V32
// ======================================================

console.log("==========================================");
console.log("             RECOVERED V32");
console.log("==========================================");
console.log("");

console.log(
  "Structural risk:",
  valueOrNA(structuralRiskV32)
);

console.log(
  "Classification:",
  valueOrNA(v32Classification)
);

console.log("");


// ======================================================
// V42
// ======================================================

console.log("==========================================");
console.log("             RECOVERED V42");
console.log("==========================================");
console.log("");

console.log(
  "Shared URI agents:",
  valueOrNA(v42Agents)
);

console.log(
  "Shared URI owners:",
  valueOrNA(v42Owners)
);

console.log(
  "Classification:",
  valueOrNA(v42Classification)
);

console.log("");


// ======================================================
// DATA VALIDATION
// ======================================================

const checks = {

  component:
    componentId === 29,

  nodeCount:
    componentNodes === 120,

  edgeCount:
    componentEdges === 6742,

  agentCount:
    componentAgents === 102,

  ownerCount:
    componentOwners === 15,

  uriCount:
    componentURIs === 3,

  density:
    density !== null &&
    Math.abs(
      density -
      0.9442577030812325
    ) < 0.000001,

  knownAgentDegree:
    knownAgentDegree === 95,

  ownerAgentCount:
    ownerAgentCount === 1,

  uriAgentCount:
    uriAgentCount === 94,

  uriOwnerCount:
    uriOwnerCount === 14,

  anomaly:
    anomalyScore === 65,

  correlatedRisk:
    correlatedRisk === 70

};

const passed =
  Object.values(checks)
    .filter(Boolean)
    .length;

const total =
  Object.keys(checks).length;

const validation =
  passed === total
    ? "PASSED"
    : "FAILED";


// ======================================================
// STRUCTURAL SIGNALS
// ======================================================

const signals = [];


// 1 — HIGH AGENT DEGREE

if (
  knownAgentDegree !== null &&
  knownAgentDegree >= 50
) {

  signals.push({

    id:
      "S01",

    type:
      "HIGH_AGENT_DEGREE",

    scope:
      "AGENT_SPECIFIC",

    severity:
      "MEDIUM",

    value:
      knownAgentDegree

  });

}


// 2 — LARGE COMPONENT

if (
  componentAgents !== null &&
  componentAgents >= 50
) {

  signals.push({

    id:
      "S02",

    type:
      "LARGE_COMPONENT",

    scope:
      "CLUSTER_WIDE",

    severity:
      "LOW",

    value:
      componentAgents

  });

}


// 3 — HIGH DENSITY

if (
  density !== null &&
  density >= 0.8
) {

  signals.push({

    id:
      "S03",

    type:
      "HIGH_COMPONENT_DENSITY",

    scope:
      "CLUSTER_WIDE",

    severity:
      "MEDIUM",

    value:
      density

  });

}


// 4 — LARGE SHARED URI

if (
  uriAgentCount !== null &&
  uriAgentCount >= 20
) {

  signals.push({

    id:
      "S04",

    type:
      "LARGE_SHARED_URI",

    scope:
      "CLUSTER_WIDE",

    severity:
      "HIGH",

    value:
      uriAgentCount

  });

}


// 5 — CROSS OWNER URI

if (
  crossOwnerURI &&
  uriOwnerCount !== null &&
  uriOwnerCount >= 2
) {

  signals.push({

    id:
      "S05",

    type:
      "CROSS_OWNER_SHARED_URI",

    scope:
      "CLUSTER_WIDE",

    severity:
      "HIGH",

    value:
      uriOwnerCount

  });

}


// 6 — URI DEVIATION

if (
  uriDeviation !== null &&
  uriDeviation >= 2
) {

  signals.push({

    id:
      "S06",

    type:
      "HIGH_URI_DEVIATION",

    scope:
      "AGENT_SPECIFIC_CANDIDATE",

    severity:
      "MEDIUM",

    value:
      uriDeviation

  });

}


// ======================================================
// CORRELATION
// ======================================================

const correlationGroups = [];


// Shared URI + cross owner URI
// are treated as ONE structural source.

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

    independentSignalCount:
      1

  });

}


// Component size + density + degree
// are graph/component related.

if (
  signals.some(
    x => x.id === "S02"
  ) &&
  signals.some(
    x => x.id === "S03"
  ) &&
  signals.some(
    x => x.id === "S01"
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

    independentSignalCount:
      1

  });

}


// ======================================================
// RISK CALCULATION
// ======================================================
//
// IMPORTANT:
// This is STRUCTURAL RISK only.
// It is NOT fraud probability.
// It is NOT maliciousness probability.
// ======================================================

let risk = 0;


// Agent-specific high degree

if (
  knownAgentDegree !== null &&
  knownAgentDegree >= 50
) {

  risk += 20;

}


// Large URI

if (
  uriAgentCount !== null &&
  uriAgentCount >= 50
) {

  risk += 15;

}


// Cross-owner URI

if (
  crossOwnerURI &&
  uriOwnerCount !== null &&
  uriOwnerCount >= 5
) {

  risk += 10;

}


// High density

if (
  density !== null &&
  density >= 0.8
) {

  risk += 5;

}


// Large component

if (
  componentAgents !== null &&
  componentAgents >= 50
) {

  risk += 3;

}


// URI deviation

if (
  uriDeviation !== null &&
  uriDeviation >= 2
) {

  risk += 7;

}


// Correlation discount

if (
  correlationGroups.some(
    x =>
      x.id ===
      "CG01"
  )
) {

  risk -= 10;

}


if (
  correlationGroups.some(
    x =>
      x.id ===
      "CG02"
  )
) {

  risk -= 5;

}


// Historical anomaly is NOT added as
// a separate 65-point risk signal.

if (
  anomalyScore !== null &&
  anomalyScore >= 60
) {

  risk += 5;

}


risk =
  Math.max(
    0,
    Math.min(
      100,
      Math.round(
        risk
      )
    )
  );


let classification;

if (risk >= 70) {

  classification = "HIGH";

} else if (risk >= 40) {

  classification = "MEDIUM";

} else {

  classification = "LOW";

}


// ======================================================
// V35-005 STATUS
// ======================================================

let v35Status =
  "OPEN";

if (
  validation === "PASSED" &&
  risk < 60
) {

  v35Status =
    "CANDIDATE_FOR_RESOLUTION";

}


// ======================================================
// OUTPUT
// ======================================================

const output = {

  schemaVersion:
    "4.3.5",

  engine:
    "STRUCTURAL_RISK_ENGINE",

  generatedAt:
    new Date().toISOString(),

  targetAgent:
    TARGET_AGENT,

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
      knownAgentDegree,

    bridgeStatus:
      knownAgentBridgeStatus,

    directOwnerLinks:
      directOwnerLinks,

    directURILinks:
      directURILinks,

    directAgentLinks:
      directAgentLinks

  },

  ownerURI: {

    ownerAgentCount,

    uriAgentCount,

    uriOwnerCount,

    crossOwnerURI,

    crossOwnerURIs

  },

  behavior: {

    ownerDeviation,

    uriDeviation,

    behavior

  },

  historicalRisk: {

    anomalyScore,

    anomalyClassification,

    correlatedRisk,

    riskClassification,

    structuralRiskV32,

    v32Classification

  },

  signals,

  correlationGroups,

  validation: {

    checks,

    passed,

    total,

    status:
      validation

  },

  reassessment: {

    structuralRisk:
      risk,

    classification,

    agentSpecificSignals:
      signals.filter(
        x =>
          x.scope ===
          "AGENT_SPECIFIC"
      ).length,

    clusterWideSignals:
      signals.filter(
        x =>
          x.scope ===
          "CLUSTER_WIDE"
      ).length,

    correlationGroups:
      correlationGroups.length

  },

  v35_005: {

    task:
      "STRUCTURAL_REVIEW",

    status:
      v35Status,

    target:
      "< 60"

  },

  safety: {

    sharedURIIsNotFraud:
      true,

    crossOwnerURIIsNotFraud:
      true,

    highDegreeIsNotFraud:
      true,

    highDensityIsNotFraud:
      true,

    maliciousnessEstablished:
      false,

    fraudEstablished:
      false,

    automaticAllow:
      false,

    automaticBlock:
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


// ======================================================
// FINAL REPORT
// ======================================================

console.log("");
console.log("==========================================");
console.log("          V43.5 FINAL RESULT");
console.log("==========================================");
console.log("");

console.log(
  "Agent:",
  TARGET_AGENT
);

console.log(
  "Component:",
  valueOrNA(componentId)
);

console.log(
  "Nodes:",
  valueOrNA(componentNodes)
);

console.log(
  "Edges:",
  valueOrNA(componentEdges)
);

console.log(
  "Agents:",
  valueOrNA(componentAgents)
);

console.log(
  "Owners:",
  valueOrNA(componentOwners)
);

console.log(
  "URIs:",
  valueOrNA(componentURIs)
);

console.log(
  "Density:",
  valueOrNA(density)
);

console.log(
  "Agent degree:",
  valueOrNA(knownAgentDegree)
);

console.log("");

console.log(
  "Owner agents:",
  valueOrNA(ownerAgentCount)
);

console.log(
  "URI agents:",
  valueOrNA(uriAgentCount)
);

console.log(
  "URI owners:",
  valueOrNA(uriOwnerCount)
);

console.log(
  "Cross-owner URI:",
  crossOwnerURI
);

console.log("");

console.log(
  "Anomaly:",
  valueOrNA(anomalyScore)
);

console.log(
  "Correlated risk:",
  valueOrNA(correlatedRisk)
);

console.log(
  "V32 structural risk:",
  valueOrNA(structuralRiskV32)
);

console.log("");

console.log("==========================================");
console.log("          DATA VALIDATION");
console.log("==========================================");
console.log("");

console.log(
  `Passed: ${passed}/${total}`
);

console.log(
  "Status:",
  validation
);

console.log("");

console.log("==========================================");
console.log("        STRUCTURAL REASSESSMENT");
console.log("==========================================");
console.log("");

console.log(
  "Structural risk:",
  `${risk}/100`
);

console.log(
  "Classification:",
  classification
);

console.log(
  "Agent-specific signals:",
  signals.filter(
    x =>
      x.scope ===
      "AGENT_SPECIFIC"
  ).length
);

console.log(
  "Cluster-wide signals:",
  signals.filter(
    x =>
      x.scope ===
      "CLUSTER_WIDE"
  ).length
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
  "STRUCTURAL_REVIEW:",
  v35Status
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
  "      STRUCTURAL RISK ENGINE TAMAMLANDI"
);
console.log("==========================================");
console.log("");
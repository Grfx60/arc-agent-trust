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
  "agent-structural-risk-v43-3.json";


function loadJSON(file) {

  if (!fs.existsSync(file)) {
    return null;
  }

  try {
    return JSON.parse(
      fs.readFileSync(file, "utf8")
    );
  } catch (error) {
    console.log(
      `ERROR loading ${file}:`,
      error.message
    );
    return null;
  }
}


function number(value) {

  const n = Number(value);

  return Number.isFinite(n)
    ? n
    : null;
}


function printValue(name, value) {

  console.log(
    `${name}:`,
    value === null ||
    value === undefined
      ? "NOT_FOUND"
      : value
  );
}


// ======================================================
// START
// ======================================================

console.log("");
console.log("==========================================");
console.log("       STRUCTURAL RISK ENGINE v43.3");
console.log("==========================================");
console.log("");

console.log(
  "Target Agent:",
  TARGET_AGENT
);

console.log("");


// ======================================================
// LOAD FILES
// ======================================================

const data = {};

for (
  const [version, file]
  of Object.entries(FILES)
) {

  data[version] =
    loadJSON(file);

}


console.log("==========================================");
console.log("        DATA AVAILABILITY");
console.log("==========================================");
console.log("");

for (
  const [version]
  of Object.entries(FILES)
) {

  console.log(
    `${version}:`,
    data[version]
      ? "OK"
      : "MISSING"
  );

}

console.log("");


// ======================================================
// V24
// IMPORTANT:
// V43.2 showed that component data is under
// $.largestComponents[0]
// ======================================================

const v24 =
  data.V24;

const v24Component =
  v24?.largestComponents?.[0] ??
  null;


const componentId =
  number(
    v24Component?.component
  ) ??
  number(
    v24Component?.id
  );


const componentNodes =
  number(
    v24Component?.nodes
  );


const componentEdges =
  number(
    v24Component?.edges
  );


const componentAgents =
  number(
    v24Component?.agents
  );


const componentOwners =
  number(
    v24Component?.owners
  );


const componentURIs =
  number(
    v24Component?.uris
  );


const density =
  number(
    v24Component?.density
  );


// ======================================================
// FIND TARGET IN V24 TOP NODES
// ======================================================

let targetV24Node = null;

if (
  Array.isArray(
    v24Component?.topNodes
  )
) {

  targetV24Node =
    v24Component.topNodes.find(
      node =>
        String(
          node.agentId ??
          node.id ??
          node.agent ??
          ""
        ) === TARGET_AGENT
    ) ?? null;

}


// V24 terminal showed 845265 degree 95.
// If target isn't in topNodes, don't fabricate it.

const degree =
  number(
    targetV24Node?.degree
  );


// ======================================================
// V25
// V43.2 confirmed:
// $.knownAgentAnalysis.ownerAgentCount
// $.knownAgentAnalysis.uriAgentCount
// $.knownAgentAnalysis.uriOwnerCount
// ======================================================

const v25 =
  data.V25;

const knownAgentAnalysis =
  v25?.knownAgentAnalysis ??
  null;


const ownerAgentCount =
  number(
    knownAgentAnalysis?.ownerAgentCount
  );


const uriAgentCount =
  number(
    knownAgentAnalysis?.uriAgentCount
  );


const uriOwnerCount =
  number(
    knownAgentAnalysis?.uriOwnerCount
  );


const crossOwnerURIs =
  Array.isArray(
    knownAgentAnalysis?.crossOwnerURIs
  )
    ? knownAgentAnalysis.crossOwnerURIs
    : [];


const crossOwnerURI =
  crossOwnerURIs.length > 0;


// ======================================================
// V26
// V43.2 confirmed values:
// $.knownAgent.ownerDeviation
// $.knownAgent.uriDeviation
// ======================================================

const v26 =
  data.V26;

const knownAgentV26 =
  v26?.knownAgent ??
  null;


const ownerDeviation =
  number(
    knownAgentV26?.ownerDeviation
  );


const uriDeviation =
  number(
    knownAgentV26?.uriDeviation
  );


const behavior =
  knownAgentV26?.behavior ??
  null;


// ======================================================
// V27
// V43.2 confirmed:
// $.anomaly.classification
// $.baseline.ownerAgents
// $.baseline.uriAgents
// $.baseline.uriOwners
// ======================================================

const v27 =
  data.V27;

const v27Baseline =
  v27?.baseline ??
  null;

const v27Anomaly =
  v27?.anomaly ??
  null;


const anomalyScore =
  number(
    v27Anomaly?.score
  ) ??
  number(
    v27Anomaly?.anomalyScore
  );


const anomalyClassification =
  v27Anomaly?.classification ??
  null;


const baselineOwnerAgents =
  number(
    v27Baseline?.ownerAgents
  );


const baselineURI =
  number(
    v27Baseline?.uriAgents
  );


const baselineURIOwners =
  number(
    v27Baseline?.uriOwners
  );


// ======================================================
// V29
// V43.2 showed anomalyScore is:
// $.inputs.anomalyScore
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
  number(
    v29Inputs?.anomalyScore
  );


const correlatedRisk =
  number(
    v29Risk?.score
  ) ??
  number(
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
  number(
    v32Risk?.structuralRisk
  ) ??
  number(
    v32Risk?.score
  );


const v32RiskClassification =
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


const metadataSharedAgents =
  number(
    v42SharedURI?.agents
  );


const metadataSharedOwners =
  number(
    v42SharedURI?.owners
  );


const metadataClassification =
  v42SharedURI?.classification ??
  null;


// ======================================================
// RECOVERED DATA
// ======================================================

console.log("==========================================");
console.log("         RECOVERED STRUCTURE");
console.log("==========================================");
console.log("");

printValue(
  "Component",
  componentId
);

printValue(
  "Component nodes",
  componentNodes
);

printValue(
  "Component edges",
  componentEdges
);

printValue(
  "Component agents",
  componentAgents
);

printValue(
  "Component owners",
  componentOwners
);

printValue(
  "Component URIs",
  componentURIs
);

printValue(
  "Density",
  density
);

printValue(
  "Target degree",
  degree
);

console.log("");

console.log("==========================================");
console.log("          RECOVERED V25");
console.log("==========================================");
console.log("");

printValue(
  "Owner agent count",
  ownerAgentCount
);

printValue(
  "URI agent count",
  uriAgentCount
);

printValue(
  "URI owner count",
  uriOwnerCount
);

console.log(
  "Cross-owner URI:",
  crossOwnerURI
);

console.log("");

console.log("==========================================");
console.log("          RECOVERED V26");
console.log("==========================================");
console.log("");

printValue(
  "Owner deviation",
  ownerDeviation
);

printValue(
  "URI deviation",
  uriDeviation
);

printValue(
  "Behavior",
  behavior
);

console.log("");

console.log("==========================================");
console.log("          RECOVERED V27");
console.log("==========================================");
console.log("");

printValue(
  "Anomaly score",
  anomalyScore
);

printValue(
  "Anomaly classification",
  anomalyClassification
);

printValue(
  "Baseline owner agents",
  baselineOwnerAgents
);

printValue(
  "Baseline URI agents",
  baselineURI
);

printValue(
  "Baseline URI owners",
  baselineURIOwners
);

console.log("");

console.log("==========================================");
console.log("          RECOVERED V29");
console.log("==========================================");
console.log("");

printValue(
  "V29 anomaly input",
  v29AnomalyScore
);

printValue(
  "Correlated risk",
  correlatedRisk
);

printValue(
  "Risk classification",
  riskClassification
);

console.log("");

console.log("==========================================");
console.log("          RECOVERED V32");
console.log("==========================================");
console.log("");

printValue(
  "Structural risk",
  structuralRiskV32
);

printValue(
  "Risk classification",
  v32RiskClassification
);

console.log("");

console.log("==========================================");
console.log("          RECOVERED V42");
console.log("==========================================");
console.log("");

printValue(
  "Shared URI agents",
  metadataSharedAgents
);

printValue(
  "Shared URI owners",
  metadataSharedOwners
);

printValue(
  "Metadata classification",
  metadataClassification
);

console.log("");


// ======================================================
// DATA VALIDATION
// ======================================================

const checks = {

  component:
    componentId === 29,

  componentNodes:
    componentNodes === 120,

  componentEdges:
    componentEdges === 6742,

  componentAgents:
    componentAgents === 102,

  componentOwners:
    componentOwners === 15,

  componentURIs:
    componentURIs === 3,

  density:
    density !== null &&
    Math.abs(
      density -
      0.9442577030812325
    ) < 0.000001,

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


const passedChecks =
  Object.values(
    checks
  ).filter(
    Boolean
  ).length;


const totalChecks =
  Object.keys(
    checks
  ).length;


const validationPassed =
  passedChecks >= 9;


console.log("==========================================");
console.log("           DATA VALIDATION");
console.log("==========================================");
console.log("");

console.log(
  "Passed:",
  `${passedChecks}/${totalChecks}`
);

console.log(
  "Validation:",
  validationPassed
    ? "PASSED"
    : "FAILED"
);

console.log("");


// ======================================================
// STRUCTURAL SIGNALS
// ======================================================

const signals = [];


// -----------------------------
// S01 COMPONENT SIZE
// -----------------------------

if (
  componentAgents !== null &&
  componentAgents >= 50
) {

  signals.push({

    id:
      "S01",

    type:
      "LARGE_COMPONENT",

    scope:
      "CLUSTER_WIDE",

    severity:
      "LOW",

    value:
      componentAgents,

    independent:
      false

  });

}


// -----------------------------
// S02 DENSITY
// -----------------------------

if (
  density !== null &&
  density >= 0.8
) {

  signals.push({

    id:
      "S02",

    type:
      "HIGH_COMPONENT_DENSITY",

    scope:
      "CLUSTER_WIDE",

    severity:
      "MEDIUM",

    value:
      density,

    independent:
      false

  });

}


// -----------------------------
// S03 DEGREE
// -----------------------------

if (
  degree !== null &&
  degree >= 50
) {

  signals.push({

    id:
      "S03",

    type:
      "HIGH_AGENT_DEGREE",

    scope:
      "AGENT_SPECIFIC",

    severity:
      "MEDIUM",

    value:
      degree,

    independent:
      true

  });

}


// -----------------------------
// S04 SHARED URI
// -----------------------------

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
      uriAgentCount,

    independent:
      false

  });

}


// -----------------------------
// S05 CROSS OWNER URI
// -----------------------------

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
      uriOwnerCount,

    independent:
      false

  });

}


// -----------------------------
// S06 URI DEVIATION
// -----------------------------

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
      "HIGH",

    value:
      uriDeviation,

    independent:
      false

  });

}


// ======================================================
// CORRELATION GROUPS
// ======================================================

const correlationGroups = [];


// Shared URI signals are one underlying structure.

if (
  signals.some(
    s => s.id === "S04"
  ) &&
  signals.some(
    s => s.id === "S05"
  )
) {

  correlationGroups.push({

    id:
      "CG01",

    type:
      "SHARED_URI_STRUCTURE",

    signals:
      [
        "S04",
        "S05"
      ],

    independentSignals:
      1

  });

}


// Component structure signals overlap.

if (
  signals.some(
    s => s.id === "S01"
  ) &&
  signals.some(
    s => s.id === "S02"
  ) &&
  signals.some(
    s => s.id === "S03"
  )
) {

  correlationGroups.push({

    id:
      "CG02",

    type:
      "GRAPH_COMPONENT_STRUCTURE",

    signals:
      [
        "S01",
        "S02",
        "S03"
      ],

    independentSignals:
      1

  });

}


// ======================================================
// AGENT-SPECIFIC EVIDENCE
// ======================================================

const agentSpecificSignals =
  signals.filter(
    s =>
      s.scope ===
      "AGENT_SPECIFIC"
  );


const clusterWideSignals =
  signals.filter(
    s =>
      s.scope ===
      "CLUSTER_WIDE"
  );


console.log("==========================================");
console.log("          SIGNAL ANALYSIS");
console.log("==========================================");
console.log("");

for (
  const signal of signals
) {

  console.log(
    `[${signal.scope}] ${signal.type} = ${signal.value}`
  );

}

console.log("");

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


// ======================================================
// STRUCTURAL RISK
// ======================================================
//
// IMPORTANT:
// This is NOT a fraud score.
// It is only a structural-risk indicator.
//
// Shared URI + cross-owner URI are correlated.
// Component size/density/degree are correlated.
// ======================================================

let risk = 0;


// -----------------------------------------
// Agent-specific degree
// -----------------------------------------

if (
  degree !== null &&
  degree >= 50
) {

  risk += 20;

}


// -----------------------------------------
// Large shared URI
// -----------------------------------------

if (
  uriAgentCount !== null &&
  uriAgentCount >= 50
) {

  risk += 15;

}


// -----------------------------------------
// Cross-owner URI
// -----------------------------------------

if (
  crossOwnerURI &&
  uriOwnerCount !== null &&
  uriOwnerCount >= 5
) {

  risk += 10;

}


// -----------------------------------------
// High density
// -----------------------------------------

if (
  density !== null &&
  density >= 0.8
) {

  risk += 5;

}


// -----------------------------------------
// Large component
// -----------------------------------------

if (
  componentAgents !== null &&
  componentAgents >= 50
) {

  risk += 3;

}


// -----------------------------------------
// URI deviation
// -----------------------------------------

if (
  uriDeviation !== null &&
  uriDeviation >= 2
) {

  risk += 7;

}


// -----------------------------------------
// Correlation discount
// -----------------------------------------

if (
  correlationGroups.some(
    group =>
      group.id === "CG01"
  )
) {

  risk -= 10;

}


if (
  correlationGroups.some(
    group =>
      group.id === "CG02"
  )
) {

  risk -= 5;

}


// -----------------------------------------
// Existing anomaly
// -----------------------------------------
//
// V27's 65 is a historical anomaly score,
// not another independent fraud signal.
// We therefore do NOT simply add 65.
// -----------------------------------------

if (
  anomalyScore !== null &&
  anomalyScore >= 60
) {

  risk += 5;

}


// -----------------------------------------
// Clamp
// -----------------------------------------

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


// ======================================================
// CLASSIFICATION
// ======================================================

let classification;

if (
  risk >= 70
) {

  classification =
    "HIGH";

} else if (
  risk >= 40
) {

  classification =
    "MEDIUM";

} else {

  classification =
    "LOW";

}


// ======================================================
// V35-005
// ======================================================

let v35Status =
  "OPEN";


if (
  validationPassed &&
  risk < 60
) {

  v35Status =
    "CANDIDATE_FOR_RESOLUTION";

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

  maliciousnessEstablished:
    false,

  fraudEstablished:
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
    "4.3.3",

  engine:
    "STRUCTURAL_RISK_ENGINE",

  generatedAt:
    new Date().toISOString(),

  agent:
    TARGET_AGENT,

  recoveredData: {

    componentId,

    componentNodes,

    componentEdges,

    componentAgents,

    componentOwners,

    componentURIs,

    density,

    degree,

    ownerAgentCount,

    uriAgentCount,

    uriOwnerCount,

    crossOwnerURI,

    ownerDeviation,

    uriDeviation,

    behavior,

    anomalyScore,

    anomalyClassification,

    baselineOwnerAgents,

    baselineURI,

    baselineURIOwners,

    correlatedRisk,

    riskClassification,

    structuralRiskV32,

    v32RiskClassification,

    metadataSharedAgents,

    metadataSharedOwners,

    metadataClassification

  },

  validation: {

    checks,

    passed:
      passedChecks,

    total:
      totalChecks,

    validationPassed

  },

  signals,

  correlationGroups,

  scope: {

    agentSpecific:
      agentSpecificSignals.map(
        s => s.id
      ),

    clusterWide:
      clusterWideSignals.map(
        s => s.id
      )

  },

  reassessment: {

    structuralRisk:
      risk,

    classification,

    previousAnomaly:
      anomalyScore,

    previousCorrelatedRisk:
      correlatedRisk,

    previousV32StructuralRisk:
      structuralRiskV32

  },

  v35_005: {

    task:
      "STRUCTURAL_REVIEW",

    status:
      v35Status,

    target:
      "< 60"

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
// FINAL
// ======================================================

console.log("");
console.log("==========================================");
console.log("          V43.3 FINAL RESULT");
console.log("==========================================");
console.log("");

console.log(
  "Agent:",
  TARGET_AGENT
);

printValue(
  "Component",
  componentId
);

printValue(
  "Component nodes",
  componentNodes
);

printValue(
  "Component edges",
  componentEdges
);

printValue(
  "Component agents",
  componentAgents
);

printValue(
  "Component owners",
  componentOwners
);

printValue(
  "Component URIs",
  componentURIs
);

printValue(
  "Agent degree",
  degree
);

printValue(
  "Density",
  density
);

console.log("");

console.log(
  "Anomaly:",
  anomalyScore === null
    ? "NOT_FOUND"
    : `${anomalyScore}/100`
);

console.log(
  "Correlated Risk:",
  correlatedRisk === null
    ? "NOT_FOUND"
    : `${correlatedRisk}/100`
);

console.log(
  "V32 Structural Risk:",
  structuralRiskV32 === null
    ? "NOT_FOUND"
    : `${structuralRiskV32}/100`
);

console.log("");

console.log("==========================================");
console.log("       STRUCTURAL REASSESSMENT");
console.log("==========================================");
console.log("");

console.log(
  "Structural Risk:",
  `${risk}/100`
);

console.log(
  "Classification:",
  classification
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
console.log("          DATA VALIDATION");
console.log("==========================================");
console.log("");

console.log(
  "Validation:",
  `${passedChecks}/${totalChecks}`
);

console.log(
  "Status:",
  validationPassed
    ? "PASSED"
    : "FAILED"
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
  "Cluster membership = fraud:",
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
  "      STRUCTURAL RISK ENGINE TAMAMLANDI"
);
console.log("==========================================");
console.log("");
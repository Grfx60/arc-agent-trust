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
  "agent-structural-risk-corrected-v43-1.json";


function load(file) {

  if (!fs.existsSync(file)) {
    return null;
  }

  try {
    return JSON.parse(
      fs.readFileSync(file, "utf8")
    );
  } catch {
    return null;
  }

}


function num(value) {

  const n = Number(value);

  return Number.isFinite(n)
    ? n
    : null;

}


function firstNumber(...values) {

  for (const value of values) {

    const n = num(value);

    if (n !== null) {
      return n;
    }

  }

  return null;

}


function firstValue(...values) {

  for (const value of values) {

    if (
      value !== undefined &&
      value !== null
    ) {

      return value;

    }

  }

  return null;

}


function recursiveFind(
  object,
  keys,
  depth = 0
) {

  if (
    object === null ||
    object === undefined ||
    depth > 8
  ) {

    return null;

  }


  if (
    typeof object !== "object"
  ) {

    return null;

  }


  for (
    const key of keys
  ) {

    if (
      Object.prototype.hasOwnProperty.call(
        object,
        key
      )
    ) {

      return object[key];

    }

  }


  for (
    const value of Object.values(object)
  ) {

    if (
      value &&
      typeof value === "object"
    ) {

      const result =
        recursiveFind(
          value,
          keys,
          depth + 1
        );

      if (
        result !== null &&
        result !== undefined
      ) {

        return result;

      }

    }

  }

  return null;

}


function findAgent(
  object,
  target
) {

  if (
    !object ||
    typeof object !== "object"
  ) {

    return null;

  }


  const targetString =
    String(target);


  if (
    Array.isArray(object)
  ) {

    for (
      const item of object
    ) {

      const result =
        findAgent(
          item,
          targetString
        );

      if (result) {
        return result;
      }

    }

    return null;

  }


  const id =
    object.agentId ??
    object.agent_id ??
    object.id ??
    object.tokenId ??
    object.token_id;


  if (
    id !== undefined &&
    String(id) === targetString
  ) {

    return object;

  }


  for (
    const value of Object.values(object)
  ) {

    if (
      value &&
      typeof value === "object"
    ) {

      const result =
        findAgent(
          value,
          targetString
        );

      if (result) {
        return result;
      }

    }

  }

  return null;

}


function findKnownValue(
  data,
  keys,
  target = TARGET_AGENT
) {

  const agent =
    findAgent(
      data,
      target
    );

  if (agent) {

    const value =
      recursiveFind(
        agent,
        keys
      );

    if (
      value !== null &&
      value !== undefined
    ) {

      return value;

    }

  }


  return recursiveFind(
    data,
    keys
  );

}


function printValue(
  name,
  value
) {

  console.log(
    `${name}:`,
    value === null
      ? "NOT_FOUND"
      : value
  );

}


console.log("");
console.log("==========================================");
console.log("   STRUCTURAL RISK CORRECTOR v43.1");
console.log("==========================================");
console.log("");

console.log(
  "Target Agent:",
  TARGET_AGENT
);

console.log("");


// ==========================================
// LOAD
// ==========================================

const data = {};

for (
  const [version, file]
  of Object.entries(FILES)
) {

  data[version] =
    load(file);

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


// ==========================================
// V24 — COMPONENT
// ==========================================

const v24 = data.V24;

const v24Agent =
  findAgent(
    v24,
    TARGET_AGENT
  );


const componentId =
  firstValue(

    v24Agent?.component,

    v24Agent?.componentId,

    v24Agent?.component_id,

    recursiveFind(
      v24,
      [
        "component",
        "componentId",
        "component_id"
      ]
    )

  );


const componentNodes =
  firstNumber(

    v24Agent?.nodes,

    v24Agent?.componentNodes,

    v24Agent?.component_nodes,

    recursiveFind(
      v24,
      [
        "nodes",
        "componentNodes",
        "component_nodes"
      ]
    )

  );


const componentEdges =
  firstNumber(

    v24Agent?.edges,

    v24Agent?.componentEdges,

    v24Agent?.component_edges,

    recursiveFind(
      v24,
      [
        "edges",
        "componentEdges",
        "component_edges"
      ]
    )

  );


const componentAgents =
  firstNumber(

    v24Agent?.agents,

    v24Agent?.componentAgents,

    v24Agent?.component_agents,

    recursiveFind(
      v24,
      [
        "agents",
        "componentAgents",
        "component_agents"
      ]
    )

  );


const componentOwners =
  firstNumber(

    v24Agent?.owners,

    v24Agent?.componentOwners,

    v24Agent?.component_owners,

    recursiveFind(
      v24,
      [
        "owners",
        "componentOwners",
        "component_owners"
      ]
    )

  );


const componentURIs =
  firstNumber(

    v24Agent?.uris,

    v24Agent?.URI,

    v24Agent?.uriCount,

    v24Agent?.componentURIs,

    v24Agent?.component_uris,

    recursiveFind(
      v24,
      [
        "uris",
        "URI",
        "uriCount",
        "componentURIs",
        "component_uris"
      ]
    )

  );


const degree =
  firstNumber(

    v24Agent?.degree,

    v24Agent?.knownAgentDegree,

    recursiveFind(
      v24,
      [
        "degree",
        "knownAgentDegree"
      ]
    )

  );


const density =
  firstNumber(

    v24Agent?.density,

    recursiveFind(
      v24,
      [
        "density"
      ]
    )

  );


// ==========================================
// V25
// ==========================================

const v25 = data.V25;

const v25Agent =
  findAgent(
    v25,
    TARGET_AGENT
  );


const ownerAgents =
  firstNumber(

    v25Agent?.ownerAgents,

    v25Agent?.ownerAgentCount,

    recursiveFind(
      v25,
      [
        "ownerAgents",
        "ownerAgentCount"
      ]
    )

  );


const uriAgents =
  firstNumber(

    v25Agent?.uriAgents,

    v25Agent?.uriAgentCount,

    recursiveFind(
      v25,
      [
        "uriAgents",
        "uriAgentCount"
      ]
    )

  );


const uriOwners =
  firstNumber(

    v25Agent?.uriOwners,

    v25Agent?.uriOwnerCount,

    recursiveFind(
      v25,
      [
        "uriOwners",
        "uriOwnerCount"
      ]
    )

  );


const crossOwnerURI =
  firstValue(

    v25Agent?.crossOwnerURI,

    v25Agent?.crossOwnerUri,

    recursiveFind(
      v25,
      [
        "crossOwnerURI",
        "crossOwnerUri"
      ]
    )

  );


// ==========================================
// V27 — ANOMALY
// ==========================================

const v27 = data.V27;

const v27Agent =
  findAgent(
    v27,
    TARGET_AGENT
  );


const anomalyScore =
  firstNumber(

    v27Agent?.anomalyScore,

    v27?.anomalyScore,

    recursiveFind(
      v27,
      [
        "anomalyScore"
      ]
    )

  );


const anomalyClassification =
  firstValue(

    v27Agent?.classification,

    v27?.classification,

    recursiveFind(
      v27,
      [
        "classification"
      ]
    )

  );


// ==========================================
// V29 — CORRELATED RISK
// ==========================================

const v29 = data.V29;

const v29Agent =
  findAgent(
    v29,
    TARGET_AGENT
  );


const correlatedRisk =
  firstNumber(

    v29Agent?.correlatedRisk,

    v29?.correlatedRisk,

    recursiveFind(
      v29,
      [
        "correlatedRisk"
      ]
    )

  );


const riskClassification =
  firstValue(

    v29Agent?.riskClassification,

    v29?.riskClassification,

    recursiveFind(
      v29,
      [
        "riskClassification"
      ]
    )

  );


// ==========================================
// V32
// ==========================================

const v32 = data.V32;

const v32Agent =
  findAgent(
    v32,
    TARGET_AGENT
  );


const structuralRiskV32 =
  firstNumber(

    v32Agent?.structuralRisk,

    v32?.structuralRisk,

    recursiveFind(
      v32,
      [
        "structuralRisk"
      ]
    )

  );


// ==========================================
// V42
// ==========================================

const v42 = data.V42;

const metadataSharedAgents =
  firstNumber(

    v42?.sharedURI?.agents,

    v42?.sharedUri?.agents,

    recursiveFind(
      v42,
      [
        "agents"
      ]
    )

  );


const metadataSharedOwners =
  firstNumber(

    v42?.sharedURI?.owners,

    v42?.sharedUri?.owners,

    recursiveFind(
      v42,
      [
        "owners"
      ]
    )

  );


const metadataClassification =
  firstValue(

    v42?.sharedURI?.classification,

    v42?.sharedUri?.classification,

    recursiveFind(
      v42,
      [
        "classification"
      ]
    )

  );


// ==========================================
// PRINT RECOVERED DATA
// ==========================================

console.log("==========================================");
console.log("        RECOVERED V24 DATA");
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
  "Agent degree",
  degree
);

printValue(
  "Density",
  density
);

console.log("");

console.log("==========================================");
console.log("        RECOVERED RISK DATA");
console.log("==========================================");
console.log("");

printValue(
  "V27 anomaly",
  anomalyScore
);

printValue(
  "V27 classification",
  anomalyClassification
);

printValue(
  "V29 correlated risk",
  correlatedRisk
);

printValue(
  "V29 classification",
  riskClassification
);

printValue(
  "V32 structural risk",
  structuralRiskV32
);

console.log("");

console.log("==========================================");
console.log("        RECOVERED V25 DATA");
console.log("==========================================");
console.log("");

printValue(
  "Owner agents",
  ownerAgents
);

printValue(
  "URI agents",
  uriAgents
);

printValue(
  "URI owners",
  uriOwners
);

printValue(
  "Cross-owner URI",
  crossOwnerURI
);

console.log("");


// ==========================================
// VALIDATION
// ==========================================

const expected = {

  componentAgents: 102,

  componentOwners: 15,

  componentURIs: 3,

  componentEdges: 6742,

  degree: 95,

  density:
    0.9442577030812325,

  anomaly:
    65,

  correlatedRisk:
    70

};


const validation = {

  componentAgents:
    componentAgents ===
    expected.componentAgents,

  componentOwners:
    componentOwners ===
    expected.componentOwners,

  componentURIs:
    componentURIs ===
    expected.componentURIs,

  componentEdges:
    componentEdges ===
    expected.componentEdges,

  degree:
    degree ===
    expected.degree,

  density:
    density !== null &&
    Math.abs(
      density -
      expected.density
    ) < 0.000001,

  anomaly:
    anomalyScore ===
    expected.anomaly,

  correlatedRisk:
    correlatedRisk ===
    expected.correlatedRisk

};


const recoveredCount =
  Object.values(validation)
    .filter(Boolean)
    .length;


const validationPassed =
  recoveredCount >= 6;


console.log("==========================================");
console.log("       DATA VALIDATION");
console.log("==========================================");
console.log("");

console.log(
  "Recovered checks:",
  recoveredCount,
  "/8"
);

console.log(
  "Validation:",
  validationPassed
    ? "PASSED"
    : "FAILED"
);

console.log("");


// ==========================================
// STRUCTURAL SIGNALS
// ==========================================

const signals = [];


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

    value:
      componentAgents

  });

}


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

    value:
      density

  });

}


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
      "AGENT_SPECIFIC_CANDIDATE",

    value:
      degree

  });

}


if (
  uriAgents !== null &&
  uriAgents >= 20
) {

  signals.push({

    id:
      "S04",

    type:
      "LARGE_SHARED_URI",

    scope:
      "CLUSTER_WIDE",

    value:
      uriAgents

  });

}


if (
  crossOwnerURI === true &&
  uriOwners !== null &&
  uriOwners >= 2
) {

  signals.push({

    id:
      "S05",

    type:
      "CROSS_OWNER_SHARED_URI",

    scope:
      "CLUSTER_WIDE",

    value:
      uriOwners

  });

}


console.log("==========================================");
console.log("        STRUCTURAL SIGNALS");
console.log("==========================================");
console.log("");

for (
  const signal of signals
) {

  console.log(
    `[${signal.scope}] ${signal.type}: ${signal.value}`
  );

}

console.log("");


// ==========================================
// CORRELATION GROUPS
// ==========================================

const correlationGroups = [];


if (
  signals.some(
    s => s.id === "S04"
  ) &&
  signals.some(
    s => s.id === "S05"
  )
) {

  correlationGroups.push({

    name:
      "SHARED_URI_STRUCTURE",

    signals: [
      "S04",
      "S05"
    ],

    independentSignals:
      1

  });

}


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

    name:
      "GRAPH_COMPONENT_STRUCTURE",

    signals: [
      "S01",
      "S02",
      "S03"
    ],

    independentSignals:
      1

  });

}


// ==========================================
// REASSESSMENT
// ==========================================

let risk = 0;


// Agent-specific degree is stronger than
// generic component size.

if (
  degree !== null &&
  degree >= 50
) {

  risk += 20;

}


// Large shared URI.

if (
  uriAgents !== null &&
  uriAgents >= 50
) {

  risk += 15;

}


// Cross-owner URI.

if (
  crossOwnerURI === true &&
  uriOwners !== null &&
  uriOwners >= 5
) {

  risk += 15;

}


// High density.

if (
  density !== null &&
  density >= 0.8
) {

  risk += 10;

}


// Large component itself is weak evidence.

if (
  componentAgents !== null &&
  componentAgents >= 50
) {

  risk += 5;

}


// Deviation from local baseline.
// V26/V25 values are used only if available.

const uriDeviation =
  firstNumber(
    v25Agent?.uriDeviation,
    recursiveFind(
      data.V26,
      [
        "uriDeviation"
      ]
    )
  );


const ownerDeviation =
  firstNumber(
    v25Agent?.ownerDeviation,
    recursiveFind(
      data.V26,
      [
        "ownerDeviation"
      ]
    )
  );


if (
  uriDeviation !== null &&
  uriDeviation >= 2
) {

  risk += 10;

}

if (
  ownerDeviation !== null &&
  ownerDeviation >= 2
) {

  risk += 5;

}


// Correlated shared-URI signals should not
// be fully double counted.

if (
  correlationGroups.some(
    group =>
      group.name ===
      "SHARED_URI_STRUCTURE"
  )
) {

  risk -= 10;

}


// Graph signals are also partially correlated.

if (
  correlationGroups.some(
    group =>
      group.name ===
      "GRAPH_COMPONENT_STRUCTURE"
  )
) {

  risk -= 5;

}


// Existing anomaly is an independent
// historical observation if correctly recovered.

if (
  anomalyScore !== null &&
  anomalyScore >= 60
) {

  risk += 10;

}


// Clamp.

risk =
  Math.max(
    0,
    Math.min(
      100,
      Math.round(risk)
    )
  );


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


// ==========================================
// V35-005
// ==========================================

let v35_005 =
  "OPEN";


if (
  validationPassed &&
  risk < 60
) {

  v35_005 =
    "CANDIDATE_FOR_RESOLUTION";

}


// ==========================================
// OUTPUT
// ==========================================

const output = {

  schemaVersion:
    "4.3.1",

  engine:
    "STRUCTURAL_RISK_CORRECTOR",

  generatedAt:
    new Date().toISOString(),

  agent:
    TARGET_AGENT,

  sourceFiles:
    Object.fromEntries(
      Object.entries(FILES)
        .map(
          ([key, file]) => [
            key,
            {
              file,
              loaded:
                !!data[key]
            }
          ]
        )
    ),

  recoveredData: {

    componentId,

    componentNodes,

    componentEdges,

    componentAgents,

    componentOwners,

    componentURIs,

    degree,

    density,

    ownerAgents,

    uriAgents,

    uriOwners,

    crossOwnerURI,

    anomalyScore,

    anomalyClassification,

    correlatedRisk,

    riskClassification,

    structuralRiskV32,

    metadataSharedAgents,

    metadataSharedOwners,

    metadataClassification

  },

  validation: {

    expected,

    checks:
      validation,

    recoveredCount,

    passed:
      validationPassed

  },

  signals,

  correlationGroups,

  reassessment: {

    risk,

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
      v35_005,

    target:
      "< 60"

  },

  safety: {

    largeComponentIsNotFraud:
      true,

    highDegreeIsNotFraud:
      true,

    sharedURIIsNotFraud:
      true,

    crossOwnerURIIsNotFraud:
      true,

    maliciousnessEstablished:
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


// ==========================================
// FINAL
// ==========================================

console.log("");
console.log("==========================================");
console.log("        V43.1 FINAL RESULT");
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
  "Component edges",
  componentEdges
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
  "Recovered anomaly:",
  anomalyScore === null
    ? "NOT_FOUND"
    : `${anomalyScore}/100`
);

console.log(
  "Recovered correlated risk:",
  correlatedRisk === null
    ? "NOT_FOUND"
    : `${correlatedRisk}/100`
);

console.log("");

console.log("==========================================");
console.log("      CORRECTED STRUCTURAL RISK");
console.log("==========================================");
console.log("");

console.log(
  "Risk:",
  risk,
  "/100"
);

console.log(
  "Classification:",
  classification
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
  v35_005
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
  "      STRUCTURAL RISK CORRECTOR TAMAMLANDI"
);
console.log("==========================================");
console.log("");
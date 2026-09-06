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
  "agent-structural-v43-4.json";


function load(file) {

  if (!fs.existsSync(file)) {
    return null;
  }

  try {
    return JSON.parse(
      fs.readFileSync(file, "utf8")
    );
  } catch (error) {
    console.log(
      "Parse error:",
      file,
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


function print(name, value) {

  console.log(
    `${name}:`,
    value === null ||
    value === undefined
      ? "NOT_FOUND"
      : value
  );

}


function findTarget(
  value,
  path = "$",
  results = [],
  depth = 0
) {

  if (
    depth > 15 ||
    value === null ||
    value === undefined
  ) {
    return results;
  }


  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {

    if (
      String(value) === TARGET_AGENT
    ) {

      results.push({
        path,
        value
      });

    }

    return results;
  }


  if (Array.isArray(value)) {

    for (
      let i = 0;
      i < value.length;
      i++
    ) {

      findTarget(
        value[i],
        `${path}[${i}]`,
        results,
        depth + 1
      );

    }

    return results;
  }


  if (typeof value === "object") {

    for (
      const [key, child]
      of Object.entries(value)
    ) {

      const childPath =
        path === "$"
          ? `$.${key}`
          : `${path}.${key}`;

      findTarget(
        child,
        childPath,
        results,
        depth + 1
      );

    }

  }

  return results;
}


function inspectObjects(
  value,
  path = "$",
  results = [],
  depth = 0
) {

  if (
    depth > 12 ||
    value === null ||
    value === undefined
  ) {
    return results;
  }


  if (Array.isArray(value)) {

    for (
      let i = 0;
      i < value.length;
      i++
    ) {

      inspectObjects(
        value[i],
        `${path}[${i}]`,
        results,
        depth + 1
      );

    }

    return results;
  }


  if (typeof value === "object") {

    const keys =
      Object.keys(value);


    results.push({

      path,

      keys,

      keyCount:
        keys.length

    });


    for (
      const [key, child]
      of Object.entries(value)
    ) {

      const childPath =
        path === "$"
          ? `$.${key}`
          : `${path}.${key}`;

      if (
        child &&
        typeof child === "object"
      ) {

        inspectObjects(
          child,
          childPath,
          results,
          depth + 1
        );

      }

    }

  }

  return results;
}


function findObjectsContainingTarget(
  value,
  path = "$",
  results = [],
  depth = 0
) {

  if (
    depth > 15 ||
    value === null ||
    value === undefined
  ) {
    return results;
  }


  if (Array.isArray(value)) {

    for (
      let i = 0;
      i < value.length;
      i++
    ) {

      const item =
        value[i];

      if (
        item &&
        typeof item === "object"
      ) {

        const targetPaths =
          findTarget(
            item,
            `${path}[${i}]`,
            [],
            0
          );

        if (
          targetPaths.length > 0
        ) {

          results.push({

            path:
              `${path}[${i}]`,

            object:
              item

          });

        }

      }

      findObjectsContainingTarget(
        item,
        `${path}[${i}]`,
        results,
        depth + 1
      );

    }

    return results;
  }


  if (typeof value === "object") {

    for (
      const [key, child]
      of Object.entries(value)
    ) {

      const childPath =
        path === "$"
          ? `$.${key}`
          : `${path}.${key}`;


      if (
        child &&
        typeof child === "object"
      ) {

        const targetPaths =
          findTarget(
            child,
            childPath,
            [],
            0
          );

        if (
          targetPaths.length > 0
        ) {

          results.push({

            path:
              childPath,

            object:
              child

          });

        }


        findObjectsContainingTarget(
          child,
          childPath,
          results,
          depth + 1
        );

      }

    }

  }

  return results;
}


// ======================================================
// START
// ======================================================

console.log("");
console.log("==========================================");
console.log("      V24 STRUCTURE RESOLVER v43.4");
console.log("==========================================");
console.log("");

console.log(
  "Target Agent:",
  TARGET_AGENT
);

console.log("");


// ======================================================
// LOAD
// ======================================================

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
  const version of Object.keys(FILES)
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
// V24 DEEP INSPECTION
// ======================================================

const v24 =
  data.V24;

console.log("==========================================");
console.log("       V24 ROOT STRUCTURE");
console.log("==========================================");
console.log("");

if (!v24) {

  console.log(
    "V24 unavailable."
  );

} else {

  console.log(
    "Root keys:",
    Object.keys(v24).join(", ")
  );


  if (
    Array.isArray(
      v24.largestComponents
    )
  ) {

    console.log(
      "largestComponents:",
      v24.largestComponents.length
    );

    console.log("");

    for (
      let i = 0;
      i <
      Math.min(
        v24.largestComponents.length,
        10
      );
      i++
    ) {

      const component =
        v24.largestComponents[i];

      console.log(
        `Component index ${i}:`
      );

      console.log(
        "  Keys:",
        Object.keys(component).join(", ")
      );

      console.log(
        "  Component:",
        component.component
      );

      console.log(
        "  Nodes:",
        component.nodes
      );

      console.log(
        "  Edges:",
        component.edges
      );

      console.log(
        "  Agents:",
        component.agents
      );

      console.log(
        "  Owners:",
        component.owners
      );

      console.log(
        "  URIs:",
        component.uris
      );

      console.log(
        "  Density:",
        component.density
      );

      console.log(
        "  topNodes:",
        Array.isArray(
          component.topNodes
        )
          ? component.topNodes.length
          : "none"
      );

      console.log("");

    }

  }

}


// ======================================================
// FIND TARGET AGENT IN V24
// ======================================================

console.log("==========================================");
console.log("       TARGET AGENT V24 SEARCH");
console.log("==========================================");
console.log("");

const targetPathsV24 =
  findTarget(
    v24
  );

console.log(
  "Target occurrences:",
  targetPathsV24.length
);

for (
  const item
  of targetPathsV24.slice(
    0,
    100
  )
) {

  console.log(
    `${item.path} = ${item.value}`
  );

}

console.log("");


// ======================================================
// TARGET CONTAINING OBJECTS
// ======================================================

const targetObjectsV24 =
  findObjectsContainingTarget(
    v24
  );

console.log(
  "Objects containing target:",
  targetObjectsV24.length
);

console.log("");

for (
  const item
  of targetObjectsV24.slice(
    0,
    30
  )
) {

  console.log(
    item.path
  );

  console.log(
    "Keys:",
    Object.keys(
      item.object
    ).join(", ")
  );

  console.log(
    "Object:",
    JSON.stringify(
      item.object,
      null,
      2
    ).slice(
      0,
      3000
    )
  );

  console.log("");

}


// ======================================================
// SEARCH COMPONENT 29
// ======================================================

console.log("==========================================");
console.log("          COMPONENT 29 SEARCH");
console.log("==========================================");
console.log("");

let component29Paths = [];


function findComponent29(
  value,
  path = "$",
  depth = 0
) {

  if (
    depth > 15 ||
    value === null ||
    value === undefined
  ) {
    return;
  }


  if (Array.isArray(value)) {

    for (
      let i = 0;
      i < value.length;
      i++
    ) {

      findComponent29(
        value[i],
        `${path}[${i}]`,
        depth + 1
      );

    }

    return;
  }


  if (typeof value === "object") {

    for (
      const [key, child]
      of Object.entries(value)
    ) {

      const childPath =
        path === "$"
          ? `$.${key}`
          : `${path}.${key}`;


      if (
        (
          key === "component" ||
          key === "componentId" ||
          key === "component_id"
        ) &&
        String(child) === "29"
      ) {

        component29Paths.push({

          path:
            childPath,

          parentPath:
            path,

          parent:
            value

        });

      }


      if (
        child &&
        typeof child === "object"
      ) {

        findComponent29(
          child,
          childPath,
          depth + 1
        );

      }

    }

  }

}


findComponent29(
  v24
);

console.log(
  "Component 29 occurrences:",
  component29Paths.length
);

console.log("");

for (
  const item
  of component29Paths
) {

  console.log(
    "Path:",
    item.path
  );

  console.log(
    "Parent:",
    JSON.stringify(
      item.parent,
      null,
      2
    ).slice(
      0,
      5000
    )
  );

  console.log("");

}


// ======================================================
// TOP NODE SEARCH
// ======================================================

console.log("==========================================");
console.log("       TARGET NODE / DEGREE SEARCH");
console.log("==========================================");
console.log("");


// Search all objects containing target and
// print every numeric field.

for (
  const item
  of targetObjectsV24
) {

  console.log(
    "PATH:",
    item.path
  );

  for (
    const [key, value]
    of Object.entries(
      item.object
    )
  ) {

    if (
      typeof value === "number" ||
      typeof value === "string"
    ) {

      console.log(
        `  ${key}: ${value}`
      );

    }

  }

  console.log("");

}


// ======================================================
// V25 CROSS OWNER FIX
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


console.log("==========================================");
console.log("          V25 CROSS-OWNER");
console.log("==========================================");
console.log("");

print(
  "Owner agent count",
  ownerAgentCount
);

print(
  "URI agent count",
  uriAgentCount
);

print(
  "URI owner count",
  uriOwnerCount
);

console.log(
  "Cross-owner URI:",
  crossOwnerURI
);

console.log("");


// ======================================================
// V26
// ======================================================

const v26 =
  data.V26;

const v26KnownAgent =
  v26?.knownAgent ??
  null;


const ownerDeviation =
  number(
    v26KnownAgent?.ownerDeviation
  );


const uriDeviation =
  number(
    v26KnownAgent?.uriDeviation
  );


console.log("==========================================");
console.log("             V26 VALUES");
console.log("==========================================");
console.log("");

print(
  "Owner deviation",
  ownerDeviation
);

print(
  "URI deviation",
  uriDeviation
);

console.log("");


// ======================================================
// V27
// ======================================================

const v27 =
  data.V27;

const anomaly =
  v27?.anomaly ??
  null;

const baseline =
  v27?.baseline ??
  null;


const anomalyScore =
  number(
    anomaly?.score
  ) ??
  number(
    anomaly?.anomalyScore
  );


const anomalyClassification =
  anomaly?.classification ??
  null;


console.log("==========================================");
console.log("             V27 VALUES");
console.log("==========================================");
console.log("");

print(
  "Anomaly score",
  anomalyScore
);

print(
  "Classification",
  anomalyClassification
);

print(
  "Baseline owner agents",
  number(
    baseline?.ownerAgents
  )
);

print(
  "Baseline URI agents",
  number(
    baseline?.uriAgents
  )
);

print(
  "Baseline URI owners",
  number(
    baseline?.uriOwners
  )
);

console.log("");


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


const v29Anomaly =
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


console.log("==========================================");
console.log("             V29 VALUES");
console.log("==========================================");
console.log("");

print(
  "Anomaly input",
  v29Anomaly
);

print(
  "Correlated risk",
  correlatedRisk
);

print(
  "Classification",
  v29Risk?.classification
);

console.log("");


// ======================================================
// V42
// ======================================================

const v42 =
  data.V42;

const sharedURI =
  v42?.sharedURI ??
  null;


console.log("==========================================");
console.log("             V42 VALUES");
console.log("==========================================");
console.log("");

print(
  "Shared URI agents",
  number(
    sharedURI?.agents
  )
);

print(
  "Shared URI owners",
  number(
    sharedURI?.owners
  )
);

print(
  "Classification",
  sharedURI?.classification
);

console.log("");


// ======================================================
// RESOLUTION
// ======================================================

const resolvedComponent =
  component29Paths.length > 0
    ? component29Paths[0].parent
    : null;


const resolvedComponentId =
  number(
    resolvedComponent?.component
  ) ??
  number(
    resolvedComponent?.componentId
  ) ??
  29;


const resolvedNodes =
  number(
    resolvedComponent?.nodes
  );


const resolvedEdges =
  number(
    resolvedComponent?.edges
  );


const resolvedAgents =
  number(
    resolvedComponent?.agents
  );


const resolvedOwners =
  number(
    resolvedComponent?.owners
  );


const resolvedURIs =
  number(
    resolvedComponent?.uris
  );


const resolvedDensity =
  number(
    resolvedComponent?.density
  );


// ======================================================
// DATA VALIDATION
// ======================================================

const checks = {

  component:
    resolvedComponentId === 29,

  componentNodes:
    resolvedNodes === 120,

  componentEdges:
    resolvedEdges === 6742,

  componentAgents:
    resolvedAgents === 102,

  componentOwners:
    resolvedOwners === 15,

  componentURIs:
    resolvedURIs === 3,

  density:
    resolvedDensity !== null &&
    Math.abs(
      resolvedDensity -
      0.9442577030812325
    ) < 0.000001,

  ownerAgents:
    ownerAgentCount === 1,

  uriAgents:
    uriAgentCount === 94,

  uriOwners:
    uriOwnerCount === 14,

  anomaly:
    anomalyScore === 65,

  correlatedRisk:
    correlatedRisk === 70

};


const passed =
  Object.values(
    checks
  ).filter(
    Boolean
  ).length;


const total =
  Object.keys(
    checks
  ).length;


const validation =
  passed === total
    ? "PASSED"
    : "FAILED";


// ======================================================
// OUTPUT
// ======================================================

const output = {

  schemaVersion:
    "4.3.4",

  engine:
    "V24_STRUCTURE_RESOLVER",

  generatedAt:
    new Date().toISOString(),

  targetAgent:
    TARGET_AGENT,

  component: {

    id:
      resolvedComponentId,

    nodes:
      resolvedNodes,

    edges:
      resolvedEdges,

    agents:
      resolvedAgents,

    owners:
      resolvedOwners,

    uris:
      resolvedURIs,

    density:
      resolvedDensity

  },

  target: {

    v24Occurrences:
      targetPathsV24,

    v24Objects:
      targetObjectsV24.map(
        item => ({
          path:
            item.path,

          object:
            item.object

        })
      )

  },

  v25: {

    ownerAgentCount,

    uriAgentCount,

    uriOwnerCount,

    crossOwnerURI,

    crossOwnerURIs

  },

  v26: {

    ownerDeviation,

    uriDeviation

  },

  v27: {

    anomalyScore,

    anomalyClassification,

    baselineOwnerAgents,

    baselineURI,
    
    baselineURIOwners

  },

  v29: {

    anomalyScore:
      v29Anomaly,

    correlatedRisk,

    classification:
      v29Risk?.classification ??
      null

  },

  v42: {

    sharedURI: {

      agents:
        number(
          sharedURI?.agents
        ),

      owners:
        number(
          sharedURI?.owners
        ),

      classification:
        sharedURI?.classification ??
        null

    }

  },

  validation: {

    checks,

    passed,

    total,

    status:
      validation

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
console.log("          V43.4 FINAL RESULT");
console.log("==========================================");
console.log("");

console.log(
  "Agent:",
  TARGET_AGENT
);

print(
  "Component",
  resolvedComponentId
);

print(
  "Component nodes",
  resolvedNodes
);

print(
  "Component edges",
  resolvedEdges
);

print(
  "Component agents",
  resolvedAgents
);

print(
  "Component owners",
  resolvedOwners
);

print(
  "Component URIs",
  resolvedURIs
);

print(
  "Density",
  resolvedDensity
);

console.log("");

print(
  "Owner agent count",
  ownerAgentCount
);

print(
  "URI agent count",
  uriAgentCount
);

print(
  "URI owner count",
  uriOwnerCount
);

console.log(
  "Cross-owner URI:",
  crossOwnerURI
);

console.log("");

print(
  "Owner deviation",
  ownerDeviation
);

print(
  "URI deviation",
  uriDeviation
);

console.log("");

print(
  "Anomaly",
  anomalyScore
);

print(
  "Correlated risk",
  correlatedRisk
);

console.log("");

console.log("==========================================");
console.log("           DATA VALIDATION");
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
  "📁 Output:",
  OUTPUT_FILE
);

console.log("");

console.log("==========================================");
console.log(
  "       V24 STRUCTURE RESOLVER TAMAMLANDI"
);
console.log("==========================================");
console.log("");
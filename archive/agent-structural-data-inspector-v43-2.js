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
  "agent-structural-data-inspector-v43-2.json";


function load(file) {

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

  } catch (error) {

    return {
      __parseError:
        error.message
    };

  }

}


function isObject(value) {

  return (
    value !== null &&
    typeof value === "object"
  );

}


function isPrimitive(value) {

  return (
    value === null ||
    typeof value !== "object"
  );

}


function containsTarget(
  value
) {

  if (
    value === null ||
    value === undefined
  ) {

    return false;

  }

  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {

    return (
      String(value) ===
      TARGET_AGENT
    );

  }

  if (
    Array.isArray(value)
  ) {

    return value.some(
      item =>
        containsTarget(item)
    );

  }

  if (
    typeof value === "object"
  ) {

    return Object.values(value)
      .some(
        item =>
          containsTarget(item)
      );

  }

  return false;

}


function inspect(
  value,
  path,
  results,
  depth = 0
) {

  if (
    depth > 12 ||
    value === null ||
    value === undefined
  ) {

    return;

  }


  if (
    Array.isArray(value)
  ) {

    results.push({

      path,

      type:
        "array",

      length:
        value.length,

      sample:

        value.length > 0
          ? (
              isPrimitive(value[0])
                ? value[0]
                : "[object]"
            )
          : null

    });


    for (
      let i = 0;
      i < Math.min(
        value.length,
        5
      );
      i++
    ) {

      inspect(
        value[i],
        `${path}[${i}]`,
        results,
        depth + 1
      );

    }

    return;

  }


  if (
    typeof value === "object"
  ) {

    const keys =
      Object.keys(value);


    results.push({

      path,

      type:
        "object",

      keys:
        keys.slice(0, 100),

      keyCount:
        keys.length

    });


    for (
      const key of keys
    ) {

      const child =
        value[key];

      const childPath =
        path === "$"
          ? `$.${key}`
          : `${path}.${key}`;


      if (
        isPrimitive(child)
      ) {

        results.push({

          path:
            childPath,

          type:
            typeof child,

          value:
            child

        });

      } else {

        inspect(
          child,
          childPath,
          results,
          depth + 1
        );

      }

    }

  }

}


function findTargetPaths(
  value,
  path,
  results,
  depth = 0
) {

  if (
    depth > 12 ||
    value === null ||
    value === undefined
  ) {

    return;

  }


  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {

    if (
      String(value) ===
      TARGET_AGENT
    ) {

      results.push({
        path,
        value
      });

    }

    return;

  }


  if (
    Array.isArray(value)
  ) {

    for (
      let i = 0;
      i < value.length;
      i++
    ) {

      findTargetPaths(
        value[i],
        `${path}[${i}]`,
        results,
        depth + 1
      );

    }

    return;

  }


  if (
    typeof value === "object"
  ) {

    for (
      const [key, child]
      of Object.entries(value)
    ) {

      findTargetPaths(
        child,
        path === "$"
          ? `$.${key}`
          : `${path}.${key}`,
        results,
        depth + 1
      );

    }

  }

}


function findKeys(
  value,
  path,
  wanted,
  results,
  depth = 0
) {

  if (
    depth > 12 ||
    value === null ||
    value === undefined
  ) {

    return;

  }


  if (
    Array.isArray(value)
  ) {

    for (
      let i = 0;
      i < value.length;
      i++
    ) {

      findKeys(
        value[i],
        `${path}[${i}]`,
        wanted,
        results,
        depth + 1
      );

    }

    return;

  }


  if (
    typeof value === "object"
  ) {

    for (
      const [key, child]
      of Object.entries(value)
    ) {

      if (
        wanted.has(
          key.toLowerCase()
        )
      ) {

        results.push({

          path:
            path === "$"
              ? `$.${key}`
              : `${path}.${key}`,

          key,

          value:
            isPrimitive(child)
              ? child
              : "[object]"

        });

      }


      if (
        child &&
        typeof child === "object"
      ) {

        findKeys(
          child,
          path === "$"
            ? `$.${key}`
            : `${path}.${key}`,
          wanted,
          results,
          depth + 1
        );

      }

    }

  }

}


function printSection(
  title
) {

  console.log("");
  console.log(
    "=========================================="
  );
  console.log(
    title
  );
  console.log(
    "=========================================="
  );
  console.log("");

}


console.log("");
console.log("==========================================");
console.log("   STRUCTURAL DATA INSPECTOR v43.2");
console.log("==========================================");
console.log("");

console.log(
  "Target Agent:",
  TARGET_AGENT
);

console.log("");


// ==========================================
// KEY SEARCH LIST
// ==========================================

const wantedKeys =
  new Set([

    "agent",

    "agentid",

    "agent_id",

    "id",

    "component",

    "componentid",

    "component_id",

    "nodes",

    "edges",

    "agents",

    "owners",

    "uris",

    "uri",

    "degree",

    "density",

    "anomalyscore",

    "anomaly_score",

    "classification",

    "correlatedrisk",

    "correlated_risk",

    "riskclassification",

    "structuralrisk",

    "structural_risk",

    "owneragents",

    "owneragentcount",

    "uriagents",

    "uriagentcount",

    "uriowners",

    "uriownercount",

    "crossowneruri",

    "crossowneruris",

    "ownerdeviation",

    "urideviation",

    "behavior"

  ]);


// ==========================================
// FILE ANALYSIS
// ==========================================

const report = {

  schemaVersion:
    "4.3.2",

  engine:
    "STRUCTURAL_DATA_INSPECTOR",

  generatedAt:
    new Date().toISOString(),

  targetAgent:
    TARGET_AGENT,

  files: {}

};


for (
  const [version, file]
  of Object.entries(FILES)
) {

  const data =
    load(file);


  printSection(
    `${version} — ${file}`
  );


  if (!data) {

    console.log(
      "STATUS: MISSING"
    );

    report.files[version] = {

      file,

      status:
        "MISSING"

    };

    continue;

  }


  if (
    data.__parseError
  ) {

    console.log(
      "STATUS: PARSE_ERROR"
    );

    console.log(
      data.__parseError
    );

    report.files[version] = {

      file,

      status:
        "PARSE_ERROR",

      error:
        data.__parseError

    };

    continue;

  }


  console.log(
    "STATUS: OK"
  );


  console.log(
    "Root type:",
    Array.isArray(data)
      ? "array"
      : typeof data
  );


  if (
    isObject(data) &&
    !Array.isArray(data)
  ) {

    console.log(
      "Root keys:",
      Object.keys(data).join(", ")
    );

  }


  // ----------------------------------------
  // TARGET PATHS
  // ----------------------------------------

  const targetPaths = [];

  findTargetPaths(
    data,
    "$",
    targetPaths
  );


  console.log("");

  console.log(
    "Target value paths:",
    targetPaths.length
  );


  for (
    const item of targetPaths.slice(
      0,
      50
    )
  ) {

    console.log(
      `${item.path} = ${item.value}`
    );

  }


  // ----------------------------------------
  // KEY PATHS
  // ----------------------------------------

  const keyPaths = [];

  findKeys(
    data,
    "$",
    wantedKeys,
    keyPaths
  );


  console.log("");

  console.log(
    "Interesting key paths:",
    keyPaths.length
  );


  for (
    const item of keyPaths.slice(
      0,
      150
    )
  ) {

    console.log(
      `${item.path} =`,
      item.value
    );

  }


  // ----------------------------------------
  // STRUCTURE
  // ----------------------------------------

  const structure = [];

  inspect(
    data,
    "$",
    structure
  );


  // ----------------------------------------
  // AGENT CONTAINING OBJECTS
  // ----------------------------------------

  const agentObjects = [];


  function collectAgentObjects(
    value,
    path,
    depth = 0
  ) {

    if (
      depth > 10 ||
      value === null ||
      value === undefined
    ) {

      return;

    }


    if (
      Array.isArray(value)
    ) {

      for (
        let i = 0;
        i < value.length;
        i++
      ) {

        const item =
          value[i];


        if (
          isObject(item) &&
          containsTarget(item)
        ) {

          agentObjects.push({

            path:
              `${path}[${i}]`,

            keys:
              Object.keys(item),

            object:
              item

          });

        }


        collectAgentObjects(
          item,
          `${path}[${i}]`,
          depth + 1
        );

      }

      return;

    }


    if (
      typeof value === "object"
    ) {

      for (
        const [key, child]
        of Object.entries(value)
      ) {

        const childPath =
          path === "$"
            ? `$.${key}`
            : `${path}.${key}`;


        if (
          isObject(child) &&
          containsTarget(child)
        ) {

          agentObjects.push({

            path:
              childPath,

            keys:
              Object.keys(child),

            object:
              child

          });

        }


        if (
          child &&
          typeof child === "object"
        ) {

          collectAgentObjects(
            child,
            childPath,
            depth + 1
          );

        }

      }

    }

  }


  collectAgentObjects(
    data,
    "$"
  );


  console.log("");

  console.log(
    "Objects containing target:",
    agentObjects.length
  );


  for (
    const item of agentObjects.slice(
      0,
      20
    )
  ) {

    console.log(
      item.path
    );

    console.log(
      "  Keys:",
      item.keys.join(", ")
    );

  }


  report.files[version] = {

    file,

    status:
      "OK",

    rootType:
      Array.isArray(data)
        ? "array"
        : typeof data,

    rootKeys:
      isObject(data) &&
      !Array.isArray(data)
        ? Object.keys(data)
        : [],

    targetPaths,

    interestingKeyPaths:
      keyPaths,

    agentObjects:
      agentObjects.map(
        item => ({

          path:
            item.path,

          keys:
            item.keys,

          object:
            item.object

        })
      ),

    structureSummary:
      structure.slice(
        0,
        500
      )

  };

}


// ==========================================
// CROSS FILE SUMMARY
// ==========================================

printSection(
  "CROSS-FILE FIELD SUMMARY"
);


const summaryKeys = [

  "component",

  "componentId",

  "nodes",

  "edges",

  "agents",

  "owners",

  "uris",

  "degree",

  "density",

  "anomalyScore",

  "classification",

  "correlatedRisk",

  "riskClassification",

  "structuralRisk",

  "ownerAgents",

  "ownerAgentCount",

  "uriAgents",

  "uriAgentCount",

  "uriOwners",

  "uriOwnerCount",

  "crossOwnerURI",

  "ownerDeviation",

  "uriDeviation",

  "behavior"

];


for (
  const key of summaryKeys
) {

  console.log("");
  console.log(
    `--- ${key} ---`
  );


  for (
    const [version, info]
    of Object.entries(
      report.files
    )
  ) {

    if (
      info.status !== "OK"
    ) {

      continue;

    }


    const matches =
      info.interestingKeyPaths
        .filter(
          item =>
            item.key === key
        );


    if (
      matches.length === 0
    ) {

      continue;

    }


    console.log(
      version
    );


    for (
      const match of matches.slice(
        0,
        10
      )
    ) {

      console.log(
        `  ${match.path} =`,
        match.value
      );

    }

  }

}


// ==========================================
// EXPECTED HISTORICAL VALUES
// ==========================================

printSection(
  "HISTORICAL VALUES FOR COMPARISON"
);


console.log(
  "These are ONLY the values previously reported in terminal output."
);

console.log(
  "They are NOT used to overwrite JSON data."
);

console.log("");

console.log(
  "V24 component:",
  "29"
);

console.log(
  "V24 component nodes:",
  "120"
);

console.log(
  "V24 component edges:",
  "6742"
);

console.log(
  "V24 component agents:",
  "102"
);

console.log(
  "V24 component owners:",
  "15"
);

console.log(
  "V24 component URIs:",
  "3"
);

console.log(
  "V24 density:",
  "0.9442577030812325"
);

console.log(
  "V24 known-agent degree:",
  "95"
);

console.log("");

console.log(
  "V27 anomaly:",
  "65"
);

console.log(
  "V29 correlated risk:",
  "70"
);

console.log(
  "V32 structural risk:",
  "68"
);

console.log("");

console.log(
  "V25 owner agents:",
  "1"
);

console.log(
  "V25 URI agents:",
  "94"
);

console.log(
  "V25 URI owners:",
  "14"
);


// ==========================================
// OUTPUT
// ==========================================

fs.writeFileSync(

  OUTPUT_FILE,

  JSON.stringify(
    report,
    null,
    2
  ),

  "utf8"

);


printSection(
  "V43.2 FINAL RESULT"
);


console.log(
  "Target:",
  TARGET_AGENT
);

console.log(
  "Files inspected:",
  Object.keys(
    FILES
  ).length
);

console.log(
  "Output:",
  OUTPUT_FILE
);

console.log("");

console.log(
  "IMPORTANT:"
);

console.log(
  "V43.2 does NOT calculate or modify risk."
);

console.log(
  "It only identifies the real JSON field paths."
);

console.log(
  "Use the discovered paths for V43.3."
);

console.log("");

console.log(
  "=========================================="
);

console.log(
  "     STRUCTURAL DATA INSPECTION TAMAMLANDI"
);

console.log(
  "=========================================="
);

console.log("");
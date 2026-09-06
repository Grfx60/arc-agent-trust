const fs = require("fs");


// ============================================
// ARGUMENTS
// ============================================

const agentIds =
  process.argv
    .slice(2)
    .filter(Boolean);


if (
  agentIds.length === 0
) {

  console.error("");
  console.error(
    "❌ En az bir Agent ID belirtilmeli."
  );

  console.error("");

  console.error(
    "Tek agent:"
  );

  console.error(
    "node agent-comparison-v12.js 845265"
  );

  console.error("");

  console.error(
    "Birden fazla agent:"
  );

  console.error(
    "node agent-comparison-v12.js 845265 845266 845267"
  );

  console.error("");

  process.exit(1);
}


// ============================================
// HEADER
// ============================================

console.log("");

console.log(
  "=========================================="
);

console.log(
  "        AGENT COMPARISON ENGINE v12"
);

console.log(
  "=========================================="
);

console.log("");

console.log(
  "Agents requested:",
  agentIds.length
);

console.log("");


// ============================================
// LOAD INTELLIGENCE
// ============================================

function loadAgent(
  agentId
) {

  const filename =
    `agent-${agentId}-intelligence-v10.json`;


  if (
    !fs.existsSync(filename)
  ) {

    return {

      agentId,

      status:
        "MISSING",

      filename

    };

  }


  try {

    const data =
      JSON.parse(
        fs.readFileSync(
          filename,
          "utf8"
        )
      );


    if (
      String(data.agentId) !==
      String(agentId)
    ) {

      return {

        agentId,

        status:
          "ID_MISMATCH",

        filename

      };

    }


    return {

      agentId,

      status:
        "OK",

      filename,

      data

    };


  } catch (
    error
  ) {

    return {

      agentId,

      status:
        "INVALID_JSON",

      filename,

      error:
        error.message

    };

  }

}


// ============================================
// LOAD ALL
// ============================================

const loadedAgents =
  agentIds.map(
    loadAgent
  );


const validAgents =
  loadedAgents.filter(
    agent =>
      agent.status ===
      "OK"
  );


const invalidAgents =
  loadedAgents.filter(
    agent =>
      agent.status !==
      "OK"
  );


// ============================================
// DATA AVAILABILITY
// ============================================

console.log(
  "=========================================="
);

console.log(
  "           DATA AVAILABILITY"
);

console.log(
  "=========================================="
);

console.log("");

for (
  const agent
  of loadedAgents
) {

  if (
    agent.status ===
    "OK"
  ) {

    console.log(
      `✓ Agent ${agent.agentId} → OK`
    );

  } else {

    console.log(
      `⚠ Agent ${agent.agentId} → ${agent.status}`
    );

  }

}

console.log("");

console.log(
  "Valid agents:",
  validAgents.length
);

console.log(
  "Unavailable:",
  invalidAgents.length
);

console.log("");


// ============================================
// STOP IF NONE
// ============================================

if (
  validAgents.length === 0
) {

  console.error(
    "❌ Karşılaştırılabilir agent bulunamadı."
  );

  process.exit(1);
}


// ============================================
// EXTRACT METRICS
// ============================================

const rows =
  validAgents.map(
    entry => {

      const data =
        entry.data;


      const assessment =
        data.assessment || {};


      const decision =
        data.decision || {};


      const reputation =
        data.reputation || {};


      const validation =
        data.validation || {};


      const graph =
        data.graph || {};


      const dynamics =
        data.dynamics || {};


      return {

        agentId:
          entry.agentId,

        evidenceCoverage:
          Number(
            assessment.evidenceCoverage || 0
          ),

        independence:
          assessment.evidenceIndependence ||
          "UNKNOWN",

        quality:
          assessment.evidenceQuality ||
          "LOW",

        graphRisk:
          assessment.graphRisk ||
          "UNKNOWN",

        graphConsistency:
          assessment.graphConsistency ||
          "UNKNOWN",

        temporalAssessment:
          assessment.temporalAssessment ||
          "UNKNOWN",

        temporalCoverage:
          assessment.temporalCoverage ||
          "UNKNOWN",

        decision:
          decision.result ||
          "UNKNOWN",

        providers:
          Number(
            reputation.providers || 0
          ),

        reputationRecords:
          Number(
            reputation.records || 0
          ),

        validationRecords:
          Number(
            validation.records || 0
          ),

        validators:
          Number(
            validation.validators || 0
          ),

        validationChanged:
          Boolean(
            validation.changed
          ),

        overlappingActors:
          Number(
            graph.overlappingActors || 0
          ),

        graphNodes:
          Number(
            graph.nodes || 0
          ),

        graphRelationships:
          Number(
            graph.relationships || 0
          ),

        reputationChanges:
          Number(
            dynamics.reputationChanges || 0
          ),

        validationChanges:
          Number(
            dynamics.validationChanges || 0
          )

      };

    }
  );


// ============================================
// COMPARISON HELPERS
// ============================================

function independenceRank(
  value
) {

  if (
    value ===
    "HIGH"
  ) {

    return 3;

  }

  if (
    value ===
    "MEDIUM"
  ) {

    return 2;

  }

  if (
    value ===
    "LOW"
  ) {

    return 1;

  }

  return 0;

}


function qualityRank(
  value
) {

  if (
    value ===
    "HIGH"
  ) {

    return 3;

  }

  if (
    value ===
    "MEDIUM"
  ) {

    return 2;

  }

  if (
    value ===
    "LOW"
  ) {

    return 1;

  }

  return 0;

}


function graphRiskRank(
  value
) {

  if (
    value ===
    "LOW"
  ) {

    return 1;

  }

  if (
    value ===
    "MEDIUM"
  ) {

    return 2;

  }

  if (
    value ===
    "HIGH"
  ) {

    return 3;

  }

  return 0;

}


function temporalRank(
  value
) {

  if (
    value ===
    "STABLE"
  ) {

    return 1;

  }

  if (
    value ===
    "CHANGED"
  ) {

    return 2;

  }

  return 0;

}


// ============================================
// EVIDENCE QUALITY RANK
// ============================================
//
// Bu Trust Score değildir.
// Yalnızca karşılaştırma sırasıdır.
//
// ============================================

function comparisonRank(
  row
) {

  let score = 0;


  // Coverage
  score +=
    row.evidenceCoverage * 0.40;


  // Independence
  score +=
    independenceRank(
      row.independence
    ) * 10;


  // Quality
  score +=
    qualityRank(
      row.quality
    ) * 5;


  // Graph consistency
  if (
    row.graphConsistency ===
    "CONSISTENT"
  ) {

    score += 5;

  }


  // Graph risk penalty
  if (
    row.graphRisk ===
    "HIGH"
  ) {

    score -= 10;

  } else if (
    row.graphRisk ===
    "MEDIUM"
  ) {

    score -= 5;

  }


  // Overlap penalty
  score -=
    row.overlappingActors * 5;


  // Single validator
  if (
    row.validators ===
    1
  ) {

    score -= 3;

  }


  return Math.max(
    0,
    Number(
      score.toFixed(2)
    )
  );

}


for (
  const row
  of rows
) {

  row.comparisonRank =
    comparisonRank(
      row
    );

}


// ============================================
// SORT
// ============================================

rows.sort(
  (
    a,
    b
  ) =>
    b.comparisonRank -
    a.comparisonRank
);


// ============================================
// COMPARISON TABLE
// ============================================

console.log(
  "=========================================="
);

console.log(
  "          AGENT COMPARISON"
);

console.log(
  "=========================================="
);

console.log("");

console.log(
  "Agent | Coverage | Independence | Quality | Graph | Dynamics | Decision"
);

console.log(
  "--------------------------------------------------------------------------"
);


for (
  const row
  of rows
) {

  console.log(

    `${row.agentId} | ` +
    `${row.evidenceCoverage} | ` +
    `${row.independence} | ` +
    `${row.quality} | ` +
    `${row.graphRisk} | ` +
    `${row.temporalAssessment} | ` +
    `${row.decision}`

  );

}

console.log("");


// ============================================
// DETAILED AGENT PROFILES
// ============================================

console.log(
  "=========================================="
);

console.log(
  "          AGENT PROFILES"
);

console.log(
  "=========================================="
);

console.log("");


for (
  const row
  of rows
) {

  console.log(
    `Agent ${row.agentId}`
  );

  console.log(
    "----------------------------------------"
  );

  console.log(
    "Comparison rank:",
    row.comparisonRank
  );

  console.log(
    "Evidence coverage:",
    `${row.evidenceCoverage}/100`
  );

  console.log(
    "Evidence independence:",
    row.independence
  );

  console.log(
    "Evidence quality:",
    row.quality
  );

  console.log(
    "Graph risk:",
    row.graphRisk
  );

  console.log(
    "Graph consistency:",
    row.graphConsistency
  );

  console.log(
    "Temporal assessment:",
    row.temporalAssessment
  );

  console.log(
    "Temporal coverage:",
    row.temporalCoverage
  );

  console.log(
    "Decision:",
    row.decision
  );

  console.log(
    "Reputation providers:",
    row.providers
  );

  console.log(
    "Reputation records:",
    row.reputationRecords
  );

  console.log(
    "Validators:",
    row.validators
  );

  console.log(
    "Validation records:",
    row.validationRecords
  );

  console.log(
    "Overlapping actors:",
    row.overlappingActors
  );

  console.log("");

}


// ============================================
// RANKING
// ============================================

console.log(
  "=========================================="
);

console.log(
  "       EVIDENCE QUALITY ORDER"
);

console.log(
  "=========================================="
);

console.log("");

rows.forEach(
  (
    row,
    index
  ) => {

    console.log(
      `${index + 1}. Agent ${row.agentId} → ${row.comparisonRank}`
    );

  }
);

console.log("");


// ============================================
// DECISION SUMMARY
// ============================================

const allowCount =
  rows.filter(
    row =>
      row.decision ===
      "ALLOW"
  ).length;


const reviewCount =
  rows.filter(
    row =>
      row.decision ===
      "REVIEW"
  ).length;


const blockCount =
  rows.filter(
    row =>
      row.decision ===
      "BLOCK"
  ).length;


console.log(
  "=========================================="
);

console.log(
  "        DECISION DISTRIBUTION"
);

console.log(
  "=========================================="
);

console.log("");

console.log(
  "ALLOW:",
  allowCount
);

console.log(
  "REVIEW:",
  reviewCount
);

console.log(
  "BLOCK:",
  blockCount
);

console.log("");


// ============================================
// OUTPUT
// ============================================

const outputFile =
  "agent-comparison-v12.json";


const output = {

  schemaVersion:
    "1.2",

  generatedAt:
    new Date().toISOString(),

  requestedAgents:
    agentIds,

  validAgents:
    validAgents.length,

  unavailableAgents:
    invalidAgents.map(
      agent => ({
        agentId:
          agent.agentId,

        status:
          agent.status,

        filename:
          agent.filename
      })
    ),

  ranking:
    rows.map(
      (
        row,
        index
      ) => ({

        rank:
          index + 1,

        agentId:
          row.agentId,

        comparisonRank:
          row.comparisonRank,

        evidenceCoverage:
          row.evidenceCoverage,

        independence:
          row.independence,

        quality:
          row.quality,

        graphRisk:
          row.graphRisk,

        graphConsistency:
          row.graphConsistency,

        temporalAssessment:
          row.temporalAssessment,

        temporalCoverage:
          row.temporalCoverage,

        decision:
          row.decision

      })
    ),

  decisionDistribution: {

    allow:
      allowCount,

    review:
      reviewCount,

    block:
      blockCount

  }

};


fs.writeFileSync(
  outputFile,
  JSON.stringify(
    output,
    null,
    2
  ),
  "utf8"
);


// ============================================
// IMPORTANT
// ============================================

console.log(
  "=========================================="
);

console.log(
  "             IMPORTANT"
);

console.log(
  "=========================================="
);

console.log("");

console.log(
  "Comparison Rank is NOT a Trust Score."
);

console.log(
  "Ranking does NOT represent probability"
);

console.log(
  "of agent reliability."
);

console.log(
  "Agents are compared using evidence"
);

console.log(
  "structure and quality indicators."
);

console.log("");

console.log(
  "📁 Comparison dosyası oluşturuldu:"
);

console.log(
  outputFile
);

console.log("");

console.log(
  "=========================================="
);

console.log(
  "       AGENT COMPARISON TAMAMLANDI"
);

console.log(
  "=========================================="
);

console.log("");
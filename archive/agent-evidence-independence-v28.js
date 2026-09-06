const fs = require("fs");

const V27_FILE = "agent-anomaly-detection-v27.json";
const V10_FILE = "agent-845265-intelligence-v10.json";
const V20_FILE = "agent-metadata-quality-v20.json";
const V21_FILE = "agent-shared-cluster-v21.json";
const V22_FILE = "agent-identity-correlation-v22.json";
const V23_FILE = "agent-relationship-graph-v23.json";

const OUTPUT_FILE = "agent-evidence-independence-v28.json";

const AGENT_ID = 845265;

function loadJSON(file) {
  if (!fs.existsSync(file)) {
    return null;
  }

  return JSON.parse(
    fs.readFileSync(file, "utf8")
  );
}

function unique(arr) {
  return [...new Set(arr)];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function main() {

  console.log("");
  console.log("==========================================");
  console.log("       EVIDENCE INDEPENDENCE ENGINE v28");
  console.log("==========================================");
  console.log("");

  const v27 = loadJSON(V27_FILE);
  const v10 = loadJSON(V10_FILE);
  const v20 = loadJSON(V20_FILE);
  const v21 = loadJSON(V21_FILE);
  const v22 = loadJSON(V22_FILE);
  const v23 = loadJSON(V23_FILE);

  console.log(
    "V27:",
    v27 ? "OK" : "MISSING"
  );

  console.log(
    "V10:",
    v10 ? "OK" : "MISSING"
  );

  console.log(
    "V20:",
    v20 ? "OK" : "MISSING"
  );

  console.log(
    "V21:",
    v21 ? "OK" : "MISSING"
  );

  console.log(
    "V22:",
    v22 ? "OK" : "MISSING"
  );

  console.log(
    "V23:",
    v23 ? "OK" : "MISSING"
  );

  console.log("");

  // ==========================================
  // BASE DATA
  // ==========================================

  const reputationProviders = [];

  const validators = [];

  let reputationProviderCount = 0;
  let validatorCount = 0;

  let overlappingActors = 0;

  let sharedURI = false;
  let crossOwnerURI = false;

  let uriAgents = 0;
  let uriOwners = 0;

  let graphNodes = 0;
  let graphEdges = 0;


  // ==========================================
  // V10 — EVIDENCE INTELLIGENCE
  // ==========================================

  if (v10) {

    reputationProviderCount =
      Number(
        v10.reputationProviders ||
        v10.reputation?.providers ||
        0
      );

    validatorCount =
      Number(
        v10.validators ||
        v10.validation?.validators ||
        0
      );

  }


  // ==========================================
  // V20 — METADATA
  // ==========================================

  if (v20) {

    const known =
      v20.knownAgent ||
      v20.knownAgentAnalysis ||
      null;

    if (known) {

      const uriCluster =
        Number(
          known.uriCluster ||
          known.sharedURICluster ||
          known.uriAgentCount ||
          0
        );

      if (uriCluster > 1) {
        sharedURI = true;
      }

    }

  }


  // ==========================================
  // V21 — SHARED CLUSTER
  // ==========================================

  if (v21) {

    const known =
      v21.knownAgent ||
      v21.knownAgentAnalysis ||
      null;

    if (known) {

      uriAgents =
        Number(
          known.sharedURIAgentCount ||
          known.uriAgentCount ||
          known.sharedAgents ||
          0
        );

      uriOwners =
        Number(
          known.sharedURIOwnerCount ||
          known.uriOwnerCount ||
          known.owners ||
          0
        );

    }

  }


  // ==========================================
  // V27 — ANOMALY
  // ==========================================

  if (v27) {

    const anomaly =
      v27.anomaly ||
      {};

    const signals =
      Array.isArray(anomaly.signals)
        ? anomaly.signals
        : [];

    sharedURI =
      sharedURI ||
      signals.some(
        s =>
          s.code ===
          "SHARED_URI"
      );

    crossOwnerURI =
      signals.some(
        s =>
          s.code ===
          "CROSS_OWNER_URI" ||
          s.code ===
          "HIGH_CROSS_OWNER_URI"
      );

  }


  // ==========================================
  // V23 — GRAPH
  // ==========================================

  if (v23) {

    graphNodes =
      Number(
        v23.nodeCount ||
        v23.nodes?.length ||
        0
      );

    graphEdges =
      Number(
        v23.edgeCount ||
        v23.edges?.length ||
        0
      );

  }


  // ==========================================
  // DIRECT EVIDENCE OVERLAP
  // ==========================================

  //
  // Önceki graph/evidence sonuçlarında bilinen
  // overlap bilgisini mümkün olduğunca koruyoruz.
  //

  if (v10) {

    const possibleOverlap =
      Number(
        v10.overlappingActors ||
        v10.overlap?.count ||
        0
      );

    if (possibleOverlap > 0) {
      overlappingActors =
        possibleOverlap;
    }

  }


  // ==========================================
  // INDEPENDENCE COMPONENTS
  // ==========================================

  const components = [];

  // Reputation independence
  let reputationScore = 0;

  if (
    reputationProviderCount >= 3
  ) {
    reputationScore = 100;
  } else if (
    reputationProviderCount === 2
  ) {
    reputationScore = 70;
  } else if (
    reputationProviderCount === 1
  ) {
    reputationScore = 30;
  }

  components.push({
    name: "REPUTATION_INDEPENDENCE",
    score: reputationScore,
    evidence:
      `${reputationProviderCount} reputation provider(s).`
  });


  // Validator independence
  let validationScore = 0;

  if (
    validatorCount >= 3
  ) {
    validationScore = 100;
  } else if (
    validatorCount === 2
  ) {
    validationScore = 70;
  } else if (
    validatorCount === 1
  ) {
    validationScore = 30;
  }

  components.push({
    name: "VALIDATOR_INDEPENDENCE",
    score: validationScore,
    evidence:
      `${validatorCount} unique validator(s).`
  });


  // Reputation / validator overlap
  let reviewerSeparationScore = 100;

  if (
    overlappingActors > 0
  ) {

    reviewerSeparationScore = 20;

  }

  components.push({
    name: "REVIEWER_SEPARATION",
    score: reviewerSeparationScore,
    evidence:
      overlappingActors > 0
        ? `${overlappingActors} overlapping actor(s).`
        : "No known reviewer overlap."
  });


  // Metadata independence
  let metadataScore = 100;

  if (
    crossOwnerURI &&
    uriOwners >= 10
  ) {

    metadataScore = 10;

  } else if (
    crossOwnerURI
  ) {

    metadataScore = 35;

  } else if (
    sharedURI
  ) {

    metadataScore = 60;

  }

  components.push({
    name: "METADATA_INDEPENDENCE",
    score: metadataScore,
    evidence:
      `${uriAgents} agent(s) and ${uriOwners} owner(s) associated with shared URI evidence.`
  });


  // Graph independence
  let graphScore = 100;

  if (
    graphNodes > 0 &&
    graphEdges > 0
  ) {

    const densityRatio =
      graphEdges /
      Math.max(
        graphNodes,
        1
      );

    if (
      densityRatio > 5
    ) {

      graphScore = 35;

    } else if (
      densityRatio > 2
    ) {

      graphScore = 60;

    } else {

      graphScore = 80;

    }

  }

  components.push({
    name: "GRAPH_INDEPENDENCE",
    score: graphScore,
    evidence:
      `${graphNodes} graph nodes and ${graphEdges} graph edges.`
  });


  // ==========================================
  // OVERALL INDEPENDENCE
  // ==========================================

  const weights = {

    reputation: 0.20,
    validation: 0.20,
    separation: 0.25,
    metadata: 0.25,
    graph: 0.10

  };

  const weightedScore =
    (
      reputationScore *
      weights.reputation
    ) +
    (
      validationScore *
      weights.validation
    ) +
    (
      reviewerSeparationScore *
      weights.separation
    ) +
    (
      metadataScore *
      weights.metadata
    ) +
    (
      graphScore *
      weights.graph
    );


  const independenceScore =
    Math.round(
      clamp(
        weightedScore,
        0,
        100
      )
    );


  // ==========================================
  // CLASSIFICATION
  // ==========================================

  let independence;

  if (
    independenceScore >= 75
  ) {

    independence =
      "HIGH";

  } else if (
    independenceScore >= 50
  ) {

    independence =
      "MEDIUM";

  } else {

    independence =
      "LOW";

  }


  // ==========================================
  // PRIMARY WEAKNESS
  // ==========================================

  const weakest =
    [...components]
      .sort(
        (a, b) =>
          a.score -
          b.score
      )[0];


  // ==========================================
  // SIGNALS
  // ==========================================

  const signals = [];

  if (
    reputationScore < 50
  ) {

    signals.push({
      code:
        "LOW_REPUTATION_INDEPENDENCE",

      severity:
        "HIGH"
    });

  }

  if (
    validationScore < 50
  ) {

    signals.push({
      code:
        "LOW_VALIDATOR_INDEPENDENCE",

      severity:
        "HIGH"
    });

  }

  if (
    reviewerSeparationScore < 50
  ) {

    signals.push({
      code:
        "REVIEWER_OVERLAP",

      severity:
        "HIGH"
    });

  }

  if (
    metadataScore < 50
  ) {

    signals.push({
      code:
        "LOW_METADATA_INDEPENDENCE",

      severity:
        "HIGH"
    });

  }

  if (
    graphScore < 50
  ) {

    signals.push({
      code:
        "HIGH_GRAPH_CORRELATION",

      severity:
        "MEDIUM"
    });

  }


  // ==========================================
  // INTERPRETATION
  // ==========================================

  const interpretation = {

    independentEvidence:
      independenceScore >= 75,

    partiallyIndependent:
      independenceScore >= 50 &&
      independenceScore < 75,

    lowIndependence:
      independenceScore < 50,

    primaryWeakness:
      weakest.name,

    reviewRecommended:
      independenceScore < 60,

    notTrustScore:
      true,

    notProbability:
      true

  };


  // ==========================================
  // OUTPUT
  // ==========================================

  const output = {

    schemaVersion:
      "2.8",

    engine:
      "EVIDENCE_INDEPENDENCE",

    generatedAt:
      new Date().toISOString(),

    agent:
      AGENT_ID,

    sourceFiles: {

      v27:
        !!v27,

      v10:
        !!v10,

      v20:
        !!v20,

      v21:
        !!v21,

      v22:
        !!v22,

      v23:
        !!v23

    },

    evidenceStructure: {

      reputationProviders:
        reputationProviderCount,

      validators:
        validatorCount,

      overlappingActors:
        overlappingActors,

      sharedURI,

      crossOwnerURI,

      uriAgents,

      uriOwners,

      graphNodes,

      graphEdges

    },

    components,

    independence: {

      score:
        independenceScore,

      classification:
        independence,

      weakestComponent:
        weakest.name

    },

    signals,

    interpretation

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
  // REPORT
  // ==========================================

  console.log("");
  console.log("==========================================");
  console.log("          V28 FINAL RESULT");
  console.log("==========================================");
  console.log("");

  console.log(
    "Agent:",
    AGENT_ID
  );

  console.log(
    "Independence Score:",
    independenceScore,
    "/100"
  );

  console.log(
    "Classification:",
    independence
  );

  console.log(
    "Weakest component:",
    weakest.name
  );

  console.log("");

  console.log("==========================================");
  console.log("       INDEPENDENCE COMPONENTS");
  console.log("==========================================");
  console.log("");

  for (
    const component
    of components
  ) {

    console.log(
      `${component.name}: ${component.score}/100`
    );

    console.log(
      `  ${component.evidence}`
    );

    console.log("");

  }


  console.log("==========================================");
  console.log("             SIGNALS");
  console.log("==========================================");
  console.log("");

  if (
    signals.length === 0
  ) {

    console.log(
      "✓ No major independence signals."
    );

  } else {

    for (
      const signal
      of signals
    ) {

      console.log(
        `⚠ ${signal.code} [${signal.severity}]`
      );

    }

  }

  console.log("");

  console.log(
    "Review recommended:",
    interpretation.reviewRecommended
  );

  console.log("");

  console.log(
    "📁 Output:",
    OUTPUT_FILE
  );

  console.log("");

  console.log("==========================================");
  console.log(
    "      EVIDENCE INDEPENDENCE TAMAMLANDI"
  );
  console.log("==========================================");
  console.log("");

}


try {

  main();

} catch (error) {

  console.error("");
  console.error("❌ V28 kritik hata:");
  console.error(
    error.message ||
    error
  );
  console.error("");

  process.exit(1);
}
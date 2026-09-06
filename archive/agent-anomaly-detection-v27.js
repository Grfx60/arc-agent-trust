const fs = require("fs");

const INPUT_FILE = "agent-behavioral-profile-v26.json";
const OUTPUT_FILE = "agent-anomaly-detection-v27.json";

const KNOWN_AGENT_ID = 845265;

function loadJSON(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`Dosya bulunamadı: ${file}`);
  }

  return JSON.parse(
    fs.readFileSync(file, "utf8")
  );
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function main() {

  console.log("");
  console.log("==========================================");
  console.log("       AGENT ANOMALY DETECTION v27");
  console.log("==========================================");
  console.log("");

  const data = loadJSON(INPUT_FILE);

  const agents = data.ownerProfiles
    ? Object.values(
        data.ownerProfiles
      )
    : [];

  const known =
    data.knownAgent;

  if (!known) {
    throw new Error(
      "V26 knownAgent verisi bulunamadı."
    );
  }

  console.log(
    "Known agent:",
    KNOWN_AGENT_ID
  );

  console.log(
    "Behavior:",
    known.behavior
  );

  console.log("");


  // ==========================================
  // SIGNALS
  // ==========================================

  const signals = [];

  let anomalyScore = 0;


  // ------------------------------------------
  // SHARED URI
  // ------------------------------------------

  if (
    known.signals.sharedURI
  ) {

    signals.push({
      code: "SHARED_URI",
      severity: "LOW",
      weight: 10,
      description:
        "Agent URI is shared by multiple agents."
    });

    anomalyScore += 10;

  }


  // ------------------------------------------
  // CROSS OWNER URI
  // ------------------------------------------

  if (
    known.signals.crossOwnerURI
  ) {

    signals.push({
      code: "CROSS_OWNER_URI",
      severity: "MEDIUM",
      weight: 20,
      description:
        "The same URI is associated with multiple owners."
    });

    anomalyScore += 20;

  }


  // ------------------------------------------
  // HIGH CROSS OWNER URI
  // ------------------------------------------

  if (
    known.signals.highCrossOwnerURI
  ) {

    signals.push({
      code: "HIGH_CROSS_OWNER_URI",
      severity: "HIGH",
      weight: 25,
      description:
        "The URI is shared across a high number of owners."
    });

    anomalyScore += 25;

  }


  // ------------------------------------------
  // OWNER CONCENTRATION
  // ------------------------------------------

  if (
    known.signals.ownerConcentrated
  ) {

    signals.push({
      code: "OWNER_CONCENTRATION",
      severity: "MEDIUM",
      weight: 15,
      description:
        "Multiple agents are concentrated under one owner."
    });

    anomalyScore += 15;

  }


  // ------------------------------------------
  // MULTI URI OWNER
  // ------------------------------------------

  if (
    known.signals.ownerUsesMultipleURIs
  ) {

    signals.push({
      code: "MULTI_URI_OWNER",
      severity: "LOW",
      weight: 5,
      description:
        "Owner operates agents across multiple URIs."
    });

    anomalyScore += 5;

  }


  // ------------------------------------------
  // URI DEVIATION
  // ------------------------------------------

  const uriDeviation =
    Number(
      known.uriDeviation || 0
    );


  if (
    uriDeviation >= 3
  ) {

    signals.push({
      code: "EXTREME_URI_DEVIATION",
      severity: "HIGH",
      weight: 20,
      description:
        "URI association is significantly above component baseline."
    });

    anomalyScore += 20;

  } else if (
    uriDeviation >= 2
  ) {

    signals.push({
      code: "HIGH_URI_DEVIATION",
      severity: "MEDIUM",
      weight: 10,
      description:
        "URI association is above component baseline."
    });

    anomalyScore += 10;

  }


  // ------------------------------------------
  // OWNER DEVIATION
  // ------------------------------------------

  const ownerDeviation =
    Number(
      known.ownerDeviation || 0
    );


  if (
    ownerDeviation >= 3
  ) {

    signals.push({
      code: "EXTREME_OWNER_DEVIATION",
      severity: "HIGH",
      weight: 15,
      description:
        "Owner concentration is significantly above baseline."
    });

    anomalyScore += 15;

  } else if (
    ownerDeviation >= 2
  ) {

    signals.push({
      code: "HIGH_OWNER_DEVIATION",
      severity: "MEDIUM",
      weight: 10,
      description:
        "Owner concentration is above baseline."
    });

    anomalyScore += 10;

  }


  // ==========================================
  // SCORE
  // ==========================================

  anomalyScore =
    clamp(
      anomalyScore,
      0,
      100
    );


  // ==========================================
  // CLASSIFICATION
  // ==========================================

  let classification;

  if (
    anomalyScore < 20
  ) {

    classification =
      "NORMAL";

  } else if (
    anomalyScore < 40
  ) {

    classification =
      "LOW_ANOMALY";

  } else if (
    anomalyScore < 65
  ) {

    classification =
      "MODERATE_ANOMALY";

  } else {

    classification =
      "HIGH_ANOMALY";

  }


  // ==========================================
  // STRUCTURAL PROFILE
  // ==========================================

  let structuralProfile =
    "STANDARD";


  if (
    known.signals.uniqueOwner &&
    known.signals.highCrossOwnerURI
  ) {

    structuralProfile =
      "UNIQUE_OWNER_HIGHLY_SHARED_URI";

  } else if (
    known.signals.crossOwnerURI
  ) {

    structuralProfile =
      "CROSS_OWNER_URI_STRUCTURE";

  } else if (
    known.signals.ownerConcentrated
  ) {

    structuralProfile =
      "OWNER_CONCENTRATED_STRUCTURE";

  }


  // ==========================================
  // INDEPENDENCE WARNING
  // ==========================================

  let independenceWarning =
    "NONE";


  if (
    known.signals.highCrossOwnerURI
  ) {

    independenceWarning =
      "URI_REUSE_MAY_REDUCE_METADATA_INDEPENDENCE";

  }


  // ==========================================
  // INTERPRETATION
  // ==========================================

  const interpretation = {

    anomalyDetected:
      anomalyScore >= 20,

    structuralAnomaly:
      anomalyScore >= 40,

    highAnomaly:
      anomalyScore >= 65,

    notMaliciousProof:
      true,

    requiresIndependenceAnalysis:
      known.signals.crossOwnerURI,

    requiresManualReview:
      anomalyScore >= 40

  };


  // ==========================================
  // OUTPUT
  // ==========================================

  const output = {

    schemaVersion:
      "2.7",

    engine:
      "AGENT_ANOMALY_DETECTION",

    generatedAt:
      new Date().toISOString(),

    source:
      INPUT_FILE,

    agent:
      KNOWN_AGENT_ID,

    anomaly: {

      score:
        anomalyScore,

      classification,

      structuralProfile,

      signals,

      independenceWarning,

      interpretation

    },

    baseline: {

      ownerDeviation:
        ownerDeviation,

      uriDeviation:
        uriDeviation,

      ownerAgents:
        known.ownerProfile?.agents ||
        0,

      uriAgents:
        known.uriProfile?.agents ||
        0,

      uriOwners:
        known.uriProfile?.owners ||
        0

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
  // REPORT
  // ==========================================

  console.log("");
  console.log("==========================================");
  console.log("          V27 FINAL RESULT");
  console.log("==========================================");
  console.log("");

  console.log(
    "Agent:",
    KNOWN_AGENT_ID
  );

  console.log(
    "Anomaly Score:",
    anomalyScore,
    "/100"
  );

  console.log(
    "Classification:",
    classification
  );

  console.log(
    "Structural Profile:",
    structuralProfile
  );

  console.log(
    "Owner deviation:",
    ownerDeviation
  );

  console.log(
    "URI deviation:",
    uriDeviation
  );

  console.log("");

  console.log("==========================================");
  console.log("          ANOMALY SIGNALS");
  console.log("==========================================");
  console.log("");

  if (
    signals.length === 0
  ) {

    console.log(
      "✓ No structural anomaly signals."
    );

  } else {

    for (
      const signal
      of signals
    ) {

      console.log(
        `⚠ [${signal.weight}] ${signal.code}`
      );

      console.log(
        `   ${signal.description}`
      );

      console.log("");

    }

  }


  console.log("==========================================");
  console.log("       INDEPENDENCE WARNING");
  console.log("==========================================");
  console.log("");

  console.log(
    independenceWarning
  );

  console.log("");

  console.log(
    "Requires independence analysis:",
    interpretation.requiresIndependenceAnalysis
  );

  console.log(
    "Requires manual review:",
    interpretation.requiresManualReview
  );

  console.log("");

  console.log(
    "📁 Output:",
    OUTPUT_FILE
  );

  console.log("");

  console.log("==========================================");
  console.log(
    "       AGENT ANOMALY DETECTION TAMAMLANDI"
  );
  console.log("==========================================");
  console.log("");

}


try {

  main();

} catch (error) {

  console.error("");
  console.error("❌ V27 kritik hata:");
  console.error(
    error.message ||
    error
  );
  console.error("");

  process.exit(1);
}
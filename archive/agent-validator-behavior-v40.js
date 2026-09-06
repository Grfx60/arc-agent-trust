const fs = require("fs");

const TARGET_AGENT = "845265";

const CURRENT_VALIDATOR =
  "0xe18f822b5071553d62cf119ce57da6c1636f2524";

const V39_FILE =
  "agent-independent-validator-v39.json";

const V38_FILE =
  "agent-validator-identity-v38.json";

const OUTPUT_FILE =
  "agent-validator-behavior-v40.json";


function loadJSON(file) {
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


function normalize(value) {
  if (!value) return "";

  return String(value)
    .trim()
    .toLowerCase();
}


function unique(values) {
  return [
    ...new Set(
      values
        .filter(Boolean)
        .map(String)
        .map(normalize)
    )
  ];
}


function average(values) {
  if (!values.length) return 0;

  return (
    values.reduce(
      (sum, value) => sum + value,
      0
    ) / values.length
  );
}


console.log("");
console.log("==========================================");
console.log("     VALIDATOR BEHAVIORAL INTELLIGENCE v40");
console.log("==========================================");
console.log("");

console.log(
  "Target Agent:",
  TARGET_AGENT
);

console.log(
  "Current Validator:",
  CURRENT_VALIDATOR
);

console.log("");


// ==========================================
// LOAD V39
// ==========================================

const v39 =
  loadJSON(V39_FILE);

if (!v39) {

  console.log(
    "❌ V39 dosyası bulunamadı:"
  );

  console.log(
    V39_FILE
  );

  process.exit(1);
}


const validators =
  v39.validators || [];

const candidates =
  v39.candidates || [];

const targetValidators =
  v39.target?.validators || [];


// ==========================================
// BUILD VALIDATOR PROFILES
// ==========================================

const profiles = {};

for (
  const validator
  of validators
) {

  profiles[
    normalize(validator)
  ] = {

    validator:
      normalize(validator),

    validationCount:
      0,

    agents:
      new Set(),

    tags:
      new Set(),

    responses:
      [],

    responseHashes:
      new Set(),

    lastUpdates:
      [],

    targetAgent:
      false,

    repeatedAgentCount:
      0

  };

}


// ==========================================
// V39 CANDIDATE DATA
// ==========================================

for (
  const candidate
  of candidates
) {

  const validator =
    normalize(
      candidate.validator
    );

  if (
    !profiles[validator]
  ) {
    profiles[validator] = {

      validator,

      validationCount: 0,

      agents: new Set(),

      tags: new Set(),

      responses: [],

      responseHashes: new Set(),

      lastUpdates: [],

      targetAgent: false,

      repeatedAgentCount: 0

    };
  }

  profiles[validator]
    .validationCount =
      Number(
        candidate.validationCount || 0
      );

  for (
    const agent
    of candidate.validatedAgents || []
  ) {

    profiles[validator]
      .agents
      .add(
        normalize(agent)
      );

  }

  for (
    const tag
    of candidate.tags || []
  ) {

    profiles[validator]
      .tags
      .add(
        normalize(tag)
      );

  }

}


// ==========================================
// V38 TARGET DATA
// ==========================================

const v38 =
  loadJSON(V38_FILE);

if (v38) {

  const records =
    v38.targetValidation?.records || [];

  for (
    const record
    of records
  ) {

    const validator =
      normalize(
        record.validator
      );

    if (
      !profiles[validator]
    ) {
      profiles[validator] = {

        validator,

        validationCount: 0,

        agents:
          new Set(),

        tags:
          new Set(),

        responses:
          [],

        responseHashes:
          new Set(),

        lastUpdates:
          [],

        targetAgent:
          false,

        repeatedAgentCount:
          0

      };
    }

    const profile =
      profiles[validator];

    profile.validationCount++;

    profile.agents.add(
      TARGET_AGENT
    );

    profile.targetAgent = true;

    profile.responses.push(
      Number(
        record.response || 0
      )
    );

    if (
      record.responseHash
    ) {

      profile.responseHashes.add(
        normalize(
          record.responseHash
        )
      );

    }

    if (
      record.tag
    ) {

      profile.tags.add(
        normalize(
          record.tag
        )
      );

    }

    if (
      record.lastUpdate
    ) {

      profile.lastUpdates.push(
        Number(
          record.lastUpdate
        )
      );

    }

  }

}


// ==========================================
// PROFILE NORMALIZATION
// ==========================================

const normalizedProfiles = [];

for (
  const key
  of Object.keys(profiles)
) {

  const p =
    profiles[key];

  const agentList =
    [...p.agents];

  const tagList =
    [...p.tags];

  const responses =
    p.responses || [];

  const responseAverage =
    average(
      responses
    );

  normalizedProfiles.push({

    validator:
      p.validator,

    validationCount:
      p.validationCount,

    uniqueAgents:
      agentList.length,

    agents:
      agentList,

    tags:
      tagList,

    responseCount:
      responses.length,

    responseAverage,

    responseMin:
      responses.length
        ? Math.min(...responses)
        : null,

    responseMax:
      responses.length
        ? Math.max(...responses)
        : null,

    uniqueResponseHashes:
      p.responseHashes.size,

    targetAgent:
      p.targetAgent,

    targetAgentCount:
      agentList.includes(
        TARGET_AGENT
      )
        ? 1
        : 0,

    behaviorRatio:
      p.validationCount > 0
        ? (
            agentList.length /
            p.validationCount
          )
        : 0

  });

}


// ==========================================
// SORT
// ==========================================

normalizedProfiles.sort(
  (a, b) =>
    b.validationCount -
    a.validationCount
);


// ==========================================
// GLOBAL STATISTICS
// ==========================================

const totalValidationCount =
  normalizedProfiles.reduce(
    (sum, p) =>
      sum + p.validationCount,
    0
  );

const totalUniqueAgents =
  unique(
    normalizedProfiles.flatMap(
      p => p.agents
    )
  ).length;

const validatorsWithTarget =
  normalizedProfiles.filter(
    p => p.targetAgent
  );


// ==========================================
// CURRENT VALIDATOR PROFILE
// ==========================================

const current =
  normalizedProfiles.find(
    p =>
      p.validator ===
      normalize(
        CURRENT_VALIDATOR
      )
  );


// ==========================================
// BEHAVIOR CLASSIFICATION
// ==========================================

function classify(profile) {

  if (!profile) {
    return "NOT_FOUND";
  }

  if (
    profile.targetAgent &&
    profile.uniqueAgents === 1 &&
    profile.validationCount <= 3
  ) {

    return "TARGET_FOCUSED";

  }

  if (
    profile.validationCount >= 20 &&
    profile.uniqueAgents >= 15
  ) {

    return "BROAD_VALIDATOR";

  }

  if (
    profile.validationCount >= 20 &&
    profile.uniqueAgents < 10
  ) {

    return "CONCENTRATED_VALIDATOR";

  }

  if (
    profile.validationCount >= 5
  ) {

    return "ACTIVE_VALIDATOR";

  }

  return "LOW_ACTIVITY";

}


for (
  const profile
  of normalizedProfiles
) {

  profile.classification =
    classify(profile);

}


// ==========================================
// CURRENT VALIDATOR BEHAVIOR
// ==========================================

let currentBehavior =
  "NOT_FOUND";

if (current) {

  currentBehavior =
    current.classification;

}


// ==========================================
// COMPARISON BASELINE
// ==========================================

const alternativeProfiles =
  normalizedProfiles.filter(
    p =>
      p.validator !==
      normalize(
        CURRENT_VALIDATOR
      )
  );

const alternativeValidationAverage =
  average(
    alternativeProfiles.map(
      p =>
        p.validationCount
    )
  );

const alternativeAgentAverage =
  average(
    alternativeProfiles.map(
      p =>
        p.uniqueAgents
    )
  );


// ==========================================
// DEVIATION
// ==========================================

let activityDeviation =
  0;

let agentCoverageDeviation =
  0;

if (
  current &&
  alternativeProfiles.length
) {

  activityDeviation =
    current.validationCount -
    alternativeValidationAverage;

  agentCoverageDeviation =
    current.uniqueAgents -
    alternativeAgentAverage;

}


// ==========================================
// COMMON AGENT OVERLAP
// ==========================================

const overlapMap = {};

for (
  const profile
  of normalizedProfiles
) {

  for (
    const agent
    of profile.agents
  ) {

    if (
      !overlapMap[agent]
    ) {

      overlapMap[agent] =
        [];

    }

    overlapMap[agent].push(
      profile.validator
    );

  }

}


const sharedAgentRelationships = [];

for (
  const agent
  of Object.keys(
    overlapMap
  )
) {

  const owners =
    overlapMap[agent];

  if (
    owners.length >= 2
  ) {

    sharedAgentRelationships.push({

      agent,

      validatorCount:
        owners.length,

      validators:
        owners

    });

  }

}


// ==========================================
// TARGET VALIDATOR POSITION
// ==========================================

const targetValidatorSet =
  new Set(
    targetValidators.map(
      normalize
    )
  );

const targetValidatorProfiles =
  normalizedProfiles.filter(
    p =>
      targetValidatorSet.has(
        p.validator
      )
  );


// ==========================================
// BEHAVIORAL SIGNALS
// ==========================================

const signals = [];

if (current) {

  if (
    current.classification ===
    "BROAD_VALIDATOR"
  ) {

    signals.push({

      type:
        "BROAD_VALIDATION_BEHAVIOR",

      severity:
        "LOW",

      description:
        "Current validator validates many different agents."

    });

  }

  if (
    current.classification ===
    "CONCENTRATED_VALIDATOR"
  ) {

    signals.push({

      type:
        "CONCENTRATED_VALIDATION_BEHAVIOR",

      severity:
        "MEDIUM",

      description:
        "Current validator performs many validations across relatively few agents."

    });

  }

  if (
    current.classification ===
    "TARGET_FOCUSED"
  ) {

    signals.push({

      type:
        "TARGET_FOCUSED_BEHAVIOR",

      severity:
        "MEDIUM",

      description:
        "Current validator activity is strongly concentrated around the target."

    });

  }

  if (
    alternativeProfiles.length &&
    Math.abs(
      activityDeviation
    ) >
      alternativeValidationAverage
  ) {

    signals.push({

      type:
        "ACTIVITY_DEVIATION",

      severity:
        "LOW",

      description:
        "Validator activity differs substantially from the alternative-validator baseline."

    });

  }

}


// ==========================================
// INDEPENDENCE INTERPRETATION
// ==========================================

let independenceAssessment =
  "UNDETERMINED";

if (
  current &&
  !current.targetAgent &&
  alternativeProfiles.length >= 2
) {

  independenceAssessment =
    "BEHAVIORALLY_DISTINCT_FROM_TARGET_VALIDATORS";

} else if (
  current &&
  current.targetAgent
) {

  independenceAssessment =
    "TARGET_VALIDATOR_REQUIRES_ROLE_REVIEW";

}


// ==========================================
// OUTPUT
// ==========================================

const output = {

  schemaVersion:
    "4.0",

  engine:
    "VALIDATOR_BEHAVIORAL_INTELLIGENCE",

  generatedAt:
    new Date().toISOString(),

  targetAgent:
    TARGET_AGENT,

  currentValidator:
    normalize(
      CURRENT_VALIDATOR
    ),

  summary: {

    validators:
      normalizedProfiles.length,

    totalValidationCount,

    totalUniqueAgents,

    validatorsWithTarget:
      validatorsWithTarget.length,

    alternativeValidators:
      alternativeProfiles.length

  },

  currentValidatorProfile:
    current || null,

  currentBehavior,

  baseline: {

    alternativeValidationAverage,

    alternativeAgentAverage,

    activityDeviation,

    agentCoverageDeviation

  },

  validatorProfiles:
    normalizedProfiles,

  sharedAgentRelationships,

  targetValidatorProfiles,

  signals,

  independence: {

    assessment:
      independenceAssessment,

    verified:
      false,

    reason:
      "Behavioral similarity or difference does not by itself establish independence."

  },

  safety: {

    behaviorIsNotTrustProof:
      true,

    deviationIsNotFraudProof:
      true,

    providerOverlapIsNotFraudProof:
      true,

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
// FINAL REPORT
// ==========================================

console.log("");
console.log("==========================================");
console.log("          V40 FINAL RESULT");
console.log("==========================================");
console.log("");

console.log(
  "Agent:",
  TARGET_AGENT
);

console.log(
  "Validators:",
  normalizedProfiles.length
);

console.log(
  "Total validation records:",
  totalValidationCount
);

console.log(
  "Unique validated agents:",
  totalUniqueAgents
);

console.log(
  "Validators for target:",
  validatorsWithTarget.length
);

console.log(
  "Alternative validators:",
  alternativeProfiles.length
);

console.log("");

console.log("==========================================");
console.log("       CURRENT VALIDATOR");
console.log("==========================================");
console.log("");

if (current) {

  console.log(
    "Validator:",
    current.validator
  );

  console.log(
    "Validation count:",
    current.validationCount
  );

  console.log(
    "Unique agents:",
    current.uniqueAgents
  );

  console.log(
    "Tags:",
    current.tags.join(", ") ||
    "N/A"
  );

  console.log(
    "Response average:",
    current.responseAverage
  );

  console.log(
    "Classification:",
    current.classification
  );

} else {

  console.log(
    "Current validator profile not found."
  );

}

console.log("");

console.log("==========================================");
console.log("       ALTERNATIVE VALIDATORS");
console.log("==========================================");
console.log("");

for (
  const profile
  of alternativeProfiles
) {

  console.log(
    profile.validator
  );

  console.log(
    "  Validations:",
    profile.validationCount
  );

  console.log(
    "  Unique agents:",
    profile.uniqueAgents
  );

  console.log(
    "  Tags:",
    profile.tags.join(", ") ||
    "N/A"
  );

  console.log(
    "  Classification:",
    profile.classification
  );

  console.log("");

}


console.log("==========================================");
console.log("       BEHAVIORAL SIGNALS");
console.log("==========================================");
console.log("");

if (
  signals.length === 0
) {

  console.log(
    "No significant behavioral deviation detected."
  );

} else {

  for (
    const signal
    of signals
  ) {

    console.log(
      `[${signal.severity}] ${signal.type}`
    );

    console.log(
      signal.description
    );

    console.log("");

  }

}


console.log("==========================================");
console.log("        INDEPENDENCE ASSESSMENT");
console.log("==========================================");
console.log("");

console.log(
  "Assessment:",
  independenceAssessment
);

console.log(
  "Verified:",
  false
);

console.log("");

console.log("==========================================");
console.log("             SAFETY CHECKS");
console.log("==========================================");
console.log("");

console.log(
  "Behavior = trust proof:",
  false
);

console.log(
  "Deviation = fraud proof:",
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
  "     VALIDATOR BEHAVIORAL INTELLIGENCE TAMAMLANDI"
);
console.log("==========================================");
console.log("");
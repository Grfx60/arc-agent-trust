const fs = require("fs");

const INPUT_FILE = "agent-component-forensics-v25.json";
const OUTPUT_FILE = "agent-behavioral-profile-v26.json";

const KNOWN_AGENT_ID = 845265;

function loadJSON(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`Dosya bulunamadı: ${file}`);
  }

  return JSON.parse(
    fs.readFileSync(file, "utf8")
  );
}

function unique(array) {
  return [...new Set(array)];
}

function percentage(value, total) {
  if (!total) return 0;
  return Number(
    ((value / total) * 100).toFixed(2)
  );
}

function main() {

  console.log("");
  console.log("==========================================");
  console.log("      OWNER & URI BEHAVIORAL PROFILER v26");
  console.log("==========================================");
  console.log("");

  const data =
    loadJSON(INPUT_FILE);

  const agents =
    Array.isArray(data.agentProfiles)
      ? data.agentProfiles
      : [];

  const owners =
    Array.isArray(data.ownerAnalysis)
      ? data.ownerAnalysis
      : [];

  const uris =
    Array.isArray(data.uriAnalysis)
      ? data.uriAnalysis
      : [];

  console.log(
    "Agents:",
    agents.length
  );

  console.log(
    "Owners:",
    owners.length
  );

  console.log(
    "URIs:",
    uris.length
  );

  console.log("");


  // ==========================================
  // OWNER BEHAVIOR
  // ==========================================

  const ownerProfiles =
    owners.map(owner => {

      const ownerAgents =
        agents.filter(
          agent =>
            agent.owner ===
            owner.owner
        );

      const ownerURIs =
        unique(
          ownerAgents
            .map(
              agent =>
                agent.uri
            )
            .filter(Boolean)
        );

      const uriCounts = {};

      for (
        const agent
        of ownerAgents
      ) {

        if (!agent.uri) {
          continue;
        }

        uriCounts[agent.uri] =
          (
            uriCounts[agent.uri] ||
            0
          ) + 1;

      }

      const dominantURI =
        Object.entries(
          uriCounts
        )
          .sort(
            (a, b) =>
              b[1] - a[1]
          )[0] || null;

      return {

        owner:
          owner.owner,

        agents:
          ownerAgents.length,

        uniqueURIs:
          ownerURIs.length,

        agentIds:
          ownerAgents.map(
            agent =>
              agent.agentId
          ),

        uriCounts,

        dominantURI:
          dominantURI
            ? dominantURI[0]
            : null,

        dominantURIAgents:
          dominantURI
            ? dominantURI[1]
            : 0,

        dominantURIPercentage:
          dominantURI
            ? percentage(
                dominantURI[1],
                ownerAgents.length
              )
            : 0,

        profile:
          ownerAgents.length === 1
            ? "SINGLE_AGENT_OWNER"
            : ownerURIs.length === 1
              ? "SINGLE_URI_OWNER"
              : "MULTI_URI_OWNER"

      };

    })
    .sort(
      (a, b) =>
        b.agents -
        a.agents
    );


  // ==========================================
  // URI BEHAVIOR
  // ==========================================

  const uriProfiles =
    uris.map(uri => {

      const uriAgents =
        agents.filter(
          agent =>
            agent.uri ===
            uri.uri
        );

      const uriOwners =
        unique(
          uriAgents
            .map(
              agent =>
                agent.owner
            )
            .filter(Boolean)
        );

      const ownerCounts = {};

      for (
        const agent
        of uriAgents
      ) {

        if (!agent.owner) {
          continue;
        }

        ownerCounts[agent.owner] =
          (
            ownerCounts[agent.owner] ||
            0
          ) + 1;

      }

      const dominantOwner =
        Object.entries(
          ownerCounts
        )
          .sort(
            (a, b) =>
              b[1] - a[1]
          )[0] || null;

      return {

        uri:
          uri.uri,

        agents:
          uriAgents.length,

        owners:
          uriOwners.length,

        agentIds:
          uriAgents.map(
            agent =>
              agent.agentId
          ),

        ownerCounts,

        dominantOwner:
          dominantOwner
            ? dominantOwner[0]
            : null,

        dominantOwnerAgents:
          dominantOwner
            ? dominantOwner[1]
            : 0,

        ownerDiversity:
          uriOwners.length,

        crossOwner:
          uriOwners.length > 1,

        profile:
          uriOwners.length === 1
            ? "SINGLE_OWNER_URI"
            : uriOwners.length <= 3
              ? "LOW_CROSS_OWNER_URI"
              : "HIGH_CROSS_OWNER_URI"

      };

    })
    .sort(
      (a, b) =>
        b.agents -
        a.agents
    );


  // ==========================================
  // CROSS OWNER BEHAVIOR
  // ==========================================

  const crossOwnerURIs =
    uriProfiles.filter(
      uri =>
        uri.crossOwner
    );


  const ownerPairs = new Map();

  for (
    const uri
    of crossOwnerURIs
  ) {

    const uriOwners =
      Object.keys(
        uri.ownerCounts
      );

    for (
      let i = 0;
      i < uriOwners.length;
      i++
    ) {

      for (
        let j = i + 1;
        j < uriOwners.length;
        j++
      ) {

        const pair =
          [
            uriOwners[i],
            uriOwners[j]
          ].sort().join("|");

        if (
          !ownerPairs.has(pair)
        ) {

          ownerPairs.set(
            pair,
            {

              owners:
                pair.split("|"),

              sharedURIs:
                [],

              sharedAgentCount:
                0

            }
          );

        }

        const record =
          ownerPairs.get(
            pair
          );

        record.sharedURIs.push(
          uri.uri
        );

        record.sharedAgentCount +=
          uri.agentIds.length;

      }

    }

  }


  const ownerPairAnalysis =
    Array.from(
      ownerPairs.values()
    )
      .map(pair => ({

        owners:
          pair.owners,

        sharedURICount:
          pair.sharedURIs.length,

        sharedURIs:
          pair.sharedURIs,

        sharedAgentCount:
          pair.sharedAgentCount

      }))
      .sort(
        (a, b) =>
          b.sharedAgentCount -
          a.sharedAgentCount
      );


  // ==========================================
  // KNOWN AGENT
  // ==========================================

  const known =
    agents.find(
      agent =>
        agent.agentId ===
        KNOWN_AGENT_ID
    );

  if (!known) {
    throw new Error(
      `Agent ${KNOWN_AGENT_ID} bulunamadı.`
    );
  }


  const knownOwnerProfile =
    ownerProfiles.find(
      owner =>
        owner.owner ===
        known.owner
    );


  const knownURIProfile =
    uriProfiles.find(
      uri =>
        uri.uri ===
        known.uri
    );


  // ==========================================
  // KNOWN AGENT BASELINE
  // ==========================================

  const averageOwnerAgents =
    ownerProfiles.length
      ? agents.length /
        ownerProfiles.length
      : 0;

  const averageURIAgents =
    uriProfiles.length
      ? agents.length /
        uriProfiles.length
      : 0;


  const knownOwnerDeviation =
    averageOwnerAgents
      ? Number(
          (
            knownOwnerProfile.agents /
            averageOwnerAgents
          ).toFixed(2)
        )
      : 0;


  const knownUIDeviation =
    averageURIAgents
      ? Number(
          (
            knownURIProfile.agents /
            averageURIAgents
          ).toFixed(2)
        )
      : 0;


  // ==========================================
  // BEHAVIOR CLASSIFICATION
  // ==========================================

  let behavior =
    "NORMAL";


  if (
    knownOwnerProfile.agents === 1 &&
    knownURIProfile.crossOwner
  ) {

    behavior =
      "UNIQUE_OWNER_SHARED_URI";

  }


  if (
    knownURIProfile.owners >= 10
  ) {

    behavior =
      "HIGH_CROSS_OWNER_URI";

  }


  if (
    knownOwnerProfile.agents >= 10 &&
    knownOwnerProfile.uniqueURIs <= 2
  ) {

    behavior =
      "OWNER_CONCENTRATED";

  }


  if (
    knownOwnerProfile.agents >= 10 &&
    knownURIProfile.owners >= 10
  ) {

    behavior =
      "OWNER_URI_HIGH_CORRELATION";

  }


  // ==========================================
  // BEHAVIORAL SIGNALS
  // ==========================================

  const signals = {

    uniqueOwner:
      knownOwnerProfile.agents === 1,

    sharedURI:
      knownURIProfile.agents > 1,

    crossOwnerURI:
      knownURIProfile.owners > 1,

    highCrossOwnerURI:
      knownURIProfile.owners >= 10,

    ownerConcentrated:
      knownOwnerProfile.agents >= 10,

    ownerUsesMultipleURIs:
      knownOwnerProfile.uniqueURIs > 1,

    dominantOwnerOnURI:
      knownURIProfile.dominantOwnerAgents,

    ownerDeviation:
      knownOwnerDeviation,

    uriDeviation:
      knownUIDeviation

  };


  // ==========================================
  // OUTPUT
  // ==========================================

  const output = {

    schemaVersion:
      "2.6",

    engine:
      "OWNER_URI_BEHAVIORAL_PROFILER",

    generatedAt:
      new Date().toISOString(),

    source:
      INPUT_FILE,

    component:
      data.component,

    statistics: {

      agents:
        agents.length,

      owners:
        owners.length,

      uris:
        uris.length,

      crossOwnerURIs:
        crossOwnerURIs.length,

      ownerPairs:
        ownerPairAnalysis.length

    },

    ownerProfiles,

    uriProfiles,

    ownerPairAnalysis,

    knownAgent: {

      agentId:
        KNOWN_AGENT_ID,

      owner:
        known.owner,

      uri:
        known.uri,

      ownerProfile:
        knownOwnerProfile,

      uriProfile:
        knownURIProfile,

      averageOwnerAgents,

      averageURIAgents,

      ownerDeviation:
        knownOwnerDeviation,

      uriDeviation:
        knownUIDeviation,

      behavior,

      signals

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
  console.log("          V26 FINAL RESULT");
  console.log("==========================================");
  console.log("");

  console.log(
    "Agents:",
    agents.length
  );

  console.log(
    "Owners:",
    owners.length
  );

  console.log(
    "URIs:",
    uris.length
  );

  console.log(
    "Cross-owner URIs:",
    crossOwnerURIs.length
  );

  console.log(
    "Owner pairs:",
    ownerPairAnalysis.length
  );

  console.log("");


  console.log("==========================================");
  console.log("          KNOWN AGENT 845265");
  console.log("==========================================");
  console.log("");

  console.log(
    "Owner:",
    known.owner
  );

  console.log(
    "Owner agents:",
    knownOwnerProfile.agents
  );

  console.log(
    "Owner URIs:",
    knownOwnerProfile.uniqueURIs
  );

  console.log(
    "URI agents:",
    knownURIProfile.agents
  );

  console.log(
    "URI owners:",
    knownURIProfile.owners
  );

  console.log(
    "URI cross-owner:",
    knownURIProfile.crossOwner
  );

  console.log(
    "Owner deviation:",
    knownOwnerDeviation
  );

  console.log(
    "URI deviation:",
    knownUIDeviation
  );

  console.log(
    "Behavior:",
    behavior
  );

  console.log("");


  console.log("==========================================");
  console.log("       CROSS-OWNER URI ANALYSIS");
  console.log("==========================================");
  console.log("");

  for (
    const uri
    of uriProfiles
  ) {

    if (!uri.crossOwner) {
      continue;
    }

    console.log(
      `Agents: ${uri.agents} | Owners: ${uri.owners}`
    );

    console.log(
      `Profile: ${uri.profile}`
    );

    console.log(
      `URI: ${uri.uri}`
    );

    console.log("");

  }


  console.log(
    "📁 Output:",
    OUTPUT_FILE
  );

  console.log("");

  console.log("==========================================");
  console.log(
    "      OWNER & URI BEHAVIOR TAMAMLANDI"
  );
  console.log("==========================================");
  console.log("");

}


try {

  main();

} catch (error) {

  console.error("");
  console.error("❌ V26 kritik hata:");
  console.error(
    error.message ||
    error
  );
  console.error("");

  process.exit(1);
}
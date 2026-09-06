const fs = require("fs");

const TARGET_AGENT = "845265";

const TARGET_URI =
  "ipfs://bafkreibdi6623n3xpf7ymk62ckb4bo75o3qemwkpfvp5i25j66itxvsoei";

const INPUT_FILE =
  "agent-metadata-intelligence-v19.json";

const V20_FILE =
  "agent-metadata-quality-v20.json";

const V25_FILE =
  "agent-component-forensics-v25.json";

const OUTPUT_FILE =
  "agent-metadata-independence-v42.json";

const GATEWAY_TIMEOUT = 12000;

const GATEWAYS = [
  {
    name: "ipfs.io",
    build: cid =>
      `https://ipfs.io/ipfs/${cid}`
  },
  {
    name: "dweb.link",
    build: cid =>
      `https://dweb.link/ipfs/${cid}`
  },
  {
    name: "cloudflare-ipfs",
    build: cid =>
      `https://cloudflare-ipfs.com/ipfs/${cid}`
  },
  {
    name: "w3s.link",
    build: cid =>
      `https://${cid}.ipfs.w3s.link`
  }
];


function loadJSON(file) {

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

  } catch {

    return null;

  }

}


function normalize(value) {

  if (!value) {
    return "";
  }

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


function extractCID(uri) {

  if (!uri) {
    return null;
  }

  const value =
    String(uri).trim();

  if (
    value.startsWith("ipfs://")
  ) {

    return value
      .replace(
        "ipfs://",
        ""
      )
      .split("/")
      [0];

  }

  return null;

}


function stableStringify(value) {

  if (
    value === null ||
    value === undefined
  ) {

    return "";

  }

  if (
    typeof value !== "object"
  ) {

    return String(value);

  }

  if (
    Array.isArray(value)
  ) {

    return "[" +
      value
        .map(
          stableStringify
        )
        .join(",") +
      "]";

  }

  return "{" +
    Object.keys(value)
      .sort()
      .map(
        key =>
          JSON.stringify(key) +
          ":" +
          stableStringify(
            value[key]
          )
      )
      .join(",") +
    "}";

}


function simpleHash(text) {

  let hash = 2166136261;

  for (
    let i = 0;
    i < text.length;
    i++
  ) {

    hash ^=
      text.charCodeAt(i);

    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);

  }

  return (
    hash >>> 0
  ).toString(16);

}


async function fetchWithTimeout(
  url,
  timeout
) {

  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () =>
        controller.abort(),
      timeout
    );

  try {

    const response =
      await fetch(
        url,
        {
          signal:
            controller.signal,
          headers: {
            "accept":
              "application/json,text/plain,*/*"
          }
        }
      );

    const text =
      await response.text();

    return {

      ok:
        response.ok,

      status:
        response.status,

      text

    };

  } catch (error) {

    return {

      ok:
        false,

      status:
        0,

      text:
        "",

      error:
        error.name ===
        "AbortError"
          ? "TIMEOUT"
          : (
              error.message ||
              "FETCH_ERROR"
            )

    };

  } finally {

    clearTimeout(timer);

  }

}


function extractAgents(
  data
) {

  if (!data) {
    return [];
  }

  if (
    Array.isArray(data)
  ) {

    return data;

  }

  return (
    data.agents ||
    data.results ||
    data.records ||
    data.data ||
    []
  );

}


function extractAgentId(
  item
) {

  return String(
    item.agentId ??
    item.id ??
    item.tokenId ??
    ""
  );

}


function extractURI(
  item
) {

  return (
    item.uri ||
    item.URI ||
    item.tokenURI ||
    item.metadataURI ||
    item.metadataUri ||
    item.agentURI ||
    ""
  );

}


async function main() {

  console.log("");
  console.log("==========================================");
  console.log("   METADATA INDEPENDENCE RECOVERY v42");
  console.log("==========================================");
  console.log("");

  console.log(
    "Target Agent:",
    TARGET_AGENT
  );

  console.log(
    "Target URI:",
    TARGET_URI
  );

  console.log("");


  // ==========================================
  // STEP 1 — LOAD V19/V20/V25
  // ==========================================

  console.log("==========================================");
  console.log("       STEP 1 — SOURCE ANALYSIS");
  console.log("==========================================");
  console.log("");


  const v19 =
    loadJSON(
      INPUT_FILE
    );

  const v20 =
    loadJSON(
      V20_FILE
    );

  const v25 =
    loadJSON(
      V25_FILE
    );


  console.log(
    "V19:",
    v19 ? "OK" : "MISSING"
  );

  console.log(
    "V20:",
    v20 ? "OK" : "MISSING"
  );

  console.log(
    "V25:",
    v25 ? "OK" : "MISSING"
  );

  console.log("");


  const agents =
    extractAgents(
      v19
    );


  const matchingAgents = [];

  for (
    const item
    of agents
  ) {

    const uri =
      normalize(
        extractURI(item)
      );

    if (
      uri ===
      normalize(TARGET_URI)
    ) {

      matchingAgents.push({

        agentId:
          extractAgentId(item),

        owner:
          item.owner ||
          item.ownerAddress ||
          item.wallet ||
          "",

        uri

      });

    }

  }


  const sharedOwners =
    unique(
      matchingAgents.map(
        item =>
          item.owner
      )
    );


  console.log(
    "Agents sharing target URI:",
    matchingAgents.length
  );

  console.log(
    "Owners sharing target URI:",
    sharedOwners.length
  );

  console.log("");


  // ==========================================
  // STEP 2 — CID EXTRACTION
  // ==========================================

  console.log("==========================================");
  console.log("         STEP 2 — CID ANALYSIS");
  console.log("==========================================");
  console.log("");


  const cid =
    extractCID(
      TARGET_URI
    );


  console.log(
    "CID:",
    cid || "NOT_FOUND"
  );

  console.log("");


  // ==========================================
  // STEP 3 — MULTI-GATEWAY RETRIEVAL
  // ==========================================

  console.log("==========================================");
  console.log("      STEP 3 — GATEWAY RETRIEVAL");
  console.log("==========================================");
  console.log("");


  const retrievals = [];


  if (cid) {

    for (
      const gateway
      of GATEWAYS
    ) {

      const url =
        gateway.build(
          cid
        );

      console.log(
        `Trying ${gateway.name}...`
      );

      const result =
        await fetchWithTimeout(
          url,
          GATEWAY_TIMEOUT
        );


      const entry = {

        gateway:
          gateway.name,

        url,

        success:
          result.ok,

        status:
          result.status,

        error:
          result.error ||
          null,

        contentLength:
          result.text.length,

        validJSON:
          false,

        metadata:
          null,

        contentHash:
          null

      };


      if (
        result.ok &&
        result.text
      ) {

        try {

          const parsed =
            JSON.parse(
              result.text
            );

          entry.validJSON =
            true;

          entry.metadata =
            parsed;

          entry.contentHash =
            simpleHash(
              stableStringify(
                parsed
              )
            );

        } catch {

          entry.validJSON =
            false;

          entry.contentHash =
            simpleHash(
              result.text
            );

        }

      }


      retrievals.push(
        entry
      );


      if (
        entry.success
      ) {

        console.log(
          `  SUCCESS ${entry.status} | ${entry.contentLength} bytes | JSON=${entry.validJSON}`
        );

      } else {

        console.log(
          `  FAIL ${entry.error || entry.status}`
        );

      }

    }

  }


  console.log("");


  // ==========================================
  // STEP 4 — CONTENT CONSISTENCY
  // ==========================================

  console.log("==========================================");
  console.log("      STEP 4 — CONTENT CONSISTENCY");
  console.log("==========================================");
  console.log("");


  const successful =
    retrievals.filter(
      item =>
        item.success
    );


  const validJSON =
    retrievals.filter(
      item =>
        item.validJSON
    );


  const contentHashes =
    unique(
      validJSON.map(
        item =>
          item.contentHash
      )
    );


  let contentConsistency =
    "UNKNOWN";


  if (
    validJSON.length === 0
  ) {

    contentConsistency =
      "NO_ACCESSIBLE_JSON";

  } else if (
    contentHashes.length === 1
  ) {

    contentConsistency =
      "CONSISTENT_CONTENT";

  } else {

    contentConsistency =
      "CONTENT_VARIATION";

  }


  console.log(
    "Successful gateways:",
    successful.length
  );

  console.log(
    "Valid JSON gateways:",
    validJSON.length
  );

  console.log(
    "Unique content hashes:",
    contentHashes.length
  );

  console.log(
    "Content consistency:",
    contentConsistency
  );

  console.log("");


  // ==========================================
  // STEP 5 — AGENT-SPECIFIC METADATA
  // ==========================================

  console.log("==========================================");
  console.log("      STEP 5 — AGENT SPECIFICITY");
  console.log("==========================================");
  console.log("");


  const agentSpecificSignals = {

    containsAgentId:
      false,

    containsTargetAgentId:
      false,

    containsOwner:
      false,

    containsTargetOwner:
      false,

    containsName:
      false,

    containsDescription:
      false,

    fields:
      []

  };


  const targetOwner =
    normalize(
      matchingAgents[0]?.owner
    );


  if (
    validJSON.length
  ) {

    const metadata =
      validJSON[0].metadata;


    const flattened =
      stableStringify(
        metadata
      ).toLowerCase();


    agentSpecificSignals.containsAgentId =
      flattened.includes(
        "agentid"
      );

    agentSpecificSignals.containsTargetAgentId =
      flattened.includes(
        TARGET_AGENT.toLowerCase()
      );

    agentSpecificSignals.containsOwner =
      flattened.includes(
        "owner"
      );

    agentSpecificSignals.containsTargetOwner =
      targetOwner
        ? flattened.includes(
            targetOwner
          )
        : false;

    agentSpecificSignals.containsName =
      flattened.includes(
        "name"
      );

    agentSpecificSignals.containsDescription =
      flattened.includes(
        "description"
      );


    if (
      metadata &&
      typeof metadata === "object" &&
      !Array.isArray(metadata)
    ) {

      agentSpecificSignals.fields =
        Object.keys(
          metadata
        );

    }

  }


  console.log(
    "Agent ID field:",
    agentSpecificSignals.containsAgentId
  );

  console.log(
    "Target agent ID present:",
    agentSpecificSignals.containsTargetAgentId
  );

  console.log(
    "Owner field:",
    agentSpecificSignals.containsOwner
  );

  console.log(
    "Target owner present:",
    agentSpecificSignals.containsTargetOwner
  );

  console.log(
    "Name field:",
    agentSpecificSignals.containsName
  );

  console.log(
    "Description field:",
    agentSpecificSignals.containsDescription
  );

  console.log("");


  // ==========================================
  // STEP 6 — SHARED URI INTERPRETATION
  // ==========================================

  console.log("==========================================");
  console.log("      STEP 6 — SHARED URI ANALYSIS");
  console.log("==========================================");
  console.log("");


  let sharedURIClassification =
    "UNKNOWN";


  if (
    matchingAgents.length >= 50 &&
    sharedOwners.length >= 5
  ) {

    sharedURIClassification =
      "LARGE_CROSS_OWNER_SHARED_URI";

  } else if (
    matchingAgents.length > 1 &&
    sharedOwners.length > 1
  ) {

    sharedURIClassification =
      "CROSS_OWNER_SHARED_URI";

  } else if (
    matchingAgents.length > 1
  ) {

    sharedURIClassification =
      "SINGLE_OWNER_SHARED_URI";

  } else if (
    matchingAgents.length === 1
  ) {

    sharedURIClassification =
      "UNIQUE_URI";

  }


  console.log(
    "Classification:",
    sharedURIClassification
  );


  // ==========================================
  // STEP 7 — INDEPENDENCE ASSESSMENT
  // ==========================================

  let metadataIndependence =
    0;

  let metadataQuality =
    0;

  let retrievalStatus =
    "INACCESSIBLE";


  if (
    validJSON.length > 0
  ) {

    retrievalStatus =
      "ACCESSIBLE_VALID_JSON";

    metadataQuality =
      50;

  } else if (
    successful.length > 0
  ) {

    retrievalStatus =
      "ACCESSIBLE_INVALID_JSON";

    metadataQuality =
      20;

  }


  if (
    agentSpecificSignals.containsTargetAgentId
  ) {

    metadataIndependence +=
      40;

  }

  if (
    agentSpecificSignals.containsTargetOwner
  ) {

    metadataIndependence +=
      30;

  }

  if (
    sharedURIClassification ===
    "UNIQUE_URI"
  ) {

    metadataIndependence +=
      30;

  } else if (
    sharedURIClassification ===
    "SINGLE_OWNER_SHARED_URI"
  ) {

    metadataIndependence +=
      15;

  }


  if (
    sharedURIClassification ===
    "CROSS_OWNER_SHARED_URI" ||
    sharedURIClassification ===
    "LARGE_CROSS_OWNER_SHARED_URI"
  ) {

    metadataIndependence =
      Math.min(
        metadataIndependence,
        20
      );

  }


  metadataIndependence =
    Math.max(
      0,
      Math.min(
        100,
        metadataIndependence
      )
    );


  // ==========================================
  // STEP 8 — GAP STATUS
  // ==========================================

  let v35_003 =
    "OPEN";

  let v35_004 =
    "OPEN";


  if (
    retrievalStatus ===
    "ACCESSIBLE_VALID_JSON" &&
    agentSpecificSignals.containsTargetAgentId
  ) {

    v35_003 =
      "CANDIDATE_FOR_RESOLUTION";

  }


  if (
    metadataIndependence >= 50
  ) {

    v35_004 =
      "CANDIDATE_FOR_RESOLUTION";

  }


  // ==========================================
  // SAFETY INTERPRETATION
  // ==========================================

  const interpretation = {

    inaccessibleMetadataIsNotFraud:
      true,

    sharedURIIsNotFraud:
      true,

    sharedURIDoesNotProveCollusion:
      true,

    templateMetadataMayBeLegitimate:
      true,

    agentSpecificMetadataWouldIncreaseIndependence:
      true,

    noMaliciousnessEstablished:
      true

  };


  // ==========================================
  // OUTPUT
  // ==========================================

  const output = {

    schemaVersion:
      "4.2",

    engine:
      "METADATA_INDEPENDENCE_RECOVERY",

    generatedAt:
      new Date().toISOString(),

    agent:
      TARGET_AGENT,

    targetURI:
      TARGET_URI,

    cid,

    sourceAnalysis: {

      v19:
        !!v19,

      v20:
        !!v20,

      v25:
        !!v25,

      matchingAgents:
        matchingAgents.length,

      sharedOwners:
        sharedOwners.length

    },

    retrieval: {

      gateways:
        retrievals,

      successful:
        successful.length,

      validJSON:
        validJSON.length,

      uniqueContentHashes:
        contentHashes.length,

      status:
        retrievalStatus,

      contentConsistency

    },

    agentSpecificity:
      agentSpecificSignals,

    sharedURI: {

      agents:
        matchingAgents.length,

      owners:
        sharedOwners.length,

      classification:
        sharedURIClassification

    },

    assessment: {

      metadataQuality,

      metadataIndependence,

      retrievalStatus,

      v35_003_METADATA_RETRIEVAL:
        v35_003,

      v35_004_METADATA_INDEPENDENCE:
        v35_004

    },

    interpretation,

    safety: {

      automaticAllow:
        false,

      automaticBlock:
        false,

      fraudEstablished:
        false,

      maliciousnessEstablished:
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
  console.log("          V42 FINAL RESULT");
  console.log("==========================================");
  console.log("");

  console.log(
    "Agent:",
    TARGET_AGENT
  );

  console.log(
    "CID:",
    cid || "NOT_FOUND"
  );

  console.log(
    "Shared URI agents:",
    matchingAgents.length
  );

  console.log(
    "Shared URI owners:",
    sharedOwners.length
  );

  console.log(
    "Successful gateways:",
    successful.length
  );

  console.log(
    "Valid JSON:",
    validJSON.length
  );

  console.log(
    "Content consistency:",
    contentConsistency
  );

  console.log("");

  console.log("==========================================");
  console.log("       METADATA SPECIFICITY");
  console.log("==========================================");
  console.log("");

  console.log(
    "Target agent ID present:",
    agentSpecificSignals.containsTargetAgentId
  );

  console.log(
    "Target owner present:",
    agentSpecificSignals.containsTargetOwner
  );

  console.log(
    "Fields:",
    agentSpecificSignals.fields.join(", ") ||
    "N/A"
  );

  console.log("");

  console.log("==========================================");
  console.log("       SHARED URI CLASSIFICATION");
  console.log("==========================================");
  console.log("");

  console.log(
    sharedURIClassification
  );

  console.log("");

  console.log("==========================================");
  console.log("       INDEPENDENCE ASSESSMENT");
  console.log("==========================================");
  console.log("");

  console.log(
    "Metadata quality:",
    metadataQuality,
    "/100"
  );

  console.log(
    "Metadata independence:",
    metadataIndependence,
    "/100"
  );

  console.log(
    "Retrieval:",
    retrievalStatus
  );

  console.log("");

  console.log("==========================================");
  console.log("          V35 GAP STATUS");
  console.log("==========================================");
  console.log("");

  console.log(
    "V35-003 METADATA_RETRIEVAL:",
    v35_003
  );

  console.log(
    "V35-004 METADATA_INDEPENDENCE:",
    v35_004
  );

  console.log("");

  console.log("==========================================");
  console.log("             SAFETY CHECKS");
  console.log("==========================================");
  console.log("");

  console.log(
    "Inaccessible metadata = fraud:",
    false
  );

  console.log(
    "Shared URI = fraud:",
    false
  );

  console.log(
    "Shared URI = collusion proof:",
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
    "     METADATA INDEPENDENCE RECOVERY TAMAMLANDI"
  );
  console.log("==========================================");
  console.log("");

}


main().catch(
  error => {

    console.error("");
    console.error(
      "❌ V42 kritik hata:"
    );

    console.error(
      error.message ||
      error
    );

    console.error("");

    process.exit(1);

  }
);
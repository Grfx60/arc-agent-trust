const agent = {
  agentId: 845265,

  identity: {
    owner:
      "0xBB30e40F0887b060e9339f6541E29AfA5A3A9dBb",

    metadataURI:
      "ipfs://bafkreibdi6623n3xpf7ymk62ckb4bo75o3qemwkpfvp5i25j66itxvsoei",
  },

  reputation: [
    {
      client:
        "0x10149142bA352e37D2225b12F47FE306a8cD5250",

      value: 95,

      tag: "welcome",

      revoked: false,
    },

    {
      client:
        "0xE18F822B5071553D62Cf119CE57Da6C1636F2524",

      value: 12,

      tag: "mode-a-daily-decision",

      revoked: false,
    },
  ],

  validation: [
    {
      validator:
        "0xE18F822B5071553D62Cf119CE57Da6C1636F2524",

      response: 1,

      tag: "identity",

      timestamp: 1783329698,
    },

    {
      validator:
        "0xE18F822B5071553D62Cf119CE57Da6C1636F2524",

      response: 100,

      tag: "identity",

      timestamp: 1787067640,
    },
  ],
};


// ============================================
// EVIDENCE ANALYSIS
// ============================================

const reputationActors =
  agent.reputation.map(
    (item) => item.client.toLowerCase()
  );

const validationActors =
  agent.validation.map(
    (item) => item.validator.toLowerCase()
  );


// Benzersiz aktörler
const uniqueReputationActors =
  [...new Set(reputationActors)];

const uniqueValidationActors =
  [...new Set(validationActors)];


// Ortak aktörleri bul
const overlappingActors =
  uniqueReputationActors.filter(
    (address) =>
      uniqueValidationActors.includes(address)
  );


// Sonuç
console.log("");
console.log("╔══════════════════════════════════════╗");
console.log("║       AGENT EVIDENCE PROFILE        ║");
console.log("╠══════════════════════════════════════╣");

console.log(
  `║ Agent ID: ${agent.agentId}`
);

console.log("║");

console.log(
  "║ Identity:              PRESENT"
);

console.log(
  `║ Reputation feedback:   ${agent.reputation.length}`
);

console.log(
  `║ Validation records:    ${agent.validation.length}`
);

console.log("║");

console.log(
  `║ Unique reputation actors:  ${uniqueReputationActors.length}`
);

console.log(
  `║ Unique validators:         ${uniqueValidationActors.length}`
);

console.log("║");

console.log(
  `║ Actor overlap:             ${
    overlappingActors.length > 0
      ? "YES"
      : "NO"
  }`
);

console.log(
  `║ Overlapping actors:        ${overlappingActors.length}`
);

console.log("║");

console.log(
  `║ Evidence independence:     ${
    overlappingActors.length > 0
      ? "LOW"
      : "UNKNOWN"
  }`
);

console.log("╚══════════════════════════════════════╝");
console.log("");


// Detay
if (overlappingActors.length > 0) {
  console.log(
    "⚠️ ORTAK KANIT SAĞLAYICISI TESPİT EDİLDİ"
  );

  console.log("");

  overlappingActors.forEach(
    (address) => {
      console.log(
        "Actor:",
        address
      );

      console.log(
        "→ Reputation provider: YES"
      );

      console.log(
        "→ Validator: YES"
      );

      console.log("");
    }
  );
}
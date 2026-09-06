const { createPublicClient, http } = require("viem");

const arcTestnet = {
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 6,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.testnet.arc.network"],
    },
  },
};

const VALIDATION_REGISTRY =
  "0x8004Cb1BF31DAf7788923b405b754f57acEB4272";

const client = createPublicClient({
  chain: arcTestnet,
  transport: http(),
});

const validationAbi = [
  {
    name: "getAgentValidations",
    type: "function",
    stateMutability: "view",
    inputs: [
      {
        name: "agentId",
        type: "uint256",
      },
    ],
    outputs: [
      {
        name: "requestHashes",
        type: "bytes32[]",
      },
    ],
  },

  {
    name: "getValidationStatus",
    type: "function",
    stateMutability: "view",
    inputs: [
      {
        name: "requestHash",
        type: "bytes32",
      },
    ],
    outputs: [
      {
        name: "validatorAddress",
        type: "address",
      },
      {
        name: "agentId",
        type: "uint256",
      },
      {
        name: "response",
        type: "uint8",
      },
      {
        name: "responseHash",
        type: "bytes32",
      },
      {
        name: "tag",
        type: "string",
      },
      {
        name: "lastUpdate",
        type: "uint256",
      },
    ],
  },
];

const agentId = 845265n;

async function main() {
  console.log(
    "🔐 Agent #1 Validation kayıtları aranıyor...\n"
  );

  try {
    const requestHashes =
      await client.readContract({
        address: VALIDATION_REGISTRY,
        abi: validationAbi,
        functionName: "getAgentValidations",
        args: [agentId],
      });

    console.log(
      "📋 Validation request sayısı:",
      requestHashes.length
    );

    if (requestHashes.length === 0) {
      console.log(
        "\n⚠️ Agent #1 için henüz validation kaydı bulunamadı."
      );
      return;
    }

    console.log(
      "\n🔎 Validation sonuçları okunuyor...\n"
    );

    // Şimdilik ilk 10 validation kaydını okuyalım.
    const limit = Math.min(
      requestHashes.length,
      10
    );

    for (let i = 0; i < limit; i++) {
      const requestHash = requestHashes[i];

      try {
        const result =
          await client.readContract({
            address: VALIDATION_REGISTRY,
            abi: validationAbi,
            functionName: "getValidationStatus",
            args: [requestHash],
          });

        const [
          validatorAddress,
          returnedAgentId,
          response,
          responseHash,
          tag,
          lastUpdate,
        ] = result;

        console.log(
          `\nValidation ${i + 1}`
        );
        console.log(
          "------------------------"
        );
        console.log(
          "Request Hash:",
          requestHash
        );
        console.log(
          "Validator:",
          validatorAddress
        );
        console.log(
          "Agent ID:",
          returnedAgentId.toString()
        );
        console.log(
          "Response:",
          response.toString() + "/100"
        );
        console.log(
          "Tag:",
          tag || "(boş)"
        );
        console.log(
          "Last Update:",
          lastUpdate.toString()
        );
        console.log(
          "Response Hash:",
          responseHash
        );

      } catch (error) {
        console.log(
          `⚠️ Validation ${i + 1} okunamadı.`
        );
      }
    }

  } catch (error) {
    console.log(
      "\n❌ Validation okunurken hata oluştu:"
    );
    console.log(error.message);
  }
}

main();
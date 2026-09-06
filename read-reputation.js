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

const REPUTATION_REGISTRY =
  "0x8004B663056A597Dffe9eCcC1965A193B7388713";

const client = createPublicClient({
  chain: arcTestnet,
  transport: http(),
});

const reputationAbi = [
  {
    name: "getClients",
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
        name: "clients",
        type: "address[]",
      },
    ],
  },

  {
    name: "getLastIndex",
    type: "function",
    stateMutability: "view",
    inputs: [
      {
        name: "agentId",
        type: "uint256",
      },
      {
        name: "clientAddress",
        type: "address",
      },
    ],
    outputs: [
      {
        name: "lastIndex",
        type: "uint64",
      },
    ],
  },

  {
    name: "readFeedback",
    type: "function",
    stateMutability: "view",
    inputs: [
      {
        name: "agentId",
        type: "uint256",
      },
      {
        name: "clientAddress",
        type: "address",
      },
      {
        name: "feedbackIndex",
        type: "uint64",
      },
    ],
    outputs: [
      {
        name: "value",
        type: "int128",
      },
      {
        name: "valueDecimals",
        type: "uint8",
      },
      {
        name: "tag1",
        type: "string",
      },
      {
        name: "tag2",
        type: "string",
      },
      {
        name: "isRevoked",
        type: "bool",
      },
    ],
  },
];

const agentId = 845265n;

async function main() {
  console.log(
    "🔎 Agent #845265 reputation araştırılıyor...\n"
  );

  try {
    // Agent'ın feedback veren client adreslerini al
    const clients = await client.readContract({
      address: REPUTATION_REGISTRY,
      abi: reputationAbi,
      functionName: "getClients",
      args: [agentId],
    });

    console.log(
      "👥 Feedback sağlayıcı sayısı:",
      clients.length
    );

    if (clients.length === 0) {
      console.log(
        "\n⚠️ Agent #845265 için feedback bulunamadı."
      );
      return;
    }

    // İlk 10 client'ı kontrol ediyoruz
    const clientsToCheck = clients.slice(0, 10);

    console.log(
      `🔬 İlk ${clientsToCheck.length} sağlayıcı kontrol ediliyor...\n`
    );

    let activeFeedbacks = [];

    for (let i = 0; i < clientsToCheck.length; i++) {
      const clientAddress = clientsToCheck[i];

      try {
        const lastIndex =
          await client.readContract({
            address: REPUTATION_REGISTRY,
            abi: reputationAbi,
            functionName: "getLastIndex",
            args: [
              agentId,
              clientAddress,
            ],
          });

        console.log(
          `${i + 1}. client → son index: ${lastIndex.toString()}`
        );

        // ÖNEMLİ:
        // Sadece son indexi okuyoruz.
        // Binlerce indexi körü körüne taramıyoruz.
        if (lastIndex > 0n) {
          const feedback =
            await client.readContract({
              address: REPUTATION_REGISTRY,
              abi: reputationAbi,
              functionName: "readFeedback",
              args: [
                agentId,
                clientAddress,
                lastIndex,
              ],
            });

          const [
            value,
            valueDecimals,
            tag1,
            tag2,
            isRevoked,
          ] = feedback;

          const numericValue =
            Number(value) /
            Math.pow(
              10,
              Number(valueDecimals)
            );

          if (!isRevoked) {
            activeFeedbacks.push({
              client: clientAddress,
              index: lastIndex.toString(),
              value: numericValue,
              tag1: tag1 || "",
              tag2: tag2 || "",
            });
          }
        }

      } catch (error) {
        console.log(
          `⚠️ Client ${i + 1} okunamadı.`
        );
      }
    }

    console.log(
      "\n⭐ AKTİF FEEDBACKLER"
    );

    console.log(
      "========================"
    );

    if (activeFeedbacks.length === 0) {
      console.log(
        "Aktif feedback bulunamadı."
      );
      return;
    }

    activeFeedbacks.forEach(
      (feedback, index) => {
        console.log(
          `\nFeedback ${index + 1}`
        );

        console.log(
          "------------------------"
        );

        console.log(
          "Client:",
          feedback.client
        );

        console.log(
          "Index:",
          feedback.index
        );

        console.log(
          "Value:",
          feedback.value
        );

        console.log(
          "Tag 1:",
          feedback.tag1 || "(boş)"
        );

        console.log(
          "Tag 2:",
          feedback.tag2 || "(boş)"
        );
      }
    );

    console.log(
      `\n✅ ${activeFeedbacks.length} aktif feedback bulundu.`
    );

  } catch (error) {
    console.log(
      "\n❌ Hata oluştu:"
    );

    console.log(
      error.message
    );
  }
}

main();
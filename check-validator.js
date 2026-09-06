const {
  createPublicClient,
  http,
  parseAbiItem,
} = require("viem");

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

const IDENTITY_REGISTRY =
  "0x8004A818BFB912233c491871b3d84c89A494BD9e";

const VALIDATOR =
  "0xE18F822B5071553D62Cf119CE57Da6C1636F2524";

const client = createPublicClient({
  chain: arcTestnet,
  transport: http(),
});

const transferEvent = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
);

async function main() {
  console.log("🔎 Validator araştırılıyor...\n");

  console.log("Validator:");
  console.log(VALIDATOR);

  try {
    const latestBlock =
      await client.getBlockNumber();

    const blockRange = 10000n;

    const fromBlock =
      latestBlock > blockRange
        ? latestBlock - blockRange
        : 0n;

    console.log(
      "\n📦 Blok aralığı:",
      fromBlock.toString(),
      "→",
      latestBlock.toString()
    );

    const logs = await client.getLogs({
      address: IDENTITY_REGISTRY,
      event: transferEvent,
      args: {
        to: VALIDATOR,
      },
      fromBlock,
      toBlock: latestBlock,
    });

    console.log(
      "\n🤖 Bulunan agent transferleri:",
      logs.length
    );

    if (logs.length === 0) {
      console.log(
        "\n⚠️ Son 10.000 blokta bu adresin aldığı bir ERC-8004 Identity bulunamadı."
      );

      console.log(
        "\nBu henüz validator'ın agent olmadığını kanıtlamaz."
      );

      return;
    }

    console.log(
      "\n⭐ Validator'a ait olabilecek agentlar:"
    );
    console.log(
      "=============================="
    );

    for (const log of logs) {
      const agentId = log.args.tokenId;

      console.log(
        "\nAgent ID:",
        agentId?.toString()
      );

      console.log(
        "Block:",
        log.blockNumber?.toString()
      );

      console.log(
        "Transaction:",
        log.transactionHash
      );
    }

  } catch (error) {
    console.log(
      "\n❌ Hata oluştu:"
    );

    console.log(error.message);
  }
}

main();
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

const client = createPublicClient({
  chain: arcTestnet,
  transport: http(),
});

async function main() {
  const blockNumber = await client.getBlockNumber();

  console.log("✅ Arc Testnet bağlantısı başarılı!");
  console.log("📦 Güncel block:", blockNumber.toString());
}

main().catch((error) => {
  console.error("❌ Hata:", error);
  process.exitCode = 1;
});

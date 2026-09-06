const { createPublicClient, http, getContract } = require("viem");

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

// Arc Testnet ERC-8004 Identity Registry
const IDENTITY_REGISTRY =
  "0x8004A818BFB912233c491871b3d84c89A494BD9e";

const client = createPublicClient({
  chain: arcTestnet,
  transport: http(),
});

const identityAbi = [
  {
    name: "ownerOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "tokenURI",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
];

const identityContract = getContract({
  address: IDENTITY_REGISTRY,
  abi: identityAbi,
  client,
});

async function main() {
  // Şimdilik test için Agent ID = 1
  const agentId = 845265n;

  console.log("🔎 ERC-8004 Agent aranıyor...");
  console.log("Agent ID:", agentId.toString());

  try {
    const owner = await identityContract.read.ownerOf([agentId]);
    const tokenURI = await identityContract.read.tokenURI([agentId]);

    console.log("\n🤖 AGENT BULUNDU");
    console.log("-------------------------");
    console.log("Agent ID:", agentId.toString());
    console.log("Owner:", owner);
    console.log("Metadata URI:", tokenURI);
  } catch (error) {
    console.log("\n❌ Bu Agent ID bulunamadı.");
    console.log("Muhtemelen Agent ID 1 mevcut değil.");
  }
}

main();
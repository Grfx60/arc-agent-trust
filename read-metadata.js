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

const IDENTITY_REGISTRY =
  "0x8004A818BFB912233c491871b3d84c89A494BD9e";

const client = createPublicClient({
  chain: arcTestnet,
  transport: http(),
});

const identityAbi = [
  {
    name: "tokenURI",
    type: "function",
    stateMutability: "view",
    inputs: [
      {
        name: "tokenId",
        type: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "string",
      },
    ],
  },
];

const agentId = 845265n;

async function main() {
  console.log("📄 Agent #845265 metadata okunuyor...\n");

  try {
    // 1. Blockchain'den metadata URI'sini al
    const metadataURI = await client.readContract({
      address: IDENTITY_REGISTRY,
      abi: identityAbi,
      functionName: "tokenURI",
      args: [agentId],
    });

    console.log("🔗 Metadata URI:");
    console.log(metadataURI);

    // 2. IPFS URI'sini HTTP gateway adresine çevir
    if (!metadataURI.startsWith("ipfs://")) {
      console.log(
        "\n⚠️ Metadata URI IPFS formatında değil."
      );
      return;
    }

    const cid = metadataURI.replace(
      "ipfs://",
      ""
    );

    const gatewayURL =
      `https://ipfs.io/ipfs/${cid}`;

    console.log("\n🌐 IPFS Gateway:");
    console.log(gatewayURL);

    // 3. Metadata dosyasını indir
    const response = await fetch(gatewayURL);

    if (!response.ok) {
      throw new Error(
        `IPFS HTTP hatası: ${response.status}`
      );
    }

    const metadata = await response.json();

    console.log("\n🤖 METADATA");
    console.log("========================");

    console.log(
      JSON.stringify(metadata, null, 2)
    );

  } catch (error) {
    console.log("\n❌ Hata oluştu:");
    console.log(error.message);
  }
}

main();
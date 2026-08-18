import { defineChain } from "viem";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import type { AppKitNetwork } from "@reown/appkit/networks";
import type { Config } from "wagmi";

export const robinhoodTestnet = defineChain({
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.chain.robinhood.com"] },
  },
  blockExplorers: {
    default: {
      name: "Robinhood Explorer",
      url: "https://explorer.testnet.chain.robinhood.com",
    },
  },
  testnet: true,
});

// WalletConnect / Reown Project IDs are publishable client identifiers.
export const projectId = "be9bcbf74fc2ea216bd558ee88a70feb";

export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [
  robinhoodTestnet,
];

// Guard: only create WagmiAdapter on the client (browser),
// never on the server during SSR
const isClient = typeof window !== "undefined";

export const wagmiAdapter = isClient
  ? new WagmiAdapter({ networks, projectId, ssr: true })
  : (null as unknown as InstanceType<typeof WagmiAdapter>);

export const wagmiConfig = isClient
  ? wagmiAdapter.wagmiConfig
  : ({} as Config);

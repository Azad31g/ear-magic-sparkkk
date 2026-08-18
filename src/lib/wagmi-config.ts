import { defineChain } from "viem";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import type { AppKitNetwork } from "@reown/appkit/networks";

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

export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true,
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

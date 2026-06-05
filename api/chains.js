// api/chains.js
// Central chain config — import di file lain yang butuh chain list

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY;

export const CHAINS = [
  {
    id: "eth",
    name: "Ethereum",
    symbol: "ETH",
    rpc: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
    webhookNetwork: "ETH_MAINNET",
    color: "#627EEA",
    explorer: "https://etherscan.io",
  },
  {
    id: "base",
    name: "Base",
    symbol: "ETH",
    rpc: `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
    webhookNetwork: "BASE_MAINNET",
    color: "#0052FF",
    explorer: "https://basescan.org",
  },
  {
    id: "arb",
    name: "Arbitrum",
    symbol: "ETH",
    rpc: `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
    webhookNetwork: "ARB_MAINNET",
    color: "#12AAFF",
    explorer: "https://arbiscan.io",
  },
  {
    id: "polygon",
    name: "Polygon",
    symbol: "MATIC",
    rpc: `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
    webhookNetwork: "MATIC_MAINNET",
    color: "#8247E5",
    explorer: "https://polygonscan.com",
  },
  {
    id: "op",
    name: "Optimism",
    symbol: "ETH",
    rpc: `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
    webhookNetwork: "OPT_MAINNET",
    color: "#FF0420",
    explorer: "https://optimistic.etherscan.io",
  },
  {
    id: "avax",
    name: "Avalanche",
    symbol: "AVAX",
    rpc: `https://avax-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
    webhookNetwork: "AVAX_MAINNET",
    color: "#E84142",
    explorer: "https://snowtrace.io",
  },
  {
    id: "bsc",
    name: "BNB Chain",
    symbol: "BNB",
    rpc: `https://bnb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
    webhookNetwork: "BNB_MAINNET",
    color: "#F3BA2F",
    explorer: "https://bscscan.com",
  },
];

// Tambah chain baru cukup di array atas — semua fitur auto pick up
export default CHAINS;


// api/add-wallet.js
// Endpoint: POST /api/add-wallet
// Body: { addresses: ["0x..."], name: "Wallet X" }

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY;
const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_SECRET = process.env.SUPABASE_SECRET_KEY;

// ── Chain config — tambah chain baru cukup di sini ──
const CHAINS = [
  { id: "eth",      name: "Ethereum",  rpc: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,      webhookNetwork: "ETH_MAINNET" },
  { id: "base",     name: "Base",      rpc: `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,     webhookNetwork: "BASE_MAINNET" },
  { id: "arb",      name: "Arbitrum",  rpc: `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,      webhookNetwork: "ARB_MAINNET" },
  { id: "polygon",  name: "Polygon",   rpc: `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,  webhookNetwork: "MATIC_MAINNET" },
  { id: "op",       name: "Optimism",  rpc: `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,      webhookNetwork: "OPT_MAINNET" },
  { id: "avax",     name: "Avalanche", rpc: `https://avax-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,     webhookNetwork: "AVAX_MAINNET" },
  { id: "bsc",      name: "BSC",       rpc: `https://bnb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,      webhookNetwork: "BNB_MAINNET" },
];

// ── Supabase helper ──
async function supaFetch(path, method = "GET", body = null) {
  const res = await fetch(`${SUPA_URL}/rest/v1${path}`, {
    method,
    headers: {
      "apikey": SUPA_SECRET,
      "Authorization": `Bearer ${SUPA_SECRET}`,
      "Content-Type": "application/json",
      "Prefer": method === "POST" ? "return=representation" : "",
    },
    body: body ? JSON.stringify(body) : null,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase error: ${err}`);
  }
  return res.json().catch(() => null);
}

// ── Scan token balances on one chain ──
async function scanChain(address, chain) {
  const tokens = [];
  try {
    // ETH/native balance
    const ethRes = await fetch(chain.rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [address, "latest"] }),
    });
    const ethData = await ethRes.json();
    const nativeBal = parseInt(ethData.result, 16) / 1e18;
    if (nativeBal > 0.000001) {
      tokens.push({ sym: chain.id === "bsc" ? "BNB" : chain.id === "polygon" ? "MATIC" : chain.id === "avax" ? "AVAX" : "ETH", amount: parseFloat(nativeBal.toFixed(8)), chain: chain.id, contract: null });
    }

    // ERC20 tokens
    const tokenRes = await fetch(chain.rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "alchemy_getTokenBalances", params: [address, "erc20"] }),
    });
    const tokenData = await tokenRes.json();
    const nonZero = (tokenData.result?.tokenBalances || [])
      .filter(t => t.tokenBalance && t.tokenBalance !== "0x" + "0".repeat(64))
      .slice(0, 10);

    for (const t of nonZero) {
      try {
        const metaRes = await fetch(chain.rpc, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 3, method: "alchemy_getTokenMetadata", params: [t.contractAddress] }),
        });
        const meta = await metaRes.json();
        const dec = meta.result?.decimals || 18;
        const bal = parseInt(t.tokenBalance, 16) / Math.pow(10, dec);
        if (bal > 0.000001 && meta.result?.symbol) {
          tokens.push({ sym: meta.result.symbol.toUpperCase(), amount: parseFloat(bal.toFixed(8)), chain: chain.id, contract: t.contractAddress });
        }
      } catch {}
    }
  } catch {}
  return tokens;
}

// ── Add address to existing Alchemy webhook ──
async function addToAlchemyWebhook(webhookId, addresses) {
  try {
    const res = await fetch(`https://dashboard.alchemy.com/api/update-webhook-addresses`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Alchemy-Token": ALCHEMY_KEY,
      },
      body: JSON.stringify({ webhook_id: webhookId, addresses_to_add: addresses, addresses_to_remove: [] }),
    });
    return res.ok;
  } catch { return false; }
}

// ── Main handler ──
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { addresses, name } = req.body;
  if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
    return res.status(400).json({ error: "addresses array required" });
  }

  const results = [];

  for (const address of addresses) {
    const addr = address.toLowerCase().trim();
    if (!/^0x[0-9a-f]{40}$/.test(addr)) {
      results.push({ address: addr, status: "invalid" });
      continue;
    }

    try {
      // 1. Scan all chains in parallel
      const chainScans = await Promise.all(CHAINS.map(c => scanChain(addr, c)));
      const allTokens = chainScans.flat();

      // 2. Save wallet to Supabase
      const walletId = `w_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await supaFetch("/wallets", "POST", {
        id: walletId,
        name: name || `Wallet ${addr.slice(0, 6)}`,
        address: addr,
        tokens: allTokens,
      });

      // 3. Add to existing Alchemy webhooks
      const webhooks = await supaFetch("/alchemy_webhooks?select=webhook_id,chain");
      if (webhooks && webhooks.length > 0) {
        await Promise.all(webhooks.map(wh => addToAlchemyWebhook(wh.webhook_id, [addr])));
      }

      results.push({ address: addr, status: "added", tokenCount: allTokens.length, walletId });
    } catch (e) {
      results.push({ address: addr, status: "error", error: e.message });
    }
  }

  return res.status(200).json({ ok: true, results });
}

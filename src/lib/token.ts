/**
 * Fetch token holders
 */

const KB_IP = process.env.CHERRY_KB;

export async function getTopTokenHolders(address: string): Promise<{
    tokenName: string;
    tokenAddress: string;
    tokenSymbol: string;
    tokenSupply: number;
    topHolders: any,
  }> {
    console.log(`Fethcing top holders for ${address}...`);

    // We'll attempt up to 3 times
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(`${KB_IP}/getTokenHolders?solTokenAddress=${address}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch token holders for ${address}`);
        }
        const data = await res.json();
        
        let topHolders = [];
        let tokenName = '';
        let tokenAddress = '';
        let tokenSymbol = '';
        let tokenSupply = data.totalSupply?.solana || 0;

        if (data.token){
            tokenName = data.token.name;
            tokenSymbol = data.token.symbol;
            tokenAddress = data.token.identifier?.address;
        }

        if (data.topHolders.length){
            topHolders = data.topHolders;
        }

        console.log(`Fetched data for ${tokenName}: top ${topHolders.length} holders`);
        return { tokenName, tokenSymbol, tokenAddress, tokenSupply, topHolders};    
      } catch (err: any) {
        console.error(`getTopTokenHolders => Attempt ${attempt} failed for ${address}, error: ${err.message}`);

        if (attempt < 3) {
          console.log(`Retrying getTopTokenHolders for ${address} in 3s...`);
          await new Promise((res) => setTimeout(res, 3000)); // wait 3s
        } else {
          console.log(`All attempts exhausted for ${address}; throwing error`);
          throw new Error(`Failed to fetch top token holders for ${address}: ${err.message}`);
        }
      }
    }
  // theoretically never gets here
  throw new Error(`Unexpected logic flow for getTopTokenHolders: ${address}`);
}

/**
 * Cluster structure the UI consumes
 *
 * {
 *   id            : number                  // 1, 2, 3…
 *   accounts      : {
 *     address     : string;
 *     level       : number;
 *     volumeUsd   : number;
 *     balance     : number;                 // raw token balance
 *     supplyPct   : number;                 // xx.xx  (two‑dec % of total supply)
 *   }[];
 *   accountLinks  : { source: string; target: string }[];
 *   totalVol      : number;                 // Σ volumeUsd
 *   totalPct      : number;                 // Σ supplyPct  (two‑dec)
 * }
 */
export function buildClusters(
  accounts: any[],
  accountLinks: { source: string; target: string }[],
  tokenSupply: number
) {
  if (!accounts?.length) return [];

  /* -------- adjacency list -------- */
  const addrToAcc = new Map(accounts.map((a) => [a.address, a]));
  const adj       = new Map<string, string[]>();

  accountLinks.forEach(({ source, target }) => {
    adj.set(source, [...(adj.get(source) || []), target]);
    adj.set(target, [...(adj.get(target) || []), source]);
  });

  /* -------- DFS over roots -------- */
  const roots = accounts.filter((a) => a.level === 0).map((a) => a.address);
  const seen  = new Set<string>();
  const clusters: any[] = [];

  for (const root of roots) {
    if (seen.has(root)) continue;

    const stack: string[] = [root];
    const cAccs: any[]   = [];
    const cAddrSet       = new Set<string>();
    let   totalVol       = 0;
    let   totalPct       = 0;

    while (stack.length) {
      const node = stack.pop()!;
      if (seen.has(node)) continue;
      seen.add(node);

      const acc = addrToAcc.get(node);
      if (acc) {
        /* ------------ per‑wallet % & balance ------------ */
        const balance   = Number(acc.balance ?? 0);
        const supplyPct =
          tokenSupply === 0
            ? 0
            : Math.round((balance / tokenSupply) * 100 * 100) / 100; // 2‑dp

        cAccs.push({ ...acc, balance, supplyPct });
        cAddrSet.add(node);

        totalVol += acc.volumeUsd;
        totalPct += supplyPct;
      }

      (adj.get(node) || []).forEach((nbr) => {
        if (!seen.has(nbr)) stack.push(nbr);
      });
    }

    /* only links inside this cluster */
    const cLinks = accountLinks.filter(
      ({ source, target }) => cAddrSet.has(source) && cAddrSet.has(target)
    );

    clusters.push({
      id: clusters.length + 1,   // 1‑based index
      accounts: cAccs,
      accountLinks: cLinks,
      totalVol,
      totalPct: Math.round(totalPct * 100) / 100, // clamp to 2‑dp once
    });
  }

  return clusters;
}

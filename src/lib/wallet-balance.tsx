/**********************************************************************
 *  get-balance.tsx
 *  -------------------------------------------------------------------
 *  Fetches full wallet balance (SOL + stables + any SPL tokens) from
 *  the Cherry KB “getBalance” micro-service.  Exported helper returns:
 *
 *    {
 *      raw,             // the untouched JSON from the service
 *      totalUSD,        // ≈ raw.totalBalance.solana
 *      solUSD,
 *      stablesUSD,      // USDC + USDT (extend STABLES set if needed)
 *      otherTokenUSD    // everything that isn’t SOL / stable
 *    }
 *
 *  -------------------------------------------------------------------
 *  Usage:
 *      import { getWalletBalance } from '@/lib/get-balance';
 *      const balance = await getWalletBalance(walletAddr);
 *
 *********************************************************************/

import { Big } from 'big.js';

const KB_IP =
  process.env.CHERRY_KB;

  const STABLES = new Set(['USDC', 'USDT']);

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type RawBalanceItem = {
  name: string;
  symbol: string;
  usd: number;
  // …rest is ignored for summary purposes
};

interface RawBalanceResponse {
  totalBalance: { solana: number };
  balances: { solana: RawBalanceItem[] };
  // plus “addresses”, “totalBalance24hAgo” etc.
}

export interface BalanceSummary {
  raw: RawBalanceResponse;
  totalUSD: number;
  solUSD: number;
  stablesUSD: number;
  otherTokenUSD: number;
}

/* ------------------------------------------------------------------ */
/*  Main helper                                                        */
/* ------------------------------------------------------------------ */

export async function getWalletBalance(
  solAddress: string,
  retries = 3,
  delayMs = 2000
): Promise<BalanceSummary> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      /* ---------------- HTTP call ---------------- */
      const res = await fetch(
        `${KB_IP}/getBalance?solAddress=${solAddress}`,
        { cache: 'no-store', next: { revalidate: 0 } } as RequestInit
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const raw = (await res.json()) as RawBalanceResponse;

      /* ---------------- quick sanity ---------------- */
      if (
        !raw?.totalBalance?.solana ||
        !Array.isArray(raw?.balances?.solana)
      ) {
        throw new Error('Malformed balance response');
      }

      /* ---------------- aggregation ---------------- */
      let solUSD = 0;
      let stablesUSD = 0;
      let otherTokenUSD = 0;

      raw.balances.solana.forEach((b) => {
        const usd = new Big(b.usd || 0);
        const sym = b.symbol.toUpperCase();

        if (sym === 'SOL') {
          solUSD = usd.toNumber();
        } else if (STABLES.has(sym)) {
          stablesUSD += usd.toNumber();
        } else {
          otherTokenUSD += usd.toNumber();
        }
      });

      const totalUSD = new Big(solUSD)
        .plus(stablesUSD)
        .plus(otherTokenUSD)
        .toNumber();

      return { raw, totalUSD, solUSD, stablesUSD, otherTokenUSD };
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs * attempt)); // 0.5s, 1s, 1.5s
    }
  }
}

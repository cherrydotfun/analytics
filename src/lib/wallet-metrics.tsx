import { Big } from 'big.js';
import { IWalletMetrics, IHoldingsDetailed } from '@/types/wallet'; 

// Symbols that count as "cash-like" balance on Solana.
// Extend if you also hold e.g. PYUSD, UXD, JPY-stable, etc.
const CASH_SYMBOLS = new Set(['SOL', 'USDC', 'USDT', 'wSOL']);

const KB_IP = process.env.CHERRY_KB;

export async function getPnL(
  address: string,
  retries = 3,
  delayMs = 500
): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    console.log(`Fetching PnL for ${address}...`);
    try {
      const res = await fetch(
        `${KB_IP}/getWalletStats?address=${address}`,
        { cache: 'no-store', next: { revalidate: 0 } } as RequestInit
      );

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = await res.json();

      if (!json || !Array.isArray(json.holdings)) {
        throw new Error('Malformed response: “holdings” not found.');
      }

      return json.holdings;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs * attempt)); // expo back-off: 0.5s, 1s, 1.5s
    }
  }

  /* eslint-disable-next-line @typescript-eslint/consistent-return */
}

/**
 * Crunch high-level stats for a wallet’s past trades.
 * All arithmetic is done with big.js to avoid float drift.
 */
export function calculateWalletMetrics(
  holdings: IHoldingsDetailed[]
): IWalletMetrics {
  if (!holdings.length) throw new Error('No holdings supplied');

  const now = Math.floor(Date.now() / 1000);

  /* running totals */
  let walletBalanceUSD     = new Big(0);   // cash only

  /* trading-only running totals */
  let winners              = 0;
  let realisedPnlSum       = new Big(0);
  let realisedProfitSum    = new Big(0);
  let unrealisedProfitSum  = new Big(0);
  let holdTimeSumHours     = new Big(0);
  let tradeCount           = 0;
  let profitPos            = new Big(0);
  let profitNeg            = new Big(0);
  let exposure             = new Big(0);
  let realisedVolume       = new Big(0);
  let costSum              = new Big(0);
  let costPosCount         = 0;

  holdings.forEach((h) => {
    const symbol = h.token.symbol.toUpperCase();
    const usdValue = new Big(h.usd_value || 0);

    /* ---------- cash token? ---------- */
    if (CASH_SYMBOLS.has(symbol)) {
      walletBalanceUSD = walletBalanceUSD.plus(usdValue);
      return; // ⟵ skip the rest of the metrics for cash tokens
    }

    /* ---------- trading token logic ---------- */

    const realisedProfit   = new Big(h.realized_profit     || 0);
    const unrealisedProfit = new Big(h.unrealized_profit   || 0);
    const realisedPnl      = new Big(h.realized_pnl        || 0);
    const soldIncome       = new Big(h.history_sold_income || 0);
    const boughtCost       = new Big(h.history_bought_cost || 0);

    realisedProfitSum   = realisedProfitSum.plus(realisedProfit);
    unrealisedProfitSum = unrealisedProfitSum.plus(unrealisedProfit);
    realisedPnlSum      = realisedPnlSum.plus(realisedPnl);
    realisedVolume      = realisedVolume.plus(soldIncome).plus(boughtCost);
    exposure            = exposure.plus(usdValue);

    if (realisedProfit.gt(0)) {
      winners += 1;
      profitPos = profitPos.plus(realisedProfit);
    } else if (realisedProfit.lt(0)) {
      profitNeg = profitNeg.plus(realisedProfit.abs());
    }

    /* holding time */
    const start = h.start_holding_at ?? now;
    const end   = h.end_holding_at   ?? now;
    holdTimeSumHours = holdTimeSumHours.plus(
      new Big(end - start).div(3600)
    );

    /* trades */
    tradeCount += (h.sells ?? 0) + (h.buy_30d ?? 0);

    /* avg cost basis */
    if (boughtCost.gt(0)) {
      costSum      = costSum.plus(boughtCost);
      costPosCount += 1;
    }
  });

  const n = costPosCount === 0 && realisedVolume.eq(0) ? 0 : winners + (profitNeg.gt(0) ? profitNeg.div(profitNeg) : 0); // alt method: count trading tokens
  // simpler: sample size = number of non-cash holdings
  const sampleSize = holdings.filter(
    (h) => !CASH_SYMBOLS.has(h.token.symbol.toUpperCase())
  ).length;

  return {
    sampleSize,
    winRate:              sampleSize ? winners / sampleSize : 0,
    avgRealisedPnl:       sampleSize ? realisedPnlSum.div(sampleSize).toNumber() : 0,
    avgRealisedProfit:    sampleSize ? realisedProfitSum.div(sampleSize).toNumber() : 0,
    avgUnrealisedProfit:  sampleSize ? unrealisedProfitSum.div(sampleSize).toNumber() : 0,
    avgHoldTimeHours:     sampleSize ? holdTimeSumHours.div(sampleSize).toNumber() : 0,
    avgTradesPerToken:    sampleSize ? tradeCount / sampleSize : 0,
    profitFactor:         profitNeg.gt(0)
                            ? profitPos.div(profitNeg).toNumber()
                            : Infinity,
    exposureUSD:          exposure.toNumber(),
    realisedVolumeUSD:    realisedVolume.toNumber(),
    avgPositionSizeUSD:   costPosCount
                            ? costSum.div(costPosCount).toNumber()
                            : 0,
    walletBalanceUSD:     walletBalanceUSD.toNumber(),
  };
}

export async function getWalletMetrics(
  address: string
): Promise<IWalletMetrics> {
  const holdings = await getPnL(address);
  return calculateWalletMetrics(holdings);
}
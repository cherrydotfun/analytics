import { Big } from 'big.js';
import { IWalletMetrics, IHoldingsDetailed } from '@/types/wallet'; 

// Symbols that count as "cash-like" balance on Solana.
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
): IWalletMetrics & { avgWinRatePct: number; avgTotalPnlUSD: number } {
  if (!holdings.length) throw new Error('No holdings supplied');

  const now = Math.floor(Date.now() / 1000);

  // running totals
  let walletBalanceUSD    = new Big(0);
  let winners             = 0;
  let realisedProfitSum   = new Big(0);
  let unrealisedProfitSum = new Big(0);
  let realisedPnlSum      = new Big(0);
  let holdTimeSumHours    = new Big(0);
  let tradeCount          = 0;
  let profitPos           = new Big(0);
  let profitNeg           = new Big(0);
  let exposure            = new Big(0);
  let realisedVolume      = new Big(0);
  let costSum             = new Big(0);
  let costPosCount        = 0;

  holdings.forEach((h) => {
    const sym     = h.token.symbol.toUpperCase();
    const usdVal  = new Big(h.usd_value || 0);

    // cash tokens
    if (CASH_SYMBOLS.has(sym)) {
      walletBalanceUSD = walletBalanceUSD.plus(usdVal);
      return;
    }

    const rProfit = new Big(h.realized_profit     || 0);
    const uProfit = new Big(h.unrealized_profit   || 0);
    const rPnl     = new Big(h.realized_pnl        || 0);
    const sold     = new Big(h.history_sold_income || 0);
    const bought   = new Big(h.history_bought_cost || 0);

    realisedProfitSum   = realisedProfitSum.plus(rProfit);
    unrealisedProfitSum = unrealisedProfitSum.plus(uProfit);
    realisedPnlSum      = realisedPnlSum.plus(rPnl);
    realisedVolume      = realisedVolume.plus(sold).plus(bought);
    exposure            = exposure.plus(usdVal);

    if (rProfit.gt(0)) {
      winners += 1;
      profitPos = profitPos.plus(rProfit);
    } else if (rProfit.lt(0)) {
      profitNeg = profitNeg.plus(rProfit.abs());
    }

    // hold time
    const start = h.start_holding_at ?? now;
    const end   = h.end_holding_at   ?? now;
    holdTimeSumHours = holdTimeSumHours.plus(
      new Big(end - start).div(3600)
    );

    // trade count
    tradeCount += (h.sells ?? 0) + (h.buy_30d ?? 0);

    // avg position cost
    if (bought.gt(0)) {
      costSum      = costSum.plus(bought);
      costPosCount += 1;
    }
  });

  const sampleSize = holdings.filter(
    (h) => !CASH_SYMBOLS.has(h.token.symbol.toUpperCase())
  ).length;

  const winRate = sampleSize ? winners / sampleSize : 0;
  const avgRealisedPnl     = sampleSize ? realisedPnlSum.div(sampleSize).toNumber() : 0;
  const avgRealisedProfit  = sampleSize ? realisedProfitSum.div(sampleSize).toNumber() : 0;
  const avgUnrealisedProfit= sampleSize ? unrealisedProfitSum.div(sampleSize).toNumber() : 0;
  const avgHoldTimeHours   = sampleSize ? holdTimeSumHours.div(sampleSize).toNumber()    : 0;
  const avgTradesPerToken  = sampleSize ? tradeCount / sampleSize : 0;
  const profitFactor       = profitNeg.gt(0) ? profitPos.div(profitNeg).toNumber() : Infinity;
  const exposureUSD        = exposure.toNumber();
  const realisedVolumeUSD  = realisedVolume.toNumber();
  const avgPositionSizeUSD = costPosCount ? costSum.div(costPosCount).toNumber() : 0;
  const walletBalance      = walletBalanceUSD.toNumber();

  // new fields:
  const avgWinRatePct   = winRate * 100;
  // const totalPnlSum     = realisedProfitSum.plus(unrealisedProfitSum);
  const avgTotalPnlUSD  = sampleSize ? realisedProfitSum.div(sampleSize).toNumber() : 0;

  return {
    sampleSize,
    winRate,
    avgWinRatePct,
    avgRealisedPnl,
    avgRealisedProfit,
    avgUnrealisedProfit,
    avgTotalPnlUSD,
    avgHoldTimeHours,
    avgTradesPerToken,
    profitFactor,
    exposureUSD,
    realisedVolumeUSD,
    avgPositionSizeUSD,
    walletBalanceUSD: walletBalance,
  };
}

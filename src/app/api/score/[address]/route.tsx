/**
 * --------------------------------------------------------------------
 * RISK SCORING
 * --------------------------------------------------------------------
 *
 * TOP-LEVEL SHAPE
 * ┌───────────────────────────────────────────────────────────────┐
 * │ token            { name, symbol, address }                  │
 * │ holdersAnalysed  number  – wallets that had enough history  │
 * │ tokenSummary     { …see below… }                            │
 * │ holders[]        array<PerHolder> – one row per whale       │
 * └───────────────────────────────────────────────────────────────┘
 *
 * ──────────────────────────────────────────────────────────────────
 * tokenSummary  – explains the health of the pool
 * ──────────────────────────────────────────────────────────────────
 * probDump1h : 0‥1
 *     Probability that **≥5 %** of pool depth will be market-sold
 *     by the analysed wallets within the *next* hour.
 *
 * sharkShare : 0‥1
 *     Share of analysed exposure held by wallets whose
 *     historical **Profit Factor ≥ 1.5** (aka “consistent winners”).
 *     More sharks → exits are colder and more coordinated.
 *
 * richness : number (cashUSD ÷ positionUSD), median across holders
 *     < 0.3  → cash-poor; may sell just to raise dry powder  
 *     0.3-1  → balanced; can add *or* exit opportunistically  
 *     > 1    → well-funded; not forced to dump
 *
 * ──────────────────────────────────────────────────────────────────
 * holders[] – per-wallet live snapshot
 * ──────────────────────────────────────────────────────────────────
 * address       full Solana address
 * short         `abbreviateAddress(address)`
 * exposurePct   % of total token supply this wallet controls
 *
 * sellScore     0‥1  – SellScore (higher = sooner/more likely to dump)
 * label         categorical bucket derived from score
 *               ▸ 0-0.3  Diamond hands  
 *               ▸ 0.3-0.6 Neutral  
 *               ▸ 0.6-0.8 Profit-taking likely  
 *               ▸ >0.8   Exit-liquidity hunter
 *
 * sizeX         USD the wallet originally spent on this token
 * pnlX          current unrealised ROI (e.g. 0.58 = +58 %)
 * holdHours     hours since first buy of this token
 * cashUSD       SOL + stable balance still sitting idle in wallet
 * basePF        wallet’s historical **Profit Factor** for *other* coins  
 *               (<1 = serial loser, >1.5 = shark, null = new wallet)
 *
 **/

import { NextResponse } from 'next/server';
import { getTopTokenHolders } from '@/lib/token';
import { getWalletBalance } from '@/lib/wallet-balance';
// import { getWalletPnl } from '@/lib/wallet-pnl';
import { calculateWalletMetrics, getPnL } from '@/lib/wallet-metrics';
import { computeSellScore, sellLabel, sigmoid } from '@/lib/sell-score';
import { abbreviateAddress } from '@/lib/formatting';
import type { IHoldingsDetailed, IWalletMetrics } from '@/types/wallet';
import { Big } from 'big.js';

export async function GET(
  _req: Request,
  { params }: { params: { address: string } }
) {
  try {
    const tokenAddress = params.address;

    /* -------------------------------------------------- */
    /* 1) who are the whales?                             */
    /* -------------------------------------------------- */
    const { tokenName, tokenSymbol, topHolders, tokenSupply } = await getTopTokenHolders(tokenAddress);
    const slice = topHolders.slice(0, 10);

    /* -------------------------------------------------- */
    /* 2) crunch each holder in parallel                  */
    /* -------------------------------------------------- */
    const perHolder = await Promise.all(
      slice.map(async (h) => {
        try {
          /* ---------- a. raw wallet data ---------- */
          const pnlRaw   = await getPnL(h.address.address);
          const holdings = pnlRaw as IHoldingsDetailed[];

          /* ---------- b. split X-token vs rest ---------- */
          const xRecord  = holdings.find((o) => o.token.address === tokenAddress);
          const baseHold = holdings.filter((o) => o.token.address !== tokenAddress);

          if (!xRecord || !baseHold.length) return null; // no baseline → skip (newbie or bot)

          /* ---------- c. baseline metrics ---------- */
          const baseMetrics: IWalletMetrics = calculateWalletMetrics(baseHold);

          /* ---------- d. wallet cash ---------- */
          const balance  = await getWalletBalance(h.address.address);
          const cashUSD  = balance.solUSD + balance.stablesUSD;

          /* ---------- e. live X position facts ---------- */
          const sizeX    = parseFloat(xRecord.history_bought_cost || '0');
          const pnlX     = parseFloat(xRecord.unrealized_pnl || '0');      // decimal
          const start    = xRecord.start_holding_at ?? Math.floor(Date.now()/1000);
          const holdX    = (Date.now()/1000 - start) / 3600;               // h
          const muSize   = baseMetrics.avgPositionSizeUSD || 1;            // avoid /0
          const muHold   = baseMetrics.avgHoldTimeHours   || 1;

          /* ---------- f. sell score ---------- */
          const score = computeSellScore(sizeX / muSize, holdX / muHold, pnlX);
          const label = sellLabel(score);

          return {
            address: h.address.address,
            short: abbreviateAddress(h.address.address),
            exposurePct: ((h.balance / (tokenSupply ?? 1)) * 100),
            score,
            label,
            sizeX,
            pnlX,
            holdHours: holdX,
            cashUSD,
            basePF: baseMetrics.profitFactor,
          };
        } catch (err) {
          console.error('holder fail', h.address, err);
          return null;
        }
      })
    ).then((arr) => arr.filter(Boolean) as NonNullable<typeof arr[number]>[]);

    if (!perHolder.length) {
      return NextResponse.json(
        { error: 'No comparable holders (all newbies?)' },
        { status: 422 }
      );
    }

    /* -------------------------------------------------- */
    /* 3) token-level aggregates                          */
    /* -------------------------------------------------- */
    const totalSize = perHolder.reduce((s, d) => s + d.sizeX, 0);

    const probDump1h = perHolder.reduce((acc, d) => acc + d.score * d.sizeX, 0) / (totalSize || 1);

    const sharkExposure = perHolder
      .filter((d) => d.basePF >= 1.5)
      .reduce((sum, d) => sum + d.sizeX, 0);

    const sharkShare = totalSize ? sharkExposure / totalSize : 0;

    const richnessArr = perHolder.map((d) => d.cashUSD / (d.sizeX || 1));
    richnessArr.sort((a, b) => a - b);
    const richness = richnessArr[Math.floor(richnessArr.length / 2)]; // median

    /* -------------------------------------------------- */
    /* 4) respond                                         */
    /* -------------------------------------------------- */
    return NextResponse.json({
      token: { name: tokenName, symbol: tokenSymbol, address: tokenAddress },
      holdersAnalysed: perHolder.length,
      tokenSummary: {
        probDump1h,   // 0-1
        sharkShare,   // 0-1
        richness,     // median cash / pos
      },
      holders: perHolder,
    });
  } catch (error) {
    console.error('Error in GET /address/[address]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
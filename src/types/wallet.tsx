export interface IHoldingsDetailed {
    token: {
      address: string;
      symbol: string;
      name: string;
      logo: string;
      // …other fields omitted for brevity
    };
    balance: string;
    usd_value: string;
    realized_profit: string;          // realised $ PnL (signed)
    unrealized_profit: string;        // $ currently on the table
    total_profit: string;             // realised + unrealised
    realized_pnl: string;             // ROI (-1 … +∞)
    start_holding_at: number | null;  // epoch seconds
    end_holding_at: number | null;    // epoch seconds | null = still open
    history_sold_income: string;      // $ outflow from sells
    history_bought_cost: string;      // $ inflow from buys
    sells: number;
    avg_bought: string;
    avg_sold: string;
    total_supply: number;
    buy_30d: number;
    sell_30d: number;
}
  
export interface IWalletMetrics {
    avgWinRatePct: number;
    avgTotalPnlUSD: number;
    sampleSize: number;
    winRate: number;                 // 0-1
    avgRealisedPnl: number;          // mean ROI
    avgRealisedProfit: number;       // $
    avgUnrealisedProfit: number;     // $
    avgHoldTimeHours: number;
    avgTradesPerToken: number;
    profitFactor: number;            // Σ wins / |Σ losses|
    exposureUSD: number;             // Σ current open position value $
    realisedVolumeUSD: number;       // Σ buys + sells $
    avgPositionSizeUSD: number;      // mean cost basis $
    walletBalanceUSD: number;        // SOL + stable-coin positions $
}
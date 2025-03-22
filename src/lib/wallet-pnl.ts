// src/lib/pnl.ts
/**
 * Fetch wallet PNL data from the internal API.
 * Aggregates realized and unrealized PNL across all holdings.
 */

const KB_IP = process.env.CHERRY_KB;

export async function getWalletPnl(address: string): Promise<{
    realizedPnl: number;
    unrealizedPnl: number;
    totalPnl: number;
    rawStats: any;
  }> {
    console.log(`Fethcing PNL for ${address}...`);
    const res = await fetch(`${KB_IP}/getWalletStats?address=${address}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch wallet stats for ${address}`);
    }
    const data = await res.json();
    let realizedPnl = 0;
    let unrealizedPnl = 0;
  
    if (data.holdings && Array.isArray(data.holdings)) {
      for (const holding of data.holdings) {
        realizedPnl += parseFloat(holding.realized_pnl || '0');
        unrealizedPnl += parseFloat(holding.unrealized_pnl || '0');
      }
    }
    const totalPnl = realizedPnl + unrealizedPnl;
    console.log(`Total PNL for ${address}: ${totalPnl}`);
    return { realizedPnl, unrealizedPnl, totalPnl, rawStats: data };
  }
  
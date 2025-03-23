/**
 * Fetch wallet PNL data from the internal API.
 * Aggregates realized and unrealized PNL across all holdings.
 */

const KB_IP = process.env.CHERRY_KB;

export async function getWalletPnl(address: string): Promise<{
    balanceUsd: number;
    pnlPerc: number;
    pnlUsd: number;
    unrealizedPnlUsd: number,
    holdings: any,
  }> {
    console.log(`Fethcing PNL for ${address}...`);

    // We'll attempt up to 3 times
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        // console.log(`getWalletPnl => Attempt ${attempt} for ${address}`);
        const res = await fetch(`${KB_IP}/getWalletStats?address=${address}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch wallet stats for ${address}`);
        }
        const data = await res.json();
        
        let balanceUsd = 0;
        let pnlPerc = 0;
        let pnlUsd = 0;
        let unrealizedPnlUsd = 0;
        let holdings = [];

        let totalSpent = 0;
        let totalEarned = 0;

        if (data.holdings && Array.isArray(data.holdings)) {
          for (const holding of data.holdings) {
            balanceUsd += parseFloat(holding.usd_value || '0');
            pnlUsd += (parseFloat(holding.history_sold_income || '0') + parseFloat(holding.usd_value || '0')) - parseFloat(holding.history_bought_cost || '0');
            unrealizedPnlUsd += parseFloat(holding.unrealized_pnl || '0');
            totalSpent += parseFloat(holding.history_bought_cost || '0');
            totalEarned += (parseFloat(holding.history_sold_income || '0') + parseFloat(holding.usd_value || '0'));
            holdings.push({
              'ca': holding?.token?.token_address || '',
              'symbol': holding?.token?.symbol || '',
              'name': holding?.token?.name || '',
              'valueUsd': parseFloat(holding?.usd_value || '0'),
              'imageUrl': holding?.token?.logo || '',
              'boughtUsd': parseFloat(holding.history_bought_cost || '0'),
              'soldUsd': parseFloat(holding.history_sold_income || '0'),
              'pnlUsd': (parseFloat(holding.history_sold_income || '0') + parseFloat(holding.usd_value || '0')) - parseFloat(holding.history_bought_cost || '0')
            });
          }
        }

        pnlPerc = ((totalEarned - totalSpent) / totalSpent) * 100;

        console.log(`Total PNL for ${address}: ${pnlUsd}`);
        return { balanceUsd, pnlPerc, pnlUsd, unrealizedPnlUsd, holdings};    
      } catch (err: any) {
        console.error(`getWalletPnl => Attempt ${attempt} failed for ${address}, error: ${err.message}`);

        if (attempt < 3) {
          console.log(`Retrying getWalletPnl for ${address} in 3s...`);
          await new Promise((res) => setTimeout(res, 3000)); // wait 3s
        } else {
          console.log(`All attempts exhausted for ${address}; throwing error`);
          throw new Error(`Failed to fetch wallet stats for ${address}: ${err.message}`);
        }
      }
    }
  // theoretically never gets here
  throw new Error(`Unexpected logic flow for getWalletPnl: ${address}`);
}
  
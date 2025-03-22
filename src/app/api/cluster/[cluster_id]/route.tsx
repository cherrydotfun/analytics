import { NextResponse } from 'next/server';
import { firestore } from '@/firestore';
import { getWalletPnl } from '@/lib/wallet-pnl';

export async function GET(
  request: Request,
  { params }: { params: { cluster_id: string } }
) {
  try {
    const clusterId = params.cluster_id;

    // Retrieve the cluster document from Firestore
    const clusterDoc = await firestore.collection('clusters').doc(clusterId).get();
    if (!clusterDoc.exists) {
      return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
    }
    const clusterData = clusterDoc.data();
    const { name, wallets } = clusterData || {};
    if (!wallets || !Array.isArray(wallets) || wallets.length === 0) {
      return NextResponse.json({ error: 'No wallets found in cluster' }, { status: 400 });
    }

    // Aggregators for cluster-level PNL
    let clusterTotalRealizedPnl = 0;
    let clusterTotalUnrealizedPnl = 0;
    let clusterTotalPnl = 0;
    const walletDetails: Array<{
      address: string;
      realizedPnl: number;
      unrealizedPnl: number;
      totalPnl: number;
    }> = [];

    // Map for aggregating top holdings across all wallets.
    const holdingsMap = new Map<string, {
      tokenAddress: string;
      symbol: string;
      name: string;
      logo: string;
      totalUsdValue: number;
      totalProfit: number;
    }>();

    // Process each wallet in the cluster.
    await Promise.all(wallets.map(async (address: string) => {
      try {
        const pnl = await getWalletPnl(address);
        clusterTotalRealizedPnl += pnl.realizedPnl;
        clusterTotalUnrealizedPnl += pnl.unrealizedPnl;
        clusterTotalPnl += pnl.totalPnl;
        walletDetails.push({
          address,
          realizedPnl: pnl.realizedPnl,
          unrealizedPnl: pnl.unrealizedPnl,
          totalPnl: pnl.totalPnl,
        });

        // Aggregate holdings for top holdings
        if (pnl.rawStats && pnl.rawStats.holdings && Array.isArray(pnl.rawStats.holdings)) {
          for (const holding of pnl.rawStats.holdings) {
            // Use token_address if available, else fallback to token.address.
            const tokenAddress = holding.token?.token_address || holding.token?.address;
            if (!tokenAddress) continue;
            const usdValue = parseFloat(holding.usd_value || '0');
            const totalProfit = parseFloat(holding.total_profit || '0');
            if (holdingsMap.has(tokenAddress)) {
              const prev = holdingsMap.get(tokenAddress)!;
              holdingsMap.set(tokenAddress, {
                tokenAddress,
                symbol: prev.symbol || holding.token?.symbol,
                name: prev.name || holding.token?.name,
                logo: prev.logo || holding.token?.logo,
                totalUsdValue: prev.totalUsdValue + usdValue,
                totalProfit: prev.totalProfit + totalProfit,
              });
            } else {
              holdingsMap.set(tokenAddress, {
                tokenAddress,
                symbol: holding.token?.symbol || '',
                name: holding.token?.name || '',
                logo: holding.token?.logo || '',
                totalUsdValue: usdValue,
                totalProfit: totalProfit,
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error processing wallet ${address}:`, error);
      }
    }));

    // Convert aggregated holdings map to array and sort by totalUsdValue descending.
    const aggregatedHoldings = Array.from(holdingsMap.values());
    aggregatedHoldings.sort((a, b) => b.totalUsdValue - a.totalUsdValue);
    const topHoldings = aggregatedHoldings.slice(0, 20);

    // Build the final response object.
    const responseData = {
      clusterId,
      clusterName: name,
      totalRealizedPnl: clusterTotalRealizedPnl,
      totalUnrealizedPnl: clusterTotalUnrealizedPnl,
      totalPnl: clusterTotalPnl,
      walletDetails,
      topHoldings,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error in GET /cluster/[cluster_id]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

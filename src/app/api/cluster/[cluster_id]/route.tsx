import { NextResponse } from 'next/server';
import { firestore } from '@/firestore';
import { getWalletPnl } from '@/lib/wallet-pnl';

export async function GET(
  request: Request,
  { params }: { params: { cluster_id: string } }
) {
  try {
    const clusterId = params.cluster_id;

    // Retrieve the cluster document from Firestore.
    const clusterDoc = await firestore.collection('clusters').doc(clusterId).get();
    if (!clusterDoc.exists) {
      return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
    }
    const clusterData = clusterDoc.data();
    const { name, addresses } = clusterData || {};
    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      return NextResponse.json({ error: 'No addresses found in cluster' }, { status: 400 });
    }

    // Aggregators for cluster-level PNL.
    let clusterTotalPnlUsd = 0;
    let clusterTotalUnrealizedPnlUsd = 0;
    const walletDetails: Array<{
      address: string;
      balanceUsd: number;
      pnlPerc: number;
      pnlUsd: number;
      unrealizedPnlUsd: number;
    }> = [];

    // Map to aggregate top holdings across all wallets.
    const holdingsMap = new Map<string, {
      tokenAddress: string;
      symbol: string;
      name: string;
      imageUrl: string;
      totalValueUsd: number;
    }>();

    // Process each wallet in the cluster.
    await Promise.all(addresses.map(async (address: string) => {
      try {
        const pnl = await getWalletPnl(address);
        // Aggregate cluster-level PNL.
        clusterTotalPnlUsd += pnl.pnlUsd;
        clusterTotalUnrealizedPnlUsd += pnl.unrealizedPnlUsd;

        walletDetails.push({
          address,
          balanceUsd: pnl.balanceUsd,
          pnlPerc: pnl.pnlPerc,
          pnlUsd: pnl.pnlUsd,
          unrealizedPnlUsd: pnl.unrealizedPnlUsd,
        });

        // Aggregate holdings from this wallet.
        if (pnl.holdings && Array.isArray(pnl.holdings)) {
          for (const holding of pnl.holdings) {
            // Use the 'ca' field as the token address.
            const tokenAddress = holding.ca;
            if (!tokenAddress) continue;
            const valueUsd = parseFloat(holding.valueUsd) || 0;
            if (holdingsMap.has(tokenAddress)) {
              const prev = holdingsMap.get(tokenAddress)!;
              holdingsMap.set(tokenAddress, {
                tokenAddress,
                symbol: prev.symbol,
                name: prev.name,
                imageUrl: prev.imageUrl,
                totalValueUsd: prev.totalValueUsd + valueUsd,
              });
            } else {
              holdingsMap.set(tokenAddress, {
                tokenAddress,
                symbol: holding.symbol,
                name: holding.name,
                imageUrl: holding.imageUrl,
                totalValueUsd: valueUsd,
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error processing wallet ${address}:`, error);
      }
    }));

    // Convert the aggregated holdings to an array, sort by total value descending, and take the top 20.
    const aggregatedHoldings = Array.from(holdingsMap.values());
    aggregatedHoldings.sort((a, b) => b.totalValueUsd - a.totalValueUsd);
    const topHoldings = aggregatedHoldings.slice(0, 20);

    // Build the final response.
    const responseData = {
      clusterId,
      clusterName: name,
      totalPnlUsd: clusterTotalPnlUsd,
      totalUnrealizedPnlUsd: clusterTotalUnrealizedPnlUsd,
      walletDetails,
      topHoldings,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error in GET /cluster/[cluster_id]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

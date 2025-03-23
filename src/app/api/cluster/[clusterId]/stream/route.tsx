import { NextResponse } from 'next/server';
import { TransformStream } from 'stream/web'; // or from the global if supported
import { firestore } from '@/firestore';
import { getWalletPnl } from '@/lib/wallet-pnl';
import { getHighScoreAssociations } from '@/lib/wallet-associations';

export async function GET(
  request: Request,
  { params }: { params: { clusterId: string } }
) {
  const { clusterId } = params;

  // Create a TransformStream for SSE
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // Helper to write SSE lines. We prefix with "data: " for SSE compliance.
  function sseWrite(line: string) {
    writer.write(encoder.encode(`data: ${line}\n\n`));
  }

  // Wrap our logic in an async IIFE so we can use try/catch and finalize.
  (async () => {
    try {
      // 1) Retrieve the cluster document from Firestore
      sseWrite(`[SSE] => Fetching cluster ${clusterId} from Firestore...`);

      const clusterDoc = await firestore.collection('clusters').doc(clusterId).get();
      if (!clusterDoc.exists) {
        sseWrite(`ERROR: Cluster ${clusterId} not found`);
        writer.close();
        return;
      }
      const clusterData = clusterDoc.data();
      const { name, addresses } = clusterData || {};

      if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
        sseWrite(`ERROR: No addresses found in cluster ${clusterId}`);
        writer.close();
        return;
      }

      sseWrite(`[SSE] => Found ${addresses.length} wallet(s) in cluster ${clusterId}`);

      // 2) Aggregators for cluster-level PNL
      let clusterTotalPnlUsd = 0;
      let clusterTotalUnrealizedPnlUsd = 0;
      let clusterTotalBalanceUsd = 0;
      let clusterPnL = [];
      const walletDetails: Array<{
        address: string;
        balanceUsd: number;
        pnlPerc: number;
        pnlUsd: number;
        unrealizedPnlUsd: number;
      }> = [];

      // 3) Map to aggregate top holdings across all wallets
      const holdingsMap = new Map<
        string,
        {
          ca: string;
          symbol: string;
          name: string;
          imageUrl: string;
          valueUsd: number;
          boughtUsd: number;
          soldUsd: number;
          pnlUsd: number;
        }
      >();

      // 4) Structures to merge BFS data from each wallet
      const mergedAddressesMap = new Map<string, number>();
      const mergedLinksMap = new Map<string, number>();

      // 5) Process each wallet in the cluster
      for (const walletAddress of addresses) {
        try {
          sseWrite(`[SSE] => Processing wallet ${walletAddress}...`);

          // 5a) Get wallet PNL
          const pnl = await getWalletPnl(walletAddress);
          clusterTotalPnlUsd += pnl.pnlUsd;
          clusterTotalUnrealizedPnlUsd += pnl.unrealizedPnlUsd;
          clusterTotalBalanceUsd += pnl.balanceUsd;
          clusterPnL.push(pnl.pnlPerc);

          walletDetails.push({
            address: walletAddress,
            balanceUsd: pnl.balanceUsd,
            pnlPerc: pnl.pnlPerc,
            pnlUsd: pnl.pnlUsd,
            unrealizedPnlUsd: pnl.unrealizedPnlUsd,
          });

          // 5b) Accumulate holdings from this wallet
          if (pnl.holdings && Array.isArray(pnl.holdings)) {
            for (const holding of pnl.holdings) {
              const ca = holding.ca;
              if (!ca) continue;
              const valueUsd = parseFloat(holding.valueUsd) || 0;
              const boughtUsd = parseFloat(holding.boughtUsd) || 0;
              const soldUsd = parseFloat(holding.soldUsd) || 0;
              const pnlUsd = parseFloat(holding.pnlUsd) || 0;  
              if (holdingsMap.has(ca)) {
                const prev = holdingsMap.get(ca)!;
                holdingsMap.set(ca, {
                  ...prev,
                  valueUsd: prev.valueUsd + valueUsd,
                  boughtUsd: prev.boughtUsd + boughtUsd,
                  soldUsd: prev.soldUsd + soldUsd,
                  pnlUsd: prev.pnlUsd + pnlUsd,  
                });
              } else {
                holdingsMap.set(ca, {
                  ca,
                  symbol: holding.symbol,
                  name: holding.name,
                  imageUrl: holding.imageUrl,
                  valueUsd: valueUsd,
                  boughtUsd: boughtUsd,
                  soldUsd: soldUsd,
                  pnlUsd: pnlUsd  
                });
              }
            }
          }

          // 5c) Also fetch BFS associations for this wallet at maxDepth=1
          sseWrite(`[SSE] => BFS for wallet ${walletAddress}...`);
          const { accounts: bfsAddresses, accountLinks: bfsLinks } =
            await getHighScoreAssociations(walletAddress, 1, (logLine) => {
              // each BFS log line
              sseWrite(`[BFS:${walletAddress}] ${logLine}`);
            });

          // Merge BFS addresses
          for (const addrObj of bfsAddresses) {
            const { address, volumeUsd } = addrObj;
            const oldVol = mergedAddressesMap.get(address) || 0;
            if (volumeUsd > oldVol) {
              mergedAddressesMap.set(address, volumeUsd);
            }
          }

          // Merge BFS links
          for (const link of bfsLinks) {
            const key = `${link.source}->${link.target}`;
            const oldVol = mergedLinksMap.get(key) || 0;
            const volNum = parseFloat(link.volumeUsd || '0');
            if (volNum > oldVol) {
              mergedLinksMap.set(key, volNum);
            }
          }

          sseWrite(`[SSE] => Done wallet ${walletAddress}`);
        } catch (err: any) {
          sseWrite(`ERROR: Wallet ${walletAddress} => ${err.message}`);
        }
      }

      // 6) Convert the aggregated holdings to array, sort, take top 30
      const aggregatedHoldings = Array.from(holdingsMap.values());
      aggregatedHoldings.sort((a, b) => (b.valueUsd + b.soldUsd + b.boughtUsd) - (a.valueUsd + a.soldUsd + a.boughtUsd));
      const topHoldings = aggregatedHoldings.slice(0, 30);

      // 7) Build BFS "associatedNetwork"
      const mergedAddresses: Array<{ address: string; volumeUsd: number; level: number }> = [];
      for (const [addr, vol] of mergedAddressesMap.entries()) {
        // If you want to tag "level=1" for addresses in the cluster, else 999
        const currentLevel = addresses.includes(addr) ? 1 : 999;
        mergedAddresses.push({ address: addr, volumeUsd: vol, level: currentLevel });
      }
      mergedAddresses.sort((a, b) => b.volumeUsd - a.volumeUsd);

      const mergedLinks: Array<{ source: string; target: string; volumeUsd: string }> = [];
      for (const [key, vol] of mergedLinksMap.entries()) {
        const [source, target] = key.split('->');
        mergedLinks.push({ source, target, volumeUsd: vol.toString() });
      }

      // 8) Build final response
      const responseData = {
        id: clusterId,
        name,
        financials: {
          balanceUsd: clusterTotalBalanceUsd, // or compute if you want
          pnlPerc: arithmeticMeanPnL(clusterPnL),
          pnlUsd: clusterTotalPnlUsd,
          unrealizedPnlUsd: clusterTotalUnrealizedPnlUsd,
          holdings: topHoldings,
        },
        associations: {
          accounts: mergedAddresses,
          accountLinks: mergedLinks,
        },
        achievements: [],
      };

      // Send the final SSE chunk
      sseWrite(`FINAL_RESULT: ${JSON.stringify(responseData)}`);

      // Close the writer to end SSE
      writer.close();
    } catch (err: any) {
      // If we got an error mid-way
      sseWrite(`ERROR: ${err.message}`);
      writer.close();
    }
  })();

  // Return SSE response
  return new NextResponse(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// Keep your existing PUT method as is
export async function PUT(
  request: Request,
  { params }: { params: { clusterId: string } }
) {
  try {
    const clusterId = params.clusterId;

    // Parse the incoming JSON
    const { name, addresses } = await request.json();

    const clusterRef = firestore.collection('clusters').doc(clusterId);
    const snapshot = await clusterRef.get();
    if (!snapshot.exists) {
      return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
    }

    const updatedDoc: any = {};
    if (typeof name === 'string') {
      updatedDoc.name = name;
    }
    if (Array.isArray(addresses)) {
      updatedDoc.addresses = addresses;
    }

    await clusterRef.update(updatedDoc);
    return NextResponse.json({ status: 'ok', data: { updatedDoc } });
  } catch (error) {
    console.error('Error in PUT /cluster/[clusterId]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


function arithmeticMeanPnL(pnlList: number[]) {
    if (!pnlList || pnlList.length === 0) return 0;
    
    const sum = pnlList.reduce((acc, val) => acc + val, 0);
    return sum / pnlList.length;
}
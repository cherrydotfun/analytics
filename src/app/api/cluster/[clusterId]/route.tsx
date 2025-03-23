import { NextResponse } from 'next/server';
import { firestore } from '@/firestore';
import { getWalletPnl } from '@/lib/wallet-pnl';
import { getHighScoreAssociations } from '@/lib/wallet-associations'; // <-- BFS logic

export async function GET(
  request: Request,
  { params }: { params: { clusterId: string } }
) {
  try {
    const clusterId = params.clusterId;

    // 1) Retrieve the cluster document from Firestore.
    const clusterDoc = await firestore.collection('clusters').doc(clusterId).get();
    if (!clusterDoc.exists) {
      return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
    }
    const clusterData = clusterDoc.data();
    const { name, addresses } = clusterData || {};
    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      return NextResponse.json({ error: 'No addresses found in cluster' }, { status: 400 });
    }

    // 2) Aggregators for cluster-level PNL.
    let clusterTotalPnlUsd = 0;
    let clusterTotalUnrealizedPnlUsd = 0;
    const walletDetails: Array<{
      address: string;
      balanceUsd: number;
      pnlPerc: number;
      pnlUsd: number;
      unrealizedPnlUsd: number;
    }> = [];

    // 3) Map to aggregate top holdings across all wallets.
    const holdingsMap = new Map<string, {
      ca: string;
      symbol: string;
      name: string;
      imageUrl: string;
      valueUsd: number;
      boughtUsd: number;
      soldUsd: number;
      pnlUsd: number;
    }>();

    // 4) Structures to merge BFS data from each wallet.
    //    We'll unify addresses in mergedAddressesMap, and unify links in mergedLinksMap/Set.
    //    - mergedAddressesMap: address -> max volumeUsd
    //    - mergedLinksMap: "source->target" -> max volumeUsd
    const mergedAddressesMap = new Map<string, number>();
    const mergedLinksMap = new Map<string, number>();

    // 5) Process each wallet in the cluster.
    await Promise.all(addresses.map(async (walletAddress: string) => {
      try {
        // 5a) Get wallet PNL
        const pnl = await getWalletPnl(walletAddress);
        clusterTotalPnlUsd += pnl.pnlUsd;
        clusterTotalUnrealizedPnlUsd += pnl.unrealizedPnlUsd;

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
        //     This yields addresses + addressLinks discovered from that wallet.
        const { accounts: bfsAddresses, accountLinks: bfsLinks } =
          await getHighScoreAssociations(walletAddress, 1);

        // Merge BFS addresses (unify duplicates by storing max volume)
        for (const addrObj of bfsAddresses) {
          const { address, volumeUsd } = addrObj;
          const oldVol = mergedAddressesMap.get(address) || 0;
          if (volumeUsd > oldVol) {
            mergedAddressesMap.set(address, volumeUsd);
          }
        }

        // Merge BFS links (avoid duplicates by storing "source->target" in a map)
        for (const link of bfsLinks) {
          const key = `${link.source}->${link.target}`;
          const oldVol = mergedLinksMap.get(key) || 0;
          const volNum = parseFloat(link.volumeUsd || '0');
          if (volNum > oldVol) {
            mergedLinksMap.set(key, volNum);
          }
        }

      } catch (error) {
        console.error(`Error processing wallet ${walletAddress}:`, error);
      }
    }));

    // 6) Convert the aggregated holdings to array, sort, take top 30
    const aggregatedHoldings = Array.from(holdingsMap.values());
    aggregatedHoldings.sort((a, b) => (b.valueUsd + b.soldUsd + b.boughtUsd) - (a.valueUsd + a.soldUsd + a.boughtUsd));
    const topHoldings = aggregatedHoldings.slice(0, 30);

    // 7) Build BFS "associatedNetwork" from mergedAddressesMap + mergedLinksMap
    //    -> addresses: { address, volumeUsd }[]
    //    -> addressLinks: { source, target, volumeUsd }[]
    console.log(addresses)
    const mergedAddresses: Array<{ address: string; volumeUsd: number, level: number }> = [];
    for (const [addr, vol] of mergedAddressesMap.entries()) {
      const currentLevel = addresses.includes(addr) ? 1 : 999;
      mergedAddresses.push({ address: addr, volumeUsd: vol, level: currentLevel });
    }
    mergedAddresses.sort((a, b) => b.volumeUsd - a.volumeUsd);

    const mergedLinks: Array<{ source: string; target: string; volumeUsd: string }> = [];
    for (const [key, vol] of mergedLinksMap.entries()) {
      // key = "source->target"
      const [source, target] = key.split('->');
      mergedLinks.push({ source, target, volumeUsd: vol.toString() });
    }

    // 8) Build the final response
    const responseData = {
      id: clusterId,
      name,
      financials: {
        balanceUsd: 0, // TODO
        pnlPerc: 0, // TODO
        pnlUsd: clusterTotalPnlUsd,
        unrealizedPnlUsd: clusterTotalUnrealizedPnlUsd,
        holdings: topHoldings,
      },
      associations: {
        accounts: mergedAddresses,
        accountLinks: mergedLinks,
      },
      achievements: []
    };

    return NextResponse.json({data: responseData});
  } catch (error) {
    console.error('Error in GET /cluster/[cluster_id]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
    request: Request,
    { params }: { params: { clusterId: string } }
  ) {
    try {
      const clusterId = params.clusterId;
  
      // Parse the incoming JSON
      const { name, addresses } = await request.json();
  
      // Retrieve the current doc
      const clusterRef = firestore.collection('clusters').doc(clusterId);
      const snapshot = await clusterRef.get();
      if (!snapshot.exists) {
        return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
      }
  
      // Prepare updated fields. If name or addresses are missing, we won't overwrite them.
      const existingData = snapshot.data();
      const updatedDoc: any = {};
  
      if (typeof name === 'string') {
        updatedDoc.name = name;
      }
      if (Array.isArray(addresses)) {
        updatedDoc.addresses = addresses;
      }
  
      // If you want to require addresses or name to be present, you could do checks here
      // For now, we just allow partial update.
  
      await clusterRef.update(updatedDoc);
  
      return NextResponse.json({ status: 'ok', data: {updatedDoc} });
    } catch (error) {
      console.error('Error in PUT /cluster/[cluster_id]:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  }

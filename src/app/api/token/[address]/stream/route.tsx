import { NextResponse } from 'next/server';
import { getTopTokenHolders, buildClusters } from '@/lib/token';
import { getHighScoreAssociations } from '@/lib/wallet-associations';
import { getDdXyzScore, getRugCheckScore } from '@/lib/rug-score';
// import { abbreviateAddress } from '@/lib/formatting';

export async function GET(
  request: Request,
  { params }: { params: { address: string } }
) {
    const address = params.address;

    /* ───────────────── external calls ───────────────── */
    const [rugCheckInfo, ddXyzInfo] = await Promise.all([
      getRugCheckScore(address),
      getDdXyzScore(address),
    ]);
  
    let topHoldersResp: any = null;

    try {
      topHoldersResp = await getTopTokenHolders(address);
    } catch (err) {
      console.error('[SSE] → Error fetching top holders:', err);
    }

    try {
        topHoldersResp = await getTopTokenHolders(address);
    } catch (err) {
        console.error('[SSE] => Error fetching top holders:', err);
        // gotta handle somehow
        topHoldersResp = null;
    }

    /* ───────────────── helpers ───────────────── */
    const { readable, writable } = new TransformStream();
    const writer  = writable.getWriter();
    const encoder = new TextEncoder();
    const sseWrite = (line: string) =>
        writer.write(encoder.encode(`data: ${line}\n\n`));

    /* ───────────────── BFS + clusters ───────────────── */
    getHighScoreAssociations(
        topHoldersResp?.topHolders.map((x: any) => x.address?.address),
        1,
        sseWrite
    )
        .then((associations) => {
        // build clusters **after** BFS so we have full account + link lists
        const clusters = buildClusters(
            associations.accounts,        // full account list from BFS
            associations.accountLinks,    // full link list from BFS
            topHoldersResp?.tokenSupply,
            topHoldersResp?.topHolders
        );

        console.log(clusters);

        const finalData = {
            id: address,
            name:   topHoldersResp?.tokenName,
            symbol: topHoldersResp?.tokenSymbol,
            supply: topHoldersResp?.tokenSupply,
            clusters,
            rugCheckInfo,
            ddXyzInfo,
        };

        sseWrite(`FINAL_RESULT: ${JSON.stringify(finalData)}`);
        writer.close();
        })
        .catch((err) => {
        sseWrite(`ERROR: ${err.message}`);
        writer.close();
        });

    /* ───────────────── SSE response ───────────────── */
    return new NextResponse(readable, {
        headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        },
    });
}
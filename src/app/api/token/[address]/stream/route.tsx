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

    const riskInfo = await fetch(
        new URL(`/api/score/${address}`, process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'),
        { cache: 'no-store' }           // don’t serve a stale copy
      ).then(r => r.ok ? r.json() : null);
  
    // console.log(riskInfo);

    let topHoldersResp: any = null;

    try {
      topHoldersResp = await getTopTokenHolders(address);
    } catch (err) {
      console.error('[SSE] → Error fetching top holders:', err);
    }

    /* ───────────────── helpers ───────────────── */
    const { readable, writable } = new TransformStream();
    const writer  = writable.getWriter();
    const encoder = new TextEncoder();
    const sseWrite = (line: string) =>
        writer.write(encoder.encode(`data: ${line}\n\n`));

    /* ───────────────── BFS + clusters ───────────────── */
    getHighScoreAssociations(
        topHoldersResp?.topHolders.slice(0,69).map((x: any) => x.address?.address),
        1,
        sseWrite
    )
        .then(async (associations) => {
            // build clusters **after** BFS so we have full account + link lists
            let clusters = buildClusters(
                associations.accounts,        // full account list from BFS
                associations.accountLinks,    // full link list from BFS
                topHoldersResp?.tokenSupply,
                topHoldersResp?.topHolders
            );
            // filter out single wallets
            clusters = clusters.filter(x => x.accounts.length > 1);
            console.log(clusters.length);
            const resp = await fetch(
                new URL(`/api/ai/${address}`, process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'),
            ).then(r => r.ok ? r.json() : null);
            const aiSummary = resp.summary ?? [];

            const finalData = {
                id: address,
                name:   topHoldersResp?.tokenName,
                symbol: topHoldersResp?.tokenSymbol,
                supply: topHoldersResp?.tokenSupply,
                clusters,
                rugCheckInfo,
                ddXyzInfo,
                riskInfo,
                aiSummary
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
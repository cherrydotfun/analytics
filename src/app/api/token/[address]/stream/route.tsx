import { NextResponse } from 'next/server';
import { getTopTokenHolders } from '@/lib/token';
import { getHighScoreAssociations } from '@/lib/wallet-associations';
import { getDdXyzScore, getRugCheckScore } from '@/lib/rug-score';
// import { abbreviateAddress } from '@/lib/formatting';

export async function GET(
  request: Request,
  { params }: { params: { address: string } }
) {
  const address = params.address;
  const rugCheckInfo = await getRugCheckScore(address);
  const ddXyzInfo = await getDdXyzScore(address);
  console.log(rugCheckInfo, ddXyzInfo);

  let topHoldersResp;
  try {
    topHoldersResp = await getTopTokenHolders(address);
  } catch (err) {
    console.error('[SSE] => Error fetching top holders:', err);
    // gotta handle somehow
    topHoldersResp = null;
  }

  // 2) Create a TransformStream to write SSE logs
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // Helper to send SSE lines
  function sseWrite(line: string) {
    const chunk = `data: ${line}\n\n`;
    writer.write(encoder.encode(chunk));
  }

  // 3) Kick off BFS with a logging callback
  getHighScoreAssociations(topHoldersResp?.topHolders.map(x => x.address?.address), 1, (logLine) => {
  // getHighScoreAssociations(topHoldersResp?.topHolders.slice(0,3).map(x => x.address?.address), 0, (logLine) => {
    sseWrite(logLine);
  })
    .then((bfsResult) => {
      // BFS is done => send final JSON containing BFS + PNL data
      const finalData = {
        id: address,
        name: topHoldersResp?.tokenName,
        symbol: topHoldersResp?.tokenSymbol,
        supply: topHoldersResp?.tokenSupply,
        associations: bfsResult,
        rugCheckInfo,
        ddXyzInfo,
      };
      sseWrite(`FINAL_RESULT: ${JSON.stringify(finalData)}`);

      // Close the stream
      writer.close();
    })
    .catch((err) => {
      sseWrite(`ERROR: ${err.message}`);
      writer.close();
    });

  // 4) Return SSE response
  return new NextResponse(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

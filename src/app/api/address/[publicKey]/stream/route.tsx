import { NextResponse } from 'next/server';
import { getHighScoreAssociations } from '@/lib/wallet-associations';
import { getWalletPnl } from '@/lib/wallet-pnl';
import { abbreviateAddress } from '@/lib/formatting';

export async function GET(
  request: Request,
  { params }: { params: { publicKey: string } }
) {
  const address = params.publicKey;

  // 1) getWalletPnl first (fast, so no streaming needed)
  let pnlData;
  try {
    pnlData = await getWalletPnl(address);
  } catch (err) {
    console.error('[SSE] => Error fetching PNL:', err);
    // If PNL fails, you might bail out entirely or set it to null
    pnlData = null;
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
  getHighScoreAssociations(address, 2, (logLine) => {
    sseWrite(logLine);
  })
    .then((bfsResult) => {
      // BFS is done => send final JSON containing BFS + PNL data
      const finalData = {
        id: address,
        name: abbreviateAddress(address),
        financials: pnlData,
        associations: bfsResult,
        achievements: []
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

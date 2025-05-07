import { NextResponse } from 'next/server';
import {
  getTopTokenHolders,
  buildClusters,          // ← same helper used in stream route
} from '@/lib/token';
import { getHighScoreAssociations } from '@/lib/wallet-associations';
import { getDdXyzScore, getRugCheckScore } from '@/lib/rug-score';

export async function GET(
  _req: Request,
  { params }: { params: { address: string } }
) {
  const address = params.address;

  try {
    /* ─────────── parallel externals ─────────── */
    const [topHoldersResp, rugCheckInfo, ddXyzInfo] = await Promise.all([
      getTopTokenHolders(address),
      getRugCheckScore(address),
      getDdXyzScore(address),
    ]);

    /* ─────────── BFS over holders ───────────── */
    const associations = await getHighScoreAssociations(
      topHoldersResp.topHolders.map((h: any) => h.address.address),
      1
    );

    /* ─────────── clusters (balance & %) ─────── */
    const clusters = buildClusters(
      associations.accounts,
      associations.accountLinks,
      topHoldersResp.tokenSupply,
      topHoldersResp.topHolders
    );

    /* ─────────── final payload ──────────────── */
    const data = {
      id: address,
      name:   topHoldersResp.tokenName,
      symbol: topHoldersResp.tokenSymbol,
      supply: topHoldersResp.tokenSupply,
      clusters,
      rugCheckInfo,
      ddXyzInfo,
    };

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[GET /api/address] →', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

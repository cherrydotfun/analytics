import { NextResponse } from 'next/server';
import { getTopTokenHolders } from '@/lib/token';
import { getHighScoreAssociations } from '@/lib/wallet-associations';
import { abbreviateAddress } from '@/lib/formatting';
import { getDdXyzScore, getRugCheckScore } from '@/lib/rug-score';

export async function GET(
  request: Request,
  { params }: { params: { address: string } }
) {
  try {
    const address = params.address;

    const topHoldersResp = await getTopTokenHolders(address);

    // Retrieve associated wallets for the given address.
    const associations = await getHighScoreAssociations(topHoldersResp.topHolders.map(x => x.address?.address), 0);
    // const associations = await getHighScoreAssociations(topHoldersResp.topHolders.slice(0, 3).map(x => x.address?.address), 0);
    const rugCheckInfo = await getRugCheckScore(address);
    const ddXyzInfo = await getDdXyzScore(address);

    // Build and return the final response.
    const responseData = {
      id: address,
      name: topHoldersResp.tokenName,
      symbol: topHoldersResp.tokenSymbol,
      supply: topHoldersResp.tokenSupply,
      rugCheckInfo,
      ddXyzInfo,
      associations
    };

    console.log(rugCheckInfo, ddXyzInfo);

    return NextResponse.json({data: responseData});
  } catch (error) {
    console.error('Error in GET /address/[address_id]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { getTopTokenHolders } from '@/lib/token';
import { getHighScoreAssociations } from '@/lib/wallet-associations';
import { abbreviateAddress } from '@/lib/formatting';

export async function GET(
  request: Request,
  { params }: { params: { address: string } }
) {
  try {
    const address = params.address;

    const topHoldersResp = await getTopTokenHolders(address);

    // Retrieve associated wallets for the given address.
    const associations = await getHighScoreAssociations(topHoldersResp.topHolders.map(x => x.address?.address), 1);

    // Build and return the final response.
    const responseData = {
      id: address,
      name: topHoldersResp.tokenName,
      symbol: topHoldersResp.tokenSymbol,
      supply: topHoldersResp.tokenSupply,
      associations
    };

    return NextResponse.json({data: responseData});
  } catch (error) {
    console.error('Error in GET /address/[address_id]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
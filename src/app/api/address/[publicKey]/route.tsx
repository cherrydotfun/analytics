import { NextResponse } from 'next/server';
import { getWalletPnl } from '@/lib/wallet-pnl';
import { getHighScoreAssociations } from '@/lib/wallet-associations';
import { abbreviateAddress } from '@/lib/formatting';

export async function GET(
  request: Request,
  { params }: { params: { publicKey: string } }
) {
  try {
    const address = params.publicKey;

    // Fetch and aggregate PNL data for the given wallet.
    const pnlData = await getWalletPnl(address);

    // Retrieve associated wallets for the given address.
    const associations = await getHighScoreAssociations(address, 2);

    // Build and return the final response.
    const responseData = {
      id: address,
      name: abbreviateAddress(address),
      financials: pnlData,
      associations,
      achievements: []
    };

    return NextResponse.json({data: responseData});
  } catch (error) {
    console.error('Error in GET /address/[address_id]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
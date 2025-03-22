// src/app/api/address/[address_id]/route.ts

import { NextResponse } from 'next/server';
import { getWalletPnl } from '@/lib/wallet-pnl';
import { getHighScoreAssociations } from '@/lib/wallet-associations';

export async function GET(
  request: Request,
  { params }: { params: { address_id: string } }
) {
  try {
    const address = params.address_id;

    // Fetch and aggregate PNL data for the given wallet.
    const pnlData = await getWalletPnl(address);

    // Retrieve associated wallets for the given address.
    const associations = await getHighScoreAssociations(address, 2);

    // Build and return the final response.
    const responseData = {
      address,
      pnlData,
      associations,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error in GET /address/[address_id]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

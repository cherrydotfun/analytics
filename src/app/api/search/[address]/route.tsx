import { getAccountType } from '@/lib/solana';
import { NextResponse } from 'next/server';


export async function GET(
  request: Request,
  { params }: { params: { address: string } }
) {
  try {
    const address = params.address;

    const accountType = await getAccountType(address);

    return NextResponse.json({ type: accountType });

  } catch (error) {
    console.error('Error in GET /search/[address_id]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
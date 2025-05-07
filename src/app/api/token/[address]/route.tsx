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

    const percentagePerWallet = Object.fromEntries(
        (topHoldersResp?.topHolders ?? []).map(({ x }) => {
          const walletAddress = x?.address?.address;
          const balanceRaw   = x?.address?.balance ?? 0; 
          const supplyRaw    = topHoldersResp?.tokenSupply ?? 1; // fallback prevents ÷0
      
          // Convert both to BigInt without using literals like 0n / 1n
          const balance = BigInt(balanceRaw);
          const supply  = BigInt(supplyRaw);
      
          // Guard against missing address or zero supply
          if (!walletAddress || supply === BigInt(0)) {
            return [walletAddress ?? "", 0];
          }
      
          // 1) fraction  (0–1) → 2) percent (0–100) → 3) rounded to 2 dp
          const percent = Math.round((Number(balance) / Number(supply)) * 100 * 100) / 100;
          return [walletAddress, percent];
        })
      );

    // Retrieve associated wallets for the given address.
    const associations = await getHighScoreAssociations(topHoldersResp.topHolders.map(x => x.address?.address), 1);
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
      associations,
      percentagePerWallet
    };

    console.log(rugCheckInfo, ddXyzInfo);

    return NextResponse.json({data: responseData});
  } catch (error) {
    console.error('Error in GET /address/[address_id]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
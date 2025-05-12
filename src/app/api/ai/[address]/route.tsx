import { NextResponse } from 'next/server';
import { getTopTokenHolders } from '@/lib/token';
import { getWalletBalance } from '@/lib/wallet-balance';
// import { getWalletPnl } from '@/lib/wallet-pnl';
import { calculateWalletMetrics, getPnL } from '@/lib/wallet-metrics';
import { computeSellScore, sellLabel, sigmoid } from '@/lib/sell-score';
import { abbreviateAddress } from '@/lib/formatting';
import type { IHoldingsDetailed, IWalletMetrics } from '@/types/wallet';
import { Big } from 'big.js';

const KB_IP = process.env.CHERRY_KB;

export async function GET(
  _req: Request,
  { params }: { params: { address: string } }
) {
  try {
    const tokenAddress = params.address;

    const aiRes = await fetch(`${KB_IP}/getAiSummary?solAddress=${tokenAddress}`, {
      method: 'GET',
    });

    const { summary: summary } = aiRes.ok ? await aiRes.json() : { summary: null };
  
    return NextResponse.json({
      summary,
    });
  } catch (error) {
    console.error('Error in GET /address/[address]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
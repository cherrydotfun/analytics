/**
 * Fetch token holders
 */

const KB_IP = process.env.CHERRY_KB;

export async function getTopTokenHolders(address: string): Promise<{
    tokenName: string;
    tokenAddress: string;
    tokenSymbol: string;
    tokenSupply: number;
    topHolders: any,
  }> {
    console.log(`Fethcing top holders for ${address}...`);

    // We'll attempt up to 3 times
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(`${KB_IP}/getTokenHolders?solTokenAddress=${address}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch token holders for ${address}`);
        }
        const data = await res.json();
        
        let topHolders = [];
        let tokenName = '';
        let tokenAddress = '';
        let tokenSymbol = '';
        let tokenSupply = 0;

        if (data.token){
            tokenName = data.token.name;
            tokenSymbol = data.token.symbol;
            tokenAddress = data.token.identifier?.address;
        }

        if (data.topHolders.length){
            topHolders = data.topHolders;
        }

        console.log(`Fetched data for ${tokenName}: top ${topHolders.length} holders`);
        return { tokenName, tokenSymbol, tokenAddress, tokenSupply, topHolders};    
      } catch (err: any) {
        console.error(`getTopTokenHolders => Attempt ${attempt} failed for ${address}, error: ${err.message}`);

        if (attempt < 3) {
          console.log(`Retrying getTopTokenHolders for ${address} in 3s...`);
          await new Promise((res) => setTimeout(res, 3000)); // wait 3s
        } else {
          console.log(`All attempts exhausted for ${address}; throwing error`);
          throw new Error(`Failed to fetch top token holders for ${address}: ${err.message}`);
        }
      }
    }
  // theoretically never gets here
  throw new Error(`Unexpected logic flow for getTopTokenHolders: ${address}`);
}

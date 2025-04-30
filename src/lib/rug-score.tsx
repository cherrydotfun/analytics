interface IRisk {
    name: string,
    value: string,
    description: number,
    score: number,
    level: string
}

async function getRugCheckScore(address: string): Promise<{score_normalised: number, risks: IRisk[]} | null> {
    console.log(`Fethcing rugcheck score for ${address}...`);
    try {
      const res = await fetch(`https://api.rugcheck.xyz/v1/tokens/${address}/report/summary`);
      if (!res.ok) {
        throw new Error(`Failed to fetch rugcheck info for ${address}`);
      }
      const data = await res.json();
      return data
    } catch (err: any) {
      console.error(`getRugCheckScore => Attempt failed for ${address}, error: ${err.message}`);
      return null;
    }
}

async function getDdXyzScore(address: string): Promise<{overallRisk: number} | null> {
    console.log(`Fethcing dd.xyz score for ${address}...`);
    try {
      const res = await fetch(`https://api.webacy.com/addresses/${address}?chain=sol&show_low_risk=false`, {
        headers: {
          'accept': 'application/json',
          'x-api-key': process.env.WEBACY_API_KEY || ''
        }
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch dd.xyz info for ${address}`);
      }
      const data = await res.json();
      return data
    } catch (err: any) {
      console.error(`getDdXyzScore => Attempt failed for ${address}, error: ${err.message}`);
      return null;
    }
}

export { getRugCheckScore, getDdXyzScore };
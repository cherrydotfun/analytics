const KB_IP = process.env.CHERRY_KB;

function isValidSolanaAddress(address: string): boolean {
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
  return typeof address === 'string' &&
          address.length > 30 && // technically it could be even 1 character, there are many 43 char addresses
          address.length <= 44 &&
          base58Regex.test(address);
}

async function getAccountType(address: string): Promise<string> {
    console.log(`Fethcing account type for ${address}...`);
    try {
      const res = await fetch(`${KB_IP}/checkAddressType?solAddress=${address}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch wallet stats for ${address}`);
      }
      const data = await res.json();
      if (data.type === 'token') {
        return 'token';
      } else if (data.type === 'wallet') {
        return 'wallet';
      }
      return 'unknown';
    } catch (err: any) {
      console.error(`getAccountType => Attempt failed for ${address}, error: ${err.message}`);
      return 'unknown';
    }
}

  
export { isValidSolanaAddress, getAccountType }
const KB_IP = process.env.CHERRY_KB;

/**
 * Compute the association score for a related wallet.
 * 
 * Scoring rules:
 * 1. If the wallet has both received and sent funds → score 100.
 * 2. If the wallet has only sent funds → score 80.
 * 3. If only received funds:
 *    - < $1 → score 1.
 *    - ≥ $1 and < $100 → score 30.
 *    - ≥ $100 → score 80.
 * 4. Bonus: if total transactions > 1 add +10, > 3 add extra +10 (capped at 100).
 */
export function computeAssociationScore(rel: any): number {
  let score = 0;
  const inTx = rel.in?.transactionCount || 0;
  const outTx = rel.out?.transactionCount || 0;
  const inUsd = parseFloat(rel.in?.totalUsd || "0");

  if (inTx > 0 && outTx > 0) {
    score = 100;
  } else if (outTx > 0 && inTx === 0) {
    score = 80;
  } else if (inTx > 0 && outTx === 0) {
    if (inUsd < 1) {
      score = 1;
    } else if (inUsd >= 1 && inUsd < 100) {
      score = 30;
    } else {
      score = 80;
    }
  }

  const totalTx = inTx + outTx;
  if (totalTx > 1) {
    score += 10;
  }
  if (totalTx > 3) {
    score += 10;
  }
  return score > 100 ? 100 : score;
}

/**
 * Fetch associated wallets from the internal API for a given wallet address.
 * Filters out wallets with knownEntity set to true.
 */
export async function fetchRelativeWallets(address: string): Promise<any[]> {
  console.log(`Fethcing associated wallets for ${address}...`);
  const res = await fetch(`${KB_IP}/getRelativeWallets?solAddress=${address}`);
  if (!res.ok) {
    console.error(`Failed to fetch relative wallets for ${address}`);
    return [];
  }
  const data = await res.json();
  console.log(`Found ${data.length} related addresses for ${address} wallet`);
  return data.filter((item: any) => !item.knownEntity);
}

/**
 * Recursively get associations for a given wallet.
 * - Limits recursion to a maximum depth of 2.
 * - Only includes up to 10 associated wallets per level (sorted by score descending).
 * - For each wallet, if its score is high enough (>= 80) and we haven't reached max depth,
 *   recursively fetch one level of nested associations.
 */
export async function getAssociations(address: string, depth: number = 1): Promise<any[]> {
  const maxDepth = 2;
  const nestedThreshold = 80;
  
  // Fetch associated wallets.
  const associated = await fetchRelativeWallets(address);
  
  // Compute score for each and sort in descending order.
  const scoredAssociations = associated.map(assoc => {
    const score = computeAssociationScore(assoc);
    console.log(`${address} counted association score: ${assoc?.entity_id} - ${score}`)
    return { ...assoc, score };
  }).sort((a, b) => b.score - a.score);
  
  // Limit to a maximum of 10 addresses.
  const limitedAssociations = scoredAssociations.slice(0, 10);
  
  // For each wallet, if we haven't reached max depth and the score is high, fetch nested associations.
  for (const assoc of limitedAssociations) {
    if (depth < maxDepth && assoc.score >= nestedThreshold) {
      assoc.subAssociations = await getAssociations(assoc.address, depth + 1);
    }
  }
  
  return limitedAssociations;
}

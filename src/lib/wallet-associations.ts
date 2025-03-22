const KB_IP = process.env.CHERRY_KB;

/**
 * 1) Score Calculation
 */
export function computeAssociationScore(rel: any): number {
  let score = 0;
  const inTx = rel.in?.transactionCount || 0;
  const outTx = rel.out?.transactionCount || 0;
  const inUsd = parseFloat(rel.in?.totalUsd || '0');
  const outUsd = parseFloat(rel.out?.totalUsd || '0');

  // Base logic
  if (inTx > 0 && outTx > 0) {
    score = 100;
  } else if (outTx > 1 && inTx === 0) {
    score = 30;
  } else if (inTx > 0 && outTx === 0) {
    if (inUsd < 1) {
      score = 1;
    } else if (inUsd < 100) {
      score = 20;
    } else {
      score = 80;
    }
  }

  const totalTx = inTx + outTx;
  const totalUsd = inUsd + outUsd;

  // Bonus logic
  if (totalTx > 1 && totalUsd > 10) {
    score += 10;
  }
  if (totalTx > 3 && totalUsd > 10) {
    score += 20;
  }
  if (totalTx > 10 && totalUsd > 10) {
    score += 100;
  }

  return score > 100 ? 100 : score;
}

/**
 * 2) Fetch Relative Wallets
 */
async function fetchRelativeWallets(address: string): Promise<any[]> {
  console.log(`[fetchRelativeWallets] => Fetching for ${address} ...`);
  const res = await fetch(`${KB_IP}/getRelativeWallets?solAddress=${address}`);
  if (!res.ok) {
    console.error(`[fetchRelativeWallets] => Failed for ${address}`);
    return [];
  }
  const data = await res.json();
  console.log(`[fetchRelativeWallets] => Found ${data.length} for ${address}`);

  // Exclude wallets that match 'address' itself or known entities
  return data.filter((x: any) => x.address !== address && !x.knownEntity);
}

/**
 * 3) BFS Approach
 *
 * @param rootAddress The root wallet
 * @param maxDepth The normal maximum depth (default=2)
 * 
 * If a parent's child has score=100, we allow going one level deeper (maxDepth+1).
 */
export async function getHighScoreAssociations(
  rootAddress: string,
  maxDepth = 1
): Promise<{
  addresses: Array<{ address: string; volumeUsd: number; level: number }>;
  addressLinks: Array<{ source: string; target: string; volumeUsd: string }>;
}> {
  console.log(`\n[getHighScoreAssociations] => BFS starting from root: ${rootAddress}, maxDepth=${maxDepth}`);

  // BFS queue
  const queue: Array<{
    address: string;
    depth: number;
    parentAddress?: string;
    parentScore?: number;
  }> = [];

  // We'll store final data here:
  // addressesMap => address -> { volumeUsd, level }
  const addressesMap = new Map<string, { volumeUsd: number; level: number }>();
  const addressLinks: Array<{ source: string; target: string; volumeUsd: string }> = [];

  // We track how many fetches we've done, skip if over 500
  let fetchCount = 0;

  // visited => addresses we've already fetched to avoid re-fetching
  const visited = new Set<string>();

  // Start with root in queue
  queue.push({
    address: rootAddress,
    depth: 0,
    parentAddress: undefined,
    parentScore: 999, // artificially high so links from root are always created
  });

  // Put root into addressesMap with level=0, volumeUsd=0
  addressesMap.set(rootAddress, { volumeUsd: 0, level: 0 });

  while (queue.length > 0) {
    const item = queue.shift()!;
    const { address, depth, parentAddress, parentScore } = item;

    if (visited.has(address)) {
      console.log(`[BFS] => Already visited ${address}, skipping further fetch`);
      continue;
    }
    visited.add(address);

    if (fetchCount >= 500) {
      console.log(`[BFS] => Reached 500 fetch limit, stopping BFS`);
      break;
    }

    console.log(`[BFS] => Processing address=${address}, depth=${depth}, parent=${parentAddress}, parentScore=${parentScore}`);
    const associated = await fetchRelativeWallets(address);
    fetchCount++;

    if (associated.length > 200) {
      console.log(`[BFS] => Address ${address} is spammy (${associated.length} > 200), skip it entirely`);
      continue;
    }

    // Compute score + volume=assoc.all.totalUsd, sort descending, take top 20
    const scored = associated.map((r) => {
      const s = computeAssociationScore(r);
      const assocVolumeUsd = parseFloat(r.all?.totalUsd || '0');
      return {
        address: r.entity_id,
        score: s,
        volumeUsd: assocVolumeUsd,
        in: r.in,
        out: r.out,
        all: r.all,
      };
    });
    scored.sort((a, b) => b.score - a.score);
    const top20 = scored.slice(0, 20);

    console.log(`[BFS] => Found ${associated.length}, took top ${top20.length} for ${address}`);

    for (const child of top20) {
      // Skip if < $1 volume
      if (child.volumeUsd < 1) {
        console.log(`[BFS] => Child ${child.address} volumeUsd=${child.volumeUsd} <1, skip.`);
        continue;
      }

      // Only proceed if child.score >=90
      if (child.score < 90) {
        console.log(`[BFS] => Child ${child.address} has score=${child.score} <90, skip.`);
        continue;
      }

      console.log(`[BFS] => Child discovered: address=${child.address}, score=${child.score}, volume=${child.volumeUsd}`);
      const childDepth = depth + 1;

      // Update addressesMap if needed
      const oldEntry = addressesMap.get(child.address);
      if (!oldEntry) {
        addressesMap.set(child.address, { volumeUsd: child.volumeUsd, level: childDepth });
        console.log(`[BFS] => New address => ${child.address}, level=${childDepth}, vol=${child.volumeUsd}`);
      } else {
        // If discovered at a smaller depth => keep that level
        // If discovered at same or bigger depth but bigger volume => update volume
        if (childDepth < oldEntry.level) {
          addressesMap.set(child.address, { volumeUsd: child.volumeUsd, level: childDepth });
          console.log(`[BFS] => Found smaller depth for ${child.address} => level=${childDepth}, vol=${child.volumeUsd}`);
        } else if (child.volumeUsd > oldEntry.volumeUsd) {
          addressesMap.set(child.address, { volumeUsd: child.volumeUsd, level: oldEntry.level });
          console.log(`[BFS] => Found bigger volume for ${child.address}, oldVol=${oldEntry.volumeUsd}, newVol=${child.volumeUsd}`);
        }
      }

      // If we have a parent, and parent's score >=80 => create link
      if (parentAddress && (parentScore ?? 0) >= 80) {
        console.log(`[BFS] => Link: ${parentAddress} -> ${child.address}, volume=${child.volumeUsd}`);
        addressLinks.push({
          source: parentAddress,
          target: child.address,
          volumeUsd: child.volumeUsd.toString(),
        });
      }

      // Determine if we can go deeper
      //  - If child.score=100 => allow depth up to (maxDepth + 1)
      //  - Else child.score>=90 => allow depth up to maxDepth
      if (child.score === 100 && childDepth < (maxDepth + 1)) {
        queue.push({
          address: child.address,
          depth: childDepth,
          parentAddress: child.address,
          parentScore: child.score
        });
      } else if (child.score >= 90 && childDepth < maxDepth) {
        queue.push({
          address: child.address,
          depth: childDepth,
          parentAddress: child.address,
          parentScore: child.score
        });
      }
    }
  }

  // Build final addresses array
  const addresses: Array<{ address: string; volumeUsd: number; level: number }> = [];
  for (const [addr, data] of addressesMap.entries()) {
    addresses.push({
      address: addr,
      volumeUsd: data.volumeUsd,
      level: data.level,
    });
  }

  // Sort by ascending level
  addresses.sort((a, b) => a.level - b.level);

  console.log(`[BFS] => BFS completed. Found ${addresses.length} addresses, ${addressLinks.length} links.`);
  return { addresses, addressLinks };
}

const KB_IP = process.env.CHERRY_KB;

/**
 * 1) Score Calculation
 */
export function computeAssociationScore(rel: any): number {
  let score = 0;
  const inTx = rel.in?.transactionCount || 0;
  const outTx = rel.out?.transactionCount || 0;
  const inUsd = parseFloat(rel.in?.totalUsd || "0");
  const outUsd = parseFloat(rel.out?.totalUsd || "0");

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
 * 2) Fetch Relative Wallets (skipping knownEntity, skipping self)
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
  return data.filter((x: any) => x.address !== address && !x.knownEntity);
}

/**
 * 3) BFS Approach with "level" tracking:
 *   - The root is depth=0 (we can call that "level 0" or "root").
 *   - Its children are depth=1 => "1st level connection"
 *   - Their children are depth=2 => "2nd level"
 *   - Up to depth=3 => "3rd level"
 *
 * Additional rules:
 *   - Skip if volumeUsd < 1
 *   - Only add (and explore) addresses with score >= 90
 *   - skip if associated length > 200 (spam)
 *   - up to 500 fetch calls
 *   - if parent's child is 100 => we allow depth=3, else depth=2 if >=90
 */
export async function getHighScoreAssociations(
  rootAddress: string
): Promise<{
  addresses: Array<{ address: string; volumeUsd: number; level: number }>;
  accountLinks: Array<{ source: string; target: string; volumeUsd: string }>;
}> {
  console.log(`\n[getHighScoreAssociations] => BFS starting from root: ${rootAddress}`);

  // Our BFS queue
  const queue: Array<{
    address: string;
    depth: number;
    parentAddress?: string;
    parentScore?: number;
  }> = [];

  // We'll store final data here
  // addressesMap => address -> { volumeUsd, level }, keeping track of the minimal level at which we found it
  const addressesMap = new Map<string, { volumeUsd: number; level: number }>();
  const accountLinks: Array<{ source: string; target: string; volumeUsd: string }> = [];

  // We track how many fetches we've done, skip if over 500
  let fetchCount = 0;

  // visited => addresses we've already fetched
  const visited = new Set<string>();

  // Start with root
  queue.push({
    address: rootAddress,
    depth: 0,
    parentAddress: undefined,
    parentScore: 999, // artificially high so we always link from root
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

    console.log(
      `\n[BFS] => Processing address=${address}, depth=${depth}, parent=${parentAddress}, parentScore=${parentScore}`
    );

    const associated = await fetchRelativeWallets(address);
    fetchCount++;

    if (associated.length > 200) {
      console.log(`[BFS] => Address ${address} is spammy (${associated.length} > 200), skip it entirely`);
      continue;
    }

    // Sort each associated by computed score, then slice top 20
    const scored = associated.map((r) => {
      const s = computeAssociationScore(r);
      const inUsd = parseFloat(r.in?.totalUsd || '0');
      const outUsd = parseFloat(r.out?.totalUsd || '0');
      const volumeUsd = inUsd + outUsd;
      return {
        address: r.entity_id,
        score: s,
        volumeUsd,
        in: r.in,
        out: r.out,
      };
    });
    scored.sort((a, b) => b.score - a.score);
    const top20 = scored.slice(0, 20);

    console.log(`[BFS] => Found ${associated.length}, took top ${top20.length} for ${address}`);

    // For each of the top 20
    for (const child of top20) {
      // Skip if < $1 volume
      if (child.volumeUsd < 1) {
        console.log(`[BFS] => Child ${child.address} has volumeUsd=${child.volumeUsd} <1, skipping.`);
        continue;
      }

      // Also skip if child's score <90
      if (child.score < 90) {
        console.log(`[BFS] => Child ${child.address} has score=${child.score} <90, skipping.`);
        continue;
      }

      console.log(
        `[BFS] => Child discovered: address=${child.address}, score=${child.score}, volumeUsd=${child.volumeUsd}`
      );

      // The child's BFS depth is (depth + 1)
      const childDepth = depth + 1;

      // If not in addressesMap yet, or we found it at a smaller depth, update
      const oldEntry = addressesMap.get(child.address);
      if (!oldEntry || childDepth < oldEntry.level) {
        addressesMap.set(child.address, { volumeUsd: child.volumeUsd, level: childDepth });
        console.log(`[BFS] => Updating addressesMap for ${child.address}, level=${childDepth}, volume=${child.volumeUsd}`);
      } else if (oldEntry && child.volumeUsd > oldEntry.volumeUsd) {
        // If we found a bigger volume for the same address at the same or bigger depth, update
        // (or you might keep the sum, but let's do max)
        addressesMap.set(child.address, { volumeUsd: child.volumeUsd, level: oldEntry.level });
        console.log(`[BFS] => Found bigger volume for same address ${child.address}, oldVol=${oldEntry.volumeUsd}, newVol=${child.volumeUsd}`);
      }

      // If we have a parent, and parentScore >=80, we build a link
      // (or if you want strictly parentScore===100, you can change that)
      if (parentAddress && (parentScore ?? 0) >= 80) {
        console.log(`[BFS] => Creating link: source=${parentAddress}, target=${child.address}, volumeUsd=${child.volumeUsd}`);
        accountLinks.push({
          source: parentAddress,
          target: child.address,
          volumeUsd: child.volumeUsd.toString(),
        });
      }

      // Depth logic: if parent's child is 100 => allow up to depth=3, else if parent's child >=90 => up to depth=2
      if (childDepth < 3 && child.score === 100) {
        // push next level
        console.log(`[BFS] => Pushing child=${child.address} to queue with depth=${childDepth}, score=100`);
        queue.push({
          address: child.address,
          depth: childDepth,
          parentAddress: child.address,
          parentScore: child.score
        });
      } else if (childDepth < 2 && child.score >= 90) {
        console.log(`[BFS] => Pushing child=${child.address} to queue with depth=${childDepth}, score>=90`);
        queue.push({
          address: child.address,
          depth: childDepth,
          parentAddress: child.address,
          parentScore: child.score
        });
      }
    }
  }

  // Finally, build the addresses array with { address, volumeUsd, level }
  const addresses: Array<{ address: string; volumeUsd: number; level: number }> = [];
  for (const [addr, data] of addressesMap.entries()) {
    addresses.push({
      address: addr,
      volumeUsd: data.volumeUsd,
      level: data.level
    });
  }

  addresses.sort((a, b) => a.level - b.level);

  console.log(`[BFS] => Completed BFS. Found ${addresses.length} addresses, ${accountLinks.length} links.`);

  return { addresses, accountLinks };
}

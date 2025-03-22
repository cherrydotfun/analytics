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
 * 3) BFS Approach with "level" tracking and using assoc.all.totalUsd as volume:
 *   - The root is depth=0 (level=0).
 *   - Its children are depth=1 => level=1, etc., up to level=3 if score=100.
 *
 * Additional rules:
 *   - Skip if assoc.all.totalUsd < 1
 *   - Only add (and explore) addresses with score >= 90
 *   - skip if associated length > 200 (spam)
 *   - up to 500 fetch calls
 *   - if parent's child is 100 => we allow depth=3, else if parent's child >=90 => depth=2
 */
export async function getHighScoreAssociations(
  rootAddress: string
): Promise<{
  addresses: Array<{ address: string; volumeUsd: number; level: number }>;
  accountLinks: Array<{ source: string; target: string; volumeUsd: string }>;
}> {
  console.log(`\n[getHighScoreAssociations] => BFS starting from root: ${rootAddress}`);

  // BFS queue
  const queue: Array<{
    address: string;
    depth: number;
    parentAddress?: string;
    parentScore?: number;
  }> = [];

  // We'll store final data here:
  // addressesMap => address -> { volumeUsd, level }
  //   volumeUsd is the maximum we've seen for that address
  //   level is the smallest depth at which we discovered that address
  const addressesMap = new Map<string, { volumeUsd: number; level: number }>();
  const accountLinks: Array<{ source: string; target: string; volumeUsd: string }> = [];

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
      // Here is the crucial change: we use r.all?.totalUsd as the volume.
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

      // The child's BFS depth is depth + 1
      const childDepth = depth + 1;

      // If not in addressesMap yet, or discovered at a smaller depth, update
      const oldEntry = addressesMap.get(child.address);
      if (!oldEntry) {
        addressesMap.set(child.address, {
          volumeUsd: child.volumeUsd,
          level: childDepth,
        });
        console.log(
          `[BFS] => Adding to addressesMap: ${child.address}, level=${childDepth}, vol=${child.volumeUsd}`
        );
      } else {
        // If we found it at a smaller depth before, keep that level.
        // But if the new volume is bigger, update it
        if (childDepth < oldEntry.level) {
          addressesMap.set(child.address, {
            volumeUsd: child.volumeUsd,
            level: childDepth,
          });
          console.log(
            `[BFS] => Found smaller depth for ${child.address} => level=${childDepth}, vol=${child.volumeUsd}`
          );
        } else if (child.volumeUsd > oldEntry.volumeUsd) {
          addressesMap.set(child.address, {
            volumeUsd: child.volumeUsd,
            level: oldEntry.level,
          });
          console.log(
            `[BFS] => Found bigger volume for same address ${child.address}, oldVol=${oldEntry.volumeUsd}, newVol=${child.volumeUsd}`
          );
        }
      }

      // If we have a parent, and parentScore >=80, we create a link
      if (parentAddress && (parentScore ?? 0) >= 80) {
        console.log(
          `[BFS] => Creating link: source=${parentAddress}, target=${child.address}, volumeUsd=${child.volumeUsd}`
        );
        accountLinks.push({
          source: parentAddress,
          target: child.address,
          volumeUsd: child.volumeUsd.toString(),
        });
      }

      // Depth logic: allow up to level=3 if child=100, else up to level=2 if child≥90
      if (childDepth < 3 && child.score === 100) {
        // push next level
        console.log(
          `[BFS] => child=${child.address} => pushing to queue depth=${childDepth}, score=100`
        );
        queue.push({
          address: child.address,
          depth: childDepth,
          parentAddress: child.address,
          parentScore: child.score,
        });
      } else if (childDepth < 2 && child.score >= 90) {
        console.log(
          `[BFS] => child=${child.address} => pushing to queue depth=${childDepth}, score>=90`
        );
        queue.push({
          address: child.address,
          depth: childDepth,
          parentAddress: child.address,
          parentScore: child.score,
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

  // Sort by ascending level so root is first, then children, etc.
  addresses.sort((a, b) => a.level - b.level);

  console.log(
    `[BFS] => Completed BFS. Found ${addresses.length} addresses, ${accountLinks.length} links.`
  );

  return { addresses, accountLinks };
}

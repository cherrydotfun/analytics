const KB_IP = process.env.CHERRY_KB;

/**
 * 1) Compute association score
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
 *    Now includes up to 2 retries (3 attempts total),
 *    waiting 3 seconds between each retry if fetch fails or !res.ok.
 */
async function fetchRelativeWallets(address: string, onLog?: (msg: string) => void): Promise<any[]> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    onLog?.(`[Fetching Relative Wallet Data] => Attempt ${attempt} for ${address} ...`);
    try {
      const res = await fetch(`${KB_IP}/getRelativeWallets?solAddress=${address}`);
      if (!res.ok) {
        throw new Error(`HTTP status: ${res.status}`);
      }
      const data = await res.json();
      onLog?.(`[Fetching Relative Wallet Data] => Found ${data.length} for ${address} on attempt ${attempt}`);

      // Exclude wallets that match 'address' itself or known entities
      return data.filter((x: any) => x.address !== address && !x.knownEntity);
    } catch (err: any) {
      onLog?.(`[Fetching Relative Wallet Data] => Attempt ${attempt} failed for ${address}, error: ${err.message}`);
      if (attempt < 3) {
        onLog?.(`[Fetching Relative Wallet Data] => Retrying in 3s...`);
        await new Promise(res => setTimeout(res, 3000)); // wait 3s
      } else {
        onLog?.(`[Fetching Relative Wallet Data] => Gave up after 3 attempts for ${address}`);
        return [];
      }
    }
  }
  // Should never reach here, but just in case
  return [];
}

/**
 * 3) BFS Approach with optional 'onLog' callback for streaming logs.
 *
 * @param rootAddress The root wallet address.
 * @param maxDepth The normal max depth (default=1).
 * @param onLog Optional callback for streaming logs; if provided, we call onLog(msg) for each log line.
 *
 * If a child's score=100, we allow going one level deeper than maxDepth (i.e., maxDepth+1).
 */
export async function getHighScoreAssociations(
  rootAddress: string,
  maxDepth = 1,
  onLog?: (msg: string) => void
): Promise<{
  accounts: Array<{ address: string; volumeUsd: number; level: number }>;
  accountLinks: Array<{ source: string; target: string; volumeUsd: string }>;
}> {
  const log = (msg: string) => {
    onLog?.(msg);
    // If you also want console logs, uncomment:
    // console.log(msg);
  };

  log(`\n[Counting Relevance Score] => BFS from root: ${rootAddress}, maxDepth=${maxDepth}`);

  // BFS queue
  const queue: Array<{
    address: string;
    depth: number;
    parentAddress?: string;
    parentScore?: number;
  }> = [];

  // We'll store final BFS data here:
  const accountsMap = new Map<string, { volumeUsd: number; level: number }>();
  const accountLinks: Array<{ source: string; target: string; volumeUsd: string }> = [];

  // We track how many fetches we've done, skip if over 500
  let fetchCount = 0;

  // visited => addresses we've already fetched
  const visited = new Set<string>();

  // Start with root in queue
  queue.push({
    address: rootAddress,
    depth: 0,
    parentAddress: undefined,
    parentScore: 999, // artificially high => root can always link to children
  });

  // Put root into accountsMap with level=0, volumeUsd=0
  accountsMap.set(rootAddress, { volumeUsd: 0, level: 0 });

  while (queue.length > 0) {
    const item = queue.shift()!;
    const { address, depth, parentAddress, parentScore } = item;

    if (visited.has(address)) {
      log(`[BFS] => Already visited ${address}, skipping fetch`);
      continue;
    }
    visited.add(address);

    if (fetchCount >= 500) {
      log(`[BFS] => Reached 500 fetch limit, stopping BFS`);
      break;
    }

    log(`[BFS] => Processing address=${address}, depth=${depth}, parent=${parentAddress}, parentScore=${parentScore}`);
    const associated = await fetchRelativeWallets(address, onLog);
    fetchCount++;

    if (associated.length > 200) {
      log(`[BFS] => Address ${address} is spammy (${associated.length}), skipping entirely`);
      continue;
    }

    // Map each association to a score + volume from all.totalUsd
    const scored = associated.map((r) => {
      const s = computeAssociationScore(r);
      const assocVolumeUsd = parseFloat(r.all?.totalUsd || '0');
      return {
        address: r.entity_id,  // or r.address if you prefer
        score: s,
        volumeUsd: assocVolumeUsd,
      };
    });

    // Sort by descending score, limit to top 20
    scored.sort((a, b) => b.score - a.score);
    const top20 = scored.slice(0, 20);

    log(`[BFS] => Found ${associated.length}, took most relative addresses by volume for ${address}`);

    for (const child of top20) {
      if (child.volumeUsd < 1) {
        log(`[BFS] => Child ${child.address} has low volumeUsd=${child.volumeUsd}, skip.`);
        continue;
      }
      if (child.score < 90) {
        log(`[BFS] => Child ${child.address} has low score=${child.score}, skip.`);
        continue;
      }

      log(`[BFS] => Child discovered: address=${child.address}, score=${child.score}, volume=${child.volumeUsd}`);
      const childDepth = depth + 1;

      // Update accountsMap if needed
      const oldEntry = accountsMap.get(child.address);
      if (!oldEntry) {
        accountsMap.set(child.address, { volumeUsd: child.volumeUsd, level: childDepth });
        log(`[BFS] => New address => ${child.address}, level=${childDepth}, vol=${child.volumeUsd}`);
      } else {
        // If discovered at smaller depth => keep that. If bigger volume => update volume
        if (childDepth < oldEntry.level) {
          accountsMap.set(child.address, { volumeUsd: child.volumeUsd, level: childDepth });
          log(`[BFS] => Found smaller depth for ${child.address} => level=${childDepth}, vol=${child.volumeUsd}`);
        } else if (child.volumeUsd > oldEntry.volumeUsd) {
          accountsMap.set(child.address, { volumeUsd: (oldEntry.volumeUsd + child.volumeUsd), level: oldEntry.level });
          log(`[BFS] => Found more volume for ${child.address}, vol=${child.volumeUsd}`);
        }
      }

      // If we have a parent with score≥80 => create a link
      if (parentAddress && (parentScore ?? 0) >= 80) {
        log(`[BFS] => Link: ${parentAddress} -> ${child.address}, volume=${child.volumeUsd}`);
        accountLinks.push({
          source: parentAddress,
          target: child.address,
          volumeUsd: child.volumeUsd.toString(),
        });
      }

      // BFS depth logic:
      // If child's score=100 => allow (maxDepth+1), else if≥90 => up to maxDepth
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

  // Convert accountsMap -> final array
  const accounts: Array<{ address: string; volumeUsd: number; level: number }> = [];
  for (const [addr, data] of accountsMap.entries()) {
    accounts.push({
      address: addr,
      volumeUsd: data.volumeUsd,
      level: data.level,
    });
  }
  // Sort by ascending level
  accounts.sort((a, b) => a.level - b.level);

  log(`[BFS] => BFS completed. Found ${accounts.length} addresses, and ${accountLinks.length} links.`);
  return { accounts, accountLinks };
}

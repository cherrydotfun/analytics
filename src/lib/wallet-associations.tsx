const KB_IP = process.env.CHERRY_KB;
// number of workers to collect data
const MAX_PARALLEL = 15;

/**
 * 1) Compute association score
 */
export function computeAssociationScore(rel: any): number {
  let score = 0;
  const inTx = rel.in?.transactionCount || 0;
  const outTx = rel.out?.transactionCount || 0;
  const inUsd = parseFloat(rel.in?.totalUsd || '0');
  const outUsd = parseFloat(rel.out?.totalUsd || '0');

  const totalTx = inTx + outTx;
  const totalUsd = inUsd + outUsd;

  // Base logic
  if (inTx > 0 && outTx > 0) {
    score = 100;
  } else if (outTx >= 1 && inTx === 0) {
    if (totalUsd < 500 && (totalUsd > 10)){
      score = 70;
    } else if ((totalUsd >= 500) && (totalUsd <= 2000)){
      score = 80;
    } else if (totalUsd > 2000){
      score = 100;
    } else {
      score = 40;
    }
  } else if (inTx > 0 && outTx === 0) {
    if (inUsd < 1) {
      score = 1;
    } else if (inUsd < 100) {
      score = 20;
    } else {
      score = 80;
    }
  }


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
  for (let attempt = 1; attempt <= 1; attempt++) {
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
        onLog?.(`[Fetching Relative Wallet Data] => Retrying in 1s...`);
        await new Promise(res => setTimeout(res, 1000)); // wait 3s
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
 * @param rootAddresses One root address **or** an array of root addresses.
 * @param maxDepth The normal max depth (default=1).
 * @param onLog Optional callback for streaming logs; if provided, we call onLog(msg) for each log line.
 *
 * If a child's score=100, we allow going one level deeper than maxDepth (i.e., maxDepth+1).
 */
export async function getHighScoreAssociations(
  rootAddresses: string | string[],
  maxDepth = 1,
  onLog?: (msg: string) => void
): Promise<{
  accounts: { address: string; volumeUsd: number; level: number }[];
  accountLinks: { source: string; target: string; volumeUsd: string }[];
}> {
  const roots = Array.isArray(rootAddresses) ? rootAddresses : [rootAddresses];
  const log = (m: string) => {
    onLog?.(m);
    console.log(m);
  };

  log(
    `\n[Counting Relevance Score] => BFS from root(s): ${roots.join(
      ', '
    )}, maxDepth=${maxDepth}`
  );

  const queue: QueueItem[] = [];
  const accountsMap = new Map<string, { volumeUsd: number; level: number }>();
  const accountLinks: { source: string; target: string; volumeUsd: string }[] =
    [];
  const visited = new Set<string>();

  for (const r of roots) {
    queue.push({ address: r, depth: 0, parentScore: 999, parentAddress:r });
    accountsMap.set(r, { volumeUsd: 1000, level: 0 });
  }

  const fetchCountRef = { value: 0 };

  /* main loop with simple async-pool */
  while (queue.length) {
    const batch = queue.splice(0, MAX_PARALLEL); // take up to N
    await Promise.all(
      batch.map((item) =>
        processNode(
          item,
          queue,
          visited,
          accountsMap,
          accountLinks,
          maxDepth,
          log,
          fetchCountRef,
          onLog
        )
      )
    );
  }

  const accounts = [...accountsMap.entries()]
    .map(([address, { volumeUsd, level }]) => ({ address, volumeUsd, level }))
    .sort((a, b) => a.level - b.level);

  log(
    `[BFS] => BFS completed. Found ${accounts.length} addresses, and ${accountLinks.length} links.`
  );
  return { accounts, accountLinks };
}


type QueueItem = {
  address: string;
  depth: number;
  parentAddress?: string;
  parentScore?: number;
};

/* one worker for a single queue item ─ extracted from the old loop */
async function processNode(
  item: QueueItem,
  queue: QueueItem[],
  visited: Set<string>,
  accountsMap: Map<string, { volumeUsd: number; level: number }>,
  accountLinks: { source: string; target: string; volumeUsd: string }[],
  maxDepth: number,
  log: (m: string) => void,
  fetchCountRef: { value: number },
  onLog?: (msg: string) => void
) {
  const { address, depth, parentAddress, parentScore } = item;

  if (visited.has(address)) {
    log(`[BFS] => Already visited ${address}, skipping fetch`);
    return;
  }
  visited.add(address);

  if (fetchCountRef.value >= 500) {
    log(`[BFS] => Reached 500 fetch limit, skipping ${address}`);
    return;
  }

  log(
    `[BFS] => Processing address=${address}, depth=${depth}, parent=${parentAddress}, parentScore=${parentScore}`
  );

  const associated = await fetchRelativeWallets(address, onLog);
  fetchCountRef.value += 1;

  if (associated.length > 200) {
    log(
      `[BFS] => Address ${address} is spammy (${associated.length}), skipping entirely`
    );
    return;
  }

  const scored = associated
    .map((r) => {
      const s = computeAssociationScore(r);
      const vol = parseFloat(r.all?.totalUsd || '0');
      return { address: r.entity_id, score: s, volumeUsd: vol };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 7); // top-10

  log(
    `[BFS] => Found ${associated.length}, took most relative addresses by volume for ${address}`
  );

  for (const child of scored) {
    if (child.volumeUsd < 1 || child.score < 90) {
      log(
        `[BFS] => Child ${child.address} filtered (score=${child.score}, vol=${child.volumeUsd})`
      );
      continue;
    }

    log(
      `[BFS] => Child discovered: ${child.address}, score=${child.score}, vol=${child.volumeUsd}`
    );

    const childDepth = depth + 1;
    const old = accountsMap.get(child.address);
    if (!old) {
      accountsMap.set(child.address, {
        volumeUsd: child.volumeUsd,
        level: childDepth,
      });
    } else {
      if (childDepth < old.level) {
        accountsMap.set(child.address, {
          volumeUsd: child.volumeUsd,
          level: childDepth,
        });
      } else if (child.volumeUsd > old.volumeUsd) {
        accountsMap.set(child.address, {
          volumeUsd: old.volumeUsd + child.volumeUsd,
          level: old.level,
        });
      }
    }

    if (parentAddress && (parentScore ?? 0) >= 80) {
      accountLinks.push({
        source: parentAddress,
        target: child.address,
        volumeUsd: child.volumeUsd.toString(),
      });
    }

    /* enqueue child respecting depth rules */
    if (
      (child.score === 100 && childDepth < maxDepth + 1) ||
      (child.score >= 90 && childDepth < maxDepth)
    ) {
      queue.push({
        address: child.address,
        depth: childDepth,
        parentAddress: child.address,
        parentScore: child.score,
      });
    }
  }
}
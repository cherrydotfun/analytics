import { useState, useEffect, useRef, useMemo } from "react"
import cytoscape from 'cytoscape';
import { List, Network } from "lucide-react"
import { useRouter } from "next/navigation"
import fcose from 'cytoscape-fcose';
import { Label } from "@/components/ui/label"

cytoscape.use(fcose); // register the extension

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Copy } from "lucide-react"
import { abbreviateAddress } from "@/lib/formatting"
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table"
import { abbreviateNumber, formatGainLoss } from "@/lib/formatting"

import { handleCopy } from "@/lib/utils/copy-to-clipboard";


// TODO: add these into a separate file
// Define 7 "bins" for node sizes
function getNodeSize(volume: number) {
  if (volume < 10) return 10*1.25
  if (volume < 100) return 20*1.25
  if (volume < 1000) return 30*1.25
  if (volume < 10_000) return 50*1.25
  if (volume < 100_000) return 80*1.25
  if (volume < 1_000_000) return 130*1.25
  return 10*1.25
}

// Define 7 "bins" for edge sizes
function getEdgeSize(volume: number) {
  if (volume < 10) return 2
  if (volume < 100) return 3
  if (volume < 1000) return 5
  if (volume < 10_000) return 8
  if (volume < 100_000) return 13
  if (volume < 1_000_000) return 21
  return 2
}

/**
 * Returns an opacity between 0 and 1 based on the link's volume.
 * Larger volume => higher opacity => less transparent.
 */
function getEdgeOpacity(volume: number) {
  if (volume <= 0) return 0.1
  // Simple clamping approach, e.g. max out at 1.0
  // Increase multiplier or tweak as needed for your dataset.
  const scaled = Math.log10(volume + 1) * 0.2
  // e.g. volume=100 => log10(101)*0.2 ~ 0.4
  // volume=10_000 => log10(10001)*0.2 ~ 0.8
  // Then clamp between 0.1 and 1
  return Math.max(0.1, Math.min(1, scaled))
}

const nodeColors = {
    /* level-0  ─ darkest: black-cherry / merlot */
    "0": "#4B0000",   // almost-black cherry
  
    /* level-1  ─ deep, saturated cherry red */
    "1": "#B00020",   // vivid crimson
  
    /* level-2  ─ bright glazed-cherry tint */
    "2": "#FF5252",   // light scarlet
  
    /* deeper   ─ very pale cherry-blossom wash */
    "default": "#FFE8E8", // near-white pink
  };

/** multiRootBeamPositions – for ONE cluster
 *  level-0 wallets = roots on a large circle, evenly spaced
 *  every deeper level fans out on the same beam slice
 */
function multiRootBeamPositions(
  accounts: { address: string; level: number }[],
  links: { source: string; target: string }[],
) {
  const ROOT_RING = 400;  // distance of level-0 nodes from cluster centre
  const STEP      = 400;  // extra radius per depth
  const GAP       = 0.5; // radian gap between sibling wedges

  /* undirected adjacency */
  const adj = new Map<string, string[]>();
  links.forEach(({ source, target }) => {
    adj.set(source, [...(adj.get(source) || []), target]);
    adj.set(target, [...(adj.get(target) || []), source]);
  });

  /* buckets by level */
  const buckets: Record<number, string[]> = {};
  accounts.forEach((a) => ((buckets[a.level] ||= []).push(a.address)));

  const roots   = buckets[0] ?? [];
  const pos: Record<string, { x: number; y: number }> = {};
  const visited = new Set<string>();

  const slice = (2 * Math.PI) / Math.max(roots.length, 1);

  roots.forEach((addr, idx) => {
    const a0 = idx * slice + GAP / 2;
    const a1 = (idx + 1) * slice - GAP / 2;

    /* root position */
    const ang = (a0 + a1) / 2;
    pos[addr] = { x: ROOT_RING * Math.cos(ang), y: ROOT_RING * Math.sin(ang) };
    visited.add(addr);

    placeSubtree(addr, null, a0, a1, 1);
  });

  return pos;

  /* ---------- recursion ---------- */
  function placeSubtree(
    node: string,
    parent: string | null,
    aStart: number,
    aEnd: number,
    depth: number,
  ) {
    const kids = (adj.get(node) || []).filter(
      (n) =>
        n !== parent &&
        !visited.has(n) &&
        (buckets[depth] || []).includes(n),
    );
    if (!kids.length) return;

    const span   = aEnd - aStart;
    const sector = (span - GAP * (kids.length - 1)) / kids.length;

    kids.forEach((child, i) => {
      const s   = aStart + i * (sector + GAP);
      const e   = s + sector;
      const ang = (s + e) / 2;
      const r   = ROOT_RING + STEP * depth + i * 90 + Math.floor(Math.random() * 600);;
      pos[child] = { x: r * Math.cos(ang), y: r * Math.sin(ang) };
      visited.add(child);
      placeSubtree(child, node, s, e, depth + 1);
    });
  }
}

/* ------------------------------------------------------------------ */
/*  Config knobs                                                      */
/* ------------------------------------------------------------------ */
const COMPONENT_SPACING    = 300;   // fcose space between components
const CLUSTER_GAP          = 300;   // default gap for big clusters
const FIT_PADDING          = 80;    // padding for cy.fit()
// const INITIAL_ZOOM_FACTOR  = 0.5;   // start a tad zoomed‑out
const SMALL_CLUSTER_GAP    = 120;  // gap for clusters < 10 wallets
const ROW_GAP              = 200;  // vertical distance between rows
const COLS                 = 8;    // how many clusters per row

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export function AccountsGraphForToken({
  clusters,
}: {
  clusters: Array<{
    id: number;
    accounts: Array<{ address: string; level: number; volumeUsd: number }>;
    accountLinks: { source: string; target: string; volumeUsd?: number }[];
  }>;
}) {
  const graphRef = useRef<HTMLDivElement>(null);

  const [tooltip, setTooltip] = useState({
    x: 0,
    y: 0,
    visible: false,
    address: '',
    volume: '',
  });

  /* build Cytoscape elements ------------------------------------ */
  const cyElements = useMemo(() => {
    const elems: cytoscape.ElementDefinition[] = [];
    clusters.forEach((c) => {
      const tag = `c${c.id}`;

      c.accounts.forEach((acc) =>
        elems.push({
          group: 'nodes',
          data: {
            id: acc.address,
            cluster: tag,
            label: abbreviateAddress(acc.address),
            fullAddress: acc.address,
            volume: acc.volumeUsd,
            level: acc.level,
            _size: getNodeSize(acc.volumeUsd),
            _color: nodeColors[String(acc.level)] ?? nodeColors.default,
          },
        }),
      );

      c.accountLinks.forEach((l) =>
        elems.push({
          group: 'edges',
          data: {
            id: `${l.source}-${l.target}`,
            source: l.source,
            target: l.target,
            volume: l.volumeUsd ?? 0,
            _size: getEdgeSize(l.volumeUsd ?? 0),
            _opacity: getEdgeOpacity(l.volumeUsd ?? 0),
          },
        }),
      );
    });
    return elems;
  }, [clusters]);

  /* draw --------------------------------------------------------- */
  const drawGraph = () => {
    if (!graphRef.current) return;

    const cy = cytoscape({
      container: graphRef.current,
      elements: cyElements,
      minZoom: 0.08,
      maxZoom: 3,
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            'background-color': 'data(_color)',
            'text-outline-width': 1,
            'text-outline-color': '#000',
            color: '#fff',
            width: 'data(_size)',
            height: 'data(_size)',
            'font-size': 20,
            'font-weight': 'bold',
            'text-halign': 'center',
            'text-valign': 'center',
          },
        },
        {
          selector: 'edge',
          style: {
            'line-color': '#949494',
            // 'line-opacity': 'data(_opacity)',
            'opacity': 0.3,
            width: 'data(_size)',
          },
        },
      ],
    });

    /* ------------------------------------------------------------ *
     *  (1) preset positions INSIDE each cluster                    *
     * ------------------------------------------------------------ */
    const presetPos: Record<string, { x: number; y: number }> = {};
    clusters.forEach((c) =>
      Object.assign(presetPos, multiRootBeamPositions(c.accounts, c.accountLinks)),
    );

    cy.one('layoutstop', () => {
      /* ---------------------------------------------------------- *
       *  (2) shift WHOLE clusters into the grid (unchanged code)   *
       * ---------------------------------------------------------- */
      const multi = [...clusters].sort((a, b) => b.accounts.length - a.accounts.length);

      let cursorX = 0;
      let cursorY = 0;
      let colIndex = 0;
      let rowHeight = 0;

      cy.batch(() => {
        multi.forEach((c) => {
          const count = c.accounts.length;
          const columnsUsed = count >= 90 ? COLS : count >= 30 ? 2 : 1;
          const gap = count < 10 ? SMALL_CLUSTER_GAP : CLUSTER_GAP;

          if (colIndex + columnsUsed > COLS) {
            cursorX = 0;
            cursorY += rowHeight + ROW_GAP;
            rowHeight = 0;
            colIndex = 0;
          }

          const sub = cy.elements(`[cluster="c${c.id}"]`);
          const bb = sub.boundingBox();
          const shiftX = cursorX - bb.x1;
          const shiftY = cursorY - bb.y1;

          sub.positions((n) => ({
            x: n.position().x + shiftX,
            y: n.position().y + shiftY,
          }));

          colIndex += columnsUsed;

          if (columnsUsed === COLS) {
            cursorX = 0;
            cursorY += bb.h + ROW_GAP;
            rowHeight = 0;
            colIndex = 0;
          } else {
            cursorX += bb.w + gap;
            rowHeight = Math.max(rowHeight, bb.h);
          }
        });
      });

      cy.fit(undefined, FIT_PADDING);
    //   cy.zoom(cy.zoom() * INITIAL_ZOOM_FACTOR);
      cy.layout({ name: 'preset', fit: false, animate: false }).run();
    });

    cy.layout({
      name: 'preset',
      positions: (n) => presetPos[n.id()] || { x: 0, y: 0 },
      fit: false,
      animate: false,
    }).run();

    /* tool-tips -------------------------------------------------- */
    const dpr = window.devicePixelRatio || 1;
    cy.on('mouseover', 'node', (e) => {
      const n = e.target;
      const p = n.renderedPosition();
      const rect = graphRef.current?.getBoundingClientRect();
      if (!rect) return;
      setTooltip({
        x: rect.left + p.x / dpr + 2,
        y: rect.top + p.y / dpr + 2,
        visible: true,
        address: n.data('fullAddress'),
        volume: '$' + (n.data('volume') ?? 0).toLocaleString(),
      });
    });
    cy.on('mouseout', 'node', () =>
      setTooltip((prev) => ({ ...prev, visible: false })),
    );
    cy.on('tap', (e) => {
      if (e.target === cy)
        setTooltip((prev) => ({ ...prev, visible: false }));
    });
  };

  /* effects ------------------------------------------------------ */
  useEffect(drawGraph, [cyElements]);
  useEffect(() => {
    window.addEventListener('resize', drawGraph);
    return () => window.removeEventListener('resize', drawGraph);
  }, [cyElements]);

  /* render ------------------------------------------------------- */
  return (
    <>
      <div ref={graphRef} className="w-full aspect-[2/1]" />
      {tooltip.visible && (
        <div
          style={{
            position: 'absolute',
            left: tooltip.x,
            top: tooltip.y,
            pointerEvents: 'none',
            background: 'rgba(0,0,0,0.8)',
            color: '#fff',
            padding: '6px 8px',
            borderRadius: 4,
            fontSize: '0.85rem',
            whiteSpace: 'nowrap',
            zIndex: 1000,
          }}
        >
          <div>
            <strong>Address:</strong> {tooltip.address}
          </div>
          <div>
            <strong>Volume:</strong> {tooltip.volume}
          </div>
        </div>
      )}
    </>
  );
}

export default function AccountsTableForToken({
  cluster,
}: {
  cluster: {
    accounts: Array<{
      balance: number;
      address: string;
      level: number;
      volumeUsd: number;
      supplyPct: number;
    }>;
  };
}) {
  const router = useRouter();

  const rows = useMemo(
    () =>
      [...cluster.accounts].sort((a, b) => {
        if (a.level === 0 && b.level !== 0) return -1;
        if (b.level === 0 && a.level !== 0) return 1;
        return b.volumeUsd - a.volumeUsd;
      }),
    [cluster.accounts],
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Address</TableHead>
          <TableHead>Volume</TableHead>
          <TableHead>Token Balance</TableHead>
          <TableHead className="text-right">Supply&nbsp;%</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {rows.map((a) => (
          <TableRow
            key={a.address}
            className={`cursor-pointer ${
              a.level === 0 ? 'bg-muted/50 font-semibold' : ''
            }`}
            onClick={() => router.push(`/acc/${a.address}`)}
          >
            <TableCell>
              <div className="flex flex-row items-center gap-2">
                {abbreviateAddress(a.address)}
                {a.level === 0 && (
                  <div className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-600 whitespace-nowrap">
                    token holder
                  </div>
                )}
                <Button
                  variant="link"
                  className="size-5"
                  onClick={(e) => handleCopy(e, a.address)}
                >
                  <Copy />
                </Button>
              </div>
            </TableCell>

            <TableCell>${abbreviateNumber(a.volumeUsd)}</TableCell>

            <TableCell>{abbreviateNumber(a.balance)}</TableCell>

            <TableCell className="text-right">
              {a.supplyPct.toFixed(2)}%
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}


export function ClusterAssociatedAccountsForToken({
  clusters,
  className,
}: {
  clusters: Array<{
    id: number;
    accounts: any[];
    accountLinks: { source: string; target: string }[];
    totalVol: number;
    totalPct: number;
  }>;
  className?: string;
}) {
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between">
          <CardTitle> Found {clusters.length} clusters ({clusters.map(x => x.totalPct).reduce((a, b) => { return a + b; }, 0).toFixed(2)}% of supply)</CardTitle>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'graph' ? 'default' : 'outline'}
              onClick={() => setViewMode('graph')}
              size="icon"
            >
              <Network />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              onClick={() => setViewMode('list')}
              size="icon"
            >
              <List />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid gap-4">
        {viewMode === 'list' ? (
          clusters.map((cluster) => (
            <div key={cluster.id} className="space-y-2 flex-nowrap overflow-x-scroll">
              <h4 className="font-semibold tracking-tight">
                Cluster&nbsp;{cluster.id}&nbsp;
                <span className="text-muted-foreground text-sm font-normal">
                  &nbsp;•&nbsp;Total&nbsp;Ownership:&nbsp;
                  {cluster.totalPct.toFixed(2)}%
                </span>
                <span className="text-muted-foreground text-sm font-normal">
                  &nbsp;•&nbsp;Total&nbsp;Volume:&nbsp;$
                  {abbreviateNumber(cluster.totalVol)}
                </span>
              </h4>
              <AccountsTableForToken cluster={cluster} />
            </div>
          ))
        ) : (
          /* graph can receive the whole cluster array */
          <AccountsGraphForToken clusters={clusters} />
        )}
      </CardContent>
    </Card>
  );
}
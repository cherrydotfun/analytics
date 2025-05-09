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

// Define 7 "bins" for node sizes
function getNodeSize(volume: number) {
  if (volume < 10) return 10*1.5
  if (volume < 100) return 20*1.5
  if (volume < 1000) return 30*1.5
  if (volume < 10_000) return 50*1.5
  if (volume < 100_000) return 80*1.5
  if (volume < 1_000_000) return 130*1.5
  return 10*1.5
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

function AccountsTable({accounts}: {accounts: any[]}) {
  const router = useRouter();
    return (
      <Table>
        {/* <TableCaption>A list of your recent invoices.</TableCaption> */}
        <TableHeader>
          <TableRow>
            <TableHead>Address</TableHead>
            <TableHead>Volume</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((account) => (
            <TableRow key={account.address} className="cursor-pointer" onClick={() => router.push(`/acc/${account.address}`)}>
              <TableCell>
                { abbreviateAddress(account.address) }
                <Button
                variant={'link'}
                className="size-5"
                onClick={(e) => handleCopy(e, account.address)}
              ><Copy /></Button>
              </TableCell>
              <TableCell>${ abbreviateNumber(account.volumeUsd) }</TableCell>
              {/* <TableCell>{ formatGainLoss(account.pnlUsd, true, true) }</TableCell> */}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
}

/* ------------------------------------------------------------------ *
 *  deterministic "beam" positions                                      *
 * ------------------------------------------------------------------ */
function beamPositions(
  accounts: { address: string; level: number }[],
  links: { source: string; target: string }[],
) {
  /* tweakables -------------------------------------------------- */
  const ROOT_RING  = 600; // distance between roots if >1 root
  const BASE_R1    = 600; // level-1 radius  (single-root case)
  const STEP       = 500; // extra per depth
  const GAP        = 0.5; // radians gap between sibling wedges
  /* ------------------------------------------------------------- */

  /* build undirected adjacency --------------------------------- */
  const adj = new Map<string, string[]>();
  links.forEach(({ source, target }) => {
    adj.set(source, [...(adj.get(source) || []), target]);
    adj.set(target, [...(adj.get(target) || []), source]);
  });

  /* buckets by level */
  const buckets: Record<number, string[]> = {};
  accounts.forEach((a) => ((buckets[a.level] ||= []).push(a.address)));

  const roots = buckets[0] ?? [];
  const pos: Record<string, { x: number; y: number }> = {};
  const visited = new Set<string>();

  /* ---------- SINGLE-ROOT CASE -------------------------------- */
  if (roots.length <= 1) {
    const root = roots[0];
    if (!root) return pos;
    pos[root] = { x: 0, y: 0 };
    visited.add(root);

    layoutSubtree(root, 0, 2 * Math.PI, 1);
    return pos;
  }

  /* ---------- MULTI-ROOT CASE --------------------------------- */
  const slice = (2 * Math.PI) / roots.length;

  roots.forEach((addr, idx) => {
    const a0   = idx * slice + GAP / 2;
    const a1   = (idx + 1) * slice - GAP / 2;
    const mid  = (a0 + a1) / 2;

    /* place root on ROOT_RING */
    pos[addr] = { x: ROOT_RING * Math.cos(mid), y: ROOT_RING * Math.sin(mid) };
    visited.add(addr);

    layoutSubtree(addr, a0, a1, 1);
  });

  return pos;

  /* ------------------------------------------------------------ */
  function layoutSubtree(
    node: string,
    angStart: number,
    angEnd: number,
    depth: number,
  ) {
    /* level of children = depth in this recursive frame */
    const kids = (adj.get(node) || []).filter(
      (n) =>
        !visited.has(n) && (buckets[depth] || []).includes(n),
    );
    if (!kids.length) return;

    const span   = angEnd - angStart;
    const sector = (span - GAP * (kids.length - 1)) / kids.length;

    kids.forEach((child, i) => {
      const s   = angStart + i * (sector + GAP);
      const e   = s + sector;
      const ang = (s + e) / 2;
      const base = roots.length === 1 ? BASE_R1 : ROOT_RING + STEP; // level-1 radius
      const r   = base + STEP * (depth - 1) + i * 45 + Math.floor(Math.random() * 1000); 

      pos[child] = { x: r * Math.cos(ang), y: r * Math.sin(ang) };
      visited.add(child);
      layoutSubtree(child, s, e, depth + 1);
    });
  }
}

export function AccountsGraph({ accounts, accountLinks }: Props) {
  const graphRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState({
    x: 0,
    y: 0,
    visible: false,
    address: '',
    volume: '',
  });

  /* Cytoscape draw */
  const draw = () => {
    if (!graphRef.current) return;

    const nodes = accounts.map((a) => ({
      data: {
        id: a.address,
        label: abbreviateAddress(a.address),
        fullAddress: a.address,
        volume: a.volumeUsd,
        level: a.level,
        _size: getNodeSize(a.volumeUsd),
        _color: nodeColors[String(a.level)] ?? nodeColors.default,
      },
    }));

    const edges = accountLinks.map((l) => ({
      data: {
        id: `${l.source}-${l.target}`,
        source: l.source,
        target: l.target,
        volume: l.volumeUsd,
        _size: getEdgeSize(l.volumeUsd),
        _opacity: getEdgeOpacity(l.volumeUsd),
      },
    }));

    const cy = cytoscape({
      container: graphRef.current,
      elements: [...nodes, ...edges],
      minZoom: 0.1,
      maxZoom: 2,
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
            'line-opacity': 0.4,
            width: 'data(_size)',
          },
        },
      ],
    });

    /* radial beam preset */
    const preset = beamPositions(accounts, accountLinks);

    cy.layout({
      name: 'preset',
      positions: (n) => preset[n.id()] || { x: 0, y: 0 },
      fit: true,
      padding: 60,
      animate: true,
      animationDuration: 600,
    }).run();

    cy.layout({
      name: 'fcose',
      randomize: false,     // start from current coordinates
      fit: false,
      nodeRepulsion: 35000,  // stronger push-apart
      idealEdgeLength: 200,  // keep parent–child somewhat tight
      edgeElasticity: 0.2,
      gravity: 0.3,         // mild inward pull so beams stay radially aligned
      gravityRange: 2.5,
      componentSpacing: 0,  // we’re only nudging inside each cluster
      animate: false,       // instant calc; we’ll animate grid shift later
      }).run();

    /* tooltips */
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

  useEffect(draw, [accounts, accountLinks]);
  useEffect(() => {
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [accounts, accountLinks]);

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

export function ClusterAssociatedAccounts({
    accounts, accountLinks, ...props
  }: {accounts: any[], accountLinks: any[], className: string}
) {
  const [assocAccVewMode, setAssocAccVewMode] = useState('graph')

  return (
  <Card {...props}>
      <CardHeader>
          <div className="flex flex-row justify-between">
              <CardTitle>Associated accounts</CardTitle>
              <div className="flex flex-row gap-2">
              <Button variant={ assocAccVewMode === "graph" ? "default" : "outline" } onClick={() => setAssocAccVewMode("graph")} size="icon">
                  <Network />
              </Button>
              <Button variant={ assocAccVewMode === "list" ? "default" : "outline" } onClick={() => setAssocAccVewMode("list")} size="icon">
                  <List />
              </Button>
              </div>
          </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        {
        assocAccVewMode === "list" ? 
          <AccountsTable accounts={accounts} /> : 
          <AccountsGraph accounts={accounts} accountLinks={accountLinks} />
        }
      </CardContent>
  </Card>
  )
}
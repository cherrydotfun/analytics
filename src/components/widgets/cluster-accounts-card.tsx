import { useState, useEffect, useRef, useMemo } from "react"
import cytoscape from 'cytoscape';
import { List, Network } from "lucide-react"
import { useRouter } from "next/navigation"
import fcose from 'cytoscape-fcose';

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

import { toast } from "sonner"
import { handleCopy } from "@/lib/utils/copy-to-clipboard";

// Define 7 "bins" for node sizes
function getNodeSize(volume: number) {
  if (volume < 10) return 10
  if (volume < 100) return 20
  if (volume < 1000) return 30
  if (volume < 10_000) return 50
  if (volume < 100_000) return 80
  if (volume < 1_000_000) return 130
  return 10
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
  "0": "#FF3C12",
  "1": "#FFA500",
  "2": "#00D443",
  "default": "#fff"
}

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


export function AccountsGraph({ accounts, accountLinks }: Props) {
  const graphRef = useRef<HTMLDivElement>(null)

  // Tooltip state: (x, y) coords + info to display
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    visible: boolean
    address: string
    volume: any
  }>({
    x: 0,
    y: 0,
    visible: false,
    address: '',
    volume: 0,
  })

  // Convert accounts to Cytoscape nodes
  const nodes = accounts.map(account => ({
    data: {
      id: account.address,
      label: abbreviateAddress(account.address),
      fullAddress: account.address,  // for tooltip
      volume: account.volumeUsd,
      level: account.level,
      _size: getNodeSize(account.volumeUsd),
      _color: nodeColors[String(account.level)] ?? nodeColors.default,
    }
  }))

  // Convert links to Cytoscape edges
  const edges = accountLinks.map(link => ({
    data: {
      id: `${link.source}-${link.target}`,
      source: link.source,
      target: link.target,
      volume: link.volumeUsd,
      _size: getEdgeSize(link.volumeUsd),
      _opacity: getEdgeOpacity(link.volumeUsd),
    }
  }))

  const drawGraph = () => {
    if (!graphRef.current) return

    const cy = cytoscape({
      container: graphRef.current,
      elements: [...nodes, ...edges],
      zoom: 1,
      // limit how far in/out users can zoom
      minZoom: 0.2,
      maxZoom: 2,
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            'background-color': 'data(_color)',
            // Outline for label contrast
            'text-outline-width': 1,
            'text-outline-color': '#000',
            color: '#fff',
            width: 'data(_size)',
            height: 'data(_size)',
            'font-size': 20,
            'font-weight': 'bold',
            'text-halign': 'center',
            'text-valign': 'center',
          }
        },
        {
          selector: 'edge',
          style: {
            'line-color': '#949494',
            'line-opacity': 'data(_opacity)',
            width: 'data(_size)',
          }
        }
      ]
    })

    // Use a force-based layout (fcose) for better distribution
    cy.layout({
      name: 'fcose',
      // Scale repulsion by volume
      nodeRepulsion: (node) => 20000 + (node.data('volume') ?? 0) * 0.2,
      idealEdgeLength: 150,
      nodeSeparation: 150,
      gravity: 0.2,
      gravityRange: 2.0,
      packComponents: true,
      randomize: true,
      animate: true,
      animationDuration: 3500,
      animationEasing: 'ease-out-cubic'
    }).run()

    // Device pixel ratio for hiDPI screens
    const dpr = window.devicePixelRatio || 1

    // ---------------------------
    // MOUSE/EVENT HANDLERS
    // ---------------------------
    // 1. Show tooltip on hover
    // Show tooltip on node hover
    cy.on('mouseover', 'node', (event) => {
      const node = event.target
      const pos = node.renderedPosition()

      // Distance from top-left of page for the container
      const rect = graphRef.current?.getBoundingClientRect()
      if (!rect) return

      // Convert Cytoscape rendered coords to page coords
      // Often dividing by dpr helps correct for retina/zoom mismatch
      const x = rect.left + pos.x / dpr
      const y = rect.top + pos.y / dpr

      setTooltip({
        x,
        y,
        visible: true,
        address: node.data('fullAddress'),
        volume: '$' + parseFloat(parseFloat(node.data('volume')).toFixed(2)),
      })
    })

    // Hide tooltip on mouse out
    cy.on('mouseout', 'node', () => {
      setTooltip((prev) => ({ ...prev, visible: false }))
    })

    // Show tooltip on tap/click (if you like)
    cy.on('tap', 'node', (event) => {
      const node = event.target
      const pos = node.renderedPosition()
      const rect = graphRef.current?.getBoundingClientRect()
      if (!rect) return

      const x = rect.left + pos.x / dpr
      const y = rect.top + pos.y / dpr

      setTooltip({
        x,
        y,
        visible: true,
        address: node.data('fullAddress'),
        volume: '$' + parseFloat(parseFloat(node.data('volume')).toFixed(2)),
      })
    })

    // Hide tooltip if user taps the empty space
    cy.on('tap', (event) => {
      if (event.target === cy) {
        setTooltip((prev) => ({ ...prev, visible: false }))
      }
    })

    // Optionally disable user panning/zooming if you want a fixed layout
    // cy.panningEnabled(false)
    // cy.userZoomingEnabled(false)
    cy.center();
    cy.zoom(1);
  }

  // Draw graph whenever accounts or accountLinks changes
  useEffect(() => {
    drawGraph()
  }, [accounts, accountLinks])

  // Redraw on window resize
  useEffect(() => {
    window.addEventListener('resize', drawGraph)
    return () => window.removeEventListener('resize', drawGraph)
  }, [])

  return (
    <>
      {/* Container that Cytoscape uses */}
      <div ref={graphRef} className="w-full aspect-[2/1]" />

      {/* A simple absolutely-positioned tooltip */}
      {tooltip.visible && (
        <div
          style={{
            position: 'absolute',
            left: tooltip.x + 2, // offset a bit so the tooltip doesn't overlap the cursor
            top: tooltip.y + 2,
            pointerEvents: 'none',
            background: 'rgba(0, 0, 0, 0.8)',
            color: '#fff',
            padding: '6px 8px',
            borderRadius: '4px',
            fontSize: '0.85rem',
            whiteSpace: 'nowrap',
            zIndex: 1000,
          }}
        >
          <div><strong>Address:</strong> {tooltip.address}</div>
          <div><strong>Volume:</strong> {tooltip.volume}</div>
        </div>
      )}
    </>
  )
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

export function ClusterAssociatedAccountsForToken({
  accounts,
  accountLinks,
  ...props
}: {
  accounts: any[];
  accountLinks: any[];
  className?: string;
}) {
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');

  /* -------- identical clustering block -------- */
  const clusters = useMemo(() => {
    if (!accounts.length) return [];

    const addrToAcc = new Map(accounts.map((a) => [a.address, a]));
    const adj = new Map<string, string[]>();

    accountLinks.forEach(({ source, target }) => {
      adj.set(source, [...(adj.get(source) || []), target]);
      adj.set(target, [...(adj.get(target) || []), source]);
    });

    const roots = accounts.filter((a) => a.level === 0).map((a) => a.address);
    const seen = new Set<string>();
    const result: { accounts: any[] }[] = [];

    for (const root of roots) {
      if (seen.has(root)) continue;

      const stack = [root];
      const cluster: any[] = [];

      while (stack.length) {
        const node = stack.pop()!;
        if (seen.has(node)) continue;
        seen.add(node);

        const acc = addrToAcc.get(node);
        if (acc) cluster.push(acc);

        (adj.get(node) || []).forEach((nbr) => {
          if (!seen.has(nbr)) stack.push(nbr);
        });
      }

      result.push({ accounts: cluster });
    }

    return result;
  }, [accounts, accountLinks]);
  /* -------------------------------------------- */

  return (
    <Card {...props}>
      <CardHeader>
        <div className="flex flex-row justify-between">
          <CardTitle>Associated accounts</CardTitle>
          <div className="flex flex-row gap-2">
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
          <>
            {clusters.map(({ accounts }, idx) => (
              <div key={idx} className="space-y-2">
                <h4 className="font-semibold tracking-tight">
                  Cluster&nbsp;{idx + 1}
                </h4>
                <AccountsTableToken accounts={accounts} />
              </div>
            ))}
          </>
        ) : (
          <AccountsGraph accounts={accounts} accountLinks={accountLinks} />
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Table (roots first, then by volume)                                */
/* ------------------------------------------------------------------ */
function AccountsTableToken({ accounts }: { accounts: any[] }) {
  const router = useRouter();

  const rows = useMemo(() => {
    return [...accounts].sort((a, b) => {
      if (a.level === 0 && b.level !== 0) return -1;
      if (b.level === 0 && a.level !== 0) return 1;
      return b.volumeUsd - a.volumeUsd; // descending volume
    });
  }, [accounts]);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Address</TableHead>
          <TableHead>Volume</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {rows.map((account) => (
          <TableRow
            key={account.address}
            /* ------------ highlight roots ------------ */
            className={`cursor-pointer ${
              account.level === 0 ? 'bg-muted/50 font-semibold' : ''
            }`}
            onClick={() => router.push(`/acc/${account.address}`)}
          >
            <TableCell>
              {abbreviateAddress(account.address)}
              <Button
                variant="link"
                className="size-5"
                onClick={(e) => handleCopy(e, account.address)}
              >
                <Copy />
              </Button>
            </TableCell>
            <TableCell>${abbreviateNumber(account.volumeUsd)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
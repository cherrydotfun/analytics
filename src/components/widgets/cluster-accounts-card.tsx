import { useState, useEffect, useRef } from "react"
import cytoscape from 'cytoscape';
import { List, Network } from "lucide-react"
import { useRouter } from "next/navigation";

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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

const nodeSizes = {
  s: 10,
  m: 20,
  l: 30,
}

const edgeSizes = {
  s: 1,
  m: 3,
  l: 5,
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
              <TableCell>{ abbreviateAddress(account.address) }</TableCell>
              <TableCell>${ abbreviateNumber(account.volumeUsd) }</TableCell>
              {/* <TableCell>{ formatGainLoss(account.pnlUsd, true, true) }</TableCell> */}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
}


function AccountsGraph({accounts, accountLinks}: {accounts: any[], accountLinks: any[]}) {
  const graphRef = useRef(null)

  const nodes = accounts.map(account => ({
    "data": {
      "id": account.address,
      "label": abbreviateAddress(account.address),
      "volume": account.volumeUsd,
      "level": account.level,
      "_size": account.volumeUsd < 1000 ? nodeSizes.s : account.volumeUsd < 10000 ? nodeSizes.m : nodeSizes.l,
      "_color": nodeColors[account.level+"" in nodeColors ? account.level+"" : "default"]
    }
  }))

  const edges = accountLinks.map(link => ({
    "data": {
      "id": `${link.source}-${link.target}`,
      "source": link.source,
      "target": link.target,
      "_size": link.volumeUsd < 1000 ? edgeSizes.s : link.volumeUsd < 10000 ? edgeSizes.m : edgeSizes.l,
    }
  }))

  const drawGraph = () => {
    const cy = cytoscape({
      container: graphRef.current,
      elements: [...nodes, ...edges],
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'color': 'data(_color)',
            'background-color': 'data(_color)',
            'width': 'data(_size)',
            'height': 'data(_size)',
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 'data(_size)',
            'line-color': '#ccc',
          }
        }
      ]
     })
     cy.panningEnabled( false );
    }
   
    useEffect(() => {
     drawGraph()
    }, [])

    useEffect(() => {
      // TODO: cy.center() works a little better
      window.addEventListener("resize", drawGraph);
      return () => window.removeEventListener("resize", drawGraph); // Cleanup
    })

    return (
      <div ref={graphRef} className="w-full aspect-[2/1]" />
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
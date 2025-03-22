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


function AccountsTable({accounts}: {accounts: any[]}) {
  const router = useRouter();
    return (
      <Table>
        {/* <TableCaption>A list of your recent invoices.</TableCaption> */}
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Address</TableHead>
            <TableHead>Balance</TableHead>
            <TableHead>P&L</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((account) => (
            <TableRow key={account.address} className="cursor-pointer" onClick={() => router.push(`/acc/${account.address}`)}>
              <TableCell>{ abbreviateAddress(account.address) }</TableCell>
              <TableCell>${ abbreviateNumber(account.balance) }</TableCell>
              <TableCell>{ formatGainLoss(account.pnlUsd, true, true) }</TableCell>
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
      "label": abbreviateAddress(account.address)
    }
  }))

  const edges = accountLinks.map(link => ({
    "data": {
      "id": `${link.source}-${link.target}`,
      "source": link.source,
      "target": link.target
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
            'color': '#fff'
          }
        },
      ]
     })
     cy.panningEnabled( false );
    }
   
    useEffect(() => {
     drawGraph()
    }, [])

    useEffect(() => {
      console.log('test')
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
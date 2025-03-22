import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

import { Button } from "@/components/ui/button"
import { List, Network } from "lucide-react"
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

import { abbreviateNumber } from "@/lib/formatting"

function TxTable({ txs }: { txs: any[] }) {
    return (
      <Table>
        {/* <TableCaption>A list of your recent invoices.</TableCaption> */}
        <TableHeader>
          <TableRow>
            <TableHead>Token</TableHead>
            <TableHead>Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {txs.map((tx) => (
            <TableRow key={tx.id}>
              <TableCell>
                {tx.name}
                </TableCell>
              <TableCell>${ abbreviateNumber(tx.valueUsd) }</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
}


export function ClusterRecentTransactions({
    txs, ...props
  }: {txs: any[], className: string}
) {


    return (
    <Card {...props}>
        <CardHeader>
            <div className="flex flex-row justify-between">
                <CardTitle>Recent transactions</CardTitle>
            </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p>Coming soon</p>
            {/* <TxTable txs={txs} /> */}
        </CardContent>
    </Card>
    )
}
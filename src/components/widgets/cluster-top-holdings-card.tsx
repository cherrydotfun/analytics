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

function HoldingsTable({ holdings }: { holdings: any[] }) {
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
          {holdings.map((holding) => (
            <TableRow key={holding.ca}>
              <TableCell>
                {holding.name}
                </TableCell>
              <TableCell>${ abbreviateNumber(holding.valueUsd) }</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
}


export function ClusterTopHoldings({
    holdings, ...props
  }: {holdings: any[], className: string}
) {


    return (
    <Card {...props}>
        <CardHeader>
            <div className="flex flex-row justify-between">
                <CardTitle>Top holdings</CardTitle>
            </div>
        </CardHeader>
        <CardContent className="grid gap-4">
            <HoldingsTable holdings={holdings} />
        </CardContent>
    </Card>
    )
}
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

function AccountsTable({accounts}: {accounts: any[]}) {
    console.log('accounts', typeof accounts)
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
            <TableRow key={account.address}>
              <TableCell className="font-medium">{abbreviateAddress(account.address)}</TableCell>
              <TableCell>{account.balance}</TableCell>
              <TableCell>{account.pnlUsd}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
}


export function ClusterAssociatedAccounts({
    accounts, accountLinks, ...props
  }: {accounts: any[], accountLinks: any[], className: string}
) {


    return (
    <Card {...props}>
        <CardHeader>
            <div className="flex flex-row justify-between">
                <CardTitle>Associated accounts</CardTitle>
                <div className="flex flex-row gap-2">
                <Button variant="outline" size="icon">
                    <List />
                </Button>
                <Button variant="outline" size="icon">
                    <Network />
                </Button>
                </div>
            </div>
        </CardHeader>
        <CardContent className="grid gap-4">
            <AccountsTable accounts={accounts} />
        </CardContent>
    </Card>
    )
}
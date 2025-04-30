import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
  } from "@/components/ui/tooltip"

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

export function TokenRisksCard({
    risks, ...props
  }: {
    risks: { name: string, level: string }[] | null,
  }) {

    return (
    <Card className={"w-full h-full"} {...props}>
        <CardHeader>
            <CardTitle>Risks</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
        <Table>
      <TableBody>
        {risks?.map((risk) => (
          <TableRow key={risk.name}>
            <TableCell>{risk.name}</TableCell>
          </TableRow>
        )) || "No known risks"}
      </TableBody>
    </Table>
        </CardContent>
    </Card>
    )
}
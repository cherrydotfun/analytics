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

function AchievementsTable({ achievements }: { achievements: any[] }) {
    return (
      <Table>
        {/* <TableCaption>A list of your recent invoices.</TableCaption> */}
        {/* <TableHeader>
          <TableRow>
            <TableHead>Address</TableHead>
          </TableRow>
        </TableHeader> */}
        <TableBody>
          {achievements.map((achievement) => (
            <TableRow key={achievement.id}>
              <TableCell>{achievement.name}</TableCell>
              {/* <TableCell>{achievement.pnlUsd}</TableCell> */}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
}


export function ClusterAchievements({
    achievements, ...props
  }: {achievements: any[], className: string}
) {


    return (
    <Card {...props}>
        <CardHeader>
            <div className="flex flex-row justify-between">
                <CardTitle>Achievements</CardTitle>
                {/* <div className="flex flex-row gap-2">
                <Button variant="outline" size="icon">
                    <List />
                </Button>
                <Button variant="outline" size="icon">
                    <Network />
                </Button>
                </div> */}
            </div>
        </CardHeader>
        <CardContent className="grid gap-4">
            <AchievementsTable achievements={achievements} />
        </CardContent>
    </Card>
    )
}
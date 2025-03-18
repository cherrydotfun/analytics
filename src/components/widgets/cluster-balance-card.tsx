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

import { abbreviateNumber } from "@/lib/formatting"

export function ClusterBalanceCard({
    balanceUsd,
  }: {
    balanceUsd: number
  }) {

    const formattedBalance = abbreviateNumber(balanceUsd);
    return (
    <TooltipProvider>
    <Card className={"w-[380px]"} >
        <CardHeader>
            <CardTitle>Balance</CardTitle>
        {/* <CardDescription>hello world.</CardDescription> */}
        </CardHeader>
        <CardContent className="grid gap-4">
            <div className="flex items-center space-x-4 rounded-md">
            
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="text-3xl font-bold">${formattedBalance}</div>
                </TooltipTrigger>
                <TooltipContent>
                <p>${balanceUsd}</p>
                </TooltipContent>
            </Tooltip>
                
            </div>
        </CardContent>
    </Card>
    </TooltipProvider>
    )
}
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

import { abbreviateNumber, formatGainLoss } from "@/lib/formatting"

export function ClusterPnlCard({
    pnlUsd, pnlPerc, unrealizedPnlUsd, ...props
  }: {
    pnlUsd: number,
    pnlPerc: number, 
    unrealizedPnlUsd: number
  }) {

    const formattedPnlPerc = formatGainLoss(pnlPerc, false);
    const formattedPnlUsd = abbreviateNumber(pnlUsd);
    const formattedUnrealizedPnlUsd = abbreviateNumber(unrealizedPnlUsd);
    return (
    <TooltipProvider>
    <Card className={"w-full"} {...props}>
        <CardHeader>
            <CardTitle>P&L</CardTitle>
        {/* <CardDescription>hello world.</CardDescription> */}
        </CardHeader>
        <CardContent className="grid gap-4">
            <div className="flex items-center space-x-4 rounded-md">
                <div className="text-3xl font-bold">{formattedPnlPerc}</div>
            </div>
            <div className="flex justify-between"> 
                <div>Total P&L</div>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div>${formattedPnlUsd}</div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>${pnlUsd}</p>
                    </TooltipContent>
                </Tooltip>
            </div>
            <div className="flex justify-between"> 
                <div>Unrealized P&L</div>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div>${formattedUnrealizedPnlUsd}</div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>${unrealizedPnlUsd}</p>
                    </TooltipContent>
                </Tooltip>
                
            </div>

        </CardContent>
    </Card>
    </TooltipProvider>
    )
}
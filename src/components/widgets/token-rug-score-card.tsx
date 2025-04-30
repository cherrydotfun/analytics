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

export function TokenRugScoreCard({
    rugCheckScore, ddXyzScore, ...props
  }: {
    rugCheckScore: number, ddXyzScore: number
  }) {

    return (
        <TooltipProvider>
        <Card className={"w-full h-full"} {...props}>
            <CardHeader>
                <CardTitle>Rug risk</CardTitle>
            {/* <CardDescription>hello world.</CardDescription> */}
            </CardHeader>
            <CardContent className="grid gap-4">
                <div className="flex justify-between"> 
                    <div>RugCheck:</div>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div>{
                            rugCheckScore === null ? "Risk unknown" : 
                            rugCheckScore > 50 ? "High" :
                            rugCheckScore > 20 ? "Medium" :
                            rugCheckScore > 0 ? "Low" : "Appears safe"
                            }</div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>RugCheck score: {rugCheckScore}</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
                <div className="flex justify-between"> 
                    <div>DD.xyz</div>
                    <Tooltip>
                        <TooltipTrigger asChild>
                        <div>{
                            ddXyzScore === null ? "Risk unknown" : 
                            ddXyzScore >= 50.1 ? "High" :
                            ddXyzScore >= 23.1 ? "Medium" :
                            ddXyzScore > 0 ? "Low" : "Appears safe"
                            }</div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>${ddXyzScore}</p>
                        </TooltipContent>
                    </Tooltip>
                    
                </div>
    
            </CardContent>
        </Card>
        </TooltipProvider>
    )
}
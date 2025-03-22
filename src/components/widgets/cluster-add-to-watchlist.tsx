import { ArrowRight } from "lucide-react"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { IAccount } from "@/types/cluster"


export function ClusterAddToWatchlist({
    name, accounts, ...props
  }: {name: string, accounts: IAccount[], className: string }
) {

    const handleAdd = () => {
        // 1. POST /cls/ - create cluster
        // 2. router.push - redirect the user to cluster page
    }

    return (
    <Card {...props}>
        <CardContent className="flex flex-row justify-between items-center gap-4">
            <div>
                <p>
                You can add more accounts to the cluster or remove irrelevant ones by adding the cluster to your watchlist
                </p>
            </div>
            <div className="flex">
            <Button variant={'default'} onClick={handleAdd}>
                Add to watchlist <ArrowRight />
            </Button>
            </div>
        </CardContent>
    </Card>
    )
}
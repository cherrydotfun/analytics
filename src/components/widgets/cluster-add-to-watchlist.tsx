import { ArrowRight, LoaderCircle } from "lucide-react"
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
import { toast } from "sonner"
import { RefreshPageButton } from "../refresh-page-button"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { abbreviateAddress } from "@/lib/formatting"


export function ClusterAddToWatchlist({
    id, accounts, ...props
  }: { id: string, accounts: IAccount[], className: string }
) {
    const [isProcessing, setIsProcessing] = useState(false)
    const router = useRouter()
    const handleAdd = () => {

        setIsProcessing(true)
        
        const submittedPayload = {
            name: abbreviateAddress(id),
            addresses: accounts
                .filter(account => account.level === 0 || account.level === 1)
                .map(account => account.address)
        }

        fetch('/api/cluster/', {
            method: 'POST',
            body: JSON.stringify(submittedPayload)
        })
        .then((res) => {
            if(!res.ok) throw new Error('Bad response from server')
            return res.json()
        })
        .then(({ data: payload }) => {
            if(typeof payload === 'object' || typeof payload?.id === 'string' ){
                const clusterId = payload.id;
                router.push(`/cls/${clusterId}/edit`)
            }else{
              throw new Error('Invalid response from server')
            }
        })
        .catch((error) => {
            console.error(error, error.message)
            toast.error('Error occurred', {
                duration: Infinity,
                description: error.message || "",
                action: <RefreshPageButton />
            })
        })
        .finally(() => setIsProcessing(false));
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
            <Button variant={'default'} onClick={handleAdd} disabled={isProcessing}>
            { isProcessing ? 
            <>
                <LoaderCircle className="animate-spin mr-4"  /> Creating a cluster...
            </> :
            <>
                Add to watchlist <ArrowRight /> 
            </> 
            }
            </Button>
            </div>
        </CardContent>
    </Card>
    )
}
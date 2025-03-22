import { Button } from "@/components/ui/button";
import { RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";

function RefreshPageButton(){
    const router = useRouter();
    return (
        <div className="flex grow justify-end">
        <Button
            variant={'outline'}
            onClick={() => {
                // router.refresh()
                location.reload()
            }}
            className="flex right"
        >
            <RotateCw />
        </Button>
        </div>

    )
}

export { RefreshPageButton }
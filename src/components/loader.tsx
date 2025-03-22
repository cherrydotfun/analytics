import { LoaderCircle } from "lucide-react"

export default function Loader(){
    return (
    <div className="flex w-full h-full text-2xl items-center justify-center">
        <LoaderCircle className="animate-spin mr-4"  /> Loading
    </div>
    )
}
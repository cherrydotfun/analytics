import { LoaderCircle } from "lucide-react"

export default function Loader(){
    return (
    <div className="flex w-full text-2xl items-center justify-center mt-10 mb-5">
        <LoaderCircle className="animate-spin mr-4"  /> Checking thousands of addresses. This may take a few minutes...
    </div>
    )
}
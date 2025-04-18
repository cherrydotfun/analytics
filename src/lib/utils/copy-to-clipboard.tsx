import { toast } from "sonner"

const handleCopy = (e: any, textToCopy: string) => {
    e.stopPropagation()
    e.preventDefault()
    navigator.clipboard.writeText(textToCopy)
    toast.success('Copied to clipboard')
}

export { handleCopy }
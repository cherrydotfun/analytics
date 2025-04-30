import { Search } from "lucide-react"
import React, { useState } from "react"
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { isValidSolanaAddress } from "@/lib/solana";
import { toast } from "sonner";

export function SearchForm({ ...props }: React.ComponentProps<"form">) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const cleanSearchTerm = searchTerm.trim()
    if (e.key === "Enter" && cleanSearchTerm) {
      e.preventDefault()
      if(isValidSolanaAddress(cleanSearchTerm)){

        fetch(`/api/search/${searchTerm}`, {method: 'GET'})
        .then((res) => {
          if(!res.ok) throw new Error('Bad response from server')
          return res.json()
        })
        .then(({ type }) => {
          if (type === 'wallet') {
            router.push(`/acc/${searchTerm}`)
          } else if (type === 'token') {
            router.push(`/token/${searchTerm}`)
          } 
          else {
            throw new Error('This address is not a valid account or token')
          }
        })
        .catch((error) => {
          toast.error('Error occurred', {
            duration: 10,
            description: error.message || "",
          })
        })
        .finally(() => setIsLoading(false));


        // router.push(`/search/${searchTerm}`);
      }else{
        toast.error('Please enter a valid Solana account address (public key)')
      }
    }
  };

  return (
    <form {...props}>
      <div className="relative">
        <Label htmlFor="search" className="sr-only">
          Search
        </Label>
        <Input
            id="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Enter token or account address"
            className="w-3xs 3xs:w-2xs 2xs:w-xs xs:w-sm sm:w-md md:w-lg h-md pl-7"
            onKeyDown={handleKeyDown}
        />
        <Search className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 opacity-50 select-none" />
      </div>
    </form>
  )
}

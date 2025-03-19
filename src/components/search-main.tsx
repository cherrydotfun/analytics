import { Search } from "lucide-react"
import React, { useState } from "react"
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

export function SearchForm({ ...props }: React.ComponentProps<"form">) {
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchTerm.trim()) {
      console.log(searchTerm)
      router.push(`/acc/${searchTerm}`);
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
            placeholder="Search for an account address"
            className="w-md h-md pl-7"
            onKeyDown={handleKeyDown}
        />
        <Search className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 opacity-50 select-none" />
      </div>
    </form>
  )
}

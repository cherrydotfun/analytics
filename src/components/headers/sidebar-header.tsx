"use client"

import Image from "next/image";
import { Menu } from "lucide-react"

import { SearchForm } from "@/components/search-header"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useSidebar } from "@/components/ui/sidebar"

export function SiteHeader() {
  const { toggleSidebar } = useSidebar()

  return (
    <header className="bg-background sticky top-0 z-50 flex w-full items-center border-b">
      <div className="flex h-(--header-height) w-full items-center gap-2 px-4">
        
        <a href="/" className="text-2xl font-bold text-primary hidden sm:block">
            {process.env.NEXT_PUBLIC_APP_NAME}
        </a>

        <a href="/" className="text-2xl font-bold text-primary block sm:hidden">
            {process.env.NEXT_PUBLIC_APP_EMOJI}
        </a>

        


        <Button
          className="h-8 w-8 block sm:hidden items-center"
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
        >
          <Menu />
        </Button>
        <SearchForm className="w-full sm:ml-auto sm:w-auto" />
      </div>
    </header>
  )
}

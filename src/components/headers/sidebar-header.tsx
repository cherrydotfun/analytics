"use client"

import Image from "next/image";
import { Menu } from "lucide-react"

import { SearchForm } from "@/components/search/search-header"
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
import Link from "next/link";

export function SiteHeader() {
  const { toggleSidebar } = useSidebar()

  return (
    <header className="bg-background sticky top-0 z-50 flex w-full items-center border-b">
      <div className="flex h-(--header-height) w-full items-center gap-2 px-4">
        
        <Link href="/" className="text-2xl font-bold text-primary hidden sm:block">
            {process.env.NEXT_PUBLIC_APP_NAME}
        </Link>

        <Link href="/" className="text-2xl font-bold text-primary block sm:hidden">
            {process.env.NEXT_PUBLIC_APP_EMOJI}
        </Link>

        <Button
          className="h-8 w-8 block md:hidden"
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
        >
          <Menu className="mx-auto" />
        </Button>
        <SearchForm className="w-full sm:ml-auto sm:w-auto" />
      </div>
    </header>
  )
}

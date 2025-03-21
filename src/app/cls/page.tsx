"use client";
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/headers/sidebar-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import useTitle from '@/hooks/use-title';

import { data, columns } from "./columns"
import { DataTable } from "./data-table"


export default function Page() {
  useTitle('Watchlist')

  return (
    <div className="[--header-height:calc(--spacing(14))]">
      <SidebarProvider className="flex flex-col">
        <SiteHeader />
        <div className="flex flex-1">
          <AppSidebar />
          <SidebarInset>
            <div className="flex flex-1 flex-col gap-4 p-4">
            <DataTable columns={columns} data={data} />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  )
}

"use client";
import { toast } from "sonner";
import { useEffect, useState } from "react";

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/headers/sidebar-header"
import { RefreshPageButton } from "@/components/refresh-page-button"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import useTitle from '@/hooks/use-title';

import { columns } from "./columns"
import { DataTable } from "./data-table"
import { IClusterSummary } from "@/types/cluster";
import Loader from "@/components/loader";


export default function Page() {
  useTitle('Watchlist')
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<IClusterSummary[] | null>(null)

  useEffect(() => {
    setIsLoading(true)
    fetch(`/api/cluster/`, {method: 'GET'})
      .then((res) => {
        if(!res.ok) throw new Error('Bad response from server')
        return res.json()
      })
      .then(({ data: payload }) => {
        if(Array.isArray(payload)){
          setData(payload)
        }else{
          throw new Error('Invalid response from server')
        }
      })
      .catch((error) => {
        toast.error('Error occurred', {
          duration: Infinity,
          description: error.message || "",
          action: <RefreshPageButton />
        })
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="[--header-height:calc(--spacing(14))]">
      <SidebarProvider className="flex flex-col">
        <SiteHeader />
        <div className="flex flex-1">
          <AppSidebar />
          <SidebarInset>
            { data === null ? 
            <Loader />
            :
            <div className="flex flex-1 flex-col gap-4 p-4">
            <h1 className="text-2xl font-bold">Watchlist</h1>
            <DataTable columns={columns} data={data} />
            </div>
            }
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  )
}

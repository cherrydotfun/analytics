"use client";
import React, {Fragment, useEffect, useRef} from 'react';
import cytoscape from 'cytoscape';
import { useParams } from 'next/navigation';

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/headers/sidebar-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

import useTitle from '@/hooks/use-title';

import { data, columns } from "./columns"
import { DataTable } from "./data-table"


export default function Page() {
  const { clusterId } = useParams<{ clusterId: string }>();

  useEffect(() => {
    // useTitle(``)
  }, [clusterId])

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

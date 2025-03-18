"use client";
import React from 'react';
import cytoscape from 'cytoscape';

import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Share } from "lucide-react"

import IdentityIcon from "@/components/identicon"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/headers/sidebar-header"

import { ClusterBalanceCard } from "@/components/widgets/cluster-balance-card"
import { ClusterPnlCard } from '@/components/widgets/cluster-pnl-card';


const cluster = {
  id: "73WakrfVbNJBaAmhQtEeDv1",
  name: "Cluster 1",
  balanceUsd: 1234567.89,
  pnlPerc: 15.4,
  pnlUsd: 154001.65,
  unrealizedPnlUsd: 10000,
  holdings: [
    {
      "ca": "6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN",
      "symbol": "TRUMP",
      "name": "OFFICIAL TRUMP",
      "valueUsd": "50230",
      "imageUrl": "https://arweave.net/VQrPjACwnQRmxdKBTqNwPiyo65x7LAT773t8Kd7YBzw"
    },
    {
      "ca": "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
      "symbol": "$WIF",
      "name": "dogwifhat",
      "valueUsd": "69420",
      "imageUrl": "https://bafkreibk3covs5ltyqxa272uodhculbr6kea6betidfwy3ajsav2vjzyum.ipfs.nftstorage.link"
    },
  ],
  accounts: [
    {
      "address": "5zsbHMxdgLUPMFPHTwCykxbbmQ6R7dd8T9vhzWKfuTdm",
      "balance": "1000000",
      "pnlUsd": "154000",
      "pnlPerc": "15.4",
      "volumeUsd": "1000000"
    },
    {
      "address": "EdCNh8EzETJLFphW8yvdY7rDd8zBiyweiz8DU5gUUUka",
      "balance": "1000000",
      "pnlUsd": "154000",
      "pnlPer": "15.4",
      "volumeUsd": "1000000"
    },
    {
      "address": "CqrwsE7Ni9AM3EGtJ68Grg9VLwP1xJWNkc5WXjLPECN6",
      "balance": "1000000",
      "pnlUsd": "154000",
      "pnlPerc": "15.4",
      "volumeUsd": "1000000"
    },
  ],
  accountLinks: [
    {
      "source": "5zsbHMxdgLUPMFPHTwCykxbbmQ6R7dd8T9vhzWKfuTdm",
      "target": "EdCNh8EzETJLFphW8yvdY7rDd8zBiyweiz8DU5gUUUka",
      "volumeUsd": "1000000"
    },
  ]

}


export default function Page() {
  return (
    <div className="[--header-height:calc(--spacing(14))]">
      <SidebarProvider className="flex flex-col">
        <SiteHeader />
        <div className="flex flex-1">
          <AppSidebar />
          <SidebarInset>
            <div className="flex flex-1 flex-col gap-4 p-4">
              <div className="flex flex-row justify-between">
                <div className="flex flex-row">
                  <div className="mr-4">
                  <IdentityIcon username={cluster.id} width={50} style={{"backgroundColor": "#ccc", "borderRadius": "50%"}} />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">{cluster.name}</h1>
                    <p className="text-xs text-gray-400">Private cluster</p>
                  </div>
                </div>
                <div className="flex flex-row">
                  <Button>
                    <Share /> Share
                  </Button>
                </div>
              </div>
              <ClusterBalanceCard balanceUsd={cluster.balanceUsd} />
              <ClusterPnlCard pnlPerc={cluster.pnlPerc} pnlUsd={cluster.pnlUsd} unrealizedPnlUsd={cluster.unrealizedPnlUsd} />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  )
}

"use client";
import React, { useEffect, useRef, useState } from 'react';
import type { Metadata } from 'next';
import { toast } from "sonner"

import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Share, Pencil } from "lucide-react"
import { useRouter, useParams } from 'next/navigation';

import IdentityIcon from "@/components/identicon"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/headers/sidebar-header"
import { ClusterBalanceCard } from "@/components/widgets/cluster-balance-card"
import { ClusterPnlCard } from "@/components/widgets/cluster-pnl-card"
import { ClusterAssociatedAccounts } from "@/components/widgets/cluster-accounts-card"
import { ClusterAchievements } from "@/components/widgets/cluster-achievements-card"
import { ClusterTopHoldings } from "@/components/widgets/cluster-top-holdings-card"
import { ClusterRecentTransactions } from "@/components/widgets/cluster-recent-txs-card"
import Loader from '@/components/loader';
import { RefreshPageButton } from '@/components/refresh-page-button';
import { ICluster } from '@/types/cluster';
import { truncateHeading } from '@/lib/formatting';

export default function Page() {
  const router = useRouter();
  const { clusterId } = useParams<{ clusterId: string }>();

  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<ICluster | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const handleEdit = () => router.push(`/cls/${clusterId}/edit`)

  // We'll reference this container so we can auto-scroll
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Start loading
    setIsLoading(true);
    // Clear old logs
    setLogs([]);

    // Instead of fetch, we use SSE to /api/cluster/[clusterId]/stream
    // You need a corresponding server route that streams logs + final data.
    const es = new EventSource(`/api/cluster/${clusterId}/stream`);

    es.onmessage = (event) => {
      // If final result
      if (event.data.startsWith("FINAL_RESULT:")) {
        try {
          const jsonStr = event.data.replace("FINAL_RESULT: ", "");
          const parsed = JSON.parse(jsonStr);

          // We expect 'parsed' to be your cluster object
          setData(parsed);
          setIsLoading(false);

          // Clear logs, close SSE
          setLogs([]);
          es.close();
        } catch (err: any) {
          toast.error('Error parsing final result', {
            duration: Infinity,
            description: err?.message || "",
            action: <RefreshPageButton />
          });
          setIsLoading(false);
          es.close();
        }
      } else if (event.data.startsWith("ERROR:")) {
        toast.error('Server-Side Error', {
          duration: Infinity,
          description: event.data,
          action: <RefreshPageButton />
        });
        setIsLoading(false);
        es.close();
      } else {
        // otherwise treat as BFS log line
        setLogs((prev) => [...prev, event.data]);
      }
    };

    es.onerror = (err) => {
      console.error('SSE error:', err);
      toast.error('Connection error with SSE', {
        duration: Infinity,
        action: <RefreshPageButton />
      });
      setIsLoading(false);
      es.close();
    };

    return () => {
      es.close();
    };
  }, [clusterId]);

  // Auto-scroll logs to bottom when they change
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="[--header-height:calc(--spacing(14))]">
      <SidebarProvider className="flex flex-col">
        <SiteHeader />
        <div className="flex flex-1">
          <AppSidebar />
          <SidebarInset>
            {/* Show the BFS logs panel only if we're still loading and have logs */}
            {isLoading && logs.length > 0 && (
              <div
                ref={logContainerRef}
                className="mb-6 p-4 border border-green-500 bg-black text-green-400 rounded overflow-auto h-[60vh] font-mono text-sm leading-tight shadow-[0_0_8px_#00ff00]"
              >
                {logs.map((line, i) => (
                  <div key={i} className="whitespace-pre-wrap">
                    {line}
                  </div>
                ))}
              </div>
            )}
            {data === null ? (
              <Loader loading={isLoading} />
            ) : (
              <div className="flex flex-1 flex-col gap-4 p-4">
                {/* cluster header */}
                <div className="flex flex-row justify-between items-center">
                  <div className="flex flex-row gap-4 w-2/3">
                    <div className="mr-4">
                      <IdentityIcon
                        username={data.id || ""}
                        width={50}
                        style={{ backgroundColor: "#333", borderRadius: "50%" }}
                      />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold">{truncateHeading(data.name)}</h1>
                      <p className="text-xs text-gray-400">Private cluster</p>
                    </div>
                  </div>
                  <div className="flex flex-row gap-4">
                    
                    <div className="hidden md:block">
                      <Button variant={'outline'} onClick={handleEdit}>
                        <Pencil /> Edit
                      </Button>
                    </div>
                    <div className="block md:hidden">
                      <Button variant={'outline'} onClick={handleEdit}>
                        <Pencil />
                      </Button>
                    </div>
                    <div className="hidden md:block">
                      <Button>
                        <Share /> Share
                      </Button>
                    </div>
                    <div className="block md:hidden">
                      <Button>
                        <Share />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* cluster metrics */}
                <div className="flex flex-col lg:flex-row  gap-4">
                  <div className="flex flex-col lg:w-1/2 gap-4">
                    <ClusterBalanceCard balanceUsd={data.financials.balanceUsd || 0} />
                  </div>
                  <ClusterPnlCard pnlPerc={data.financials.pnlPerc || 0} pnlUsd={data.financials.pnlUsd || 0} unrealizedPnlUsd={data.financials.unrealizedPnlUsd || 0} />
                  {/* <ClusterAchievements achievements={data.achievements || []} className="lg:w-2/3 flex" /> */}
                </div>

                {/* tabs */}
                <Tabs defaultValue="accounts" className="flex w-full">
                  <TabsList>
                    <TabsTrigger value="accounts" className="cursor-pointer">
                      Associated accounts
                    </TabsTrigger>
                    <TabsTrigger value="holdings" className="cursor-pointer">
                      Top holdings
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="accounts">
                    <ClusterAssociatedAccounts
                      accounts={data.associations?.accounts || []}
                      accountLinks={data.associations?.accountLinks || []}
                      className="w-full flex"
                    />
                  </TabsContent>
                  <TabsContent value="holdings">
                    <ClusterTopHoldings
                      holdings={data.financials?.holdings || []}
                      className="w-full flex"
                    />
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  );
}

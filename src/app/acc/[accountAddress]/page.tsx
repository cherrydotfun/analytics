"use client";
import React, { useEffect, useState, useRef } from 'react';
import type { Metadata } from 'next';
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Share, Copy } from "lucide-react"
import { useRouter, useParams } from 'next/navigation';

import IdentityIcon from "@/components/identicon"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/headers/sidebar-header"
import { ClusterBalanceCard } from "@/components/widgets/cluster-balance-card"
import { ClusterPnlCard } from "@/components/widgets/cluster-pnl-card"
import { ClusterAssociatedAccounts } from "@/components/widgets/cluster-accounts-card"
import { ClusterAchievements } from "@/components/widgets/cluster-achievements-card"
import { ClusterTopHoldings } from "@/components/widgets/cluster-top-holdings-card"
import { ClusterAddToWatchlist } from '@/components/widgets/cluster-add-to-watchlist';
import Loader from '@/components/loader';
import { toast } from 'sonner';
import { RefreshPageButton } from '@/components/refresh-page-button';
import { truncateHeading } from '@/lib/formatting';
import { ICluster } from '@/types/cluster';

export default function Page() {
  const router = useRouter();
  const { accountAddress } = useParams<{ accountAddress: string }>();

  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<ICluster | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  // Ref for the logs container – so we can auto-scroll
  const logsRef = useRef<HTMLDivElement>(null);

  // On mount, start SSE connection
  useEffect(() => {
    setIsLoading(true);
    setLogs([]); // clear old logs, in case user navigates between addresses

    // Create an EventSource to your SSE endpoint
    const es = new EventSource(`/api/address/${accountAddress}/stream`);

    es.onmessage = (event) => {
      // Check if final result
      if (event.data.startsWith("FINAL_RESULT:")) {
        try {
          const jsonStr = event.data.replace("FINAL_RESULT: ", "");
          const parsed = JSON.parse(jsonStr);

          setData(parsed);
          setIsLoading(false);

          // Clear logs + close SSE
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
        // If the server sends an error
        toast.error('Server-Side Error', {
          duration: Infinity,
          description: event.data,
          action: <RefreshPageButton />
        });
        setIsLoading(false);
        es.close();
      } else {
        // Otherwise treat as BFS log line
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
  }, [accountAddress]);

  // Auto-scroll logs to bottom whenever new lines are added
  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
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
                ref={logsRef}
                className="mb-6 p-4 border bg-black text-white rounded overflow-auto  h-[60vh]"
              >
                {logs.map((line, i) => (
                  <div key={i} className="text-sm">
                    {line}
                  </div>
                ))}
              </div>
            )}
            {/* If we haven't received final data yet, show loader or partial UI */}
            {data === null ? (
              <Loader loading={isLoading} />
            ) : (
              <div className="flex flex-1 flex-col gap-4 p-4">
                {/* cluster header */}
                <div className="flex flex-row justify-between items-center">
                  <div className="flex flex-row">
                    <div className="mr-4">
                      <IdentityIcon
                        username={data.id}
                        width={50}
                        style={{ backgroundColor: "#333", borderRadius: "50%" }}
                      />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold">{truncateHeading(data.name)}</h1>
                      <p className="text-xs text-gray-400">Public cluster</p>
                    </div>
                  </div>
                  <div className="flex flex-row gap-4">
                    {/* <Button variant={'outline'}>
                      <Copy /> Clone
                    </Button> */}
                    <Button>
                      <Share /> Share
                    </Button>    
                    <div className="block md:hidden">
                      <Button>
                        <Share />
                      </Button>
                    </div>
                  </div>
                </div>

                <ClusterAddToWatchlist
                  id={data.id}
                  accounts={data.associations.accounts}
                  className="bg-card brightness-200"
                />

                {/* cluster metrics */}
                <div className="flex flex-col lg:flex-row  gap-4">
                  <div className="flex flex-col lg:w-1/2 gap-4">
                    <ClusterBalanceCard balanceUsd={data.financials.balanceUsd} />
                    
                  </div>
                  <ClusterPnlCard pnlPerc={data.financials.pnlPerc} pnlUsd={data.financials.pnlUsd} unrealizedPnlUsd={data.financials.unrealizedPnlUsd} />
                  {/* <ClusterAchievements achievements={data.achievements} className="lg:w-2/3 flex" /> */}
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
                      accounts={data.associations.accounts}
                      accountLinks={data.associations.accountLinks}
                      className="w-full flex"
                    />
                  </TabsContent>
                  <TabsContent value="holdings">
                    <ClusterTopHoldings
                      holdings={data.financials.holdings}
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

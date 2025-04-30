"use client";
import { toast } from "sonner";
import { useEffect, useState } from "react";

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/headers/sidebar-header"
import { RefreshPageButton } from "@/components/refresh-page-button"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import useTitle from '@/hooks/use-title';

import Loader from "@/components/loader";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";


export default function Page() {
  useTitle('Search')
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<String|null>(null)
  const { address } = useParams<{ address: string }>();
  const router = useRouter();

  useEffect(() => {
    setIsLoading(true)
    fetch(`/api/address/${address}`, {method: 'GET'})
      .then((res) => {
        if(!res.ok) throw new Error('Bad response from server')
        return res.json()
      })
      .then(({ data: payload }) => {
        // if type == 'account', then redirect to /acc/[accountAddress]
        // if type == 'token', then redirect to /token/[tokenAddress]
        // otherwise direct to 404 page
        if (payload.type === 'account') {
          setData("account")
          router.push(`/acc/${address}`)
        } else if (payload.type === 'token') {
          setData
          router.push(`/token/${address}`)
        } 
        else {
          setData(null)
          throw new Error('This address is not a valid account or token')
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
            { !data && isLoading ? 
            <Loader />
            :
            !data && !isLoading ?

            <div className="flex flex-1 flex-col gap-4 p-4">
                <h2 className="text-2xl font-bold">No results found</h2>
                <p className="text-muted-foreground">
                  We couldn't find any results for the address you searched for.
                  Please check the address and try again.
                </p>
                <Link className=" hover:underline" href="/">Go back to the homepage</Link>
            </div>
            :
            <div className="flex flex-1 flex-col gap-4 p-4">
                <h2 className="text-2xl font-bold">Redirecting...</h2>
                We are redirecting you to the appropriate page. Please wait...
                If you are not redirected, please click the button below.

                <button className="btn btn-primary" onClick={() => router.push(`/acc/${data}`)}>Go to Account</button>
            </div>
            }
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  )
}

"use client";
import React, { useEffect, useState, SetStateAction } from 'react';
import cytoscape from 'cytoscape';
import type { Metadata } from 'next';
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Share, Pencil, List, Network, CirclePlus, Save } from "lucide-react"

import IdentityIcon from "@/components/identicon"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/headers/sidebar-header"
import { ClusterBalanceCard } from "@/components/widgets/cluster-balance-card"
import { ClusterPnlCard } from "@/components/widgets/cluster-pnl-card"
import { ClusterAssociatedAccountsWizard } from "@/components/widgets/cluster-accounts-wizard-card"

import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
  } from "@/components/ui/drawer"  

import useTitle from '@/hooks/use-title';
import { useParams, useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { IAccountEditable, ICluster } from '@/types/cluster';
import Loader from '@/components/loader';


function AddAccountDrawer({ isOpen, setOpenCbk, onSubmitCbk, ...props }: { isOpen: boolean, setOpenCbk: React.Dispatch<SetStateAction<boolean>>, onSubmitCbk: any }){
    const [accountAddressInput, setAccountAddressInput] = useState("")

    return (
    <Drawer open={isOpen} onOpenChange={(newIsOpen) => setOpenCbk(newIsOpen)}>
    <DrawerContent>
        <DrawerHeader>
        <DrawerTitle>Add new account to cluster</DrawerTitle>
        {/* <DrawerDescription>This action cannot be undone.</DrawerDescription> */}
        </DrawerHeader>
        <DrawerFooter>
            <Input 
                placeholder='Enter account address'
                value={accountAddressInput}
                onChange={(e) => setAccountAddressInput(e.target.value)}
                />
        <Button onClick={() => {
            onSubmitCbk()
            setOpenCbk(false)
        }}>Add</Button>
        <DrawerClose>

            <Button variant="outline">Cancel</Button>
        </DrawerClose>
        </DrawerFooter>
    </DrawerContent>
    </Drawer>
    )
}


export default function Page() {
    const router = useRouter();
    const { clusterId } = useParams<{ clusterId: string }>();
    const [isLoading, setIsLoading] = useState(false)
    const [data, setData] = useState<ICluster | null>(null)

    const [accounts, setAccounts] = useState<IAccountEditable[] | null>([])
    const [newName, setNewName] = useState("")

    const [isDrawerOpen, setDrawerOpen] = useState(false)

    useEffect(() => {
        setIsLoading(true)
        fetch(`/api/cluster/${clusterId}`, {method: 'GET'})
        .then((res) => {
            if(!res.ok) throw new Error('')
            return res.json()
        })
        .then(({data: _data}) => {
            setData(_data)
            setAccounts(_data.accounts.map(( account: IAccountEditable ) => (
                {
                    ...account,
                    isIncluded: true
                }
            )))
        })
        .catch((error) => {
            // TODO
        })
        .finally(() => setIsLoading(false));
    }, [clusterId]);

    const handleAddAccount = ({ accountAddress }: { accountAddress: string}) => {

    }


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

                {/* cluster header */}
                <div className="flex flex-row justify-between">
                <div className="flex flex-row">
                    <div className="mr-4">
                    <IdentityIcon username={data.id} width={50} style={{"backgroundColor": "#333", "borderRadius": "50%"}} />
                    </div>
                    <div>
                    <h1 className="text-2xl font-bold">{data.name}</h1>
                    <p className="text-xs text-gray-400">Private cluster</p>
                    </div>
                </div>
                <AddAccountDrawer isOpen={isDrawerOpen} setOpenCbk={setDrawerOpen} onSubmitCbk={handleAddAccount} />
                <div className="flex flex-row gap-4">
                    <Button variant={'outline'} onClick={() => setDrawerOpen(true)}>
                        <CirclePlus /> Add new account
                    </Button>
                    <Button>
                        <Save /> Save
                    </Button>
                </div>
                </div>
                
                {/* metrics */}

                <ClusterAssociatedAccountsWizard accounts={accounts} accountLinks={data.accountLinks} className="w-full flex" />

            </div>
            }
            </SidebarInset>
        </div>
        </SidebarProvider>
    </div>
    )
}

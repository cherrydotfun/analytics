"use client";
import React, { useEffect, useState, SetStateAction } from 'react';
import cytoscape from 'cytoscape';
import type { Metadata } from 'next';
import { toast } from "sonner"

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
import { isValidSolanaAddress } from '@/lib/solana';
import { RefreshPageButton } from '@/components/refresh-page-button';
import { abbreviateAddress, truncateHeading } from '@/lib/formatting';


function AddAccountDrawer({ isOpen, setOpenCbk, onSubmitCbk, ...props }: { isOpen: boolean, setOpenCbk: React.Dispatch<SetStateAction<boolean>>, onSubmitCbk: any }){
    const [accountAddressInput, setAccountAddressInput] = useState("")
    
    useEffect(() => {
        if(!isOpen) setAccountAddressInput("")
    }, [isOpen])

    return (
    <Drawer open={isOpen} onOpenChange={(newIsOpen) => setOpenCbk(newIsOpen)}>
    <DrawerContent>
        <DrawerHeader>
        <DrawerTitle>
            <p className="text-center">Add a new account address</p>
        </DrawerTitle>
        {/* <DrawerDescription>This action cannot be undone.</DrawerDescription> */}
        </DrawerHeader>
        <DrawerFooter>
            <div className="flex flex-col w-full sm:w-xl md:w-2xl mx-auto">
                <Input 
                    placeholder='Enter account address'
                    value={accountAddressInput}
                    onChange={(e) => setAccountAddressInput(e.target.value)}
                    className="w-full text-center mb-2"
                />
                <p className="text-xs text-gray-400 mb-4 text-center">
                    Solana account address is a 44-character base58 public key
                </p>
                <Button
                    className="w-full"
                    onClick={() => {
                        onSubmitCbk({ newAddress: accountAddressInput })
                        setOpenCbk(false)
                    }}
                    disabled={!isValidSolanaAddress(accountAddressInput)}
                >
                    Add</Button>
            </div>
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

    const [accounts, setAccounts] = useState<IAccountEditable[]>([])
    const [newName, setNewName] = useState("")

    const [isDrawerOpen, setDrawerOpen] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)

    const handleToggle = (address: string) => {
        setAccounts((prev) =>
          prev.map((acc) =>
            acc.address === address ? { ...acc, isIncluded: !acc.isIncluded } : acc
          )
        );
    };

    const handleAddAccount = ({ newAddress }: { newAddress: string}) => {
        const isNewAddress = accounts.every(account => account.address !== newAddress)
        if(isNewAddress){
            const newAccount: IAccountEditable  = {
                address: newAddress,
                pnlPerc: 0,
                pnlUsd: 0,
                balance: 0,
                volumeUsd: 0,
                isIncluded: true
            }

            setAccounts((prev) => 
            [
                ...prev,
                newAccount
            ]);

            toast.success("Account has been successfully added to the list. Hit Save to update the cluster.")
        }
        else {
            toast.info("This address is already on the list, and has not been re-added.")
        }
    }

    const handleSave = () => {

        setIsProcessing(true)

        const submittedPayload = {
            name: abbreviateAddress(data?.id || ""),
            addresses: accounts
                .filter(account => account.isIncluded)
                .map(account => account.address)
        }

        fetch(`/api/cluster/${clusterId}`, {
            method: 'PUT',
            body: JSON.stringify(submittedPayload)
        })
        .then((res) => {
            if(!res.ok) throw new Error('Bad response from server')
            return res.json()
        })
        .then(({ status }) => {
            if(status === 'ok'){
                router.push(`/cls/${clusterId}`)
            }else{
              throw new Error('Invalid response from server')
            }
        })
        .catch((error) => {
            console.error(error, error.message)
            toast.error('Error occurred', {
                duration: Infinity,
                description: error.message || "",
                action: <RefreshPageButton />
            })
        })
        .finally(() => setIsProcessing(false));

    }

    useEffect(() => {
        setIsLoading(true)
        fetch(`/api/cluster/${clusterId}`, {method: 'GET'})
        .then((res) => {
            if(!res.ok) throw new Error('Bad response from server')
            return res.json()
        })
        .then(({data: payload}) => {
            console.log(payload)
            if(typeof payload === 'object' || typeof payload?.id === 'string' ){
                setData(payload)
                setAccounts(payload.associations.accounts.map(( account: IAccountEditable ) => (
                    {
                        ...account,
                        isIncluded: account.level === 0 || account.level === 1
                    }
                )))
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
    }, [clusterId]);

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
                <div className="flex flex-row justify-between items-center">
                <div className="flex flex-row">
                    <div className="mr-4">
                    <IdentityIcon username={data.id} width={50} style={{"backgroundColor": "#333", "borderRadius": "50%"}} />
                    </div>
                    <div>
                    <h1 className="text-2xl font-bold">{truncateHeading(data.name)}</h1>
                    <p className="text-xs text-gray-400">Private cluster</p>
                    </div>
                </div>
                <AddAccountDrawer
                    isOpen={isDrawerOpen}
                    setOpenCbk={setDrawerOpen}
                    onSubmitCbk={handleAddAccount}
                />
                <div className="flex flex-row gap-4">

                    {/* add button */}
                    <div className="hidden md:block">
                    <Button variant={'outline'} onClick={() => setDrawerOpen(true)}>
                        <CirclePlus /> Add new address
                    </Button>
                    </div>
                    <div className="block md:hidden">
                    <Button variant={'outline'} onClick={() => setDrawerOpen(true)}>
                        <CirclePlus />
                    </Button>
                    </div>

                    {/* save button */}
                    <div className="hidden md:block">
                    <Button onClick={handleSave}>
                        <Save /> Save
                    </Button>
                    </div>
                    <div className="block md:hidden">
                    <Button onClick={handleSave}>
                        <Save />
                    </Button>
                    </div>
                </div>
                </div>
                
                {/* metrics */}

                <ClusterAssociatedAccountsWizard accounts={accounts} accountLinks={data.associations.accountLinks} onToggle={handleToggle} className="w-full flex" />

            </div>
            }
            </SidebarInset>
        </div>
        </SidebarProvider>
    </div>
    )
}

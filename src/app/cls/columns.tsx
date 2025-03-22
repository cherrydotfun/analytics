"use client"
import { ColumnDef } from "@tanstack/react-table"
import { IClusterSummary } from "@/types/cluster"

export const columns: ColumnDef<IClusterSummary>[] = [
    {
        id: "name",
        header: "Name",
        accessorKey: "name",
    },
    {
        id: "nAccounts",
        header: "Accounts",
        accessorFn: (cluster) => (cluster.addresses.length || 0),
    },
    // {
    //     id: "createdAt",
    //     header: "Date created",
    //     accessorKey: "createdAt"
    // }
]
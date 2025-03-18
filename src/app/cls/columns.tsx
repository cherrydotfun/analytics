"use client"
 import { ColumnDef } from "@tanstack/react-table"

type Cluster = {
    id: string
    name: string
    nAccounts: number
    pnlPercent: number
}

export const data: Cluster[] = [
    {
        id: "728ed52f",
        name: "My accounts",
        nAccounts: 100,
        pnlPercent: 15.4,
    },
    {
        id: "489e1d42",
        name: "Trump's team accounts",
        nAccounts: 125,
        pnlPercent: -99.9,
    },
]

export const columns: ColumnDef<Cluster>[] = [
    {
        id: "name",
        header: "Name",
        accessorKey: "name",
    },
    {
        id: "nAccounts",
        header: "Accounts",
        accessorKey: "nAccounts",
    },
    {
        id: "pnlPercent",
        header: "PnL %",
        accessorKey: "pnlPercent",
    },
]
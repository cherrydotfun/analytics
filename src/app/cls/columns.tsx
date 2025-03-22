"use client"
import { ColumnDef } from "@tanstack/react-table"
import { IClusterSummary } from "@/types/cluster"

export const data: IClusterSummary[] = [
    {
        id: "728ed52f",
        name: "My accounts",
        nAccounts: 100,
        pnlPerc: 15.4,
    },
    {
        id: "489e1d42",
        name: "Trump's team accounts",
        nAccounts: 125,
        pnlPerc: -99.9,
    },
]

export const columns: ColumnDef<IClusterSummary>[] = [
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
        id: "pnlPerc",
        header: "PnL %",
        accessorKey: "pnlPerc",
    },
]
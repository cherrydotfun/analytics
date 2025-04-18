"use client"

import * as React from "react"
import Image from "next/image"
import {
  Eye,
  Compass,
  Command,
  Frame,
  LifeBuoy,
  Map,
  PieChart,
  Send,
  Settings2,
  SquareTerminal,
  Trophy,
  TrendingUp
} from "lucide-react"

// import { NavMain } from "@/components/nav-main"
import { NavSocial } from "@/components/nav-social"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import Link from "next/link"

const data = {
  user: {
    id: "anonymous",
    name: "anonymous",
    // email: "m@example.com",
    // avatar: "",
  },
  // navMain: [
  //   {
  //     title: "Trending",
  //     url: "#",
  //     icon: TrendingUp,
  //     isActive: true,
  //   },
  //   {
  //     title: "Leaderboard",
  //     url: "#",
  //     icon: Trophy,
  //     isActive: true,
  //   },
  // ],
  navSocial: [
    {
      title: "Join our Telegram",
      url: process.env.NEXT_PUBLIC_TG_URL,
      iconUrl: '/icons/tg-logo.svg',
    },
    {
      title: "Follow us on X",
      url: process.env.NEXT_PUBLIC_X_URL,
      iconUrl: '/icons/x-logo.svg',
    },
  ]
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      className="top-(--header-height) h-[calc(100svh-var(--header-height))]!"
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>

          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/cls/">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Eye className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Watchlist</span>
                  <span className="truncate text-xs">Track saved accounts</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {/* <NavMain items={data.navMain} /> */}
        <NavSocial items={data.navSocial} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}

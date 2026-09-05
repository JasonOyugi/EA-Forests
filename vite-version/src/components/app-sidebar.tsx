"use client"

import * as React from "react"
import {
  LayoutDashboard,
  ShoppingCart,
  Trees,
} from "lucide-react"
import { Link } from "react-router-dom"
import { Logo } from "@/components/logo"
import { SidebarNotification } from "@/components/sidebar-notification"

import { NavMain } from "@/components/nav-main"
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

const data = {
  user: {
    name: "EA Forests",
    email: "ea@forests.com",
    avatar: "",
  },
  navGroups: [
    {
      label: "EA Forests",
      items: [
        {
          title: "Portfolio Preview",
          url: "/dashboard",
          icon: LayoutDashboard,
        },
        {
          title: "Market Data",
          url: "#",
          icon: ShoppingCart,
          items: [
            {
              title: "Seed & seedlings",
              url: "/shop/seedlings",
            },
            {
              title: "Land & services",
              url: "/shop/forests-land",
            },
            {
              title: "Market map",
              url: "/shop/sector-map",
            },
          ],
        },
        {
          title: "Models",
          url: "#",
          icon: Trees,
          items: [
            {
              title: "Site-species Analysis",
              url: "/models/site-species-analysis",
            },
            {
              title: "Silvicultural Models",
              url: "/models/model-2",
            },
            {
              title: "Roundwood Production",
              url: "/models/model-3",
            },
            {
              title: "Clonal Nursery",
              url: "/models/clonal-eucalyptus-nursery",
            },
          ],
        },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg text-primary-foreground">
                  <Logo size={24} className="text-current" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">EA Forests</span>
                  <span className="truncate text-xs">Services</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {data.navGroups.map((group) => (
          <NavMain
            key={group.label}
            label={group.label}
            items={group.items}
            collapsible={group.label === "Back Pages"}
            defaultOpen={group.label !== "Back Pages"}
          />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarNotification />
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}

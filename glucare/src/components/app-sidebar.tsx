"use client"

import * as React from "react"
import {
  CalendarDays,
  HeartPulse,
  Stethoscope,
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
    name: "GluCare",
    email: "care@glucare.health",
    avatar: "",
  },
  navGroups: [
    {
      label: "Care",
      items: [
        {
          title: "Diabetes Care",
          url: "/shop/diabetes-programs",
          icon: Stethoscope,
        },
        {
          title: "Health Tools",
          url: "#",
          icon: HeartPulse,
          items: [
            {
              title: "BMI & Metabolic Risk",
              url: "/models/bmi-calculator",
            },
            {
              title: "Diabetes Risk Assessment",
              url: "/models/diabetes-risk-assessment",
            },
            {
              title: "3D Vitality Explorer",
              url: "/models/vitality-3d",
            },
          ],
        },
        {
          title: "Booking Calendar",
          url: "/calendar",
          icon: CalendarDays,
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
              <Link to="/landing">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg text-primary-foreground">
                  <Logo size={24} className="text-current" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">GluCare</span>
                  <span className="truncate text-xs">Diabetes Care</span>
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
            defaultOpen
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

"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Shield,
  AlertTriangle,
  Settings,
  HelpCircle,
  CreditCard,
  ShoppingCart,
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
    name: "Prodigy GluCare",
    email: "care@prodigyglucare.com",
    avatar: "",
  },
  navGroups: [
    {
      label: "User Products",
      items: [
        {
          title: "Operations Dashboard",
          url: "/dashboard",
          icon: LayoutDashboard,
        },
        {
          title: "Healthcare Store",
          url: "#",
          icon: ShoppingCart,
          items: [
            {
              title: "Wellness Products",
              url: "/shop/wellness-products",
            },
            {
              title: "Hospital Care",
              url: "/shop/hospital-services",
            },
          ],
        },
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
      ],
    },
    {
      label: "Back Pages",
      items: [
        {
          title: "Auth Pages",
          url: "#",
          icon: Shield,
          items: [
            {
              title: "Sign In 1",
              url: "/auth/sign-in",
            },
            {
              title: "Sign In 2",
              url: "/auth/sign-in-2",
            },
            {
              title: "Sign In 3",
              url: "/auth/sign-in-3",
            },
            {
              title: "Sign Up 1",
              url: "/auth/sign-up",
            },
            {
              title: "Sign Up 2",
              url: "/auth/sign-up-2",
            },
            {
              title: "Sign Up 3",
              url: "/auth/sign-up-3",
            },
            {
              title: "Forgot Password 1",
              url: "/auth/forgot-password",
            },
            {
              title: "Forgot Password 2",
              url: "/auth/forgot-password-2",
            },
            {
              title: "Forgot Password 3",
              url: "/auth/forgot-password-3",
            }
          ],
        },
        {
          title: "Errors",
          url: "#",
          icon: AlertTriangle,
          items: [
            {
              title: "Unauthorized",
              url: "/errors/unauthorized",
            },
            {
              title: "Forbidden",
              url: "/errors/forbidden",
            },
            {
              title: "Not Found",
              url: "/errors/not-found",
            },
            {
              title: "Internal Server Error",
              url: "/errors/internal-server-error",
            },
            {
              title: "Under Maintenance",
              url: "/errors/under-maintenance",
            },
          ],
        },
        {
          title: "Settings",
          url: "#",
          icon: Settings,
          items: [
            {
              title: "User Settings",
              url: "/settings/user",
            },
            {
              title: "Account Settings",
              url: "/settings/account",
            },
            {
              title: "Plans & Billing",
              url: "/settings/billing",
            },
            {
              title: "Appearance",
              url: "/settings/appearance",
            },
            {
              title: "Notifications",
              url: "/settings/notifications",
            },
            {
              title: "Connections",
              url: "/settings/connections",
            },
          ],
        },
        {
          title: "FAQs",
          url: "/faqs",
          icon: HelpCircle,
        },
        {
          title: "Pricing",
          url: "/pricing",
          icon: CreditCard,
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
                  <span className="truncate font-medium">Prodigy GluCare</span>
                  <span className="truncate text-xs">Wellness & Diabetes Care</span>
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

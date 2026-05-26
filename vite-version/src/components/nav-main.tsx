"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"
import { Link, useLocation } from "react-router-dom"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

type NavItem = {
  title: string
  url: string
  icon?: LucideIcon
  isActive?: boolean
  items?: {
    title: string
    url: string
    isActive?: boolean
  }[]
}

export function NavMain({
  label,
  items,
  collapsible = false,
  defaultOpen = true,
}: {
  label: string
  items: NavItem[]
  collapsible?: boolean
  defaultOpen?: boolean
}) {
  const location = useLocation()

  const shouldBeOpen = (item: NavItem) => {
    if (item.isActive) return true
    return (
      location.pathname === item.url ||
      item.items?.some((subItem) => location.pathname === subItem.url) ||
      false
    )
  }

  const menuContent = (
    <SidebarMenu>
      {items.map((item) => (
        <Collapsible
          key={item.title}
          asChild
          defaultOpen={shouldBeOpen(item)}
          className="group/collapsible"
        >
          <SidebarMenuItem>
            {item.items?.length ? (
              <>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title} className="cursor-pointer">
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton asChild className="cursor-pointer" isActive={location.pathname === subItem.url}>
                          <Link
                            to={subItem.url}
                            target={item.title === "Auth Pages" || item.title === "Errors" ? "_blank" : undefined}
                            rel={item.title === "Auth Pages" || item.title === "Errors" ? "noopener noreferrer" : undefined}
                          >
                            <span>{subItem.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </>
            ) : (
              <SidebarMenuButton asChild tooltip={item.title} className="cursor-pointer" isActive={location.pathname === item.url}>
                <Link to={item.url}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </Collapsible>
      ))}
    </SidebarMenu>
  )

  if (collapsible) {
    return (
      <Collapsible defaultOpen={defaultOpen} className="group/nav-group">
        <SidebarGroup>
          <CollapsibleTrigger asChild>
            <SidebarGroupLabel asChild>
              <button type="button" className="flex w-full cursor-pointer items-center gap-2 text-left">
                <span>{label}</span>
                <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/nav-group:rotate-90" />
              </button>
            </SidebarGroupLabel>
          </CollapsibleTrigger>
          <CollapsibleContent>{menuContent}</CollapsibleContent>
        </SidebarGroup>
      </Collapsible>
    )
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      {menuContent}
    </SidebarGroup>
  )
}

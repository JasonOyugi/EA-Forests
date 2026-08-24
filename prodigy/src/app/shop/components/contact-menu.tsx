"use client"

import { Mail, Phone, PhoneCall } from "lucide-react"
import { FaWhatsapp } from "react-icons/fa6"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const contactOptions = [
  {
    label: "Switchboard 1",
    value: "+254 733 342 820",
    href: "tel:+254733342820",
    icon: PhoneCall,
  },
  {
    label: "Switchboard 2",
    value: "+254 700 709 066",
    href: "tel:+254700709066",
    icon: PhoneCall,
  },
  {
    label: "WhatsApp",
    value: "+254 700 709 066",
    href: "https://wa.me/254700709066",
    icon: FaWhatsapp,
  },
  {
    label: "Email",
    value: "info@prodigyhealthcare.co.ke",
    href: "mailto:info@prodigyhealthcare.co.ke",
    icon: Mail,
  },
] as const

interface ContactMenuProps {
  productName?: string
  className?: string
  variant?: "default" | "outline" | "ghost"
}

export function ContactMenu({
  productName,
  className,
  variant = "default",
}: ContactMenuProps) {
  const subject = productName ? `Product enquiry: ${productName}` : "Product enquiry"

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant={variant}
          className={cn("rounded-full", className)}
          aria-label={`Contact Prodigy${productName ? ` about ${productName}` : ""}`}
          onClick={(event) => event.stopPropagation()}
        >
          <Phone className="h-4 w-4" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(22rem,calc(100vw-2rem))] rounded-2xl border-border/80 p-2 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-3 pb-2 pt-1">
          <p className="text-sm font-semibold">Contact Prodigy Healthcare</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {productName ? `Ask about ${productName}.` : "Choose the contact method that works for you."}
          </p>
        </div>
        <div className="grid gap-1">
          {contactOptions.map((option) => {
            const Icon = option.icon
            const href = option.label === "Email"
              ? `${option.href}?subject=${encodeURIComponent(subject)}`
              : option.label === "WhatsApp" && productName
                ? `${option.href}?text=${encodeURIComponent(`Hello, I would like to enquire about ${productName}.`)}`
                : option.href

            return (
              <a
                key={option.label}
                href={href}
                target={option.label === "WhatsApp" ? "_blank" : undefined}
                rel={option.label === "WhatsApp" ? "noreferrer" : undefined}
                className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-medium text-muted-foreground">{option.label}</span>
                  <span className="block truncate text-sm font-semibold text-foreground">{option.value}</span>
                </span>
              </a>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

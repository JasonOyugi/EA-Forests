"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import type { ComponentType } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Github, Heart, Linkedin, Mail, Phone, Send, Twitter, Youtube } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Logo } from "@/components/logo"
import { DiscordIcon, TelegramIcon, WhatsAppIcon } from "@/components/brand-icons"
import { landingContainer, landingEyebrowClass } from "./landing-shared"

type FlipContactProps = {
  href: string
  label: string
  value: string
  icon: ComponentType<{ className?: string }>
  wide?: boolean
  external?: boolean
}

function FlipContact({ href, label, value, icon: Icon, wide, external }: FlipContactProps) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={`group h-11 w-full [perspective:700px] ${wide ? "sm:w-64" : "sm:w-48"}`}
      aria-label={`${label}: ${value}`}
    >
      <span className="relative block size-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateX(180deg)] group-focus-visible:[transform:rotateX(180deg)]">
        <span className="absolute inset-0 inline-flex items-center justify-center gap-2 rounded-full border border-emerald-700/50 bg-emerald-950/70 px-4 text-xs font-semibold uppercase tracking-[.12em] text-emerald-100 [backface-visibility:hidden]">
          <Icon className="size-3.5" /> <span className="sm:hidden">{value}</span><span className="hidden sm:inline">{label}</span>
        </span>
        <span className="absolute inset-0 inline-flex items-center justify-center rounded-full border border-emerald-400/60 bg-emerald-500 px-4 text-xs font-semibold tracking-[.05em] text-emerald-950 [backface-visibility:hidden] [transform:rotateX(180deg)]">
          {value}
        </span>
      </span>
    </a>
  )
}

const newsletterSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
})

const contactSchema = z.object({
  firstName: z.string().min(2, { message: "Enter your first name." }),
  lastName: z.string().min(2, { message: "Enter your last name." }),
  email: z.string().email({ message: "Enter a valid email address." }),
  subject: z.string().min(5, { message: "Add a short subject." }),
  message: z.string().min(10, { message: "Tell us a little more." }),
})

const socialLinks = [
  { name: "Twitter", href: "#", icon: Twitter },
  { name: "GitHub", href: "https://github.com/JasonOyugi/EA_Forests", icon: Github },
  { name: "LinkedIn", href: "#", icon: Linkedin },
  { name: "YouTube", href: "https://www.youtube.com/results?search_query=East+Africa+forestry", icon: Youtube },
  { name: "Discord", href: "https://discord.com/invite/XEQhPc9a6p", icon: DiscordIcon },
  { name: "Telegram", href: "#", icon: TelegramIcon },
] as const

export function LandingFooter() {
  const newsletterForm = useForm<z.infer<typeof newsletterSchema>>({
    resolver: zodResolver(newsletterSchema),
    defaultValues: { email: "" },
  })
  const contactForm = useForm<z.infer<typeof contactSchema>>({
    resolver: zodResolver(contactSchema),
    defaultValues: { firstName: "", lastName: "", email: "", subject: "", message: "" },
  })

  const submitNewsletter = (values: z.infer<typeof newsletterSchema>) => {
    console.log(values)
    newsletterForm.reset()
  }

  const submitContact = (values: z.infer<typeof contactSchema>) => {
    console.log(values)
    contactForm.reset()
  }

  return (
    <footer id="contact" className="section-map-shell section-map-footer relative overflow-hidden border-t bg-background">
      <div aria-hidden className="section-map-bg absolute inset-0" />
      <div aria-hidden className="section-map-tint absolute inset-0" />

      <div className={`${landingContainer} relative py-16 sm:py-20 lg:py-24`}>
        <div className="grid gap-12 lg:grid-cols-[.9fr_1.1fr] lg:gap-16">
          <div>
            <a href="#hero" className="inline-flex items-center gap-3">
              <Logo size={32} />
              <span className="text-xl font-bold">EA Forests</span>
            </a>
            <p className={`${landingEyebrowClass} mb-2 mt-6 text-primary`}>We say:</p>
            <h2 className="landing-section-heading font-semibold uppercase">
              Stay informed. Make money.
            </h2>
            <p className="mt-2 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              Talk to us directly:
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <FlipContact href="https://wa.me/254700000000" label="WhatsApp" value="+254 700 000 000" icon={WhatsAppIcon} external />
              <FlipContact href="tel:+254700000000" label="Call us" value="+254 700 000 000" icon={Phone} />
              <FlipContact href="mailto:hello@eaforests.com" label="Email us" value="hello@eaforests.com" icon={Mail} wide />
            </div>

            <Form {...newsletterForm}>
              <form onSubmit={newsletterForm.handleSubmit(submitNewsletter)} className="mt-7 flex max-w-lg flex-col gap-2 sm:flex-row">
                <FormField
                  control={newsletterForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl><Input type="email" aria-label="Newsletter email" placeholder="Email for the weekly brief" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="cursor-pointer"><Mail className="size-4" /> Subscribe</Button>
              </form>
            </Form>

          </div>

          <div>
            <div className="mb-6 flex items-center gap-3 border-b pb-5">
              <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary"><Send className="size-4" /></span>
              <div><h3 className="text-xl font-semibold tracking-[-.025em] sm:text-2xl">Send us a message</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Questions, opportunities or feedback.</p></div>
            </div>

            <Form {...contactForm}>
              <form onSubmit={contactForm.handleSubmit(submitContact)} className="grid gap-3 sm:grid-cols-2">
                <FormField control={contactForm.control} name="firstName" render={({ field }) => <FormItem><FormControl><Input aria-label="First name" placeholder="First name" {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={contactForm.control} name="lastName" render={({ field }) => <FormItem><FormControl><Input aria-label="Last name" placeholder="Last name" {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={contactForm.control} name="email" render={({ field }) => <FormItem><FormControl><Input type="email" aria-label="Email" placeholder="Email" {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={contactForm.control} name="subject" render={({ field }) => <FormItem><FormControl><Input aria-label="Subject" placeholder="What can we help with?" {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={contactForm.control} name="message" render={({ field }) => <FormItem className="sm:col-span-2"><FormControl><Textarea aria-label="Message" placeholder="Your message" rows={4} className="min-h-24 resize-none" {...field} /></FormControl><FormMessage /></FormItem>} />
                <Button type="submit" className="w-fit cursor-pointer sm:col-span-2">Send message <Send className="size-4" /></Button>
              </form>
            </Form>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-center justify-between gap-5 lg:flex-row">
          <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground sm:flex-row sm:text-sm">
            <span className="flex items-center gap-1">Made with <Heart className="size-3.5 fill-current text-red-500" /> by <a href="#hero" className="font-semibold text-foreground hover:text-primary">EA Forests</a></span>
            <span className="hidden sm:inline">|</span>
            <span>&copy; {new Date().getFullYear()} for the forestry community</span>
          </div>

          <div className="flex items-center gap-1">
            {socialLinks.map((social) => {
              const Icon = social.icon
              return <Button key={social.name} variant="ghost" size="icon" asChild><a href={social.href} aria-label={social.name} target="_blank" rel="noopener noreferrer"><Icon className="size-4" /></a></Button>
            })}
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground sm:text-sm">
            <a href="#privacy" className="hover:text-foreground">Privacy</a>
            <a href="#terms" className="hover:text-foreground">Terms</a>
            <a href="#cookies" className="hover:text-foreground">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { BookOpen, Github, Heart, Linkedin, Mail, MessageCircle, Send, Twitter, Youtube } from "lucide-react"

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
import { landingContainer } from "./landing-shared"

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

const contactLinks = [
  { name: "Discord", href: "https://discord.com/invite/XEQhPc9a6p", icon: MessageCircle },
  { name: "GitHub", href: "https://github.com/JasonOyugi/EA_Forests", icon: Github },
  { name: "Guides", href: "/faqs", icon: BookOpen },
] as const

const socialLinks = [
  { name: "Twitter", href: "#", icon: Twitter },
  { name: "GitHub", href: "https://github.com/JasonOyugi/EA_Forests", icon: Github },
  { name: "LinkedIn", href: "#", icon: Linkedin },
  { name: "YouTube", href: "https://www.youtube.com/results?search_query=East+Africa+forestry", icon: Youtube },
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

      <div className={`${landingContainer} relative py-12 sm:py-14`}>
        <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:gap-14">
          <div>
            <a href="#hero" className="inline-flex items-center gap-3">
              <Logo size={32} />
              <span className="text-xl font-bold">EA Forests</span>
            </a>
            <h2 className="mt-6 max-w-md text-2xl font-semibold tracking-tight sm:text-3xl">
              Stay informed. Build better forests.
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              Weekly market updates, useful tools and practical forestry intelligence from across East Africa.
            </p>

            <Form {...newsletterForm}>
              <form onSubmit={newsletterForm.handleSubmit(submitNewsletter)} className="mt-5 flex max-w-md flex-col gap-2 sm:flex-row">
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

            <div className="mt-6 flex flex-wrap gap-2">
              {contactLinks.map((link) => {
                const Icon = link.icon
                const external = link.href.startsWith("http")
                return (
                  <a key={link.name} href={link.href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-2 text-xs font-semibold transition-colors hover:border-primary hover:text-primary">
                    <Icon className="size-3.5" /> {link.name}
                  </a>
                )
              })}
            </div>
          </div>

          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary"><Send className="size-4" /></span>
              <div><h3 className="font-semibold">Send us a message</h3><p className="text-xs text-muted-foreground">Questions, opportunities or feedback.</p></div>
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

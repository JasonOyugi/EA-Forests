"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form"
import { Logo } from "@/components/logo"
import { Github, Heart, Linkedin, Twitter, Youtube } from "lucide-react"
import { landingContainer } from "./landing-shared"

const newsletterSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
})

const socialLinks = [
  { name: "Twitter", href: "#", icon: Twitter },
  { name: "GitHub", href: "https://github.com/silicondeck/shadcn-dashboard-landing-template", icon: Github },
  { name: "LinkedIn", href: "#", icon: Linkedin },
  { name: "YouTube", href: "#", icon: Youtube },
]

export function LandingFooter() {
  const form = useForm<z.infer<typeof newsletterSchema>>({
    resolver: zodResolver(newsletterSchema),
    defaultValues: {
      email: "",
    },
  })

  function onSubmit(values: z.infer<typeof newsletterSchema>) {
    console.log(values)
    form.reset()
  }

  return (
    <footer className="section-map-shell section-map-footer relative overflow-hidden border-t bg-background">
      <div aria-hidden className="section-map-bg absolute inset-0" />
      <div aria-hidden className="section-map-tint absolute inset-0" />
      <div className={`${landingContainer} py-16`}>
        <div className="mb-16">
          <div className="mx-auto max-w-2xl text-center">
            <h3 className="mb-4 text-2xl font-bold sm:text-3xl">Stay updated</h3>
            <p className="mb-6 text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              Get the latest updates, articles, and resources sent to your inbox weekly.
            </p>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="mx-auto flex max-w-md flex-col gap-2 sm:flex-row">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input type="email" placeholder="Enter your email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="cursor-pointer">
                  Subscribe
                </Button>
              </form>
            </Form>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 sm:gap-6 md:grid-cols-4 md:gap-8 lg:grid-cols-2">
          <div className="col-span-2 max-w-2xl sm:col-span-2 md:col-span-4 lg:col-span-2">
            <div className="mb-3 flex items-center space-x-2 max-lg:justify-center sm:mb-4">
              <a href="#hero" className="flex items-center space-x-2 cursor-pointer">
                <Logo size={28} />
                <span className="text-lg font-bold sm:text-xl">EA Forests</span>
              </a>
            </div>
            <p className="mb-4 text-xs text-muted-foreground max-lg:flex max-lg:justify-center max-lg:text-center sm:mb-6 sm:text-sm">
              Accelerating trade and investments into forestry in East Africa.
            </p>
            <div className="flex space-x-4 max-lg:justify-center">
              {socialLinks.map((social) => (
                <Button key={social.name} variant="ghost" size="icon" asChild>
                  <a
                    href={social.href}
                    aria-label={social.name}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <social.icon className="h-4 w-4" />
                  </a>
                </Button>
              ))}
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-center justify-between gap-3 sm:gap-4 lg:flex-row">
          <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground sm:flex-row sm:text-sm">
            <div className="flex items-center gap-1">
              <span>Made with</span>
              <Heart className="h-3 w-3 fill-current text-red-500 sm:h-4 sm:w-4" />
              <span>by</span>
              <a href="#hero" className="cursor-pointer font-semibold text-foreground transition-colors hover:text-primary">
                EA Forests
              </a>
            </div>
            <span className="hidden sm:inline">|</span>
            <span>&copy; {new Date().getFullYear()} for the forestry community</span>
          </div>
          <div className="mt-3 flex items-center space-x-3 text-xs text-muted-foreground sm:mt-0 sm:space-x-4 sm:text-sm md:mt-0">
            <a href="#privacy" className="transition-colors hover:text-foreground">
              Privacy Policy
            </a>
            <a href="#terms" className="transition-colors hover:text-foreground">
              Terms of Service
            </a>
            <a href="#cookies" className="transition-colors hover:text-foreground">
              Cookie Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

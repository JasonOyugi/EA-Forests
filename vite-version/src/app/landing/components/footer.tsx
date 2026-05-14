"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form"
import { Logo } from '@/components/logo'
import { Github, Twitter, Linkedin, Youtube, Heart } from 'lucide-react'

const newsletterSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
})

const socialLinks = [
  { name: 'Twitter', href: '#', icon: Twitter },
  { name: 'GitHub', href: 'https://github.com/silicondeck/shadcn-dashboard-landing-template', icon: Github },
  { name: 'LinkedIn', href: '#', icon: Linkedin },
  { name: 'YouTube', href: '#', icon: Youtube },
]

export function LandingFooter() {
  const form = useForm<z.infer<typeof newsletterSchema>>({
    resolver: zodResolver(newsletterSchema),
    defaultValues: {
      email: "",
    },
  })

  function onSubmit(values: z.infer<typeof newsletterSchema>) {
    // Here you would typically send the email to your newsletter service
    console.log(values)
    // Show success message and reset form
    form.reset()
  }

  return (
    <footer className="section-map-shell section-map-footer relative overflow-hidden border-t bg-background">
      <div aria-hidden className="section-map-bg absolute inset-0" />
      <div aria-hidden className="section-map-tint absolute inset-0" />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Newsletter Section */}
        <div className="mb-16">
          <div className="mx-auto max-w-2xl text-center">
            <h3 className="text-2xl font-bold mb-4">Stay updated</h3>
            <p className="text-muted-foreground mb-6">
              Get the latest updates, articles, and resources sent to your inbox weekly.
            </p>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-2 max-w-md mx-auto sm:flex-row">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Enter your email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="cursor-pointer">Subscribe</Button>
              </form>
            </Form>
          </div>
        </div>

        {/* Main Footer Content */}
        <div className="grid gap-4 sm:gap-6 md:gap-8 grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-2">
          {/* Brand Column */}
          <div className="col-span-2 sm:col-span-2 md:col-span-4 lg:col-span-2 max-w-2xl">
            <div className="flex items-center space-x-2 mb-3 sm:mb-4 max-lg:justify-center">
              <a href="#hero" className="flex items-center space-x-2 cursor-pointer">
                <Logo size={28} sm:size-32 />
                <span className="font-bold text-lg sm:text-xl">EA Forests</span>
              </a>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6 max-lg:text-center max-lg:flex max-lg:justify-center">
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

        {/* Bottom Footer */}
        <div className="flex flex-col lg:flex-row justify-between items-center gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <span>Made with</span>
              <Heart className="h-3 sm:h-4 w-3 sm:w-4 text-red-500 fill-current" />
              <span>by</span>
              <a href="#hero" className="font-semibold text-foreground hover:text-primary transition-colors cursor-pointer">
                EA Forests
              </a>
            </div>
            <span className="hidden sm:inline">•</span>
            <span>© {new Date().getFullYear()} for the forestry community</span>
          </div>
          <div className="flex items-center space-x-3 sm:space-x-4 text-xs sm:text-sm text-muted-foreground mt-3 sm:mt-0 md:mt-0">
            <a href="#privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </a>
            <a href="#terms" className="hover:text-foreground transition-colors">
              Terms of Service
            </a>
            <a href="#cookies" className="hover:text-foreground transition-colors">
              Cookie Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

"use client"

import { ArrowRight, TrendingUp, Package, Handshake } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollReveal } from '@/components/ui/scroll-reveal'
import { Separator } from '@/components/ui/separator'

export function CTASection() {
  return (
    <section className='section-map-shell section-map-cta relative overflow-hidden py-16 lg:py-24 bg-muted/80'>
      <div aria-hidden className="section-map-bg absolute inset-0" />
      <div aria-hidden className="section-map-tint absolute inset-0" />
      <div className='container mx-auto px-4 lg:px-8'>
        <div className='mx-auto max-w-4xl'>
          <ScrollReveal className='text-center' distance={22}>
            <div className='space-y-8'>
              {/* Badge and Stats */}
              <div className='flex flex-col items-center gap-4'>
                <Badge variant='outline' className="badge-emerald-run text-primary rounded-lg px-4 py-2 
                          border border-emerald-500/40
                          bg-emerald-400/5
                          transition-shadow duration-300
                          shadow-[0_0_22px_rgba(16,185,129,0.35)]">
                  <TrendingUp className='size-3' />
                  Become a trusted member
                </Badge>

                <div className='text-muted-foreground flex items-center gap-4 text-sm'>
                  <span className='flex items-center gap-1'>
                    <div className='size-2 rounded-full bg-green-500' />
                    200+ Active daily trades
                  </span>
                  <Separator orientation='vertical' className='!h-4' />
                  <span>25K+ Downloads</span>
                  <Separator orientation='vertical' className='!h-4' />
                  <span>4.9★ Rating</span>
                </div>
              </div>

              {/* Main Content */}
              <div className='space-y-6'>
                <h1 className='text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl'>
                  Join the community of 
                  <span className='flex sm:inline-flex justify-center'>
                    <span className='relative mx-2'>
                      <span className='emerald-glitter-text bg-gradient-to-r from-emerald-300 via-emerald-500 to-emerald-200 bg-clip-text text-transparent'>
                      forestry
                      </span>
                      <div className='absolute start-0 -bottom-2 h-1 w-full bg-gradient-to-r from-emerald-400/35 via-emerald-500/20 to-emerald-200/35' />
                    </span>
                    businesses today
                  </span>
                </h1>

                <p className='text-muted-foreground mx-auto max-w-2xl text-balance lg:text-xl'>
                  From seed suppliers to timber processers, we bring the clients and dealers to you - partner with us, increase your visibility,
                  find customers and suppliers, start trading and earn profits!
                </p>
              </div>

              {/* CTA Buttons */}
              <div className='flex flex-col justify-center gap-4 sm:flex-row sm:gap-6'>
                <Button size='lg' className='cursor-pointer px-8 py-6 text-lg font-medium' asChild>
                  <a href='/auth/sign-up-2' target='_blank' rel='noopener noreferrer' className="group relative overflow-hidden">
                    <span className="pointer-events-none absolute inset-y-0 left-0 w-2/3 -translate-x-full bg-gradient-to-r from-emerald-400/25 via-emerald-400/10 to-transparent transition-transform duration-900 group-hover:translate-x-[220%]" />
                    <span className="relative z-10 inline-flex items-center group-hover:text-emerald-100">
                      <Handshake className='me-2 size-5' />
                      Become a member
                    </span>  
                  </a>
                </Button>
                <Button variant="outline" size="lg" className="px-8 py-6 emerald-border-hover text-base cursor-pointer transition-all duration-300 hover:text-emerald-400 hover:bg-secondary/20 hover:shadow-[0_0_24px_rgba(16,185,129,0.35)]" asChild>
                  <a href='/shop' target='_blank' rel='noopener noreferrer'>
                    <Package className='me-2 size-5' />
                    Browse services
                    <ArrowRight className='ms-2 size-4 transition-transform group-hover:translate-x-1' />
                  </a>
                </Button>
              </div>

              {/* Trust Indicators */}
              <div className='text-muted-foreground flex flex-wrap items-center justify-center gap-6 text-sm'>
                <div className='flex items-center gap-2'>
                    <div className='size-2 rounded-full bg-green-600 dark:bg-green-400 me-1' />

                  <span>Free market information available</span>
                </div>
                <div className='flex items-center gap-2'>
                    <div className='size-2 rounded-full bg-blue-600 dark:bg-blue-400 me-1' />

                  <span>Verified profiles only</span>
                </div>
                <div className='flex items-center gap-2'>
                    <div className='size-2 rounded-full bg-purple-600 dark:bg-purple-400 me-1' />

                  <span>Regular updates & support</span>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}

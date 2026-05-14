"use client"

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Facebook, Globe, Linkedin, Phone } from 'lucide-react'
import { FaWhatsapp } from 'react-icons/fa6'
import { cn } from '@/lib/utils'
import { Button } from "@/components/ui/button"
import { BentoTilt } from '@/components/ui/bento-tilt'
import { ScrollReveal } from '@/components/ui/scroll-reveal'

type Testimonial = {
  name: string
  role: string
  image: string
  quote: string
}

const testimonials: Testimonial[] = [
  {
    name: 'Grace Wanjiku',
    role: 'Nursery Operator, Kenya',
    image: 'https://notion-avatars.netlify.app/api/avatar?preset=female-1',
    quote: 'For the first time, serious buyers and investors are reaching out with well planned planting projects. It is much easier to plan my business.',
  },
  {
    name: 'Michael Harrington',
    role: 'Investment Manager, UK',
    image: 'https://notion-avatars.netlify.app/api/avatar?preset=male-1',
    quote: 'We were actively looking for exposure to East African forestry but lacked trusted execution partners. This platform didn’t just give us data—it gave us counterparties we could work with.',
  },
  {
    name: 'Neema Mtei',
    role: 'Climate-Focused Investor, Tanzania',
    image: 'https://notion-avatars.netlify.app/api/avatar?preset=female-2',
    quote: 'This isn’t a directory or an information tool, it’s a functioning marketplace with projects you cant track.',
  },
  {
    name: 'Daniel Mwangi',
    role: 'Private Investor, Kenya',
    image: 'https://notion-avatars.netlify.app/api/avatar?preset=male-2',
    quote: 'Instead of chasing credible contacts and piecing things together manually, everything I needed—nurseries, contractors, projections—was in one place. That changes the speed of decisions.',
  },
  {
    name: 'Sarah Namusoke',
    role: 'Plywood Factory Manager, Uganda',
    image: 'https://notion-avatars.netlify.app/api/avatar?preset=female-3',
    quote: 'Access to quality supply has always been unpredictable. This gives us earlier visibility into what’s being planted—and when it’s coming to market.',
  },
  {
    name: 'Tesfaye Bekele',
    role: 'Planting Contractor, Uganda',
    image: 'https://notion-avatars.netlify.app/api/avatar?preset=male-3',
    quote: 'We used to rely on referrals and chance. Now projects come with defined scope, capital clarity, and timelines. It’s professional forestry at last.',
  },
  {
    name: 'Asha Mohamed',
    role: 'Smallholder Forestry Grower, Tanzania',
    image: 'https://notion-avatars.netlify.app/api/avatar?preset=female-4',
    quote: 'I used to plant trees for firewood and decoration. Now I understand the market, the timelines, and who I can plant for.',
  },
  {
    name: 'Peter Kariuki',
    role: 'Landowner, Kenya',
    image: 'https://notion-avatars.netlify.app/api/avatar?preset=male-4',
    quote: 'I had land sitting idle for years. The platform showed me what was possible—and connected me to the people who could actually make it happen.',
  },
  {
    name: 'Sophie Laurent',
    role: 'Carbon Project Developer, Tanzania',
    image: 'https://notion-avatars.netlify.app/api/avatar?preset=female-5',
    quote: 'Carbon conversations in East Africa are finally grounded in actual forestry systems and data. That credibility matters when speaking to buyers and regulator.',
  },
  {
    name: 'Oliver Ahlm',
    role: 'Impact Fund Partner, Sweeden',
    image: 'https://notion-avatars.netlify.app/api/avatar?preset=male-5',
    quote: 'Instead of months of desktop research, fragmented sourcing and due dilligence, we’re reviewing coordinated forestry opportunities in weeks.',
  },
  {
    name: 'Natasha Nkurunziza',
    role: 'Institutional Investment Advisor, Rwanda',
    image: 'https://notion-avatars.netlify.app/api/avatar?preset=female-6',
    quote: 'Forestry in the region has always had promise. The missing piece was coordination. This platform feels like that missing infrastructure.',
  },
  {
    name: 'Doan Dai',
    role: 'Export Timber Trader, Vietnam',
    image: 'https://notion-avatars.netlify.app/api/avatar?preset=male-6',
    quote: 'Access to structured, forward-looking supply changes how we negotiate and contract in East Africa. It brings confidence in the region.',
  },
]

export function TestimonialsSection() {
  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null)

  const socialIcons = [
    {
      name: 'LinkedIn',
      Icon: Linkedin,
      className:
        'text-[#0A66C2] hover:border-[#0A66C2]/45 hover:bg-[#0A66C2]/12 hover:shadow-[0_0_18px_rgba(10,102,194,0.3)]',
    },
    {
      name: 'WhatsApp',
      Icon: FaWhatsapp,
      className:
        'text-[#25D366] hover:border-[#25D366]/45 hover:bg-[#25D366]/12 hover:shadow-[0_0_18px_rgba(37,211,102,0.32)]',
    },
    {
      name: 'Facebook',
      Icon: Facebook,
      className:
        'text-[#1877F2] hover:border-[#1877F2]/45 hover:bg-[#1877F2]/12 hover:shadow-[0_0_18px_rgba(24,119,242,0.28)]',
    },
    {
      name: 'Website',
      Icon: Globe,
      className:
        'text-emerald-700 hover:border-emerald-500/45 hover:bg-emerald-500/12 hover:shadow-[0_0_18px_rgba(16,185,129,0.28)]',
    },
  ] as const

  return (
    <section id="testimonials" className="py-24 sm:py-32">
      <div className="container mx-auto px-8 sm:px-6">
        {/* Section Header */}
        <ScrollReveal className="mx-auto mb-16 max-w-2xl text-center" distance={22}>
          <Badge variant="outline" className="mb-4 text-primary border border-emerald-500/40" >
            Testimonials
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Accelerating Forestry In East Africa
          </h2>
          <p className="text-lg text-muted-foreground">
            Join thousands of entrepreneurs and investors who trust our platform to build exceptional forestry investments.
          </p>
        </ScrollReveal>

        {/* Testimonials Masonry Grid */}
        <div className="columns-1 gap-4 md:columns-2 md:gap-6 lg:columns-3 lg:gap-4">
          {testimonials.map((testimonial, index) => (
            <ScrollReveal key={index} className="mb-6 break-inside-avoid lg:mb-4" delay={(index % 6) * 70}>
              <BentoTilt>
                <Card className="group shadow-none">
                  <CardContent className="relative">
                  <div className="absolute right-2 top-2 z-10">
                    <div className="group/social relative flex flex-col items-end gap-2">
                      <Button
                        type="button"
                        aria-label={openMenuIndex === index ? 'Hide contact options' : 'Show contact options'}
                        aria-expanded={openMenuIndex === index}
                        onClick={() => setOpenMenuIndex(current => (current === index ? null : index))}
                        className={cn(
                          'testimonial-social-icon inline-flex size-8 items-center rounded-full border border-emerald-500/30 bg-background/90 text-emerald-700 shadow-sm transition-all duration-300 hover:border-emerald-500/45 hover:bg-emerald-500/12 hover:shadow-[0_0_18px_rgba(16,185,129,0.25)]',
                          openMenuIndex === index && 'border-emerald-500/55 bg-emerald-500/12 shadow-[0_0_18px_rgba(16,185,129,0.25)]'
                        )}
                      >
                        <Phone className="size-3" />
                      </Button>

                      <div
                        className={cn(
                          'flex flex-col items-end gap-2 transition-all duration-300',
                          openMenuIndex === index
                            ? 'pointer-events-auto translate-y-0 opacity-100'
                            : 'pointer-events-none -translate-y-2 opacity-0 group-hover/social:pointer-events-auto group-hover/social:translate-y-0 group-hover/social:opacity-100'
                        )}
                      >
                        {socialIcons.map(({ name, Icon, className }) => (
                          <button
                            key={`${testimonial.name}-${name}`}
                            type="button"
                            aria-label={name}
                            className={`testimonial-social-icon inline-flex size-8 items-center justify-center rounded-full border border-border/70 bg-background/85 transition-all duration-300 ${className}`}
                          >
                            <Icon className="size-3.5" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <Avatar className="bg-muted size-12 shrink-0">
                      <AvatarImage
                        alt={testimonial.name}
                        src={testimonial.image}
                        loading="lazy"
                        width="120"
                        height="120"
                      />
                      <AvatarFallback>
                        {testimonial.name
                          .split(' ')
                          .map(n => n[0])
                          .join('')}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <a href="#" onClick={e => e.preventDefault()} className="cursor-pointer">
                        <h3 className="font-medium hover:text-primary transition-colors">{testimonial.name}</h3>
                      </a>
                      <span className="text-muted-foreground block text-sm tracking-wide">
                        {testimonial.role}
                      </span>
                    </div>
                  </div>

                  <blockquote className="mt-4">
                    <p className="text-sm leading-relaxed text-balance">{testimonial.quote}</p>
                  </blockquote>
                  </CardContent>
                </Card>
              </BentoTilt>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}

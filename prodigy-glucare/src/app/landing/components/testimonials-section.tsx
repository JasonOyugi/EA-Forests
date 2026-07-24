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
import {
  landingBadgeClass,
  landingContainer,
  landingHeadingClass,
  landingLeadClass,
  landingSectionIntro,
  landingSectionPadding,
} from './landing-shared'

type Testimonial = {
  name: string
  role: string
  image: string
  quote: string
}

const testimonials: Testimonial[] = [
  {
    name: 'Grace Wanjiku',
    role: 'Wellness Store Customer, Nairobi',
    image: 'https://notion-avatars.netlify.app/api/avatar?preset=female-1',
    quote: 'The wellness store makes it so easy to reorder my supplements every month. Fast delivery and genuine products.',
  },
  {
    name: 'Michael Otieno',
    role: 'Diabetes Remission Program Patient',
    image: 'https://notion-avatars.netlify.app/api/avatar?preset=male-1',
    quote: 'The structured remission program gave me a clear plan for the first time. My readings have never been this stable.',
  },
  {
    name: 'Neema Mtei',
    role: 'Hospital Services Patient',
    image: 'https://notion-avatars.netlify.app/api/avatar?preset=female-2',
    quote: 'From consultation to diagnostics, the hospital team was thorough and easy to reach for follow-up questions.',
  },
  {
    name: 'Daniel Mwangi',
    role: 'Personalized Diabetes Management Client',
    image: 'https://notion-avatars.netlify.app/api/avatar?preset=male-2',
    quote: 'Having a dedicated care plan instead of generic advice changed how I manage my day-to-day glucose levels.',
  },
  {
    name: 'Sarah Namusoke',
    role: 'Nutrition & Lifestyle Therapy Client',
    image: 'https://notion-avatars.netlify.app/api/avatar?preset=female-3',
    quote: 'The nutrition coaching was practical, not just a diet sheet. Small changes that actually stuck.',
  },
  {
    name: 'Tesfaye Bekele',
    role: 'Weight Management Program Client',
    image: 'https://notion-avatars.netlify.app/api/avatar?preset=male-3',
    quote: 'The weight-management program tied directly into my metabolic health goals, not just the number on the scale.',
  },
  {
    name: 'Asha Mohamed',
    role: 'Remote Monitoring Patient',
    image: 'https://notion-avatars.netlify.app/api/avatar?preset=female-4',
    quote: 'Remote monitoring means I do not have to wait for my next visit to know if something needs adjusting.',
  },
  {
    name: 'Peter Kariuki',
    role: 'Wellness Store Customer',
    image: 'https://notion-avatars.netlify.app/api/avatar?preset=male-4',
    quote: 'Good range of wellness products in one shop, and the online checkout is simple.',
  },
  {
    name: 'Sophie Nyambura',
    role: 'Diabetes Remission Program Patient',
    image: 'https://notion-avatars.netlify.app/api/avatar?preset=female-5',
    quote: 'I appreciated how remission-focused the program was, it was never just about managing symptoms.',
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
        'text-emerald-700 hover:border-emerald-500/45 hover:bg-emerald-500/12 hover:shadow-[0_0_18px_rgba(23, 179, 172,0.28)]',
    },
  ] as const

  return (
    <section id="testimonials" className={landingSectionPadding}>
      <div className={landingContainer}>
        {/* Section Header */}
        <ScrollReveal className={landingSectionIntro} distance={22}>
          <Badge variant="outline" className={landingBadgeClass} >
            Testimonials
          </Badge>
          <h2 className={landingHeadingClass}>
            Real Results, From Wellness To Remission
          </h2>
          <p className={landingLeadClass}>
            Join the patients and customers who trust Prodigy GluCare for everyday wellness, hospital care, and specialized diabetes management.
          </p>
        </ScrollReveal>

        <div className="grid gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <ScrollReveal key={index} className="h-full" delay={(index % 6) * 70}>
              <BentoTilt className="h-full">
                <Card className="group h-full shadow-none">
                  <CardContent className="relative">
                  <div className="absolute right-2 top-2 z-10">
                    <div className="group/social relative flex flex-col items-end gap-2">
                      <Button
                        type="button"
                        aria-label={openMenuIndex === index ? 'Hide contact options' : 'Show contact options'}
                        aria-expanded={openMenuIndex === index}
                        onClick={() => setOpenMenuIndex(current => (current === index ? null : index))}
                        className={cn(
                          'testimonial-social-icon inline-flex size-8 items-center rounded-full border border-emerald-500/30 bg-background/90 text-emerald-700 shadow-sm transition-all duration-300 hover:border-emerald-500/45 hover:bg-emerald-500/12 hover:shadow-[0_0_18px_rgba(23, 179, 172,0.25)]',
                          openMenuIndex === index && 'border-emerald-500/55 bg-emerald-500/12 shadow-[0_0_18px_rgba(23, 179, 172,0.25)]'
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
                    <p className="text-sm leading-relaxed">{testimonial.quote}</p>
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

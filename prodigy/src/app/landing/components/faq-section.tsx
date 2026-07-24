"use client"

import { useState } from 'react'
import { CircleHelp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { ScrollReveal } from '@/components/ui/scroll-reveal'
import {
  landingBadgeClass,
  landingContainer,
  landingHeadingClass,
  landingLeadClass,
  landingSectionIntro,
  landingSectionPadding,
} from './landing-shared'

type FaqItem = {
  value: string
  question: string
  answer: string
}

const faqItems: FaqItem[] = [
  {
    value: 'item-1',
    question: 'What is Prodigy?',
    answer:
      'Prodigy Healthcare provides personal care products and hospital care supplies in one focused marketplace.',
  },
  {
    value: 'item-2',
    question: 'Can I order personal care products online?',
    answer:
      'Yes. Browse the personal care store for supplements, skincare, and weight-management products, and check out directly from the shop.',
  },
  {
    value: 'item-3',
    question: 'Do you support hospital procurement?',
    answer:
      'Yes. Prodigy Hospital Care covers dialysis consumables, high-level disinfectants, vascular access devices, and wound care supplies.',
  },
  {
    value: 'item-4',
    question: 'Can I speak to someone before ordering?',
    answer:
      'Yes. Use the contact section to request product guidance, sourcing support, or a hospital care consultation.',
  },
  {
    value: 'item-5',
    question: 'Where can I find health information?',
    answer:
      'Use the health information library for practical wellness guidance and everyday care information.',
  },
]

const FaqSection = () => {
  const [openItem, setOpenItem] = useState<string | undefined>()

  return (
    <section id="faq" className={`relative overflow-hidden ${landingSectionPadding}`}>
      <div className={landingContainer}>
        {/* Section Header */}
        <ScrollReveal className={landingSectionIntro} distance={22}>
          <Badge variant="outline" className={landingBadgeClass} >FAQ</Badge>
          <h2 className={landingHeadingClass}>
            Frequently Asked Questions
          </h2>
          <p className={landingLeadClass}>
            What people are asking about Prodigy's personal and hospital care:
          </p>
        </ScrollReveal>

        {/* FAQ Content */}
        <div className="max-w-4xl mx-auto">
          <div className='bg-transparent'>
            <div className='p-0'>
              <Accordion
                type='single'
                collapsible
                value={openItem}
                onValueChange={setOpenItem}
                className='space-y-5 '
              >
                {faqItems.map(item => (
                  <AccordionItem
                    key={item.value}
                    value={item.value}
                    className='faq-accordion-item group/faq relative overflow-hidden rounded-2xl !border border-border/70 bg-background/30 transition-colors data-[state=open]:bg-background/65 theme-primary-border-hover text-base cursor-pointer
                        transition-all duration-300
                        hover:text-primary
                        hover:bg-secondary/20'
                  >
                    <div
                      aria-hidden
                      className={`pointer-events-none absolute inset-0 transition-opacity duration-300 ${openItem === item.value ? 'opacity-100' : 'opacity-0'}`}
                    >
                      <div className='section-map-bg absolute inset-0 opacity-15' />
                      <div className='section-map-tint absolute inset-0 opacity-10' />
                    </div>
                    <AccordionTrigger className='relative z-10 cursor-pointer items-center gap-4 rounded-none bg-transparent py-3 ps-3 pe-4 hover:no-underline data-[state=open]:border-b'>
                      <div className='flex items-center gap-4'>
                        <div className='bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full'>
                          <CircleHelp className='size-5' />
                        </div>
                        <span className='text-start font-semibold'>{item.question}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className='relative z-10 bg-transparent p-4'>{item.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>

          {/* Contact Support CTA */}
          <ScrollReveal className="mt-12 text-center" delay={120}>
            <p className="text-muted-foreground mb-4">
              Still have questions? We're here to help.
            </p>
            <Button size="lg" className="text-base cursor-pointer" asChild>
              <a
                href="#contact"
                className="group relative overflow-hidden"
              >
                <span className="pointer-events-none absolute inset-y-0 left-0 w-2/3 -translate-x-full bg-gradient-to-r from-emerald-400/25 via-emerald-400/10 to-transparent transition-transform duration-900 group-hover:translate-x-[220%]" />
                <span className="relative z-10 inline-flex items-center group-hover:text-emerald-100">
                  Contact Support
                </span>
              </a>
            </Button>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}

export { FaqSection }

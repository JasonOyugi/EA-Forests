"use client"

import { CircleHelp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'

type FaqItem = {
  value: string
  question: string
  answer: string
}

const faqItems: FaqItem[] = [
  {
    value: 'item-1',
    question: 'Who is this platform for?',
    answer:
      'Mainly people looking to make money from forestry in East Africa—investors deploying capital, landowners structuring projects, nurseries supplying genetics, contractors executing harvest and haulage, and buyers securing timber or carbon. If you want to operate in the value chain, this is built for you.',
  },
  {
    value: 'item-2',
    question: 'Can I actually transact here, or is this just information?',
    answer:
      'You can transact. The platform connects capital to verified operators and market participants. Information supports the process, but the core is brokerage, coordination, and execution.',
  },
  {
    value: 'item-3',
    question: 'How are actors verified?',
    answer:
      'We assess documentation, operational history, references, and performance where available. While no marketplace eliminates risk entirely, we prioritize transparency and structured engagement over informal introductions.',
  },
  {
    value: 'item-4',
    question: 'How does the investment process work?',
    answer:
      'Investors review structured opportunities with defined assumptions, timelines, and counterparties. Once aligned, parties move into formal agreements and project execution with visibility across the value chain.',
  },
  {
    value: 'item-5',
    question: 'How does the platform generate revenue?',
    answer:
      'We earn through marketplace and investment-related fees tied to successful coordination and structured services. Our incentives are aligned with completed transactions and long-term performance.',
  },
]

const FaqSection = () => {
  return (
    <section id="faq" className="py-24 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge variant="outline" className="mb-4">FAQ</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground">
            What people are asking about EA Forests' features and purpose:
          </p>
        </div>

        {/* FAQ Content */}
        <div className="max-w-4xl mx-auto">
          <div className='bg-transparent'>
            <div className='p-0'>
              <Accordion type='single' collapsible className='space-y-5'>
                {faqItems.map(item => (
                  <AccordionItem key={item.value} value={item.value} className='rounded-md !border bg-transparent'>
                    <AccordionTrigger className='cursor-pointer items-center gap-4 rounded-none bg-transparent py-2 ps-3 pe-4 hover:no-underline data-[state=open]:border-b'>
                      <div className='flex items-center gap-4'>
                        <div className='bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full'>
                          <CircleHelp className='size-5' />
                        </div>
                        <span className='text-start font-semibold'>{item.question}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className='p-4 bg-transparent'>{item.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>

          {/* Contact Support CTA */}
          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">
              Still have questions? We're here to help.
            </p>
            <Button className='cursor-pointer' asChild>
              <a href="#contact">
                Contact Support
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

export { FaqSection }

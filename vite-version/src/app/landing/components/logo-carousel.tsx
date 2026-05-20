"use client"

import { Card } from "@/components/ui/card"
import { ScrollReveal } from "@/components/ui/scroll-reveal"
import { landingContainer, landingEyebrowClass, landingSectionPaddingCompact } from "./landing-shared"

const companies = [
  { name: "UTGA", src: "/UTGA.png" },
  { name: "KEFRI", src: "/KEFRI.png" },
  { name: "Hoffman", src: "/Hoffman.png" },
  { name: "Gatsby Africa", src: "/Gatsby-Africa.png" },
  { name: "CMA Kenya", src: "/CMA_KE.png" },
  { name: "CrossBoundary", src: "/Crossboundary.png" },
] as const

const marqueeCompanies = [...companies, ...companies]

function Logo({ src, name, size = 32 }: { src: string; name: string; size?: number }) {
  return (
    <img
      src={src}
      alt={`${name} logo`}
      width={size}
      height={size}
      className="object-contain"
      loading="lazy"
      draggable={false}
    />
  )
}

export function LogoCarousel() {
  return (
    <section className={landingSectionPaddingCompact}>
      <div className={landingContainer}>
        <ScrollReveal className="text-center" distance={18}>
          <p className={`${landingEyebrowClass} mb-8`}>
            Trusted by leading regional forestry and investment experts
          </p>

          <div className="relative">
            <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-20 bg-gradient-to-r from-background to-transparent" />
            <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-20 bg-gradient-to-l from-background to-transparent" />

            <div className="overflow-hidden">
              <div className="flex animate-logo-scroll space-x-8 sm:space-x-12">
                {marqueeCompanies.map((company, index) => (
                  <Card
                    key={`${company.name}-${index}`}
                    className="flex h-16 w-40 flex-shrink-0 items-center justify-center border-0 bg-transparent opacity-60 shadow-none transition-opacity duration-300 hover:opacity-100 sm:h-[4.5rem] sm:w-44"
                  >
                    <div className="flex items-center gap-3">
                      <Logo src={company.src} name={company.name} />
                      <span className="whitespace-nowrap text-base font-semibold text-foreground sm:text-lg">
                        {company.name}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

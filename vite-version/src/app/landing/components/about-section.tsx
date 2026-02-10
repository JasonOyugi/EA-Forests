"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { CardDecorator } from "@/components/ui/card-decorator"
import { Github, TreePine, Sigma, PiggyBank, TrendingUp } from "lucide-react"

const values = [
  {
    icon: TreePine,
    title: "Forestry First",
    description:
      "Every forest investment is built with real time, auditable and precise forestry data, ensuring trackable investments.",
    imageSrc: "/forest.webp",
    imageAlt: "Forestry data and field verification",
  },
  {
    icon: Sigma,
    title: "Modelling Excellence",
    description:
      "We maintain the highest, most analytic modelling standards, merging modern tree allometry with statistical inference.",
    imageSrc: "/about.webp",
    imageAlt: "Allometry and statistical modeling",
  },
  {
    icon: PiggyBank,
    title: "Investment Ready",
    description:
      "Battle-tested cashflow analysis used in real applications with proven performance and reliability across different environments.",
    imageSrc: "/drylands.webp",
    imageAlt: "Cashflow and investment analysis",
  },
  {
    icon: TrendingUp,
    title: "Quality Market Insights",
    description:
      "Hand-collected live market data from analysts on the ground committed to investment performance optimization.",
    imageSrc: "/greenbuilding.webp",
    imageAlt: "Market insights and performance tracking",
  },
] as const

export function AboutSection() {
  return (
    <section id="about" className="py-24 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-4xl text-center mb-16">
          <Badge variant="outline" className="mb-4">
            About EA Forests
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
            Who said money doesn&apos;t grow on trees!
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Forestry has been analog for too long. We bring science, data, and financial intelligence
            into a single platform that lets anyone build, manage, and invest in high-performance forests.
            The future of forestry, engineered.
          </p>
        </div>

        {/* Values Grid */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 xl:grid-cols-4 mb-12">
          {values.map((value, index) => (
            <Card key={index} className="group shadow-xs py-2 overflow-hidden">
              {/* Card image */}
              <div className="relative h-40 w-full overflow-hidden">
                <img
                  src={value.imageSrc}
                  alt={value.imageAlt}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  loading="lazy"
                  decoding="async"
                />
                {/* subtle overlay so icon/text feels integrated */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent" />
              </div>

              <CardContent className="p-8">
                <div className="flex flex-col items-center text-center">
                  <CardDecorator>
                    <value.icon className="h-6 w-6" aria-hidden />
                  </CardDecorator>

                  <h3 className="mt-6 font-medium text-balance">{value.title}</h3>
                  <p className="text-muted-foreground mt-3 text-sm">{value.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA (update copy if you want to remove dev-community wording) */}
        <div className="mt-16 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="text-muted-foreground">❤️ Built for real forestry investing</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="cursor-pointer" asChild>
              <a
                href="https://github.com/silicondeck/shadcn-dashboard-landing-template"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="mr-2 h-4 w-4" />
                Star on GitHub
              </a>
            </Button>

            <Button size="lg" variant="outline" className="cursor-pointer" asChild>
              <a href="https://discord.com/invite/XEQhPc9a6p" target="_blank" rel="noopener noreferrer">
                Join Discord Community
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

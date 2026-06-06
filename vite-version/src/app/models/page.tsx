"use client"

import { ArrowRight, MapPinned, Trees, Workflow } from "lucide-react"
import { Link } from "react-router-dom"

import { BaseLayout } from "@/components/layouts/base-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const modelCards = [
  {
    title: "Model 1: Site classification",
    description:
      "Notebook-inspired map workflow where clicking a site passes its coordinate into the site-analysis function and displays the result tables below the map.",
    href: "/models/site-classification",
    badge: "Ready",
    icon: MapPinned,
  },
  {
    title: "Silvicultural models",
    description:
      "Silviculture costs, thinning revenue, final-harvest revenue, and rotation cashflow metrics for commercial screening.",
    href: "/models/model-2",
    badge: "Ready",
    icon: Trees,
  },
  {
    title: "Roundwood production",
    description:
      "Map-driven harvesting and haulage model with processor buyer specs, grade yields, and factory-gate cashflow comparison.",
    href: "/models/model-3",
    badge: "Ready",
    icon: Workflow,
  },
]

export default function ModelsPage() {
  return (
    <BaseLayout
      title="Models"
      description="Central home for notebook-driven model pages in the app."
    >
      <div className="@container/main px-4 lg:px-6">
        <div className="grid gap-4 xl:grid-cols-3">
          {modelCards.map((model) => (
            <Card key={model.title} className="border-border/70 bg-background/75">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
                    <model.icon className="h-5 w-5" />
                  </div>
                  <Badge variant="outline">{model.badge}</Badge>
                </div>
                <CardTitle className="pt-2 text-lg">{model.title}</CardTitle>
                <CardDescription>{model.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full gap-2">
                  <Link to={model.href}>
                    Open model
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </BaseLayout>
  )
}

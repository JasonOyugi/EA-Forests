"use client"

import { ArrowRight, Activity, Atom, HeartPulse } from "lucide-react"
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
    title: "BMI Calculator",
    description:
      "Calculate your Body Mass Index from your height and weight and see what the result means for your health.",
    href: "/models/bmi-calculator",
    badge: "Ready",
    icon: Activity,
  },
  {
    title: "Diabetes Risk Assessment",
    description:
      "A quick screening questionnaire covering age, weight, activity, and family history to gauge your type 2 diabetes risk.",
    href: "/models/diabetes-risk-assessment",
    badge: "Ready",
    icon: HeartPulse,
  },
  {
    title: "3D Vitality Explorer",
    description:
      "Interact with a cinematic 3D wellness field for glucose, cardio, hydration, and recovery signals.",
    href: "/models/vitality-3d",
    badge: "3D",
    icon: Atom,
  },
]

export default function ModelsPage() {
  return (
    <BaseLayout
      title="Health Tools"
      description="Quick, self-serve health calculators from Prodigy GluCare."
    >
      <div className="@container/main px-4 lg:px-6">
        <div className="grid gap-4 xl:grid-cols-4">
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
                    Open tool
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

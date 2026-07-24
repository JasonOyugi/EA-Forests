"use client"

import * as React from "react"
import { ArrowLeft, Activity } from "lucide-react"
import { Link } from "react-router-dom"

import { BaseLayout } from "@/components/layouts/base-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ModelAssumptionsDisclosure } from "@/app/models/components/model-assumptions-disclosure"

type UnitSystem = "metric" | "imperial"

interface BmiCategory {
  label: string
  range: string
  className: string
  advice: string
}

function classifyBmi(bmi: number): BmiCategory {
  if (bmi < 18.5) {
    return {
      label: "Underweight",
      range: "Below 18.5",
      className: "bg-sky-100 text-sky-800",
      advice: "Consider speaking with a Prodigy Hospital physician about a nutrition plan to reach a healthy weight range.",
    }
  }
  if (bmi < 25) {
    return {
      label: "Healthy weight",
      range: "18.5 - 24.9",
      className: "bg-emerald-100 text-emerald-800",
      advice: "You're in a healthy weight range. Our wellness store has options to help you maintain it.",
    }
  }
  if (bmi < 30) {
    return {
      label: "Overweight",
      range: "25.0 - 29.9",
      className: "bg-amber-100 text-amber-800",
      advice: "A GluCare weight-management or nutrition therapy program could help bring this into a healthier range.",
    }
  }
  return {
    label: "Obese",
    range: "30.0 and above",
    className: "bg-rose-100 text-rose-800",
    advice: "This range is linked to higher metabolic risk. We recommend booking a consultation with a GluCare specialist.",
  }
}

export default function BmiCalculatorPage() {
  const [unit, setUnit] = React.useState<UnitSystem>("metric")
  const [heightCm, setHeightCm] = React.useState("170")
  const [weightKg, setWeightKg] = React.useState("70")
  const [heightFt, setHeightFt] = React.useState("5")
  const [heightIn, setHeightIn] = React.useState("7")
  const [weightLb, setWeightLb] = React.useState("154")

  const bmi = React.useMemo(() => {
    if (unit === "metric") {
      const heightM = parseFloat(heightCm) / 100
      const weight = parseFloat(weightKg)
      if (!heightM || !weight || heightM <= 0) return null
      return weight / (heightM * heightM)
    }

    const totalInches = parseFloat(heightFt) * 12 + parseFloat(heightIn || "0")
    const weight = parseFloat(weightLb)
    if (!totalInches || !weight || totalInches <= 0) return null
    return (weight / (totalInches * totalInches)) * 703
  }, [unit, heightCm, weightKg, heightFt, heightIn, weightLb])

  const category = bmi ? classifyBmi(bmi) : null

  return (
    <BaseLayout
      title="BMI Calculator"
      description="Estimate your Body Mass Index and see what it means for your health."
    >
      <div className="@container/main space-y-6 px-4 lg:px-6">
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link to="/models">
            <ArrowLeft className="h-4 w-4" />
            Back to health tools
          </Link>
        </Button>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)]">
          <ModelAssumptionsDisclosure description="Enter your height and weight to calculate your BMI.">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Unit system</Label>
                <Select value={unit} onValueChange={(value) => setUnit(value as UnitSystem)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="metric">Metric (cm / kg)</SelectItem>
                    <SelectItem value="imperial">Imperial (ft, in / lb)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {unit === "metric" ? (
                <>
                  <div className="space-y-2">
                    <Label>Height (cm)</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={heightCm}
                      onChange={(event) => setHeightCm(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Weight (kg)</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={weightKg}
                      onChange={(event) => setWeightKg(event.target.value)}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Height (ft)</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={heightFt}
                      onChange={(event) => setHeightFt(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Height (in)</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={heightIn}
                      onChange={(event) => setHeightIn(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Weight (lb)</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={weightLb}
                      onChange={(event) => setWeightLb(event.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
          </ModelAssumptionsDisclosure>

          <Card className="border-border/70 bg-background/75">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
                  <Activity className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">Your result</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {bmi && category ? (
                <>
                  <div>
                    <p className="text-4xl font-bold">{bmi.toFixed(1)}</p>
                    <p className="text-sm text-muted-foreground">Body Mass Index</p>
                  </div>
                  <Badge className={category.className}>{category.label}</Badge>
                  <p className="text-sm text-muted-foreground">Range: {category.range}</p>
                  <p className="text-sm leading-6">{category.advice}</p>
                  <Button asChild className="w-full">
                    <Link to="/shop/diabetes-programs">Explore care programs</Link>
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Enter valid height and weight values to see your BMI.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </BaseLayout>
  )
}

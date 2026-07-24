"use client"

import * as React from "react"
import { ArrowLeft, HeartPulse } from "lucide-react"
import { Link } from "react-router-dom"

import { BaseLayout } from "@/components/layouts/base-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ModelAssumptionsDisclosure } from "@/app/models/components/model-assumptions-disclosure"

interface RiskQuestion {
  id: string
  question: string
  options: Array<{ label: string; points: number }>
}

const questions: RiskQuestion[] = [
  {
    id: "age",
    question: "What is your age?",
    options: [
      { label: "Under 40", points: 0 },
      { label: "40 - 49", points: 1 },
      { label: "50 - 59", points: 2 },
      { label: "60 or older", points: 3 },
    ],
  },
  {
    id: "bmi",
    question: "How would you describe your body weight?",
    options: [
      { label: "Healthy weight", points: 0 },
      { label: "Somewhat overweight", points: 1 },
      { label: "Overweight", points: 2 },
      { label: "Obese", points: 3 },
    ],
  },
  {
    id: "activity",
    question: "How often are you physically active (30+ minutes)?",
    options: [
      { label: "Most days", points: 0 },
      { label: "A few times a week", points: 1 },
      { label: "Rarely", points: 2 },
    ],
  },
  {
    id: "family",
    question: "Does a parent or sibling have diabetes?",
    options: [
      { label: "No", points: 0 },
      { label: "Yes, one", points: 1 },
      { label: "Yes, more than one", points: 2 },
    ],
  },
  {
    id: "bloodPressure",
    question: "Have you ever been told you have high blood pressure?",
    options: [
      { label: "No", points: 0 },
      { label: "Yes", points: 1 },
    ],
  },
  {
    id: "gestational",
    question: "Have you ever had high blood sugar detected during a health screening?",
    options: [
      { label: "No", points: 0 },
      { label: "Yes", points: 2 },
    ],
  },
]

function getRiskBand(score: number, maxScore: number) {
  const percentage = score / maxScore

  if (percentage < 0.3) {
    return {
      label: "Lower risk",
      className: "bg-emerald-100 text-emerald-800",
      advice: "Your answers suggest a lower current risk. Keep up healthy habits with support from our wellness store.",
      cta: { label: "Browse wellness products", href: "/shop/wellness-products" },
    }
  }
  if (percentage < 0.6) {
    return {
      label: "Moderate risk",
      className: "bg-amber-100 text-amber-800",
      advice: "Your answers suggest a moderate risk. Nutrition & lifestyle therapy from GluCare could help you stay ahead of it.",
      cta: { label: "Explore diabetes programs", href: "/shop/diabetes-programs" },
    }
  }
  return {
    label: "Higher risk",
    className: "bg-rose-100 text-rose-800",
    advice: "Your answers suggest a higher risk. We recommend booking a consultation with a Prodigy Hospital or GluCare specialist.",
    cta: { label: "Book a consultation", href: "/shop/hospital-services" },
  }
}

export default function DiabetesRiskAssessmentPage() {
  const [answers, setAnswers] = React.useState<Record<string, number>>({})

  const maxScore = React.useMemo(
    () => questions.reduce((sum, q) => sum + Math.max(...q.options.map((o) => o.points)), 0),
    []
  )

  const answeredCount = Object.keys(answers).length
  const score = Object.values(answers).reduce((sum, value) => sum + value, 0)
  const isComplete = answeredCount === questions.length
  const riskBand = isComplete ? getRiskBand(score, maxScore) : null

  return (
    <BaseLayout
      title="Diabetes Risk Assessment"
      description="A quick screening questionnaire to help you understand your type 2 diabetes risk."
    >
      <div className="@container/main space-y-6 px-4 lg:px-6">
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link to="/models">
            <ArrowLeft className="h-4 w-4" />
            Back to health tools
          </Link>
        </Button>

        <p className="max-w-2xl text-sm text-muted-foreground">
          This tool is for general education only and is not a medical diagnosis. Please consult a qualified
          healthcare professional for a full assessment.
        </p>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)]">
          <ModelAssumptionsDisclosure description="Answer the questions below based on your current health.">
            <div className="space-y-6">
              {questions.map((q) => (
                <div key={q.id} className="space-y-3">
                  <Label className="text-sm font-medium">{q.question}</Label>
                  <RadioGroup
                    value={answers[q.id]?.toString() ?? ""}
                    onValueChange={(value) =>
                      setAnswers((prev) => ({ ...prev, [q.id]: parseInt(value, 10) }))
                    }
                    className="gap-2"
                  >
                    {q.options.map((option) => (
                      <div key={option.label} className="flex items-center gap-2">
                        <RadioGroupItem value={option.points.toString()} id={`${q.id}-${option.label}`} />
                        <Label htmlFor={`${q.id}-${option.label}`} className="font-normal">
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              ))}
            </div>
          </ModelAssumptionsDisclosure>

          <Card className="border-border/70 bg-background/75">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-800">
                  <HeartPulse className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">Your result</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {riskBand ? (
                <>
                  <div>
                    <p className="text-4xl font-bold">{score}</p>
                    <p className="text-sm text-muted-foreground">out of {maxScore} points</p>
                  </div>
                  <Badge className={riskBand.className}>{riskBand.label}</Badge>
                  <p className="text-sm leading-6">{riskBand.advice}</p>
                  <Button asChild className="w-full">
                    <Link to={riskBand.cta.href}>{riskBand.cta.label}</Link>
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Answer all {questions.length} questions ({answeredCount}/{questions.length} completed) to see your
                  result.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </BaseLayout>
  )
}

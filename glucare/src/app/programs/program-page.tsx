import { Navigate, Link, useParams } from "react-router-dom"
import { ArrowLeft, ArrowRight, CheckCircle2, HeartPulse, LineChart, ShieldCheck, Stethoscope } from "lucide-react"

import { BaseLayout } from "@/components/layouts/base-layout"
import { Badge } from "@/components/ui/badge"
import { BentoTilt } from "@/components/ui/bento-tilt"
import { Button } from "@/components/ui/button"

const programs = {
  "foundational-care": {
    name: "Foundational Care",
    eyebrow: "The steady start",
    price: "$49",
    cadence: "per month",
    description: "A calm, clinician-guided foundation for understanding your numbers and building habits that hold.",
    icon: ShieldCheck,
    accent: "#22d3ee",
    outcomes: ["Establish a practical monitoring rhythm", "Understand patterns in your glucose readings", "Build confidence before making bigger changes"],
    includes: ["Quarterly consultations with a GluCare clinician", "Blood sugar range tracking and guidance", "Access to the health information library", "A clear plan for your next check-in"],
    fit: "A good fit when you want dependable clinical guidance without an intensive program schedule.",
  },
  "remission-program": {
    name: "Remission Program",
    eyebrow: "The focused path",
    price: "$149",
    cadence: "per month",
    description: "A structured, remission-focused program that brings nutrition, lifestyle, and clinical care into one deliberate path.",
    icon: HeartPulse,
    accent: "#f472b6",
    outcomes: ["Turn daily routines into a measurable care plan", "Work toward steadier glucose patterns", "Review progress with a consistent care team"],
    includes: ["Personalized diabetes management plan", "Nutrition and lifestyle therapy sessions", "Monthly progress reviews with your care team", "Priority booking for hospital services"],
    fit: "Designed for people ready to make coordinated changes with regular clinical support.",
  },
  "complete-metabolic-care": {
    name: "Complete Metabolic Care",
    eyebrow: "The full system",
    price: "$249",
    cadence: "per month",
    description: "Comprehensive metabolic support for people who need coordinated care across glucose, weight, lifestyle, and monitoring.",
    icon: Stethoscope,
    accent: "#a78bfa",
    outcomes: ["Coordinate the factors that affect metabolic health", "Keep care decisions connected between visits", "Get earlier support when your plan needs adjustment"],
    includes: ["Everything in the Remission Program", "Weight-management coaching for metabolic health", "Remote monitoring and telemedicine check-ins", "A direct line to your care team between visits"],
    fit: "Best when diabetes care, weight goals, and ongoing monitoring need to work as one plan.",
  },
} as const

type ProgramSlug = keyof typeof programs

const programImages: Record<ProgramSlug, string> = {
  "foundational-care": "/sug1.jpg",
  "remission-program": "/mealplan.jpg",
  "complete-metabolic-care": "/diabetic1.jpg",
}

export default function ProgramPage() {
  const { programSlug } = useParams<{ programSlug: string }>()
  const program = programSlug ? programs[programSlug as ProgramSlug] : undefined

    if (!program) return <Navigate to="/errors/not-found" replace />

    const Icon = program.icon

    return (
      <BaseLayout>
        <main className="px-4 py-2 lg:px-6">
          <div className="mx-auto max-w-7xl space-y-6">
            <Button asChild variant="ghost" size="sm" className="gap-2"><Link to="/shop/diabetes-programs"><ArrowLeft className="h-4 w-4" /> All care programs</Link></Button>

            <section className="overflow-hidden border border-primary/25 bg-card/50 shadow-[0_0_48px_hsl(var(--primary)/0.1)]">
              <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-7 p-6 sm:p-8 lg:p-10">
                  <Badge variant="outline" className="border-primary/45 bg-primary/10 text-primary">{program.eyebrow}</Badge>
                  <div><h1 className="max-w-3xl text-3xl font-semibold tracking-normal text-foreground sm:text-5xl">{program.name}</h1><p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">{program.description}</p></div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {program.outcomes.map((outcome, index) => <div key={outcome} className="border border-primary/20 bg-background/60 p-4"><p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-primary">Care focus 0{index + 1}</p><p className="mt-2 text-sm font-medium leading-6">{outcome}</p></div>)}
                  </div>
                </div>
                <div className="group relative min-h-80 overflow-hidden lg:min-h-full"><img src={programImages[programSlug as ProgramSlug]} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" /><div className="absolute inset-0 bg-[linear-gradient(135deg,hsl(var(--primary)/0.35),rgba(4,8,20,0.28)_45%,rgba(4,8,20,0.82))]" /><div className="absolute bottom-6 left-6 right-6 flex items-center gap-3 text-white"><span className="flex h-11 w-11 items-center justify-center border border-white/35 bg-black/20"><Icon className="h-5 w-5" /></span><span className="text-sm font-medium">Clinician-guided care pathway</span></div></div>
              </div>
            </section>

            <section className="grid overflow-hidden border border-primary/25 bg-[linear-gradient(135deg,hsl(var(--primary)/0.13),transparent_52%)] lg:grid-cols-[1.12fr_0.88fr]">
              <div className="space-y-6 p-6 sm:p-8"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Our offer</p><h2 className="text-2xl font-semibold sm:text-3xl">A care plan built around your real life.</h2><p className="max-w-2xl leading-7 text-muted-foreground">Your clinician adapts the pace and focus of this program to your history, goals, and daily context. It is designed to support care decisions, not replace urgent or emergency medical advice.</p><div className="grid gap-3 sm:grid-cols-2">{program.includes.map((item) => <div key={item} className="flex gap-3 border border-primary/20 bg-background/60 p-4 text-sm leading-6"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{item}</div>)}</div></div>
              <aside className="border-t border-primary/25 bg-background/65 p-6 sm:p-8 lg:border-l lg:border-t-0"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Program investment</p><div className="mt-3 flex items-end gap-2"><span className="text-5xl font-semibold">{program.price}</span><span className="mb-2 text-sm text-muted-foreground">{program.cadence}</span></div><div className="my-6 border-y border-primary/20 py-5"><p className="text-sm font-medium">Designed for</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{program.fit}</p><p className="mt-4 text-sm font-medium">Care commitment</p><p className="mt-1 text-sm leading-6 text-muted-foreground">Regular clinician-guided check-ins.</p></div><Button asChild className="w-full gap-2"><Link to="/calendar">Book a care consultation <ArrowRight className="h-4 w-4" /></Link></Button><p className="mt-3 text-center text-xs leading-5 text-muted-foreground">A clinician will help confirm whether this program is right for your needs.</p></aside>
            </section>

            <section className="relative overflow-hidden border border-primary/25 bg-card/50 p-6 sm:p-8"><div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.18),transparent_35%)]" /><div className="relative"><div className="max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Managed care path</p><h2 className="mt-3 text-2xl font-semibold sm:text-3xl">How the program works</h2><p className="mt-3 leading-7 text-muted-foreground">Each stage gives you and your care team a clear next move, from the first conversation through ongoing review.</p></div><div className="mt-8 grid gap-4 lg:grid-cols-3">{program.outcomes.map((outcome, index) => <BentoTilt key={outcome} className="h-full" maxTilt={3}><article className="h-full border border-primary/25 bg-background/70 p-5"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">0{index + 1}</p><h3 className="mt-3 text-xl font-semibold">Care step {index + 1}</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">{outcome}</p><p className="mt-5 border-t border-primary/15 pt-4 text-sm text-muted-foreground">Review this step with your care team and adapt the next action to your needs.</p></article></BentoTilt>)}</div></div></section>

            <section className="flex flex-col items-start justify-between gap-5 border border-cyan-400/25 bg-cyan-400/5 p-6 sm:flex-row sm:items-center"><div className="flex gap-3"><LineChart className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" /><div><h2 className="font-semibold">Start with a care conversation</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Bring your questions, records, and goals. Your clinician can help you choose the right starting point.</p></div></div><Button asChild variant="outline" className="shrink-0 border-primary/35"><Link to="/calendar">Book consultation <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></section>
          </div>
        </main>
      </BaseLayout>
    )
}
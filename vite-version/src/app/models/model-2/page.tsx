"use client"

import { Clock3, ArrowRight } from "lucide-react"
import { Link } from "react-router-dom"

import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function ModelTwoPage() {
  return (
    <BaseLayout
      title="Model 2"
      description="Placeholder route for the next notebook-backed model."
    >
      <div className="@container/main px-4 lg:px-6">
        <Card className="mx-auto max-w-3xl border-border/70 bg-background/75">
          <CardHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
              <Clock3 className="h-5 w-5" />
            </div>
            <CardTitle className="pt-2 text-xl">Model 2 is reserved</CardTitle>
            <CardDescription>
              The route, layout, and sidebar link are ready. The next step is dropping in the
              second notebook workflow once its inputs and outputs are defined.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/models">
                Back to models
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </BaseLayout>
  )
}

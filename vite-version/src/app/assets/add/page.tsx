import { useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"

import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function AddAssetPage() {
  const navigate = useNavigate()

  return (
    <BaseLayout title="Add Asset Block" description="Register a new forest asset block">
      <div className="px-4 lg:px-6">
        <div className="mb-6">
          <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>New Asset Block</CardTitle>
            <CardDescription>
              This page will contain the form to register a new forest asset block. Form fields and
              submission logic will be defined later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-dashed p-12 text-center text-muted-foreground">
              Asset registration form — coming soon
            </div>
          </CardContent>
        </Card>
      </div>
    </BaseLayout>
  )
}

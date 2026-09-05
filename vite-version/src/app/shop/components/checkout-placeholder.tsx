import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface CheckoutPlaceholderProps {
  onBack: () => void
  onConfirm: () => void
}

export function CheckoutPlaceholder({
  onBack,
  onConfirm,
}: CheckoutPlaceholderProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Checkout placeholder</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Checkout is not enabled in this MVP. The market catalog is presented for
          discovery and model context, while procurement and payment workflows remain
          to be connected to a live operational backend.
        </p>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={onBack}>
            Back to market
          </Button>
          <Button onClick={onConfirm}>
            Acknowledge preview
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
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
          This is a fake v1 checkout flow. The next step can swap this for a real
          checkout service, backend order API, or payment provider without rewriting
          the shop listing and cart logic.
        </p>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={onBack}>
            Back to cart
          </Button>
          <Button onClick={onConfirm}>
            Confirm fake checkout
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
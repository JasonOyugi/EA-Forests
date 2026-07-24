"use client"

import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, Download, Mail, Phone } from "lucide-react"

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type InvoiceData = {
  id: string
  invoiceNumber: string
  date: string
  dueDate: string
  status: "paid" | "pending" | "overdue" | "received" | "cancelled" | "scheduled"
  vendor: {
    name: string
    address: string
    phone: string
    email: string
  }
  billTo: {
    name: string
    address: string
    phone: string
  }
  items: {
    description: string
    quantity: number
    rate: number
    amount: number
  }[]
  subtotal: number
  tax: number
  total: number
}

const invoiceDatabase: Record<string, InvoiceData> = {
  "INV-2026-143": {
    id: "1",
    invoiceNumber: "INV-2026-143",
    date: "2026-04-04",
    dueDate: "2026-04-04",
    status: "paid",
    vendor: {
      name: "GreenCanopy Ltd",
      address: "123 Forest Lane, Kampala, Uganda",
      phone: "+256-123-456-7890",
      email: "billing@greencanopy.ug",
    },
    billTo: {
      name: "EA Forests Investment",
      address: "Portfolio Management, East Africa",
      phone: "+256-555-1234",
    },
    items: [
      {
        description: "Silviculture crew services - North Ridge A1 (March 15-31)",
        quantity: 1,
        rate: 28450,
        amount: 28450,
      },
    ],
    subtotal: 28450,
    tax: 0,
    total: 28450,
  },
  "INV-2026-138": {
    id: "2",
    invoiceNumber: "INV-2026-138",
    date: "2026-03-27",
    dueDate: "2026-03-27",
    status: "received",
    vendor: {
      name: "Timberline Services",
      address: "456 Oak Avenue, Nairobi, Kenya",
      phone: "+254-720-123-456",
      email: "sales@timberline.ke",
    },
    billTo: {
      name: "EA Forests Investment",
      address: "Portfolio Management, East Africa",
      phone: "+256-555-1234",
    },
    items: [
      {
        description: "Planting materials - River Bend C2",
        quantity: 2800,
        rate: 7.07,
        amount: 19796,
      },
    ],
    subtotal: 19796,
    tax: 0,
    total: 19796,
  },
  "INV-2026-131": {
    id: "3",
    invoiceNumber: "INV-2026-131",
    date: "2026-03-18",
    dueDate: "2026-02-18",
    status: "overdue",
    vendor: {
      name: "TerrainWorks",
      address: "789 Infrastructure Road, Dar es Salaam, Tanzania",
      phone: "+255-654-321-098",
      email: "invoices@terrainworks.tz",
    },
    billTo: {
      name: "EA Forests Investment",
      address: "Portfolio Management, East Africa",
      phone: "+256-555-1234",
    },
    items: [
      {
        description: "Road maintenance and grading - East Valley B4",
        quantity: 1,
        rate: 8920,
        amount: 8920,
      },
    ],
    subtotal: 8920,
    tax: 0,
    total: 8920,
  },
  "INV-2026-151": {
    id: "4",
    invoiceNumber: "INV-2026-151",
    date: "2026-04-10",
    dueDate: "2026-04-18",
    status: "scheduled",
    vendor: {
      name: "SylvaOps",
      address: "321 Forestry Way, Kampala, Uganda",
      phone: "+256-787-654-321",
      email: "billing@sylvaops.ug",
    },
    billTo: {
      name: "EA Forests Investment",
      address: "Portfolio Management, East Africa",
      phone: "+256-555-1234",
    },
    items: [
      {
        description: "Thinning operation - Pine Hollow D7",
        quantity: 1,
        rate: 41300,
        amount: 41300,
      },
    ],
    subtotal: 41300,
    tax: 0,
    total: 41300,
  },
  "INV-2026-154": {
    id: "5",
    invoiceNumber: "INV-2026-154",
    date: "2026-04-12",
    dueDate: "2026-04-29",
    status: "scheduled",
    vendor: {
      name: "Timberline Services",
      address: "456 Oak Avenue, Nairobi, Kenya",
      phone: "+254-720-123-456",
      email: "sales@timberline.ke",
    },
    billTo: {
      name: "EA Forests Investment",
      address: "Portfolio Management, East Africa",
      phone: "+256-555-1234",
    },
    items: [
      {
        description: "Seedling replenishment - East Valley B4 (1,200 units)",
        quantity: 1200,
        rate: 10.58,
        amount: 12696,
      },
    ],
    subtotal: 12696,
    tax: 0,
    total: 12696,
  },
  "INV-2026-162": {
    id: "6",
    invoiceNumber: "INV-2026-162",
    date: "2026-04-15",
    dueDate: "2026-05-12",
    status: "scheduled",
    vendor: {
      name: "Forest Audit Services",
      address: "555 Check Lane, Kampala, Uganda",
      phone: "+256-312-543-210",
      email: "reports@forestaudit.ug",
    },
    billTo: {
      name: "EA Forests Investment",
      address: "Portfolio Management, East Africa",
      phone: "+256-555-1234",
    },
    items: [
      {
        description: "Site inspection and assessment package",
        quantity: 1,
        rate: 6400,
        amount: 6400,
      },
    ],
    subtotal: 6400,
    tax: 0,
    total: 6400,
  },
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    paid: "bg-emerald-100 text-emerald-800 border-emerald-300",
    received: "bg-emerald-100 text-emerald-800 border-emerald-300",
    pending: "bg-amber-100 text-amber-800 border-amber-300",
    overdue: "bg-rose-100 text-rose-800 border-rose-300",
    cancelled: "bg-slate-100 text-slate-800 border-slate-300",
    scheduled: "bg-blue-100 text-blue-800 border-blue-300",
  }
  return colors[status] || ""
}

export default function InvoicePage() {
  const params = useParams()
  const navigate = useNavigate()
  const invoiceId = params.id as string
  const invoice = invoiceDatabase[invoiceId]

  if (!invoice) {
    return (
      <BaseLayout title="Invoice Not Found" description="The requested invoice could not be found.">
        <div className="px-4 lg:px-6">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Invoice Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The invoice {invoiceId} does not exist in our system.
            </p>
            <Button onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </BaseLayout>
    )
  }

  return (
    <BaseLayout
      title={`Invoice ${invoice.invoiceNumber}`}
      description={`View invoice details and payment status`}
    >
      <div className="px-4 lg:px-6">
        <div className="mb-6">
          <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3 mb-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{invoice.invoiceNumber}</CardTitle>
                  <CardDescription>
                    Invoice date: {new Date(invoice.date).toLocaleDateString()}
                  </CardDescription>
                </div>
                <Badge className={getStatusColor(invoice.status)}>
                  {invoice.status.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Vendor and Bill To */}
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h4 className="font-semibold mb-2 text-sm text-muted-foreground">FROM</h4>
                  <div className="space-y-1">
                    <p className="font-medium">{invoice.vendor.name}</p>
                    <p className="text-sm text-muted-foreground">{invoice.vendor.address}</p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                      <Phone className="h-3 w-3" />
                      {invoice.vendor.phone}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {invoice.vendor.email}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2 text-sm text-muted-foreground">BILL TO</h4>
                  <div className="space-y-1">
                    <p className="font-medium">{invoice.billTo.name}</p>
                    <p className="text-sm text-muted-foreground">{invoice.billTo.address}</p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                      <Phone className="h-3 w-3" />
                      {invoice.billTo.phone}
                    </div>
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <h4 className="font-semibold mb-3">Invoice Items</h4>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoice.items.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                              maximumFractionDigits: 2,
                            }).format(item.rate)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                              maximumFractionDigits: 0,
                            }).format(item.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="font-medium">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                    maximumFractionDigits: 0,
                  }).format(invoice.subtotal)}
                </span>
              </div>

              {invoice.tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Tax</span>
                  <span className="font-medium">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                      maximumFractionDigits: 0,
                    }).format(invoice.tax)}
                  </span>
                </div>
              )}

              <div className="border-t pt-3">
                <div className="flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-lg">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                      maximumFractionDigits: 0,
                    }).format(invoice.total)}
                  </span>
                </div>
              </div>

              <div className="border-t pt-3 space-y-1">
                <div className="text-xs text-muted-foreground">
                  <strong>Invoice Date:</strong> {new Date(invoice.date).toLocaleDateString()}
                </div>
                <div className="text-xs text-muted-foreground">
                  <strong>Due Date:</strong> {new Date(invoice.dueDate).toLocaleDateString()}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" size="sm" className="flex-1">
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
                <Button size="sm" className="flex-1">
                  <Mail className="h-4 w-4 mr-1" />
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </BaseLayout>
  )
}

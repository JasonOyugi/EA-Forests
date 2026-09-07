import type { CalendarEvent } from "@/app/calendar/types"
import type { SupplyDataset, SupplyLot } from "./types"

export interface SupplyOperation {
  event: CalendarEvent
  basis: "committed" | "forecast" | "recommended"
  epistemicClass: "SYNTHETIC"
  supplyId: string | null
  amountUgx: number | null
  paymentStatus?: "pending" | "overdue" | "paid"
  counterpartyKind?: "grower" | "contractor" | "logistics"
}
export function createSupplyOperations(data: SupplyDataset): SupplyOperation[] {
  const payments = [
    { id: 8101, title: "Grower advance review", date: "2026-09-11", amount: 12600000, kind: "grower" as const, status: "pending" as const },
    { id: 8102, title: "Extraction contractor settlement", date: "2026-09-25", amount: 8400000, kind: "contractor" as const, status: "pending" as const },
    { id: 8103, title: "Haulage invoice reconciliation", date: "2026-09-03", amount: 4600000, kind: "logistics" as const, status: "overdue" as const },
    { id: 8104, title: "Intake haulage provision", date: "2026-10-20", amount: 6200000, kind: "logistics" as const, status: "pending" as const },
  ]
  const events: SupplyOperation[] = payments.map(payment => ({
    basis: "committed", epistemicClass: "SYNTHETIC", supplyId: null, amountUgx: payment.amount,
    paymentStatus: payment.status, counterpartyKind: payment.kind,
    event: {
      id: payment.id, title: `Preview · ${payment.title}`, date: new Date(`${payment.date}T09:00:00`),
      time: "9:00 AM", duration: "30 min", type: "payment", attendees: [], location: "Processor operations preview",
      color: "bg-emerald-700", status: `preview ${payment.status}`, vendor: `Example ${payment.kind}`,
      description: `SYNTHETIC example obligation: UGX ${payment.amount.toLocaleString("en-GB")}. This is not a recorded invoice or authorization to pay.`,
      agenda: ["Confirm invoice, counterparty and completion evidence before payment"],
    },
  }))
  const firstLot = data.lots.find(lot => lot.id === "UG-042")
  if (firstLot) events.push({
    basis: "forecast", epistemicClass: "SYNTHETIC", supplyId: firstLot.id, amountUgx: null,
    event: {
      id: 8201, title: `Preview forecast · ${firstLot.name} availability`, date: new Date(`${firstLot.availability.planningDate}T09:00:00`),
      time: "9:00 AM", duration: "Planning window", type: "activity", attendees: [], location: firstLot.name,
      color: "bg-emerald-700", status: "preview forecast", description: "Illustrative supply timing. No harvest or delivery is committed.",
    },
  })
  return events
}
export function verificationDraft(lot: SupplyLot): CalendarEvent {
  return {
    id: 8300 + Number(lot.id.split("-")[1]), title: `Preview recommendation · ${lot.name}`,
    date: new Date(`${lot.availability.planningDate}T09:00:00`), time: "9:00 AM", duration: "Unscheduled recommendation",
    type: "task", attendees: [], location: lot.name, color: "bg-amber-700", status: "preview recommendation",
    description: lot.nextAction.reason,
    agenda: ["Agree a suitable field sampling protocol", "Confirm stocking and tree dimensions", "Confirm landholder availability and extraction access"],
    diary: "Review-only draft. No task has been assigned, no contact made, and no canonical verification record created.",
  }
}
/** Buckets are cumulative from the explicit snapshot date; overdue is separate. */
export function paymentSummary(operations: SupplyOperation[], asOf: string) {
  const outstanding = operations.filter(op => op.amountUgx !== null && op.paymentStatus !== "paid")
  const offset = (op: SupplyOperation) => Math.floor((Date.UTC(op.event.date.getFullYear(), op.event.date.getMonth(), op.event.date.getDate()) - Date.parse(asOf)) / 86400000)
  const sum = (rows: SupplyOperation[]) => rows.reduce((total, op) => total + (op.amountUgx ?? 0), 0)
  return {
    outstanding, total: sum(outstanding), overdue: sum(outstanding.filter(op => offset(op) < 0)),
    buckets: [7, 30, 60].map(days => ({ days, amount: sum(outstanding.filter(op => offset(op) >= 0 && offset(op) <= days)) })),
  }
}

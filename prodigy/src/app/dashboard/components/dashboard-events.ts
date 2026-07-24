"use client"

import { format } from "date-fns"

import type { CalendarEvent } from "@/app/calendar/types"

import type { PaymentRow } from "./data-table"

function relativeDate(daysFromToday: number, hours: number, minutes: number) {
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  date.setDate(date.getDate() + daysFromToday)
  return date
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2)
}

function participant(
  name: string,
  role: string,
  organization: string,
  kind: NonNullable<CalendarEvent["participants"]>[number]["kind"]
) {
  return {
    name,
    role,
    organization,
    kind,
    initials: initials(name),
  }
}

export function createDashboardCalendarEvents(): CalendarEvent[] {
  return [
    {
      id: 301,
      title: "Thinning payout release - Pine Hollow D7",
      date: relativeDate(4, 11, 0),
      time: "11:00 AM",
      duration: "45 min",
      type: "payment",
      attendees: ["AM", "GK", "RT"],
      location: "Treasury workspace",
      color: "bg-emerald-600",
      description:
        "Authorize the scheduled thinning payout after the field completion note and contractor invoice are reconciled.",
      participants: [
        participant("Amina Mugo", "Investment operations lead", "EA Forests", "team"),
        participant("Grace Kato", "Vendor finance contact", "GreenCanopy Ltd", "vendor"),
        participant("Ruth Tendo", "Portfolio controller", "EA Forests", "operations"),
      ],
      agenda: [
        "Confirm released hectares against the D7 contractor log",
        "Review tax, retention, and contractor split",
        "Approve payment release and audit trail attachments",
      ],
      diary:
        "This release clears the last operational invoice ahead of the next inspection cycle and keeps Pine Hollow on its forecasted cash timing.",
      logs: [
        {
          id: "log-301-1",
          kind: "status",
          author: "Amina Mugo",
          timestamp: "Today, 8:40 AM",
          summary: "Field verification pack uploaded and marked ready for treasury review.",
        },
        {
          id: "log-301-2",
          kind: "message",
          author: "Grace Kato",
          timestamp: "Today, 9:05 AM",
          summary: "Vendor confirmed receiving the revised release note and bank reference format.",
        },
      ],
      linkedInvoice: "INV-2026-301",
      vendor: "GreenCanopy Ltd",
      status: "scheduled",
      assetGroupId: "group-3",
    },
    {
      id: 302,
      title: "Species rotation review - East Valley B4",
      date: relativeDate(2, 2, 30),
      time: "2:30 PM",
      duration: "1 hour",
      type: "meeting",
      attendees: ["JO", "NL", "PB"],
      location: "Investment desk / Teams",
      color: "bg-blue-600",
      description:
        "Review the current eucalyptus and teak mix against water stress, contractor pacing, and target valuation assumptions.",
      participants: [
        participant("Jason Oyugi", "Portfolio owner", "EA Forests", "investor"),
        participant("Naomi Lule", "Silviculture analyst", "EA Forests", "team"),
        participant("Peter Bwire", "Field coordinator", "SylvaOps", "vendor"),
      ],
      agenda: [
        "Review current age-band allocation by sub-block",
        "Confirm whether the teak line should absorb more hectares next quarter",
        "Record follow-up actions for contractor sequencing",
      ],
      diary:
        "Discussion should end with a concrete recommendation on whether the next 12 ha should stay in eucalyptus or shift into teak for the B4 corridor.",
      logs: [
        {
          id: "log-302-1",
          kind: "call",
          author: "Naomi Lule",
          timestamp: "Yesterday, 6:15 PM",
          summary: "Pre-read shared with updated moisture variance and expected yield assumptions.",
        },
      ],
      conferenceLink: "teams://species-rotation-east-valley",
      assetGroupId: "group-4",
    },
    {
      id: 303,
      title: "North Ridge density audit",
      date: relativeDate(6, 9, 30),
      time: "9:30 AM",
      duration: "2 hours",
      type: "activity",
      attendees: ["SM", "TO"],
      location: "North Ridge A1",
      color: "bg-lime-600",
      description:
        "Field activity to check survival rates and mark the next thinning and replanting decisions across the A1 grid.",
      participants: [
        participant("Sarah Mutesi", "Field auditor", "EA Forests", "operations"),
        participant("Tom Ochan", "Site supervisor", "TerrainWorks", "vendor"),
      ],
      agenda: [
        "Walk all live rows against establishment plan",
        "Capture replacement count and irrigation exceptions",
        "Log any contractor support actions before month-end",
      ],
      diary:
        "Expected to feed directly into the next species allocation decision for the Uganda blocks.",
      logs: [
        {
          id: "log-303-1",
          kind: "note",
          author: "Sarah Mutesi",
          timestamp: "Today, 7:55 AM",
          summary: "Drone strip and previous audit pack attached for side-by-side review.",
        },
      ],
      status: "scheduled",
      assetGroupId: "group-1",
    },
    {
      id: 304,
      title: "Seedling replenishment release - East Valley B4",
      date: relativeDate(9, 10, 15),
      time: "10:15 AM",
      duration: "30 min",
      type: "payment",
      attendees: ["RT", "PB"],
      location: "Treasury workspace",
      color: "bg-amber-500",
      description:
        "Release the replenishment payment for the replacement stock approved after the B4 survival review.",
      participants: [
        participant("Ruth Tendo", "Portfolio controller", "EA Forests", "operations"),
        participant("Peter Bwire", "Vendor coordinator", "SylvaOps", "vendor"),
      ],
      agenda: [
        "Validate accepted replenishment count",
        "Cross-check invoice support and replacement schedule",
      ],
      diary:
        "Payment remains contingent on the contractor confirming the final delivery lane and stock count.",
      logs: [
        {
          id: "log-304-1",
          kind: "payment",
          author: "Ruth Tendo",
          timestamp: "Today, 10:20 AM",
          summary: "Invoice staged and waiting for operations sign-off.",
        },
      ],
      linkedInvoice: "INV-2026-304",
      vendor: "SylvaOps",
      status: "scheduled",
      assetGroupId: "group-4",
    },
    {
      id: 305,
      title: "Road maintenance settlement - East Valley B4",
      date: relativeDate(-8, 3, 0),
      time: "3:00 PM",
      duration: "30 min",
      type: "payment",
      attendees: ["AM", "TO"],
      location: "Operations ledger",
      color: "bg-slate-500",
      description:
        "Settled the access-road maintenance invoice after the post-rain inspection confirmed the works were complete.",
      participants: [
        participant("Amina Mugo", "Investment operations lead", "EA Forests", "team"),
        participant("Tom Ochan", "Vendor supervisor", "TerrainWorks", "vendor"),
      ],
      agenda: ["Archived for reference"],
      diary:
        "Completed settlement. This one remains in the recent-payment list for audit visibility.",
      logs: [
        {
          id: "log-305-1",
          kind: "payment",
          author: "Amina Mugo",
          timestamp: "8 days ago, 3:22 PM",
          summary: "Marked paid after completion photos and access note were verified.",
        },
      ],
      linkedInvoice: "INV-2026-305",
      vendor: "TerrainWorks",
      status: "paid",
      assetGroupId: "group-4",
    },
    {
      id: 306,
      title: "Planting materials receipt - River Bend C2",
      date: relativeDate(-15, 1, 30),
      time: "1:30 PM",
      duration: "30 min",
      type: "payment",
      attendees: ["NL", "EM"],
      location: "Procurement ledger",
      color: "bg-emerald-500",
      description:
        "Materials receipt cleared after the River Bend consignment was logged and matched to delivery quantities.",
      participants: [
        participant("Naomi Lule", "Silviculture analyst", "EA Forests", "team"),
        participant("Eliud Maina", "Procurement lead", "Timberline Services", "vendor"),
      ],
      agenda: ["Archived for reference"],
      diary: "Receipt completed and attached to the River Bend planting file.",
      logs: [
        {
          id: "log-306-1",
          kind: "payment",
          author: "Naomi Lule",
          timestamp: "15 days ago, 2:05 PM",
          summary: "Marked received after goods note and batch numbers matched the order sheet.",
        },
      ],
      linkedInvoice: "INV-2026-306",
      vendor: "Timberline Services",
      status: "received",
      assetGroupId: "group-2",
    },
    {
      id: 307,
      title: "Investor call - allocation reforecast",
      date: relativeDate(11, 4, 0),
      time: "4:00 PM",
      duration: "45 min",
      type: "call",
      attendees: ["JO", "AM", "GK"],
      location: "Investor line",
      color: "bg-violet-600",
      description:
        "Talk through the revised allocation mix, expected payments, and near-term asset work across Uganda and Tanzania.",
      participants: [
        participant("Jason Oyugi", "Portfolio owner", "EA Forests", "investor"),
        participant("Amina Mugo", "Investment operations lead", "EA Forests", "team"),
        participant("Grace Kato", "Contractor finance contact", "GreenCanopy Ltd", "vendor"),
      ],
      agenda: [
        "Review revised hectares by variety",
        "Confirm next two scheduled contractor releases",
        "Capture investor follow-up questions",
      ],
      diary:
        "This call should align the capital pacing narrative with what the calendar and transaction queue now show.",
      logs: [
        {
          id: "log-307-1",
          kind: "message",
          author: "Amina Mugo",
          timestamp: "Today, 11:30 AM",
          summary: "Investor pack updated with the latest North Ridge and Pine Hollow assumptions.",
        },
      ],
      conferenceLink: "teams://investor-allocation-reforecast",
    },
  ]
}

export function deriveEventDates(events: CalendarEvent[]) {
  const counts = new Map<string, number>()

  events.forEach((event) => {
    const key = format(event.date, "yyyy-MM-dd")
    counts.set(key, (counts.get(key) ?? 0) + 1)
  })

  return Array.from(counts.entries()).map(([key, count]) => ({
    date: new Date(`${key}T00:00:00`),
    count,
  }))
}

function isUpcoming(date: Date) {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  return date.getTime() >= start.getTime()
}

function mapPaymentStatus(event: CalendarEvent): PaymentRow["status"] {
  if (event.status === "paid" || event.status === "received" || event.status === "pending" || event.status === "overdue" || event.status === "cancelled" || event.status === "scheduled") {
    return event.status
  }
  return "scheduled"
}

function inferPaymentAmount(event: CalendarEvent) {
  const seededAmounts: Record<number, number> = {
    301: 41300,
    304: 12700,
    305: 8920,
    306: 19780,
  }

  return seededAmounts[event.id] ?? 6400
}

function toPaymentRow(event: CalendarEvent): PaymentRow {
  return {
    invoice: event.linkedInvoice ?? `INV-${event.id}`,
    description: event.description ?? event.title,
    dueDate: format(event.date, "yyyy-MM-dd"),
    amount: inferPaymentAmount(event),
    status: mapPaymentStatus(event),
  }
}

export function getUpcomingPaymentRows(events: CalendarEvent[]) {
  return events
    .filter((event) => event.type === "payment")
    .filter((event) => isUpcoming(event.date))
    .filter((event) => !["paid", "received", "cancelled"].includes(event.status ?? "scheduled"))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map(toPaymentRow)
}

export function getRecentPaymentRows(events: CalendarEvent[]) {
  return events
    .filter((event) => event.type === "payment")
    .filter((event) => !isUpcoming(event.date) || ["paid", "received"].includes(event.status ?? ""))
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .map(toPaymentRow)
}

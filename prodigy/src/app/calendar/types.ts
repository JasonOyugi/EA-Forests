export type CalendarEventType =
  | "meeting"
  | "event"
  | "personal"
  | "task"
  | "reminder"
  | "payment"
  | "activity"
  | "call"

export interface CalendarEventParticipant {
  name: string
  initials: string
  role: string
  organization?: string
  kind?: "vendor" | "team" | "client" | "investor" | "operations"
}

export interface CalendarEventLogEntry {
  id: string
  kind: "message" | "call" | "note" | "status" | "payment"
  author: string
  timestamp: string
  summary: string
}

export interface CalendarEvent {
  id: number
  title: string
  date: Date
  time: string
  duration: string
  type: CalendarEventType
  attendees: string[]
  location: string
  color: string
  description?: string
  participants?: CalendarEventParticipant[]
  agenda?: string[]
  diary?: string
  logs?: CalendarEventLogEntry[]
  linkedInvoice?: string
  vendor?: string
  status?: string
  assetGroupId?: string
  conferenceLink?: string
}

export interface Calendar {
  id: string
  name: string
  color: string
  visible: boolean
  type: "personal" | "work" | "shared"
}

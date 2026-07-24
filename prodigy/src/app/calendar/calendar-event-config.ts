import type { CalendarEventType } from "./types"

export const calendarEventTypeConfig: Record<
  CalendarEventType,
  {
    label: string
    color: string
  }
> = {
  meeting: { label: "Meeting", color: "bg-blue-500" },
  call: { label: "Call", color: "bg-sky-500" },
  payment: { label: "Payment", color: "bg-emerald-500" },
  activity: { label: "Activity", color: "bg-lime-500" },
  event: { label: "Event", color: "bg-green-500" },
  personal: { label: "Personal", color: "bg-pink-500" },
  task: { label: "Task", color: "bg-orange-500" },
  reminder: { label: "Reminder", color: "bg-purple-500" },
}

export const calendarSidebarGroups = [
  {
    name: "My Calendars",
    items: ["meeting", "payment", "activity"] as CalendarEventType[],
  },
  {
    name: "Favorites",
    items: ["call", "task", "reminder"] as CalendarEventType[],
  },
  {
    name: "Others",
    items: ["event", "personal"] as CalendarEventType[],
  },
]

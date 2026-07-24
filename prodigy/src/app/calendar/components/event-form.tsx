"use client"

import { useEffect, useMemo, useState } from "react"
import { Building2, CalendarIcon, Clock, MapPin, NotebookTabs, ReceiptText, Tag, Type, Users } from "lucide-react"
import { format } from "date-fns"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import { calendarEventTypeConfig } from "../calendar-event-config"
import { type CalendarEvent } from "../types"

interface EventFormProps {
  event?: CalendarEvent | null
  open: boolean
  onOpenChange: (open: boolean) => void
  initialDate?: Date
  onSave: (event: Partial<CalendarEvent>) => void
  onDelete?: (eventId: number) => void
}

type ParticipantDraft = {
  name: string
  role: string
  organization: string
  kind: NonNullable<CalendarEvent["participants"]>[number]["kind"] extends infer T
    ? Exclude<T, undefined>
    : "team"
}

const eventTypes = Object.entries(calendarEventTypeConfig).map(([value, config]) => ({
  value: value as CalendarEvent["type"],
  label: config.label,
  color: config.color,
}))

const timeSlots = [
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM",
  "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM",
]

const durationOptions = [
  "15 min", "30 min", "45 min", "1 hour", "1.5 hours", "2 hours", "3 hours", "All day",
]

function buildParticipantState(event?: CalendarEvent | null) {
  return event?.participants?.length
    ? event.participants.map((entry) => ({
        name: entry.name,
        role: entry.role,
        organization: entry.organization ?? "",
        kind: entry.kind ?? "team",
      }))
    : (event?.attendees ?? []).map((attendee) => ({
        name: attendee,
        role: "Attendee",
        organization: "",
        kind: "team" as const,
      }))
}

export function EventForm({ event, open, onOpenChange, initialDate, onSave, onDelete }: EventFormProps) {
  const [formData, setFormData] = useState({
    title: event?.title || "",
    date: event?.date || initialDate || new Date(),
    time: event?.time || "9:00 AM",
    duration: event?.duration || "1 hour",
    type: event?.type || "meeting",
    location: event?.location || "",
    description: event?.description || "",
    linkedInvoice: event?.linkedInvoice || "",
    vendor: event?.vendor || "",
    status: event?.status || "scheduled",
    diary: event?.diary || "",
    agendaText: event?.agenda?.join("\n") || "",
    allDay: false,
    reminder: true,
  })
  const [showCalendar, setShowCalendar] = useState(false)
  const [participantDraft, setParticipantDraft] = useState<ParticipantDraft>({
    name: "",
    role: "",
    organization: "",
    kind: "team",
  })
  const [participants, setParticipants] = useState<ParticipantDraft[]>(buildParticipantState(event))

  useEffect(() => {
    setFormData({
      title: event?.title || "",
      date: event?.date || initialDate || new Date(),
      time: event?.time || "9:00 AM",
      duration: event?.duration || "1 hour",
      type: event?.type || "meeting",
      location: event?.location || "",
      description: event?.description || "",
      linkedInvoice: event?.linkedInvoice || "",
      vendor: event?.vendor || "",
      status: event?.status || "scheduled",
      diary: event?.diary || "",
      agendaText: event?.agenda?.join("\n") || "",
      allDay: false,
      reminder: true,
    })
    setParticipants(buildParticipantState(event))
  }, [event, initialDate, open])

  const selectedEventType = eventTypes.find((entry) => entry.value === formData.type)
  const statusOptions = useMemo(
    () => ["scheduled", "in progress", "pending", "paid", "received", "completed"],
    []
  )

  const handleSave = () => {
    const normalizedParticipants = participants
      .filter((entry) => entry.name.trim())
      .map((entry) => ({
        name: entry.name.trim(),
        role: entry.role.trim() || "Attendee",
        organization: entry.organization.trim() || undefined,
        kind: entry.kind,
        initials: entry.name
          .split(" ")
          .filter(Boolean)
          .map((part) => part[0]?.toUpperCase() ?? "")
          .join("")
          .slice(0, 2),
      }))

    onSave({
      id: event?.id,
      title: formData.title,
      date: formData.date,
      time: formData.time,
      duration: formData.duration,
      type: formData.type,
      location: formData.location,
      description: formData.description,
      attendees: normalizedParticipants.map((entry) => entry.initials),
      participants: normalizedParticipants,
      linkedInvoice: formData.linkedInvoice || undefined,
      vendor: formData.vendor || undefined,
      status: formData.status || undefined,
      diary: formData.diary || undefined,
      agenda: formData.agendaText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      logs: event?.logs ?? [],
      assetGroupId: event?.assetGroupId,
      conferenceLink: event?.conferenceLink,
      color: eventTypes.find((entry) => entry.value === formData.type)?.color || "bg-blue-500",
    })
    onOpenChange(false)
  }

  const handleDelete = () => {
    if (event?.id && onDelete) {
      onDelete(event.id)
      onOpenChange(false)
    }
  }

  const addParticipant = () => {
    if (!participantDraft.name.trim()) return

    setParticipants((previous) => [
      ...previous,
      {
        ...participantDraft,
        name: participantDraft.name.trim(),
        role: participantDraft.role.trim(),
        organization: participantDraft.organization.trim(),
      },
    ])
    setParticipantDraft({
      name: "",
      role: "",
      organization: "",
      kind: "team",
    })
  }

  const removeParticipant = (name: string) => {
    setParticipants((previous) => previous.filter((entry) => entry.name !== name))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] !w-[min(56rem,calc(100vw-1.5rem))] !max-w-[56rem] overflow-y-auto p-0">
        <DialogHeader>
          <div className="border-b bg-muted/30 px-6 py-5">
            <DialogTitle className="flex items-center gap-2 text-left">
              <div className={cn("h-3 w-3 rounded-full", selectedEventType?.color)} />
              {event ? "Edit Event" : "Create New Event"}
            </DialogTitle>
            <DialogDescription className="pt-2 text-left">
              {event ? "Refine the schedule, people, and notes attached to this event." : "Create a flexible event with participants, vendor context, and working notes."}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-6 px-6 py-5 xl:px-7">
          <div className="space-y-6 rounded-2xl border p-5">
            <div className="space-y-2">
              <Label htmlFor="title" className="flex items-center gap-2">
                <Type className="h-4 w-4" />
                Event Title
              </Label>
              <Input
                id="title"
                placeholder="Enter event title..."
                value={formData.title}
                onChange={(changeEvent) => setFormData((previous) => ({ ...previous, title: changeEvent.target.value }))}
                className="text-lg font-medium"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Event Type
                </Label>
                <Select value={formData.type} onValueChange={(value) => setFormData((previous) => ({ ...previous, type: value as CalendarEvent["type"] }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <div className={cn("h-3 w-3 rounded-full", type.color)} />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <ReceiptText className="h-4 w-4" />
                  Status
                </Label>
                <Select value={formData.status} onValueChange={(value) => setFormData((previous) => ({ ...previous, status: value }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-6 rounded-2xl border p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Date
                </Label>
                <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      {format(formData.date, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.date}
                      onSelect={(date) => {
                        if (date) {
                          setFormData((previous) => ({ ...previous, date }))
                          setShowCalendar(false)
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Time
                </Label>
                <Select value={formData.time} onValueChange={(value) => setFormData((previous) => ({ ...previous, time: value }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select value={formData.duration} onValueChange={(value) => setFormData((previous) => ({ ...previous, duration: value }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {durationOptions.map((duration) => (
                      <SelectItem key={duration} value={duration}>
                        {duration}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Options</Label>
                <div className="flex min-h-10 flex-wrap items-center gap-5 rounded-xl border px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="all-day"
                      checked={formData.allDay}
                      onCheckedChange={(checked) => setFormData((previous) => ({ ...previous, allDay: checked }))}
                    />
                    <Label htmlFor="all-day" className="text-sm">All day</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="reminder"
                      checked={formData.reminder}
                      onCheckedChange={(checked) => setFormData((previous) => ({ ...previous, reminder: checked }))}
                    />
                    <Label htmlFor="reminder" className="text-sm">Reminder</Label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6 rounded-2xl border p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location
                </Label>
                <Input
                  id="location"
                  placeholder="Add location..."
                  value={formData.location}
                  onChange={(changeEvent) => setFormData((previous) => ({ ...previous, location: changeEvent.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Vendor / Organization
                </Label>
                <Input
                  id="vendor"
                  placeholder="Add vendor or owner..."
                  value={formData.vendor}
                  onChange={(changeEvent) => setFormData((previous) => ({ ...previous, vendor: changeEvent.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="linked-invoice" className="flex items-center gap-2">
                <ReceiptText className="h-4 w-4" />
                Linked Invoice / Reference
              </Label>
              <Input
                id="linked-invoice"
                placeholder="INV-2026-..."
                value={formData.linkedInvoice}
                onChange={(changeEvent) => setFormData((previous) => ({ ...previous, linkedInvoice: changeEvent.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Add description..."
                value={formData.description}
                onChange={(changeEvent) => setFormData((previous) => ({ ...previous, description: changeEvent.target.value }))}
                rows={4}
              />
            </div>
          </div>

          <div className="space-y-5 rounded-2xl border p-5">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                People Involved
              </Label>
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  placeholder="Name"
                  value={participantDraft.name}
                  onChange={(changeEvent) => setParticipantDraft((previous) => ({ ...previous, name: changeEvent.target.value }))}
                />
                <Input
                  placeholder="Role"
                  value={participantDraft.role}
                  onChange={(changeEvent) => setParticipantDraft((previous) => ({ ...previous, role: changeEvent.target.value }))}
                />
                <Input
                  placeholder="Organization"
                  value={participantDraft.organization}
                  onChange={(changeEvent) => setParticipantDraft((previous) => ({ ...previous, organization: changeEvent.target.value }))}
                />
                <Select
                  value={participantDraft.kind}
                  onValueChange={(value) =>
                    setParticipantDraft((previous) => ({
                      ...previous,
                      kind: value as ParticipantDraft["kind"],
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="team">Team</SelectItem>
                    <SelectItem value="vendor">Vendor</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="investor">Investor</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={addParticipant} variant="outline" className="mt-2 cursor-pointer">
                Add participant
              </Button>
            </div>

            {participants.length > 0 ? (
              <div className="space-y-2">
                {participants.map((entry, index) => (
                  <div key={`${entry.name}-${index}`} className="flex items-center justify-between rounded-xl border bg-muted/20 px-3 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {entry.name
                            .split(" ")
                            .filter(Boolean)
                            .map((part) => part[0]?.toUpperCase() ?? "")
                            .join("")
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{entry.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {entry.role || "Attendee"}
                          {entry.organization ? ` - ${entry.organization}` : ""}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeParticipant(entry.name)}
                      className="cursor-pointer text-muted-foreground hover:text-foreground"
                      type="button"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.9fr)]">
            <div className="space-y-6 rounded-2xl border p-5">
              <div className="space-y-2">
                <Label htmlFor="agenda" className="flex items-center gap-2">
                  <NotebookTabs className="h-4 w-4" />
                  Agenda / Checklist
                </Label>
                <Textarea
                  id="agenda"
                  placeholder={"One item per line...\nConfirm vendor scope\nCapture next action"}
                  value={formData.agendaText}
                  onChange={(changeEvent) => setFormData((previous) => ({ ...previous, agendaText: changeEvent.target.value }))}
                  rows={5}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="diary">Diary / Working Notes</Label>
                <Textarea
                  id="diary"
                  placeholder="Add context, follow-up notes, or diary details..."
                  value={formData.diary}
                  onChange={(changeEvent) => setFormData((previous) => ({ ...previous, diary: changeEvent.target.value }))}
                  rows={6}
                />
              </div>
            </div>

            <div className="rounded-2xl border bg-muted/20 p-5">
              <div className="text-sm font-medium">Quick context</div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Use flexible types like meetings, payments, activities, reminders, tasks, calls, or personal items. Added participants show up in the detail popup with their roles and organizations.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 border-t px-6 py-4">
          <Button onClick={handleSave} className="flex-1 cursor-pointer">
            {event ? "Update Event" : "Create Event"}
          </Button>
          {event && onDelete ? (
            <Button onClick={handleDelete} variant="destructive" className="cursor-pointer">
              Delete
            </Button>
          ) : null}
          <Button onClick={() => onOpenChange(false)} variant="outline" className="cursor-pointer">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

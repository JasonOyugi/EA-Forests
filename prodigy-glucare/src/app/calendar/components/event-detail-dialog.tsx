"use client"

import { CalendarDays, Clock3, FileText, MapPin, PhoneCall, Receipt, ScrollText, Users2 } from "lucide-react"
import { format } from "date-fns"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

import { calendarEventTypeConfig } from "../calendar-event-config"
import type { CalendarEvent } from "../types"

interface EventDetailDialogProps {
  event: CalendarEvent | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (event: CalendarEvent) => void
}

function titleCase(value: string) {
  return value.replace(/(^|\s)\S/g, (match) => match.toUpperCase())
}

export function EventDetailDialog({ event, open, onOpenChange, onEdit }: EventDetailDialogProps) {
  if (!event) return null

  const participants =
    event.participants?.length
      ? event.participants
      : event.attendees.map((attendee) => ({
          name: attendee,
          initials: attendee,
          role: "Attendee",
          organization: event.vendor ?? "Calendar guest",
          kind: "team" as const,
        }))
  const eventType = calendarEventTypeConfig[event.type]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(76rem,calc(100vw-1.5rem))] max-w-5xl overflow-hidden p-0">
        <div className="border-b bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-6 py-6 text-white">
          <DialogHeader className="space-y-4 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={cn("border-0 text-white", eventType.color)}>{eventType.label}</Badge>
              {event.status ? <Badge variant="secondary" className="bg-white/12 text-white">{titleCase(event.status)}</Badge> : null}
              {event.linkedInvoice ? <Badge variant="secondary" className="bg-white/12 text-white">{event.linkedInvoice}</Badge> : null}
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-2xl font-semibold text-white">{event.title}</DialogTitle>
              <DialogDescription className="max-w-3xl text-slate-200">
                {event.description ?? "Review the key participants, context, and activity attached to this event."}
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-300">
                <CalendarDays className="h-4 w-4" />
                Schedule
              </div>
              <div className="mt-3 text-sm text-white">{format(event.date, "EEEE, MMMM d, yyyy")}</div>
              <div className="mt-1 flex items-center gap-2 text-sm text-slate-200">
                <Clock3 className="h-4 w-4" />
                {event.time} · {event.duration}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-300">
                <MapPin className="h-4 w-4" />
                Context
              </div>
              <div className="mt-3 text-sm text-white">{event.location || "No location added"}</div>
              <div className="mt-1 text-sm text-slate-200">
                {event.vendor ?? (event.assetGroupId ? `Linked asset ${event.assetGroupId}` : "Standalone event")}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-300">
                <Users2 className="h-4 w-4" />
                People
              </div>
              <div className="mt-3 text-sm text-white">{participants.length} participant{participants.length === 1 ? "" : "s"}</div>
              <div className="mt-1 text-sm text-slate-200">
                {participants.map((entry) => entry.role).slice(0, 2).join(" · ")}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="people">People</TabsTrigger>
              <TabsTrigger value="log">Log</TabsTrigger>
              <TabsTrigger value="diary">Diary</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="grid gap-4 lg:grid-cols-[minmax(0,1.18fr)_minmax(280px,0.82fr)]">
              <div className="rounded-2xl border bg-muted/20 p-5">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Summary
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {event.description ?? "No description has been added yet."}
                </p>
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl border bg-background p-5">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                    Agenda
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(event.agenda?.length ? event.agenda : ["No agenda items added yet."]).map((item) => (
                      <Badge key={item} variant="outline" className="rounded-full px-3 py-1 text-xs">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border bg-muted/20 p-5">
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Event type</div>
                  <div className="mt-3 flex items-center gap-3">
                    <span className={cn("h-3 w-3 rounded-full", eventType.color)} />
                    <span className="font-medium">{eventType.label}</span>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="people" className="space-y-3">
              {participants.map((entry) => (
                <div key={`${entry.name}-${entry.role}`} className="flex items-center justify-between rounded-2xl border p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>{entry.initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{entry.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {entry.role}
                        {entry.organization ? ` · ${entry.organization}` : ""}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline">{titleCase(entry.kind ?? "team")}</Badge>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="log" className="space-y-3">
              {(event.logs?.length ? event.logs : []).map((entry) => (
                <div key={entry.id} className="rounded-2xl border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {entry.kind === "call" ? <PhoneCall className="h-4 w-4 text-muted-foreground" /> : <ScrollText className="h-4 w-4 text-muted-foreground" />}
                      {titleCase(entry.kind)}
                    </div>
                    <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{entry.timestamp}</div>
                  </div>
                  <div className="mt-2 text-sm font-medium">{entry.author}</div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{entry.summary}</p>
                </div>
              ))}
              {!event.logs?.length ? (
                <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                  No activity log entries yet.
                </div>
              ) : null}
            </TabsContent>

            <TabsContent value="diary">
              <div className="rounded-2xl border bg-muted/20 p-5 text-sm leading-6 text-muted-foreground">
                {event.diary ?? "No diary notes yet."}
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button onClick={() => onEdit?.(event)}>Edit event</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

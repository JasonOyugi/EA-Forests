"use client"

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"

import { CalendarSidebar } from "./calendar-sidebar"
import { CalendarMain } from "./calendar-main"
import { EventForm } from "./event-form"

import { type CalendarEvent } from "../types"
import { useCalendar } from "../use-calendar"

interface CalendarProps {
  events: CalendarEvent[]
  eventDates?: Array<{ date: Date; count: number }>
  onEventsChange?: (events: CalendarEvent[]) => void
}

export function Calendar({ events, eventDates, onEventsChange }: CalendarProps) {
  const calendar = useCalendar(events, onEventsChange)
  const derivedEventDates =
    eventDates ??
    calendar.events.reduce<Array<{ date: Date; count: number }>>((accumulator, event) => {
      const key = event.date.toDateString()
      const existing = accumulator.find((entry) => entry.date.toDateString() === key)

      if (existing) {
        existing.count += 1
      } else {
        accumulator.push({ date: new Date(event.date), count: 1 })
      }

      return accumulator
    }, [])

  return (
    <>
      <div className="relative rounded-lg border bg-background">
        <div className="flex min-h-[600px] sm:min-h-[700px] md:min-h-[800px]">
          <div className="hidden w-80 flex-shrink-0 border-r xl:block">
            <CalendarSidebar
              selectedDate={calendar.selectedDate}
              onDateSelect={calendar.handleDateSelect}
              onNewCalendar={calendar.handleNewCalendar}
              onNewEvent={calendar.handleNewEvent}
              events={derivedEventDates}
              className="h-full"
            />
          </div>

          <div className="min-w-0 flex-1">
            <CalendarMain
              selectedDate={calendar.selectedDate}
              onDateSelect={calendar.handleDateSelect}
              onDayClick={calendar.handleCreateEventForDate}
              onMenuClick={() => calendar.setShowCalendarSheet(true)}
              events={calendar.events}
              onEventEdit={calendar.handleEditEvent}
            />
          </div>
        </div>

        <Sheet open={calendar.showCalendarSheet} onOpenChange={calendar.setShowCalendarSheet}>
          <SheetContent side="left" className="w-80 p-0" style={{ position: "absolute" }}>
            <SheetHeader className="p-4 pb-2">
              <SheetTitle>Calendar</SheetTitle>
              <SheetDescription>Browse dates and manage your calendar events</SheetDescription>
            </SheetHeader>
            <CalendarSidebar
              selectedDate={calendar.selectedDate}
              onDateSelect={calendar.handleDateSelect}
              onNewCalendar={calendar.handleNewCalendar}
              onNewEvent={calendar.handleNewEvent}
              events={derivedEventDates}
              className="h-full"
            />
          </SheetContent>
        </Sheet>
      </div>

      <EventForm
        event={calendar.editingEvent}
        open={calendar.showEventForm}
        onOpenChange={calendar.setShowEventForm}
        initialDate={calendar.draftDate}
        onSave={calendar.handleSaveEvent}
        onDelete={calendar.handleDeleteEvent}
      />
    </>
  )
}

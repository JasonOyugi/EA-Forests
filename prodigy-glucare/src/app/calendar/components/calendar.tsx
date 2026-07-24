"use client"

import { CalendarMain } from "./calendar-main"
import { EventForm } from "./event-form"

import { type CalendarEvent } from "../types"
import { useCalendar } from "../use-calendar"

interface CalendarProps {
  events: CalendarEvent[]
  eventDates?: Array<{ date: Date; count: number }>
  onEventsChange?: (events: CalendarEvent[]) => void
}

export function Calendar({ events, eventDates: _eventDates, onEventsChange }: CalendarProps) {
  const calendar = useCalendar(events, onEventsChange)

  return (
    <>
      <div className="relative rounded-lg border bg-background">
        <div className="min-h-[600px] sm:min-h-[700px] md:min-h-[800px]">
          <CalendarMain
            selectedDate={calendar.selectedDate}
            onDateSelect={calendar.handleDateSelect}
            onDayClick={calendar.handleCreateEventForDate}
            onNewEvent={calendar.handleNewEvent}
            events={calendar.events}
            onEventEdit={calendar.handleEditEvent}
          />
        </div>
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

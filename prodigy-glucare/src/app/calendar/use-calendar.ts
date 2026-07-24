"use client"

import { useCallback, useEffect, useState } from "react"

import { type CalendarEvent } from "./types"

export interface UseCalendarState {
  selectedDate: Date
  showEventForm: boolean
  editingEvent: CalendarEvent | null
  showCalendarSheet: boolean
  draftDate: Date
  events: CalendarEvent[]
}

export interface UseCalendarActions {
  setSelectedDate: (date: Date) => void
  setShowEventForm: (show: boolean) => void
  setEditingEvent: (event: CalendarEvent | null) => void
  setShowCalendarSheet: (show: boolean) => void
  setDraftDate: (date: Date) => void
  handleDateSelect: (date: Date) => void
  handleNewEvent: () => void
  handleCreateEventForDate: (date: Date) => void
  handleNewCalendar: () => void
  handleSaveEvent: (eventData: Partial<CalendarEvent>) => void
  handleDeleteEvent: (eventId: number) => void
  handleEditEvent: (event: CalendarEvent) => void
}

export interface UseCalendarReturn extends UseCalendarState, UseCalendarActions {}

export function useCalendar(
  initialEvents: CalendarEvent[] = [],
  onEventsChange?: (events: CalendarEvent[]) => void
): UseCalendarReturn {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [showEventForm, setShowEventForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [showCalendarSheet, setShowCalendarSheet] = useState(false)
  const [draftDate, setDraftDate] = useState<Date>(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents)

  useEffect(() => {
    setEvents(initialEvents)
  }, [initialEvents])

  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date)
    setDraftDate(date)
    setShowCalendarSheet(false)
  }, [])

  const handleNewEvent = useCallback(() => {
    setEditingEvent(null)
    setDraftDate(selectedDate)
    setShowEventForm(true)
  }, [selectedDate])

  const handleCreateEventForDate = useCallback((date: Date) => {
    setSelectedDate(date)
    setDraftDate(date)
    setEditingEvent(null)
    setShowEventForm(true)
    setShowCalendarSheet(false)
  }, [])

  const handleNewCalendar = useCallback(() => {
    console.log("Creating new calendar")
  }, [])

  const handleSaveEvent = useCallback((eventData: Partial<CalendarEvent>) => {
    setEvents((previousEvents) => {
      const nextEvent: CalendarEvent = {
        id: eventData.id ?? Math.max(0, ...previousEvents.map((entry) => entry.id)) + 1,
        title: eventData.title ?? "Untitled event",
        date: eventData.date ?? draftDate,
        time: eventData.time ?? "9:00 AM",
        duration: eventData.duration ?? "1 hour",
        type: eventData.type ?? "meeting",
        attendees: eventData.attendees ?? [],
        location: eventData.location ?? "",
        color: eventData.color ?? "bg-blue-500",
        description: eventData.description,
        participants: eventData.participants ?? [],
        agenda: eventData.agenda ?? [],
        diary: eventData.diary,
        logs: eventData.logs ?? [],
        linkedInvoice: eventData.linkedInvoice,
        vendor: eventData.vendor,
        status: eventData.status,
        assetGroupId: eventData.assetGroupId,
        conferenceLink: eventData.conferenceLink,
      }

      const nextEvents = previousEvents.some((entry) => entry.id === nextEvent.id)
        ? previousEvents.map((entry) => (entry.id === nextEvent.id ? nextEvent : entry))
        : [...previousEvents, nextEvent]

      onEventsChange?.(nextEvents)
      return nextEvents
    })

    setShowEventForm(false)
    setEditingEvent(null)
  }, [draftDate, onEventsChange])

  const handleDeleteEvent = useCallback((eventId: number) => {
    setEvents((previousEvents) => {
      const nextEvents = previousEvents.filter((entry) => entry.id !== eventId)
      onEventsChange?.(nextEvents)
      return nextEvents
    })

    setShowEventForm(false)
    setEditingEvent(null)
  }, [onEventsChange])

  const handleEditEvent = useCallback((event: CalendarEvent) => {
    setEditingEvent(event)
    setDraftDate(event.date)
    setShowEventForm(true)
  }, [])

  return {
    selectedDate,
    showEventForm,
    editingEvent,
    showCalendarSheet,
    draftDate,
    events,
    setSelectedDate,
    setShowEventForm,
    setEditingEvent,
    setShowCalendarSheet,
    setDraftDate,
    handleDateSelect,
    handleNewEvent,
    handleCreateEventForDate,
    handleNewCalendar,
    handleSaveEvent,
    handleDeleteEvent,
    handleEditEvent,
  }
}

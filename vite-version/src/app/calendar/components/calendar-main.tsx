"use client"

import { useEffect, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  MoreHorizontal,
  Search,
  Grid3X3,
  List,
  ChevronDown,
  Menu,
} from "lucide-react"
import { addMonths, eachDayOfInterval, endOfMonth, format, isSameDay, isSameMonth, isToday, startOfMonth, subMonths } from "date-fns"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

import { calendarEventTypeConfig } from "../calendar-event-config"
import { EventDetailDialog } from "./event-detail-dialog"

import { type CalendarEvent } from "../types"

interface CalendarMainProps {
  selectedDate?: Date
  onDateSelect?: (date: Date) => void
  onDayClick?: (date: Date) => void
  onMenuClick?: () => void
  events?: CalendarEvent[]
  onEventEdit?: (event: CalendarEvent) => void
}

export function CalendarMain({ selectedDate, onDateSelect, onDayClick, onMenuClick, events, onEventEdit }: CalendarMainProps) {
  const sampleEvents: CalendarEvent[] = events ?? []

  const [currentDate, setCurrentDate] = useState(selectedDate || new Date())
  const [viewMode, setViewMode] = useState<"month" | "week" | "day" | "list">("month")
  const [showEventDialog, setShowEventDialog] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  useEffect(() => {
    if (selectedDate && !isSameMonth(selectedDate, currentDate)) {
      setCurrentDate(selectedDate)
    }
  }, [currentDate, selectedDate])

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = new Date(monthStart)
  calendarStart.setDate(calendarStart.getDate() - monthStart.getDay())
  const calendarEnd = new Date(monthEnd)
  calendarEnd.setDate(calendarEnd.getDate() + (6 - monthEnd.getDay()))
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const getEventsForDay = (date: Date) => sampleEvents.filter((event) => isSameDay(event.date, date))

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate(direction === "prev" ? subMonths(currentDate, 1) : addMonths(currentDate, 1))
  }

  const goToToday = () => setCurrentDate(new Date())

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setShowEventDialog(true)
  }

  const renderCalendarGrid = () => {
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    return (
      <div className="flex-1 bg-background">
        <div className="grid grid-cols-7 border-b">
          {weekDays.map((day) => (
            <div key={day} className="border-r p-4 text-center text-sm font-medium text-muted-foreground last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 flex-1">
          {calendarDays.map((day) => {
            const dayEvents = getEventsForDay(day)
            const isCurrentMonth = isSameMonth(day, currentDate)
            const isDayToday = isToday(day)
            const isSelected = selectedDate && isSameDay(day, selectedDate)

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "min-h-[120px] cursor-pointer border-r border-b p-2 transition-colors last:border-r-0",
                  isCurrentMonth ? "bg-background hover:bg-accent/50" : "bg-muted/30 text-muted-foreground",
                  isSelected && "ring-primary ring-2 ring-inset",
                  isDayToday && "bg-accent/20"
                )}
                onClick={() => {
                  onDateSelect?.(day)
                  onDayClick?.(day)
                }}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      isDayToday && "bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-md text-xs"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {dayEvents.length > 2 ? (
                    <span className="text-xs text-muted-foreground">+{dayEvents.length - 2}</span>
                  ) : null}
                </div>

                <div className="space-y-1">
                  {dayEvents.slice(0, 2).map((event) => (
                    <div
                      key={event.id}
                      className={cn(
                        "cursor-pointer truncate rounded-sm p-1 text-xs text-white",
                        calendarEventTypeConfig[event.type]?.color ?? event.color
                      )}
                      onClick={(clickEvent) => {
                        clickEvent.stopPropagation()
                        handleEventClick(event)
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span className="truncate">{event.title}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderListView = () => {
    const upcomingEvents = sampleEvents
      .filter((event) => event.date >= new Date())
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    return (
      <div className="flex-1 p-6">
        <div className="space-y-4">
          {upcomingEvents.map((event) => (
            <Card key={event.id} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => handleEventClick(event)}>
              <CardContent className="px-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={cn("mt-1.5 h-3 w-3 rounded-full", calendarEventTypeConfig[event.type]?.color ?? event.color)} />
                    <div className="flex-1">
                      <h3 className="font-medium">{event.title}</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="h-4 w-4" />
                          {format(event.date, "MMM d, yyyy")}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {event.time}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {event.location}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {event.attendees.slice(0, 3).map((attendee, index) => (
                        <Avatar key={`${event.id}-${attendee}-${index}`} className="border-2 border-background">
                          <AvatarFallback className="text-xs">{attendee}</AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    <Button variant="ghost" size="sm" className="cursor-pointer">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col flex-wrap gap-4 border-b p-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="outline" size="sm" className="cursor-pointer xl:hidden" onClick={onMenuClick}>
            <Menu className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")} className="cursor-pointer">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateMonth("next")} className="cursor-pointer">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday} className="cursor-pointer">
              Today
            </Button>
          </div>

          <h1 className="text-2xl font-semibold">{format(currentDate, "MMMM yyyy")}</h1>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative">
            <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input placeholder="Search events..." className="w-64 pl-10" />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="cursor-pointer">
                {viewMode === "month" ? <Grid3X3 className="mr-2 h-4 w-4" /> : <List className="mr-2 h-4 w-4" />}
                {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setViewMode("month")} className="cursor-pointer">
                <Grid3X3 className="mr-2 h-4 w-4" />
                Month
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setViewMode("list")} className="cursor-pointer">
                <List className="mr-2 h-4 w-4" />
                List
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {viewMode === "month" ? renderCalendarGrid() : renderListView()}

      <EventDetailDialog
        event={selectedEvent}
        open={showEventDialog}
        onOpenChange={setShowEventDialog}
        onEdit={(event) => {
          setShowEventDialog(false)
          onEventEdit?.(event)
        }}
      />
    </div>
  )
}

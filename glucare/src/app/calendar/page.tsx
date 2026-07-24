import { BaseLayout } from "@/components/layouts/base-layout"
import { Calendar } from "./components/calendar"
import { events, eventDates } from "./data"

export default function CalendarPage() {
  return (
    <BaseLayout 
      title="Booking Calendar" 
      description="Book and manage GluCare consultation appointments"
    >
      <div className="px-4 lg:px-6">
        <Calendar events={events} eventDates={eventDates} />
      </div>
    </BaseLayout>
  )
}

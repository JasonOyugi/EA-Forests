import { BaseLayout } from "@/components/layouts/base-layout"
import { ChartAreaInteractive } from "./components/chart-area-interactive"
import { DataTable } from "./components/data-table"
import { SectionCards } from "./components/section-cards"

export default function Page() {
  return (
    <BaseLayout title="Investor Dashboard" description="Welcome to your admin dashboard: see your portfolio's performance this season">
      <div className="@container/main px-4 lg:px-6 space-y-6">
        <SectionCards />
        <ChartAreaInteractive />
      </div>
      <div className="@container/main">
        <DataTable />
      </div>
    </BaseLayout>
  )
}

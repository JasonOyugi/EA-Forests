import { BaseLayout } from "@/components/layouts/base-layout"
import { MetricsOverview } from "./components/metrics-overview"
import { SalesChart } from "./components/sales-chart"
import { RecentTransactions } from "./components/recent-transactions"
import { TopProducts } from "./components/top-products"
import { CustomerInsights } from "./components/customer-insights"
import { QuickActions } from "./components/quick-actions"
import { TasksPanel } from "@/app/tasks/components/tasks-panel"
import { UsersPanel } from "@/app/users/components/users-panel"

export default function Dashboard2() {
  return (
    <BaseLayout>
      <div className="flex-1 space-y-6 px-6 pt-0">
        {/* Enhanced Header */}

        <div className="flex md:flex-row flex-col md:items-center justify-between gap-4 md:gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Investor Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor your forest investment performance and key metrics in real-time
            </p>
          </div>
          <QuickActions />
        </div>

        {/* Main Dashboard Grid */}
        <div className="@container/main space-y-6">
          {/* Top Row - Key Metrics */}

          <MetricsOverview />

          {/* Second Row */}
          <div className="grid gap-6 grid-cols-1 @5xl:grid-cols-2">
            <SalesChart />
            <RecentTransactions />
          </div>

          {/* Third Row */}
          <div className="grid gap-6 grid-cols-1 @5xl:grid-cols-2">
            <TopProducts />
            <CustomerInsights />
          </div>

          {/* Fourth Row - Integrated Tasks */}
          <TasksPanel showCreateTaskAction={false} className="pb-6" />

          {/* Fifth Row - Integrated Users */}
          <UsersPanel />
        </div>
      </div>
    </BaseLayout>
  )
}

import { BaseLayout } from "@/components/layouts/base-layout"
import { TasksPanel } from "./components/tasks-panel"

export default function TaskPage() {
  return (
    <BaseLayout title="Tasks" description="A powerful task and issue tracker built with Tanstack Table.">
      <TasksPanel />
    </BaseLayout>
  )
}

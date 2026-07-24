"use client"

import { useMemo, useState } from "react"
import { ArrowUp, BarChart3, CheckCircle2, Clock, ListTodo } from "lucide-react"
import { z } from "zod"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { columns } from "./columns"
import { DataTable } from "./data-table"
import { taskSchema, type Task } from "../data/schema"
import tasksData from "../data/tasks.json"

interface TasksPanelProps {
  showCreateTaskAction?: boolean
  showHeader?: boolean
  className?: string
}

function getPercentage(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0
}

export function TasksPanel({
  showCreateTaskAction = true,
  showHeader = true,
  className,
}: TasksPanelProps) {
  const [tasks, setTasks] = useState<z.infer<typeof taskSchema>[]>(() => z.array(taskSchema).parse(tasksData))

  const handleAddTask = (newTask: Task) => {
    setTasks((prev) => [newTask, ...prev])
  }

  const stats = useMemo(
    () => ({
      total: tasks.length,
      completed: tasks.filter((task) => task.status === "completed").length,
      inProgress: tasks.filter((task) => task.status === "in progress").length,
      pending: tasks.filter((task) => task.status === "pending").length,
    }),
    [tasks]
  )

  return (
    <div className={className}>
      <div className="hidden h-full flex-1 flex-col space-y-6 md:flex">
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Total Tasks</p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{stats.total}</span>
                    <span className="flex items-center gap-0.5 text-sm text-green-500">
                      <ArrowUp className="size-3.5" />
                      {getPercentage(stats.completed, stats.total)}%
                    </span>
                  </div>
                </div>
                <div className="bg-secondary rounded-lg p-3">
                  <ListTodo className="size-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Completed</p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{stats.completed}</span>
                    <span className="flex items-center gap-0.5 text-sm text-green-500">
                      <ArrowUp className="size-3.5" />
                      {getPercentage(stats.completed, stats.total)}%
                    </span>
                  </div>
                </div>
                <div className="bg-secondary rounded-lg p-3">
                  <CheckCircle2 className="size-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">In Progress</p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{stats.inProgress}</span>
                    <span className="flex items-center gap-0.5 text-sm text-green-500">
                      <ArrowUp className="size-3.5" />
                      {getPercentage(stats.inProgress, stats.total)}%
                    </span>
                  </div>
                </div>
                <div className="bg-secondary rounded-lg p-3">
                  <Clock className="size-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Pending</p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{stats.pending}</span>
                    <span className="flex items-center gap-0.5 text-sm text-orange-500">
                      <ArrowUp className="size-3.5" />
                      {getPercentage(stats.pending, stats.total)}%
                    </span>
                  </div>
                </div>
                <div className="bg-secondary rounded-lg p-3">
                  <BarChart3 className="size-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          {showHeader ? (
            <CardHeader>
              <CardTitle>Task Management</CardTitle>
              <CardDescription>
                View, filter, and manage all your project tasks in one place
              </CardDescription>
            </CardHeader>
          ) : null}
          <CardContent>
            <DataTable
              data={tasks}
              columns={columns}
              onAddTask={handleAddTask}
              showCreateTaskAction={showCreateTaskAction}
            />
          </CardContent>
        </Card>
      </div>

      <div className="md:hidden">
        <div className="flex items-center justify-center h-96 border rounded-lg bg-muted/20">
          <div className="text-center p-8">
            <h3 className="text-lg font-semibold mb-2">Tasks Dashboard</h3>
            <p className="text-muted-foreground">
              Please use a larger screen to view the full tasks interface.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

"use client"

import { BaseLayout } from "@/components/layouts/base-layout"
import { UsersPanel } from "./components/users-panel"

export default function UsersPage() {
  return (
    <BaseLayout 
      title="Users" 
      description="Manage your users and their permissions"
    >
      <div className="flex flex-col gap-4">
        <div className="@container/main px-4 lg:px-6 mt-8 lg:mt-12">
          <UsersPanel />
        </div>
      </div>
    </BaseLayout>
  )
}

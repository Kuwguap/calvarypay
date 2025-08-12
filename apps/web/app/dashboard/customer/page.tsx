"use client"

import { DashboardLayout } from "@/components/dashboard-layout"

export default function CustomerDashboard() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to your EliteePay customer dashboard
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium">Total Payments</h3>
            </div>
            <div className="text-2xl font-bold">$0.00</div>
            <p className="text-xs text-muted-foreground">
              No payments yet
            </p>
          </div>

          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium">Transactions</h3>
            </div>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              No transactions yet
            </p>
          </div>

          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium">Pending</h3>
            </div>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              No pending payments
            </p>
          </div>

          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium">Success Rate</h3>
            </div>
            <div className="text-2xl font-bold">100%</div>
            <p className="text-xs text-muted-foreground">
              All payments successful
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <div className="col-span-4 rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="p-6">
              <h3 className="text-lg font-medium">Recent Transactions</h3>
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">
                  No transactions found. Start making payments to see your transaction history here.
                </p>
              </div>
            </div>
          </div>

          <div className="col-span-3 rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="p-6">
              <h3 className="text-lg font-medium">Quick Actions</h3>
              <div className="mt-4 space-y-2">
                <button className="w-full text-left p-3 rounded-md border hover:bg-accent hover:text-accent-foreground">
                  Make a Payment
                </button>
                <button className="w-full text-left p-3 rounded-md border hover:bg-accent hover:text-accent-foreground">
                  View Transaction History
                </button>
                <button className="w-full text-left p-3 rounded-md border hover:bg-accent hover:text-accent-foreground">
                  Update Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

/**
 * Loading component for transactions page
 */

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { EmployeeLayout } from "@/components/dashboard/role-based-layout"

export default function TransactionsLoading() {
  return (
    <EmployeeLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-8 w-24 bg-slate-700" />
            <div>
              <Skeleton className="h-8 w-48 bg-slate-700 mb-2" />
              <Skeleton className="h-4 w-64 bg-slate-700" />
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Skeleton className="h-10 w-24 bg-slate-700" />
            <Skeleton className="h-10 w-32 bg-slate-700" />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <Skeleton className="h-4 w-20 bg-slate-700" />
                <Skeleton className="h-8 w-8 bg-slate-700 rounded-lg" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24 bg-slate-700 mb-2" />
                <Skeleton className="h-3 w-32 bg-slate-700" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Transactions Table */}
        <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-6 w-40 bg-slate-700 mb-2" />
                <Skeleton className="h-4 w-56 bg-slate-700" />
              </div>
              <div className="flex items-center space-x-3">
                <Skeleton className="h-10 w-64 bg-slate-700" />
                <Skeleton className="h-10 w-32 bg-slate-700" />
                <Skeleton className="h-10 w-32 bg-slate-700" />
                <Skeleton className="h-10 w-24 bg-slate-700" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-hidden rounded-lg">
              <div className="border-slate-800 bg-slate-800/30 p-4">
                <div className="grid grid-cols-6 gap-4">
                  <Skeleton className="h-4 w-20 bg-slate-700" />
                  <Skeleton className="h-4 w-16 bg-slate-700" />
                  <Skeleton className="h-4 w-24 bg-slate-700" />
                  <Skeleton className="h-4 w-16 bg-slate-700" />
                  <Skeleton className="h-4 w-16 bg-slate-700" />
                  <Skeleton className="h-4 w-16 bg-slate-700" />
                </div>
              </div>
              {Array.from({ length: 10 }).map((_, index) => (
                <div key={index} className="border-slate-800 p-4 border-t">
                  <div className="grid grid-cols-6 gap-4 items-center">
                    <Skeleton className="h-4 w-24 bg-slate-700" />
                    <Skeleton className="h-4 w-20 bg-slate-700" />
                    <Skeleton className="h-4 w-32 bg-slate-700" />
                    <Skeleton className="h-4 w-16 bg-slate-700" />
                    <Skeleton className="h-4 w-20 bg-slate-700" />
                    <Skeleton className="h-6 w-20 bg-slate-700 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </EmployeeLayout>
  )
}

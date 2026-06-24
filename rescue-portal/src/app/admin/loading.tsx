import { Skeleton } from '@/components/ui/skeleton'

export default function AdminLoading() {
  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48 bg-slate-800" />
        <Skeleton className="h-9 w-32 bg-slate-800" />
      </div>
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-slate-900 border border-slate-700 rounded-lg p-5 space-y-3">
            <Skeleton className="h-3 w-24 bg-slate-800" />
            <Skeleton className="h-8 w-16 bg-slate-800" />
          </div>
        ))}
      </div>
      {/* Map / table area */}
      <Skeleton className="h-64 w-full bg-slate-800 rounded-lg" />
      {/* Incident rows */}
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full bg-slate-800 rounded-lg" />
        ))}
      </div>
    </div>
  )
}

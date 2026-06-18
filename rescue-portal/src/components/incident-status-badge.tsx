import { Badge } from '@/components/ui/badge'
import { getStatusLabel, getStatusColor } from '@/lib/utils'
import type { IncidentStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

interface IncidentStatusBadgeProps {
  status: IncidentStatus
  className?: string
  pulse?: boolean
}

export function IncidentStatusBadge({ status, className, pulse }: IncidentStatusBadgeProps) {
  const colorClass = getStatusColor(status)
  const label = getStatusLabel(status)

  return (
    <Badge
      variant="outline"
      className={cn(
        'border-transparent text-xs font-medium px-2 py-0.5',
        colorClass,
        pulse && 'animate-pulse',
        className
      )}
    >
      {label}
    </Badge>
  )
}

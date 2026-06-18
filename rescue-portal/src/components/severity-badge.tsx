import { Badge } from '@/components/ui/badge'
import { getSeverityColor } from '@/lib/utils'
import type { SeverityLevel } from '@/lib/types'
import { cn } from '@/lib/utils'

interface SeverityBadgeProps {
  severity: SeverityLevel
  className?: string
}

const SEVERITY_LABELS: Record<SeverityLevel, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'border-transparent text-xs font-semibold px-2 py-0.5 uppercase tracking-wide',
        getSeverityColor(severity),
        className
      )}
    >
      {SEVERITY_LABELS[severity]}
    </Badge>
  )
}

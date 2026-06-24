'use client'

import { cn } from '@/lib/utils'
import type { IncidentPriority } from '@/lib/types'

const PRIORITY_CONFIG: Record<IncidentPriority, {
  label: string
  className: string
  dot: string
}> = {
  critical: {
    label: 'CRITICAL',
    className: 'bg-red-600 text-white',
    dot: 'bg-red-400 animate-pulse',
  },
  high: {
    label: 'HIGH',
    className: 'bg-orange-600 text-white',
    dot: 'bg-orange-400',
  },
  medium: {
    label: 'MEDIUM',
    className: 'bg-yellow-500 text-white',
    dot: 'bg-yellow-300',
  },
  low: {
    label: 'LOW',
    className: 'bg-slate-500 text-white',
    dot: 'bg-slate-300',
  },
}

interface PriorityBadgeProps {
  priority: IncidentPriority
  compact?: boolean
  className?: string
}

export function PriorityBadge({ priority, compact = false, className }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.high

  if (compact) {
    return (
      <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold', config.className, className)}>
        <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
        {config.label}
      </span>
    )
  }

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold', config.className, className)}>
      <span className={cn('w-2 h-2 rounded-full', config.dot)} />
      {config.label}
    </span>
  )
}

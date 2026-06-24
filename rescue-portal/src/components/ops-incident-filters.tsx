'use client'

import { cn } from '@/lib/utils'

export type OpsFilterKey =
  | 'all'
  | 'live'
  | 'delayed'
  | 'late_request'
  | 'sms_fallback'
  | 'active'
  | 'closed'
  | 'false_alarm'

interface FilterConfig {
  label: string
  color: string
  activeColor: string
}

const FILTERS: Record<OpsFilterKey, FilterConfig> = {
  all: { label: 'All', color: 'text-slate-600', activeColor: 'bg-slate-900 text-white' },
  live: { label: 'Live', color: 'text-green-700', activeColor: 'bg-green-600 text-white' },
  delayed: { label: 'Delayed', color: 'text-yellow-700', activeColor: 'bg-yellow-500 text-white' },
  late_request: { label: 'Late Request', color: 'text-red-700', activeColor: 'bg-red-600 text-white' },
  sms_fallback: { label: 'SMS Fallback', color: 'text-orange-700', activeColor: 'bg-orange-600 text-white' },
  active: { label: 'Active', color: 'text-blue-700', activeColor: 'bg-blue-600 text-white' },
  closed: { label: 'Closed', color: 'text-slate-500', activeColor: 'bg-slate-600 text-white' },
  false_alarm: { label: 'False Alarm', color: 'text-slate-400', activeColor: 'bg-slate-500 text-white' },
}

const ACTIVE_STATUSES = [
  'submitted', 'received', 'verification_pending', 'verified', 'assigned',
  'accepted', 'preparing', 'dispatched', 'on_the_way', 'arrived',
  'operation_in_progress', 'transporting',
]

const CLOSED_STATUSES = ['resolved', 'closed', 'cancelled', 'unable_to_contact']

interface OpsIncidentFiltersProps {
  activeFilter: OpsFilterKey
  onFilterChange: (filter: OpsFilterKey) => void
  counts?: Partial<Record<OpsFilterKey, number>>
  className?: string
}

export function OpsIncidentFilters({
  activeFilter,
  onFilterChange,
  counts,
  className,
}: OpsIncidentFiltersProps) {
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {(Object.keys(FILTERS) as OpsFilterKey[]).map((key) => {
        const config = FILTERS[key]
        const isActive = activeFilter === key
        const count = counts?.[key]

        return (
          <button
            key={key}
            onClick={() => onFilterChange(key)}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors border',
              isActive
                ? cn(config.activeColor, 'border-transparent')
                : cn('bg-white border-slate-200', config.color, 'hover:bg-slate-50')
            )}
          >
            {config.label}
            {count != null && (
              <span className={cn(
                'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold',
                isActive ? 'bg-white/20' : 'bg-slate-100 text-slate-600'
              )}>
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Filter incidents based on the selected ops filter.
 */
export function filterIncidents<T extends { delivery_status?: string; status?: string }>(
  incidents: T[],
  filter: OpsFilterKey
): T[] {
  switch (filter) {
    case 'all':
      return incidents
    case 'live':
      return incidents.filter(i => i.delivery_status === 'live')
    case 'delayed':
      return incidents.filter(i => i.delivery_status === 'delayed')
    case 'late_request':
      return incidents.filter(i => i.delivery_status === 'late_request')
    case 'sms_fallback':
      return incidents.filter(i => i.delivery_status === 'sms_fallback')
    case 'active':
      return incidents.filter(i => i.status && ACTIVE_STATUSES.includes(i.status))
    case 'closed':
      return incidents.filter(i => i.status && CLOSED_STATUSES.includes(i.status))
    case 'false_alarm':
      return incidents.filter(i => i.status === 'false_alert' || i.status === 'invalid' || i.status === 'duplicate')
    default:
      return incidents
  }
}

/**
 * Count incidents per filter for badge display.
 */
export function countByFilter<T extends { delivery_status?: string; status?: string }>(
  incidents: T[]
): Partial<Record<OpsFilterKey, number>> {
  const counts: Partial<Record<OpsFilterKey, number>> = {
    all: incidents.length,
  }

  for (const key of Object.keys(FILTERS) as OpsFilterKey[]) {
    if (key === 'all') continue
    const filtered = filterIncidents(incidents, key)
    if (filtered.length > 0) {
      counts[key] = filtered.length
    }
  }

  return counts
}

'use client'

import { cn } from '@/lib/utils'
import {
  AlertTriangle, MapPin, WifiOff, Wifi, Send, Phone, CheckCircle2,
  Shield, Truck, Eye, XCircle, Clock, MessageSquare, FileText, Users
} from 'lucide-react'
import type { IncidentTimelineEntry, TimelineEventType } from '@/lib/types'

const EVENT_CONFIG: Record<TimelineEventType, {
  icon: typeof AlertTriangle
  color: string
  bgColor: string
}> = {
  sos_created: { icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-100' },
  gps_captured: { icon: MapPin, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  online_submission_attempted: { icon: Send, color: 'text-blue-500', bgColor: 'bg-blue-50' },
  internet_unavailable: { icon: WifiOff, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  queued_offline: { icon: WifiOff, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  sms_fallback_triggered: { icon: MessageSquare, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  internet_restored: { icon: Wifi, color: 'text-green-600', bgColor: 'bg-green-100' },
  sos_synced: { icon: Send, color: 'text-green-600', bgColor: 'bg-green-100' },
  ops_received: { icon: Eye, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  ops_called_resident: { icon: Phone, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  resident_verified: { icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-100' },
  responder_assigned: { icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  on_the_way: { icon: Truck, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  on_scene: { icon: Shield, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  resolved: { icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-100' },
  false_alarm: { icon: XCircle, color: 'text-slate-500', bgColor: 'bg-slate-100' },
  closed: { icon: CheckCircle2, color: 'text-slate-600', bgColor: 'bg-slate-100' },
  status_change: { icon: Clock, color: 'text-slate-500', bgColor: 'bg-slate-100' },
  note_added: { icon: FileText, color: 'text-slate-500', bgColor: 'bg-slate-100' },
  assignment_change: { icon: Users, color: 'text-blue-500', bgColor: 'bg-blue-50' },
}

interface IncidentTimelineProps {
  events: IncidentTimelineEntry[]
  className?: string
}

export function IncidentTimeline({ events, className }: IncidentTimelineProps) {
  if (events.length === 0) {
    return (
      <div className={cn('text-sm text-slate-400 text-center py-6', className)}>
        No timeline events yet.
      </div>
    )
  }

  return (
    <div className={cn('relative', className)}>
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />

      <div className="space-y-0">
        {events.map((event, i) => {
          const config = EVENT_CONFIG[event.event_type] ?? EVENT_CONFIG.status_change
          const Icon = config.icon
          const isLast = i === events.length - 1
          const time = new Date(event.occurred_at)

          return (
            <div key={event.id} className="relative flex items-start gap-3 pl-0 py-2">
              {/* Icon circle */}
              <div className={cn(
                'relative z-10 flex items-center justify-center w-8 h-8 rounded-full shrink-0',
                config.bgColor
              )}>
                <Icon className={cn('w-4 h-4', config.color)} />
              </div>

              {/* Content */}
              <div className={cn('flex-1 min-w-0 pb-2', !isLast && 'border-b border-slate-100')}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {event.label}
                  </p>
                  <time className="text-[10px] text-slate-400 shrink-0 tabular-nums">
                    {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </time>
                </div>
                {event.description && (
                  <p className="text-xs text-slate-500 mt-0.5">{event.description}</p>
                )}
                {event.actor_name && event.actor_role !== 'system' && (
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    by {event.actor_name} ({event.actor_role})
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

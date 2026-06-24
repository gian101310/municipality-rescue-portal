'use client'

import { cn } from '@/lib/utils'
import { Wifi, Clock, AlertTriangle, MessageSquare } from 'lucide-react'
import type { DeliveryStatus } from '@/lib/types'

const DELIVERY_CONFIG: Record<DeliveryStatus, {
  label: string
  icon: typeof Wifi
  className: string
  description: string
}> = {
  live: {
    label: 'LIVE',
    icon: Wifi,
    className: 'bg-green-100 text-green-800 border-green-300',
    description: 'Received within 2 minutes',
  },
  delayed: {
    label: 'DELAYED',
    icon: Clock,
    className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    description: 'Received after 3–10 minutes',
  },
  late_request: {
    label: 'LATE REQUEST',
    icon: AlertTriangle,
    className: 'bg-red-100 text-red-800 border-red-300',
    description: 'Received after 10+ minutes',
  },
  sms_fallback: {
    label: 'SMS FALLBACK',
    icon: MessageSquare,
    className: 'bg-orange-100 text-orange-800 border-orange-300',
    description: 'Sent via SMS backup',
  },
}

interface DeliveryBadgeProps {
  status: DeliveryStatus
  delayMinutes?: number
  compact?: boolean
  className?: string
}

export function DeliveryBadge({ status, delayMinutes, compact = false, className }: DeliveryBadgeProps) {
  const config = DELIVERY_CONFIG[status] ?? DELIVERY_CONFIG.live
  const Icon = config.icon

  if (compact) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border',
          config.className,
          className
        )}
        title={config.description}
      >
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    )
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold uppercase border',
        config.className,
        className
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{config.label}</span>
      {delayMinutes != null && delayMinutes > 0 && (
        <span className="font-normal opacity-75">
          ({Math.round(delayMinutes)}m)
        </span>
      )}
    </div>
  )
}

/**
 * Determine delivery status from delay in minutes.
 */
export function getDeliveryStatus(delayMinutes: number): DeliveryStatus {
  if (delayMinutes <= 2) return 'live'
  if (delayMinutes <= 10) return 'delayed'
  return 'late_request'
}

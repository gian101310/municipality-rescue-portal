'use client'

import { CheckCircle2, Circle, Clock, Truck, ShieldCheck } from 'lucide-react'

type ProgressStep = {
  label: string
  icon: React.ReactNode
  activeIcon: React.ReactNode
  completedIcon: React.ReactNode
}

const steps: ProgressStep[] = [
  {
    label: 'Received',
    icon: <Circle className="w-5 h-5 text-slate-300" />,
    activeIcon: <Clock className="w-5 h-5 text-amber-500 animate-pulse" />,
    completedIcon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
  },
  {
    label: 'Dispatched',
    icon: <Circle className="w-5 h-5 text-slate-300" />,
    activeIcon: <Truck className="w-5 h-5 text-blue-500 animate-pulse" />,
    completedIcon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
  },
  {
    label: 'Resolved',
    icon: <Circle className="w-5 h-5 text-slate-300" />,
    activeIcon: <ShieldCheck className="w-5 h-5 text-green-500 animate-pulse" />,
    completedIcon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
  },
]

/** Maps incident status to which step index is active (0-based). -1 = before received. */
function getStepIndex(status: string): number {
  switch (status) {
    case 'submitted':
      return -1 // before received
    case 'received':
      return 0
    case 'dispatched':
    case 'on_the_way':
    case 'arrived':
      return 1
    case 'resolved':
    case 'closed':
      return 2
    default:
      return -1
  }
}

function isTerminalNonProgress(status: string): boolean {
  return ['false_alert', 'cancelled', 'duplicate', 'invalid'].includes(status)
}

interface IncidentProgressTrackerProps {
  status: string
  assignedUnitName?: string | null
  className?: string
}

export function IncidentProgressTracker({ status, assignedUnitName, className = '' }: IncidentProgressTrackerProps) {
  if (isTerminalNonProgress(status)) return null

  const activeIndex = getStepIndex(status)
  const isSubmitted = status === 'submitted'

  return (
    <div className={`${className}`}>
      {isSubmitted && (
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-xs font-medium text-amber-700">Report submitted — awaiting confirmation</span>
        </div>
      )}

      <div className="flex items-center">
        {steps.map((step, i) => {
          const isCompleted = i < activeIndex || (i === activeIndex && (status === 'resolved' || status === 'closed'))
          const isCurrent = i === activeIndex && !isCompleted
          const isPending = i > activeIndex || (activeIndex === -1 && i >= 0)

          // Determine which icon to show
          let icon = step.icon
          if (isCompleted) icon = step.completedIcon
          else if (isCurrent) icon = step.activeIcon

          return (
            <div key={step.label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all
                  ${isCompleted ? 'border-green-200 bg-green-50' : ''}
                  ${isCurrent ? 'border-blue-300 bg-blue-50 shadow-sm shadow-blue-100' : ''}
                  ${isPending ? 'border-slate-200 bg-slate-50' : ''}
                `}>
                  {icon}
                </div>
                <span className={`
                  text-xs mt-1.5 font-medium
                  ${isCompleted ? 'text-green-600' : ''}
                  ${isCurrent ? 'text-blue-600' : ''}
                  ${isPending ? 'text-slate-400' : ''}
                `}>
                  {step.label}
                </span>
                {isCurrent && i === 1 && assignedUnitName && (
                  <span className="text-[10px] text-blue-500 mt-0.5 max-w-[80px] text-center truncate">
                    {assignedUnitName}
                  </span>
                )}
              </div>

              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className={`
                  flex-1 h-0.5 mx-2 rounded-full transition-colors
                  ${i < activeIndex ? 'bg-green-400' : 'bg-slate-200'}
                `} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

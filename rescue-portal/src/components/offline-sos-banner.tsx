'use client'

import { WifiOff, CloudUpload, AlertTriangle } from 'lucide-react'
import type { OfflineSosRecord } from '@/lib/types'

interface OfflineSosBannerProps {
  online: boolean
  pendingCount: number
  emergencyHotline: string
  smsFallbackRecord: OfflineSosRecord | null
  onDismissSmsFallback: () => void
}

export function OfflineSosBanner({
  online,
  pendingCount,
  emergencyHotline,
  smsFallbackRecord,
  onDismissSmsFallback,
}: OfflineSosBannerProps) {
  // SMS Fallback prompt (highest priority)
  if (smsFallbackRecord) {
    const smsBody = encodeURIComponent(
      `EMERGENCY SOS - ${smsFallbackRecord.resident_name}. ` +
      `Location: ${smsFallbackRecord.created_latitude.toFixed(6)}, ${smsFallbackRecord.created_longitude.toFixed(6)}. ` +
      `Type: ${smsFallbackRecord.emergency_type}. ` +
      `Time: ${new Date(smsFallbackRecord.created_timestamp).toLocaleString()}`
    )
    const hotlineNumber = emergencyHotline.replace(/[^0-9+]/g, '')
    const smsHref = `sms:${hotlineNumber}?body=${smsBody}`

    return (
      <div className="bg-orange-600 px-4 py-3 text-white">
        <div className="flex items-start gap-3 max-w-2xl mx-auto">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold">Still offline after 10+ minutes</p>
            <p className="text-xs mt-1 opacity-90">
              Your SOS has not yet been received by operations. It remains queued and will send automatically when internet returns.
              As a backup, you can send via SMS:
            </p>
            <div className="flex gap-2 mt-2">
              <a
                href={smsHref}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-orange-700 text-xs font-bold rounded-md"
              >
                Send via SMS
              </a>
              <a
                href={`tel:${hotlineNumber}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-800 text-white text-xs font-bold rounded-md"
              >
                Call {emergencyHotline}
              </a>
              <button
                onClick={onDismissSmsFallback}
                className="px-3 py-1.5 text-xs font-medium text-orange-100 border border-orange-400 rounded-md"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Offline with pending items
  if (!online && pendingCount > 0) {
    return (
      <div className="bg-amber-600 px-4 py-2 text-white">
        <div className="flex items-center gap-2 justify-center max-w-2xl mx-auto">
          <WifiOff className="w-4 h-4" />
          <span className="text-xs font-semibold">
            Offline — {pendingCount} SOS queued. Not yet received by operations.
          </span>
        </div>
      </div>
    )
  }

  // Offline without pending
  if (!online) {
    return (
      <div className="bg-slate-700 px-4 py-2 text-white">
        <div className="flex items-center gap-2 justify-center max-w-2xl mx-auto">
          <WifiOff className="w-4 h-4" />
          <span className="text-xs font-medium">
            You are offline — SOS will be queued and sent automatically
          </span>
        </div>
      </div>
    )
  }

  // Online with syncing items
  if (pendingCount > 0) {
    return (
      <div className="bg-blue-600 px-4 py-2 text-white">
        <div className="flex items-center gap-2 justify-center max-w-2xl mx-auto">
          <CloudUpload className="w-4 h-4 animate-pulse" />
          <span className="text-xs font-semibold">
            Syncing {pendingCount} queued SOS...
          </span>
        </div>
      </div>
    )
  }

  return null
}

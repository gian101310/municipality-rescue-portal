'use client'

import { Info } from 'lucide-react'

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

export function DemoBanner() {
  if (!isDemoMode) return null

  return (
    <div className="w-full bg-amber-500 text-amber-950 text-xs font-medium py-1 px-4 flex items-center justify-center gap-2 z-50">
      <Info className="w-3.5 h-3.5 shrink-0" />
      <span>Demo Mode — Using simulated data. No real emergencies are being tracked.</span>
    </div>
  )
}

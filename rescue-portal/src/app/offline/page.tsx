'use client'

import { WifiOff, Phone, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white px-6">
      <div className="w-20 h-20 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-6">
        <WifiOff className="w-10 h-10 text-slate-400" />
      </div>
      <h1 className="text-2xl font-bold mb-2">No Internet Connection</h1>
      <p className="text-slate-400 text-center max-w-sm mb-8">
        You are currently offline. Some features may not be available. For life-threatening emergencies, call your local hotline directly.
      </p>

      <div className="space-y-3 w-full max-w-xs">
        <Button
          className="w-full bg-red-600 hover:bg-red-700 text-white h-14 text-lg font-bold"
          onClick={() => window.location.href = 'tel:911'}
        >
          <Phone className="w-5 h-5 mr-2" />
          Call 911
        </Button>
        <Button
          variant="outline"
          className="w-full border-slate-600 text-slate-300 hover:bg-slate-800 h-12"
          onClick={() => window.location.reload()}
        >
          Try Again
        </Button>
      </div>

      <div className="mt-10 flex items-center gap-2 text-slate-600 text-sm">
        <Shield className="w-4 h-4" />
        <span>Emergency Rescue Portal — Municipal Emergency Response</span>
      </div>
    </
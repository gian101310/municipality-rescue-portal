'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Activity, BellRing, MapPin, Radio, ShieldCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { playSosDemoSound } from '@/lib/notification-sound'

const demoSteps = [
  { icon: Activity, label: 'SOS demo activated', detail: 'Preview only' },
  { icon: MapPin, label: 'GPS location simulated', detail: 'No real location sent' },
  { icon: Radio, label: 'Routed to command center', detail: 'Demo dispatch path' },
  { icon: BellRing, label: 'Responder notified', detail: 'Sample notification' },
]

export function LandingSosDemo() {
  const [open, setOpen] = useState(false)
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    if (!open) return

    const timers = demoSteps.slice(1).map((_, index) =>
      window.setTimeout(() => setActiveStep(index + 1), (index + 1) * 650)
    )

    return () => timers.forEach(window.clearTimeout)
  }, [open])

  function handleOpen() {
    playSosDemoSound()
    setActiveStep(0)
    setOpen(true)
  }

  function handleClose() {
    setOpen(false)
    setActiveStep(0)
  }

  return (
    <div className="fixed bottom-5 right-4 z-40 flex flex-col items-end gap-3 sm:bottom-7 sm:right-7">
      {open && (
        <div className="w-[min(calc(100vw-2rem),22rem)] rounded-lg border border-red-400/25 bg-slate-950/95 p-4 text-white shadow-2xl shadow-red-950/40 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-red-100">
                <ShieldCheck className="h-4 w-4 text-red-300" />
                SOS Demo Preview
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                This is a design preview. No emergency report is being sent.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-white"
              aria-label="Close SOS demo"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 space-y-2.5">
            {demoSteps.map((step, index) => {
              const Icon = step.icon
              const active = index <= activeStep

              return (
                <div key={step.label} className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${
                    active
                      ? 'border-red-400/50 bg-red-500/15 text-red-200'
                      : 'border-slate-800 bg-slate-900 text-slate-600'
                  }`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={active ? 'text-sm font-semibold text-white' : 'text-sm text-slate-500'}>{step.label}</p>
                    <p className="text-xs text-slate-500">{step.detail}</p>
                  </div>
                  {active && <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.75)]" />}
                </div>
              )
            })}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button className="bg-red-600 text-white hover:bg-red-700" render={<Link href="/auth/register" />}>
              Register
            </Button>
            <Button variant="outline" className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800" render={<Link href="/auth/login" />}>
              Login
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <span className="hidden rounded-md border border-slate-700 bg-slate-950/90 px-3 py-1.5 text-xs font-semibold text-slate-200 shadow-lg shadow-slate-950/30 backdrop-blur sm:inline-flex">
          Try SOS demo
        </span>
        <button
          type="button"
          onClick={handleOpen}
          className="group relative h-20 w-20 rounded-full outline-none transition-transform active:translate-y-1 active:scale-95 focus-visible:ring-4 focus-visible:ring-red-300/40"
          aria-label="Open SOS demo preview"
        >
          <span className="absolute inset-[-10px] rounded-full border border-red-400/25 opacity-80 animate-ping motion-reduce:animate-none" />
          <span className="absolute inset-0 rounded-full bg-gradient-to-br from-red-400 via-red-600 to-red-950 shadow-[0_18px_36px_rgba(127,29,29,0.55),inset_0_8px_12px_rgba(255,255,255,0.24),inset_0_-14px_18px_rgba(69,10,10,0.85)]" />
          <span className="absolute left-4 right-4 top-3 h-5 rounded-full bg-white/35 blur-[1px]" />
          <span className="absolute inset-[9px] rounded-full border border-white/20 bg-red-600/40" />
          <span className="relative flex h-full w-full flex-col items-center justify-center text-white">
            <span className="text-[1.05rem] font-black tracking-wide">SOS</span>
            <span className="text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-red-100">Demo</span>
          </span>
        </button>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  getStoredSoundPreference,
  playAdminNotificationSound,
  setStoredSoundPreference,
} from '@/lib/notification-sound'
import { toast } from 'sonner'

export function AdminSoundToggle() {
  const [enabled, setEnabled] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const id = window.setTimeout(() => {
      setEnabled(getStoredSoundPreference(window.localStorage))
      setMounted(true)
    }, 0)

    return () => window.clearTimeout(id)
  }, [])

  function toggleSound() {
    const next = !enabled
    setEnabled(next)
    setStoredSoundPreference(window.localStorage, next)

    if (next) {
      playAdminNotificationSound()
      toast.success('Notification sound enabled')
    } else {
      toast.info('Notification sound muted')
    }
  }

  const Icon = enabled ? Bell : BellOff

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSound}
      className="text-slate-300 hover:bg-slate-700 hover:text-white"
      title={enabled ? 'Mute notification sound' : 'Enable notification sound'}
      aria-label={enabled ? 'Mute notification sound' : 'Enable notification sound'}
      disabled={!mounted}
    >
      <Icon className="h-4 w-4" />
    </Button>
  )
}

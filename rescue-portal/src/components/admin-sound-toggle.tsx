'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  armAdminNotificationSound,
  playAdminNotificationSound,
  setStoredSoundPreference,
  shouldAutoEnableAdminSound,
} from '@/lib/notification-sound'
import { toast } from 'sonner'

export function AdminSoundToggle() {
  const [enabled, setEnabled] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const id = window.setTimeout(() => {
      setEnabled(shouldAutoEnableAdminSound(window.localStorage))
      setMounted(true)
    }, 0)

    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    function armOnFirstInteraction() {
      if (shouldAutoEnableAdminSound(window.localStorage)) {
        setStoredSoundPreference(window.localStorage, true)
        setEnabled(true)
      }
      void armAdminNotificationSound()
      window.removeEventListener('pointerdown', armOnFirstInteraction)
      window.removeEventListener('keydown', armOnFirstInteraction)
    }

    window.addEventListener('pointerdown', armOnFirstInteraction)
    window.addEventListener('keydown', armOnFirstInteraction)

    return () => {
      window.removeEventListener('pointerdown', armOnFirstInteraction)
      window.removeEventListener('keydown', armOnFirstInteraction)
    }
  }, [])

  async function toggleSound() {
    const next = !enabled
    setEnabled(next)
    setStoredSoundPreference(window.localStorage, next)

    if (next) {
      const armed = await armAdminNotificationSound()
      playAdminNotificationSound()
      toast.success(armed ? 'Incident alarm enabled' : 'Tap the page once to enable browser audio')
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

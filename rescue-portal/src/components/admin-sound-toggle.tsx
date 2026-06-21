'use client'

import { useEffect, useState } from 'react'
import { Siren } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  armAdminNotificationSound,
  playAdminNotificationSound,
  setStoredSoundPreference,
} from '@/lib/notification-sound'
import { toast } from 'sonner'

export function AdminSoundToggle() {
  const [armed, setArmed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const id = window.setTimeout(() => {
      setMounted(true)
    }, 0)

    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    async function armOnFirstInteraction() {
      setStoredSoundPreference(window.localStorage, true)
      const isArmed = await armAdminNotificationSound()
      setArmed(isArmed)
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

  async function armAlarm() {
    setStoredSoundPreference(window.localStorage, true)
    const isArmed = await armAdminNotificationSound()
    setArmed(isArmed)
    if (isArmed) {
      playAdminNotificationSound()
      toast.success('Mandatory incident alarm armed')
    } else toast.error('Browser audio is blocked. Click the page once and arm the alarm again.')
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={armAlarm}
      className={armed ? 'border-red-500/50 bg-red-500/10 text-red-200 hover:bg-red-500/20' : 'border-amber-500/50 text-amber-200 hover:bg-amber-500/10'}
      title="Mandatory incident alarm"
      aria-label="Arm mandatory incident alarm"
      disabled={!mounted}
    >
      <Siren className="h-4 w-4 mr-1" />
      <span className="hidden sm:inline text-xs">{armed ? 'Alarm armed' : 'Arm alarm'}</span>
    </Button>
  )
}

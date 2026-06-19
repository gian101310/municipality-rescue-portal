'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function PushNotificationToggle() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    const id = window.setTimeout(() => {
      if ('Notification' in window) {
        setSupported(true)
        setPermission(Notification.permission)
      }
    }, 0)

    return () => window.clearTimeout(id)
  }, [])

  async function requestPermission() {
    if (!supported) {
      toast.error('Push notifications are not supported in this browser')
      return
    }

    try {
      const result = await Notification.requestPermission()
      setPermission(result)

      if (result === 'granted') {
        toast.success('Push notifications enabled!')
        // Show a test notification
        new Notification('Emergency Rescue Portal Alert', {
          body: 'You will now receive real-time emergency alerts.',
          icon: '/icons/icon-192.svg',
          tag: 'test-notification',
        })
      } else if (result === 'denied') {
        toast.error('Notifications blocked. Enable them in browser settings.')
      }
    } catch {
      toast.error('Failed to enable notifications')
    }
  }

  function disableNotifications() {
    toast.info('To disable notifications, update your browser settings for this site.')
  }

  if (!supported) return null

  if (permission === 'granted') {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="text-green-400 hover:text-green-300 gap-1.5"
        onClick={disableNotifications}
        title="Push notifications enabled"
      >
        <Bell className="w-4 h-4" />
        <span className="text-xs hidden sm:inline">Alerts ON</span>
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-slate-400 hover:text-white gap-1.5"
      onClick={requestPermission}
      title="Enable push notifications"
    >
      <BellOff className="w-4 h-4" />
      <span className="text-xs hidden sm:inline">Enable Alerts</span>
    </Button>
  )
}

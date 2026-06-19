'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell, AlertCircle, Info, CheckCircle2, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { formatRelativeTime } from '@/lib/utils'
import { DEMO_NOTIFICATIONS } from '@/lib/demo-data'
import { getStoredSoundPreference, playAdminNotificationSound } from '@/lib/notification-sound'
import type { Notification, NotificationType } from '@/lib/types'
import { cn } from '@/lib/utils'
import Link from 'next/link'

function NotificationIcon({ type }: { type: NotificationType }) {
  switch (type) {
    case 'incident_new':
      return <AlertCircle className="w-4 h-4 text-red-500" />
    case 'incident_update':
    case 'incident_assigned':
      return <Info className="w-4 h-4 text-blue-500" />
    case 'incident_resolved':
      return <CheckCircle2 className="w-4 h-4 text-green-500" />
    case 'registration_update':
      return <UserCheck className="w-4 h-4 text-purple-500" />
    default:
      return <Bell className="w-4 h-4 text-gray-500" />
  }
}

interface NotificationCenterProps {
  userId?: string
}

export function NotificationCenter({ userId }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>(
    DEMO_NOTIFICATIONS.filter((n) => !userId || n.user_id === userId || n.user_id === 'uid-disp')
  )

  const unreadCount = notifications.filter((n) => !n.is_read).length
  const previousUnreadCount = useRef(unreadCount)

  useEffect(() => {
    if (
      unreadCount > previousUnreadCount.current &&
      getStoredSoundPreference(window.localStorage)
    ) {
      playAdminNotificationSound()
    }

    previousUnreadCount.current = unreadCount
  }, [unreadCount])

  function markAsRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
      )
    )
  }

  function markAllRead() {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="relative text-slate-300 hover:text-white hover:bg-slate-700" />}>
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 text-white border-0">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 bg-slate-800 border-slate-700" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h3 className="font-semibold text-sm text-white">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllRead}
              className="text-xs text-blue-400 hover:text-blue-300 h-auto p-0"
            >
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">No notifications</div>
          ) : (
            notifications.map((notif, idx) => (
              <div key={notif.id}>
                <div
                  className={cn(
                    'flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-slate-700/50 transition-colors',
                    !notif.is_read && 'bg-blue-900/20'
                  )}
                  onClick={() => markAsRead(notif.id)}
                >
                  <div className="mt-0.5 shrink-0">
                    <NotificationIcon type={notif.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <p className={cn('text-xs font-medium text-white leading-tight', notif.is_read && 'text-slate-300')}>
                        {notif.title}
                      </p>
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-0.5" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 leading-snug line-clamp-2">{notif.message}</p>
                    <p className="text-xs text-slate-500 mt-1">{formatRelativeTime(notif.created_at)}</p>
                  </div>
                </div>
                {idx < notifications.length - 1 && <Separator className="bg-slate-700/50" />}
              </div>
            ))
          )}
        </ScrollArea>
        <div className="border-t border-slate-700 p-2">
          <Link href="/admin/audit" className="block">
            <Button variant="ghost" size="sm" className="w-full text-xs text-slate-400 hover:text-white">
              View all activity
            </Button>
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

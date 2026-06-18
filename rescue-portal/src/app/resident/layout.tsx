'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Shield, Clock, User, Bell, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DemoBanner } from '@/components/demo-banner'
import { LanguageSwitcher } from '@/components/language-switcher'
import { DEMO_NOTIFICATIONS } from '@/lib/demo-data'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/resident', label: 'Home', icon: Home, exact: true },
  { href: '/resident/emergency', label: 'Emergency', icon: Shield },
  { href: '/resident/history', label: 'History', icon: Clock },
  { href: '/resident/profile', label: 'Profile', icon: User },
]

export default function ResidentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const unread = DEMO_NOTIFICATIONS.filter((n) => !n.is_read && n.user_id === 'uid-res-001').length

  function handleLogout() {
    sessionStorage.removeItem('demo_role')
    sessionStorage.removeItem('demo_email')
    router.push('/auth/login')
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <DemoBanner />
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-red-600" />
            <span className="font-bold text-slate-900">RescuePortal</span>
          </div>
          <div className="flex items-center gap-1">
            <LanguageSwitcher variant="compact" />
            <Button variant="ghost" size="icon" className="relative text-slate-600">
              <Bell className="w-5 h-5" />
              {unread > 0 && (
                <Badge className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center p-0 text-xs bg-red-500 text-white border-0">
                  {unread}
                </Badge>
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="rounded-full" />}>
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-blue-600 text-white text-xs font-bold">MC</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem render={<Link href="/resident/profile" />}>
                  <User className="w-4 h-4 mr-2" />Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="sticky bottom-0 z-40 bg-white border-t border-slate-200 safe-area-inset-bottom">
        <div className="max-w-2xl mx-auto px-4 flex items-center justify-around h-16">
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg transition-colors',
                  isActive ? 'text-red-600' : 'text-slate-400 hover:text-slate-600'
                )}
              >
                <item.icon className={cn('w-5 h-5', item.label === 'Emergency' && 'w-6 h-6')} />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
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
import { createClient } from '@/lib/supabase/client'
import { isOwnerTestMode, withOwnerTestMode } from '@/lib/owner-test-mode'
import { validateTrustedSession, clearTrustedSession } from '@/lib/trusted-session'
import { useOfflineSos } from '@/hooks/use-offline-sos'
import { OfflineSosBanner } from '@/components/offline-sos-banner'

const NAV_ITEMS = [
  { href: '/resident', label: 'Home', icon: Home, exact: true },
  { href: '/resident/emergency', label: 'Emergency', icon: Shield },
  { href: '/resident/history', label: 'History', icon: Clock },
  { href: '/resident/profile', label: 'Profile', icon: User },
]

export default function ResidentLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <ResidentLayoutContent>{children}</ResidentLayoutContent>
    </Suspense>
  )
}

function ResidentLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const ownerTestMode = isOwnerTestMode(searchParams) && isSuperAdmin
  const unread = DEMO_NOTIFICATIONS.filter((n) => !n.is_read && n.user_id === 'uid-res-001').length
  const { online, pendingCount, smsFallbackRecord, dismissSmsFallback } = useOfflineSos()

  useEffect(() => {
    let cancelled = false

    async function loadProfile() {
      const supabase = createClient()
      let { data: { user } } = await supabase.auth.getUser()

      // If no active Supabase session, try trusted session recovery
      if (!user) {
        const stored = (await import('@/lib/trusted-session')).getStoredTrustedSession()
        if (stored) {
          try {
            // Call server to validate token and get a magic link token
            const res = await fetch('/api/auth/trusted-session-refresh', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: stored.token }),
            })
            if (res.ok) {
              const payload = await res.json()
              // Use verifyOtp to establish a fresh Supabase session
              const { error: verifyError } = await supabase.auth.verifyOtp({
                token_hash: payload.token_hash,
                type: 'magiclink',
              })
              if (!verifyError) {
                user = (await supabase.auth.getUser()).data.user
              }
            }
          } catch {
            // Silent — fall through to redirect
          }
        }
        if (!user) {
          // No session recoverable — redirect to login
          if (!cancelled) {
            clearTrustedSession()
            router.push('/auth/login?role=resident')
          }
          return
        }
      }

      if (cancelled) return

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, is_active')
        .eq('user_id', user.id)
        .single() as { data: { role: string; is_active: boolean } | null }

      if (!cancelled) {
        setIsSuperAdmin(profile?.role === 'super_admin' && profile.is_active)
      }
    }

    void loadProfile()
    return () => { cancelled = true }
  }, [])

  function residentHref(path: string) {
    return withOwnerTestMode(path, ownerTestMode)
  }

  async function handleLogout() {
    const supabase = createClient()
    clearTrustedSession()
    await supabase.auth.signOut()
    sessionStorage.removeItem('demo_role')
    sessionStorage.removeItem('demo_email')
    router.push('/auth/login')
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <DemoBanner />
      <OfflineSosBanner
        online={online}
        pendingCount={pendingCount}
        smsFallbackRecord={smsFallbackRecord}
        onDismissSmsFallback={dismissSmsFallback}
      />
      {ownerTestMode && (
        <div className="bg-amber-100 px-4 py-2 text-center text-xs font-semibold text-amber-900">
          Owner Test Mode — reports from this portal are saved as drills.
        </div>
      )}
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-red-600" />
            <span className="font-bold text-slate-900">Emergency Rescue Portal</span>
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
              <DropdownMenuTrigger className="rounded-full focus:outline-none">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-blue-600 text-white text-xs font-bold">MC</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => router.push(residentHref('/resident/profile'))}>
                  <User className="w-4 h-4 mr-2" />Profile
                </DropdownMenuItem>
                {isSuperAdmin && (
                  <DropdownMenuItem className="text-amber-700" onClick={() => router.push('/super-admin')}>
                    <Shield className="w-4 h-4 mr-2" />Return to Super Admin
                  </DropdownMenuItem>
                )}
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
                href={residentHref(item.href)}
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

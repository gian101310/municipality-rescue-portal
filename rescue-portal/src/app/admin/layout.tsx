'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, AlertTriangle, Map, Users, UserCheck,
  ShieldCheck, BarChart3, ScrollText, Settings, Activity,
  Shield, Menu, ChevronLeft, LogOut, User, Clock, QrCode,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { NotificationCenter } from '@/components/notification-center'
import { DemoBanner } from '@/components/demo-banner'
import { PushNotificationToggle } from '@/components/push-notification-toggle'
import { AdminSoundToggle } from '@/components/admin-sound-toggle'
// Real data fetched from API — no more demo imports for org/stats
import { MasterKeyProvider } from '@/components/master-key-provider'
import { MasterKeyToggle } from '@/components/master-key-toggle'
import { cn } from '@/lib/utils'
import {
  COVERAGE_LOCK_CHANGED_EVENT,
  getBuyerDetails,
  loadCoverageLock,
} from '@/lib/coverage-lock-client'
import type { TenantGeographyScope } from '@/lib/philippines-geography'
import { createClient } from '@/lib/supabase/client'

type DashboardStats = {
  active_incidents: number
  pending_registrations: number
}

type AdminProfile = {
  full_name: string
  email: string
  role: string
  avatar_url: string | null
}

function buildNavItems(stats: DashboardStats | null) {
  return [
    { href: '/admin', label: 'Command Center', icon: LayoutDashboard, exact: true },
    { href: '/admin/incidents', label: 'Incidents', icon: AlertTriangle, badge: stats?.active_incidents },
    { href: '/admin/map', label: 'Live Map', icon: Map },
    { href: '/admin/teams', label: 'Rescue Teams', icon: Users },
    { href: '/admin/residents', label: 'Residents', icon: UserCheck, badge: stats?.pending_registrations },
    { href: '/admin/verification', label: 'Verification', icon: ShieldCheck },
    { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
    { href: '/admin/audit', label: 'Audit Logs', icon: ScrollText },
    { href: '/admin/qr-posters', label: 'QR Posters', icon: QrCode },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
    { href: '/admin/health', label: 'System Health', icon: Activity },
  ]
}

type NavItem = {
  href: string
  label: string
  icon: React.FC<{ className?: string }>
  exact?: boolean
  badge?: number
}

function NavLink({ item, collapsed, onClick }: {
  item: NavItem
  collapsed: boolean
  onClick?: () => void
}) {
  const pathname = usePathname()
  const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group relative',
        isActive
          ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
          : 'text-slate-400 hover:text-white hover:bg-slate-800'
      )}
    >
      <item.icon className={cn('w-5 h-5 shrink-0', isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300')} />
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
      {!collapsed && item.badge !== undefined && item.badge > 0 && (
        <Badge className="bg-red-600 text-white text-xs h-5 px-1.5 border-0">{item.badge}</Badge>
      )}
      {collapsed && item.badge !== undefined && item.badge > 0 && (
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
      )}
    </Link>
  )
}

function Sidebar({ collapsed, setCollapsed, onClick, organizationName, organizationArea, navItems }: {
  collapsed: boolean
  setCollapsed?: (v: boolean) => void
  onClick?: () => void
  organizationName: string
  organizationArea: string
  navItems: NavItem[]
}) {
  return (
    <div className={cn('flex flex-col h-full bg-slate-950 border-r border-slate-800', collapsed ? 'w-16' : 'w-60')}>
      {/* Logo */}
      <div className={cn('flex items-center h-16 border-b border-slate-800 shrink-0', collapsed ? 'justify-center px-2' : 'px-4 gap-2')}>
        <Shield className="w-7 h-7 text-red-500 shrink-0" />
        {!collapsed && (
          <span className="font-bold text-white tracking-tight">Emergency Rescue Portal</span>
        )}
        {setCollapsed && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft className={cn('w-4 h-4 transition-transform', collapsed && 'rotate-180')} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink key={item.href} item={item} collapsed={collapsed} onClick={onClick} />
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="border-t border-slate-800 px-4 py-3">
          <p className="text-xs text-slate-600 truncate">{organizationName}</p>
          <p className="text-xs text-slate-600 truncate">{organizationArea}</p>
        </div>
      )}
    </div>
  )
}

function LiveClock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    function tick() {
      setTime(new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="hidden sm:flex items-center gap-1.5 text-slate-400 text-xs">
      <Clock className="w-3.5 h-3.5" />
      <span className="font-mono">{time}</span>
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [coverageScope, setCoverageScope] = useState<TenantGeographyScope | null>(null)
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null)
  const [dashStats, setDashStats] = useState<DashboardStats | null>(null)

  const buyerDetails = getBuyerDetails(coverageScope ?? { level: 'country' })
  const organizationName = coverageScope ? buyerDetails.organizationName : 'Loading...'
  const organizationArea = coverageScope
    ? [buyerDetails.provinceName, buyerDetails.regionName].filter(Boolean).join(', ') || buyerDetails.locationName
    : ''

  const navItems = buildNavItems(dashStats)

  // Fetch admin profile and stats
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/admin/dashboard', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        if (data.profile) setAdminProfile(data.profile)
        if (data.stats) setDashStats(data.stats)
      } catch { /* silent */ }
    }
    load()
    // Refresh stats every 30 seconds
    const interval = setInterval(load, 30000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function refreshCoverage(scope?: TenantGeographyScope) {
      const activeScope = scope ?? (await loadCoverageLock()).scope
      if (!cancelled) setCoverageScope(activeScope)
    }

    function handleCoverageChange(event: Event) {
      const customEvent = event as CustomEvent<TenantGeographyScope>
      if (customEvent.detail) void refreshCoverage(customEvent.detail)
    }

    void refreshCoverage()
    window.addEventListener(COVERAGE_LOCK_CHANGED_EVENT, handleCoverageChange)

    return () => {
      cancelled = true
      window.removeEventListener(COVERAGE_LOCK_CHANGED_EVENT, handleCoverageChange)
    }
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    sessionStorage.removeItem('demo_role')
    sessionStorage.removeItem('demo_email')
    router.push('/auth/login')
  }

  const initials = adminProfile?.full_name
    ? adminProfile.full_name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : 'AD'

  return (
    <MasterKeyProvider>
    <div className="flex flex-col min-h-screen bg-slate-950">
      <DemoBanner />
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex shrink-0">
          <Sidebar
            collapsed={collapsed}
            setCollapsed={setCollapsed}
            organizationName={organizationName}
            organizationArea={organizationArea}
            navItems={navItems}
          />
        </div>

        {/* Mobile Sidebar */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="p-0 w-64 bg-slate-950 border-slate-800">
            <Sidebar
              collapsed={false}
              onClick={() => setMobileOpen(false)}
              organizationName={organizationName}
              organizationArea={organizationArea}
              navItems={navItems}
            />
          </SheetContent>
        </Sheet>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <header className="h-14 flex items-center gap-3 px-4 bg-slate-900 border-b border-slate-800 shrink-0 z-10">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-slate-400 hover:text-white"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>

            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-white text-sm truncate hidden sm:block">
                {organizationName}
              </span>
              <Badge className="hidden sm:flex bg-green-600/20 text-green-400 border border-green-500/30 text-xs">
                LIVE
              </Badge>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <LiveClock />
              <MasterKeyToggle />
              {dashStats && (
                <div className="hidden sm:flex items-center gap-1.5 bg-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 border border-slate-700">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  {dashStats.active_incidents} active
                </div>
              )}
              <PushNotificationToggle />
              <AdminSoundToggle />
              <NotificationCenter />
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="rounded-full" />}>
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-blue-600 text-white text-xs font-bold">{initials}</AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-slate-800 border-slate-700">
                  <DropdownMenuLabel className="text-slate-300 text-xs">
                    <div>{adminProfile?.full_name ?? 'Admin'}</div>
                    <div className="text-slate-500 font-normal">{adminProfile?.email ?? '...'}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-slate-700" />
                  <DropdownMenuItem className="text-slate-300 hover:text-white cursor-pointer">
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-slate-300 hover:text-white cursor-pointer" render={<Link href="/admin/settings" />}>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-slate-700" />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-400 hover:text-red-300 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-auto bg-slate-950">
            {children}
          </main>
        </div>
      </div>
    </div>
    </MasterKeyProvider>
  )
}

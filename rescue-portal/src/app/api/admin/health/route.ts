import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface ServiceCheck {
  name: string
  status: 'healthy' | 'degraded' | 'down'
  latency: number
  description: string
  icon: string
}

// The generated schema intentionally keeps legacy tables as sparse records.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any

async function checkDatabase(admin: AdminClient, organizationId: string): Promise<ServiceCheck> {
  const start = Date.now()
  try {
    const { error } = await admin.from('organizations').select('id').eq('id', organizationId).single()
    const latency = Date.now() - start
    if (error) return { name: 'Database', status: 'down', latency, description: 'Tenant database query failed', icon: 'Database' }
    return { name: 'Database', status: latency > 1000 ? 'degraded' : 'healthy', latency, description: 'Tenant database query completed', icon: 'Database' }
  } catch {
    return { name: 'Database', status: 'down', latency: Date.now() - start, description: 'Database connection failed', icon: 'Database' }
  }
}

async function checkRealtime(admin: AdminClient): Promise<ServiceCheck> {
  const start = Date.now()
  const channel = admin.channel(`health-${crypto.randomUUID()}`)
  try {
    const status = await new Promise<string>((resolve) => {
      const timer = setTimeout(() => resolve('TIMED_OUT'), 2500)
      channel.subscribe((nextStatus: string) => {
        if (nextStatus === 'SUBSCRIBED' || nextStatus === 'CHANNEL_ERROR' || nextStatus === 'TIMED_OUT') {
          clearTimeout(timer)
          resolve(nextStatus)
        }
      })
    })
    const latency = Date.now() - start
    return status === 'SUBSCRIBED'
      ? { name: 'Realtime', status: 'healthy', latency, description: 'Realtime subscription established', icon: 'Radio' }
      : { name: 'Realtime', status: 'degraded', latency, description: `Realtime subscription ${status.toLowerCase().replace('_', ' ')}`, icon: 'Radio' }
  } catch {
    return { name: 'Realtime', status: 'down', latency: Date.now() - start, description: 'Realtime connection failed', icon: 'Radio' }
  } finally {
    await admin.removeChannel(channel)
  }
}

async function checkAuth(admin: AdminClient): Promise<ServiceCheck> {
  const start = Date.now()
  try {
    const { error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 })
    const latency = Date.now() - start
    if (error) return { name: 'Auth', status: 'down', latency, description: 'Supabase Auth admin query failed', icon: 'Shield' }
    return { name: 'Auth', status: latency > 1000 ? 'degraded' : 'healthy', latency, description: 'Supabase Auth responded', icon: 'Shield' }
  } catch {
    return { name: 'Auth', status: 'down', latency: Date.now() - start, description: 'Supabase Auth unreachable', icon: 'Shield' }
  }
}

async function checkRouting(): Promise<ServiceCheck> {
  const start = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 3000)
  try {
    const response = await fetch('https://router.project-osrm.org/route/v1/driving/55.2708,25.2048;55.2808,25.2148?overview=false', {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'rescue-portal.ph/1.0' },
      cache: 'no-store',
    })
    const latency = Date.now() - start
    return response.ok
      ? { name: 'Routing', status: latency > 2000 ? 'degraded' : 'healthy', latency, description: 'Road-route ETA service responded', icon: 'Map' }
      : { name: 'Routing', status: 'degraded', latency, description: `Road routing returned HTTP ${response.status}; ETA fallback remains active`, icon: 'Map' }
  } catch {
    return { name: 'Routing', status: 'degraded', latency: Date.now() - start, description: 'Road routing unavailable; ETA fallback remains active', icon: 'Map' }
  } finally {
    clearTimeout(timer)
  }
}

async function checkStats(admin: AdminClient, organizationId: string) {
  const [users, incidents, teams, barangays] = await Promise.all([
    admin.from('user_profiles').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
    admin.from('incidents').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
    admin.from('rescue_units').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('is_active', true),
    admin.from('barangays').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
  ])
  return { totalUsers: users.count ?? 0, totalIncidents: incidents.count ?? 0, activeTeams: teams.count ?? 0, totalBarangays: barangays.count ?? 0 }
}

export async function GET() {
  try {
    const client = await createClient()
    const { data: { user } } = await client.auth.getUser()
    if (!user) return NextResponse.json({ message: 'Sign in required.' }, { status: 401 })
    const { data } = await client.from('user_profiles').select('role, organization_id, is_active').eq('user_id', user.id).single()
    const profile = data as { role: string; organization_id: string; is_active: boolean } | null
    if (!profile?.is_active || !['admin', 'super_admin'].includes(profile.role)) return NextResponse.json({ message: 'Admin access required.' }, { status: 403 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = await createAdminClient() as any
    const [db, realtime, auth, routing, stats] = await Promise.all([
      checkDatabase(admin, profile.organization_id),
      checkRealtime(admin),
      checkAuth(admin),
      checkRouting(),
      checkStats(admin, profile.organization_id),
    ])
    return NextResponse.json({ services: [db, realtime, auth, routing], stats, checkedAt: new Date().toISOString() }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return NextResponse.json({ message: 'Health check failed.' }, { status: 500 })
  }
}

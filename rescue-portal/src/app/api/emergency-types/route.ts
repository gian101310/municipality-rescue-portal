import { NextResponse } from 'next/server'
import { getEmergencyTypeScopeFilter } from '@/lib/emergency-type-catalog'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type QueryResult<T> = {
  data: T | null
  error: { message?: string } | null
}

type EmergencyTypeRow = {
  id: string
  name: string
  icon: string
  color: string
  description: string | null
}

type RequesterProfileRow = {
  organization_id: string
}

export async function GET() {
  try {
    const requester = await createClient()
    const { data: { user } } = await requester.auth.getUser()
    let organizationId: string | undefined

    if (user) {
      const { data: profile } = await requester
        .from('user_profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle<RequesterProfileRow>()
      organizationId = profile?.organization_id
    }

    const admin = await createAdminClient()

    const { data, error } = await (admin
      .from('emergency_types')
      .select('id, name, icon, color, description')
      .eq('is_active', true)
      .or(getEmergencyTypeScopeFilter(organizationId))
      .order('sort_order', { ascending: true }) as unknown as Promise<QueryResult<EmergencyTypeRow[]>>)

    if (error) {
      return NextResponse.json({ message: error.message ?? 'Failed to load emergency types.' }, { status: 500 })
    }

    return NextResponse.json({ emergencyTypes: data ?? [] })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to load emergency types.' },
      { status: 500 }
    )
  }
}

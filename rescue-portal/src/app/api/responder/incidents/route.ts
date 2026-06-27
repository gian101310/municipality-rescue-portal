import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { attachEmergencyTypes } from '@/lib/incident-presentation'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const client = await createClient()
    const { data: { user } } = await client.auth.getUser()
    if (!user) return NextResponse.json({ message: 'Please sign in first.' }, { status: 401 })

    // Supabase's generated table map is intentionally sparse in this project.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = await createAdminClient() as any
    const { data: profile } = await admin
      .from('user_profiles')
      .select('id, role, organization_id, rescue_unit_id, is_active, registration_status')
      .eq('user_id', user.id)
      .single()

    if (!profile?.is_active || !['responder', 'team_leader'].includes(profile.role) || (profile.registration_status && profile.registration_status !== 'approved')) {
      return NextResponse.json({ message: 'Rescue team access required.' }, { status: 403 })
    }

    const { data: memberships } = await admin
      .from('rescue_unit_members')
      .select('unit_id')
      .eq('user_id', profile.id)
      .eq('is_active', true)
    const unitIds = Array.from(new Set([
      ...(profile.rescue_unit_id ? [profile.rescue_unit_id] : []),
      ...(memberships ?? []).map((membership: { unit_id: string }) => membership.unit_id),
    ]))

    if (unitIds.length === 0) {
      return NextResponse.json({ incidents: [], unitConfigured: false })
    }

    const { data: incidents, error } = await admin
      .from('incidents')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .in('assigned_unit_id', unitIds)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)

    const { data: emergencyTypes } = await admin
      .from('emergency_types')
      .select('id, name, icon, color, description')

    return NextResponse.json({
      incidents: attachEmergencyTypes(incidents ?? [], emergencyTypes ?? []),
      unitConfigured: true,
    })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to load assigned missions.' },
      { status: 500 }
    )
  }
}

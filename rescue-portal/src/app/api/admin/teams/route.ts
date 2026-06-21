import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { buildStarterTeams } from '@/lib/rescue-team-payload'

async function staff() {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return null
  const { data: profile } = await client.from('user_profiles').select('id, role, full_name, organization_id, is_active, registration_status').eq('user_id', user.id).single() as any
  if (!profile || !profile.is_active || !['super_admin', 'admin', 'dispatcher', 'staff'].includes(profile.role) || (profile.registration_status && profile.registration_status !== 'approved')) return null
  return profile
}

export async function GET() {
  const profile = await staff()
  if (!profile) return NextResponse.json({ message: 'Team management access required.' }, { status: 403 })
  const admin = await createAdminClient() as any
  let { data: teams, error } = await admin.from('rescue_units').select('*').eq('organization_id', profile.organization_id).order('created_at')
  if (error) return NextResponse.json({ message: error.message }, { status: 500 })
  if (!teams?.length) {
    const seeded = await admin.from('rescue_units').insert(buildStarterTeams(profile.organization_id)).select('*')
    if (seeded.error) return NextResponse.json({ message: seeded.error.message }, { status: 500 })
    teams = seeded.data
  }
  const unitIds = teams.map((team: any) => team.id)
  const { data: members } = unitIds.length ? await admin.from('rescue_unit_members').select('*').in('unit_id', unitIds).eq('is_active', true) : { data: [] }
  return NextResponse.json({ teams: teams.map((team: any) => ({ ...team, members: (members ?? []).filter((member: any) => member.unit_id === team.id) })) })
}

export async function POST(request: Request) {
  const profile = await staff()
  if (!profile) return NextResponse.json({ message: 'Team management access required.' }, { status: 403 })
  const body = await request.json()
  if (!String(body.name ?? '').trim() || !String(body.code ?? '').trim()) return NextResponse.json({ message: 'Team name and code are required.' }, { status: 400 })
  const admin = await createAdminClient() as any
  const { data, error } = await admin.from('rescue_units').insert({ organization_id: profile.organization_id, name: body.name.trim(), code: body.code.trim(), contact_number: body.contact_number?.trim() || null, status: body.status || 'available', vehicle_info: body.vehicle_info || null, equipment: body.equipment || [], specializations: body.specializations || [], is_active: true }).select('*').single()
  if (error) return NextResponse.json({ message: error.message }, { status: 400 })
  return NextResponse.json({ team: data }, { status: 201 })
}

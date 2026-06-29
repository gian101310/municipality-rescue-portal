import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

const VIEW_ROLES = new Set(['super_admin', 'admin', 'dispatcher', 'team_leader', 'responder', 'staff'])
const EDIT_ROLES = new Set(['super_admin', 'admin', 'dispatcher'])
const SHIFT_TYPES = new Set(['day', 'swing', 'night'])

async function requireShiftProfile() {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return null
  const { data } = await client.from('user_profiles')
    .select('id, role, full_name, organization_id, is_active, registration_status')
    .eq('user_id', user.id).single()
  return data as null | { id: string; role: string; full_name: string; organization_id: string | null; is_active: boolean; registration_status: string }
}

function isApproved(profile: NonNullable<Awaited<ReturnType<typeof requireShiftProfile>>>) {
  return Boolean(profile.is_active && profile.organization_id && VIEW_ROLES.has(profile.role)
    && (profile.role === 'super_admin' || profile.registration_status === 'approved'))
}

export async function GET(request: NextRequest) {
  const profile = await requireShiftProfile()
  if (!profile || !isApproved(profile)) return NextResponse.json({ message: 'Shift access required.' }, { status: 403 })
  const organizationId = profile.organization_id as string
  const week = request.nextUrl.searchParams.get('week')?.trim() ?? ''
  const start = new Date(`${week}T00:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week) || Number.isNaN(start.getTime())) {
    return NextResponse.json({ message: 'A valid week start is required.' }, { status: 400 })
  }
  const end = new Date(start); end.setUTCDate(end.getUTCDate() + 6)
  const endDate = end.toISOString().slice(0, 10)
  const admin = await createAdminClient()
  const [{ data: units, error: unitError }, { data: shifts, error: shiftError }] = await Promise.all([
    admin.from('rescue_units').select('id, name, code, status').eq('organization_id', organizationId).eq('is_active', true).order('name'),
    admin.from('rescue_unit_shifts').select('id, rescue_unit_id, shift_date, shift_type').eq('organization_id', organizationId).gte('shift_date', week).lte('shift_date', endDate),
  ])
  if (unitError || shiftError) return NextResponse.json({ message: unitError?.message ?? shiftError?.message }, { status: 500 })
  return NextResponse.json({ units: units ?? [], shifts: shifts ?? [], canEdit: EDIT_ROLES.has(profile.role) })
}

export async function PUT(request: Request) {
  const profile = await requireShiftProfile()
  if (!profile || !isApproved(profile) || !EDIT_ROLES.has(profile.role)) {
    return NextResponse.json({ message: 'Shift editing access required.' }, { status: 403 })
  }
  const organizationId = profile.organization_id as string
  const body = await request.json() as { rescueUnitId?: unknown; shiftDate?: unknown; shiftType?: unknown }
  const rescueUnitId = String(body.rescueUnitId ?? '').trim()
  const shiftDate = String(body.shiftDate ?? '').trim()
  const shiftType = body.shiftType === null ? null : String(body.shiftType ?? '').trim()
  if (!rescueUnitId || !/^\d{4}-\d{2}-\d{2}$/.test(shiftDate) || (shiftType !== null && !SHIFT_TYPES.has(shiftType))) {
    return NextResponse.json({ message: 'Valid team, date, and shift are required.' }, { status: 400 })
  }
  const admin = await createAdminClient()
  const { data: rawUnit } = await admin.from('rescue_units').select('id, name').eq('id', rescueUnitId).eq('organization_id', organizationId).eq('is_active', true).maybeSingle()
  const unit = rawUnit as null | { id: string; name: string }
  if (!unit) return NextResponse.json({ message: 'Rescue team not found.' }, { status: 404 })
  const write = shiftType === null
    ? await admin.from('rescue_unit_shifts').delete().eq('rescue_unit_id', rescueUnitId).eq('shift_date', shiftDate).eq('organization_id', organizationId)
    : await admin.from('rescue_unit_shifts').upsert({ organization_id: organizationId, rescue_unit_id: rescueUnitId, shift_date: shiftDate, shift_type: shiftType, updated_by: profile.id, updated_at: new Date().toISOString() } as never, { onConflict: 'rescue_unit_id,shift_date' })
  if (write.error) return NextResponse.json({ message: write.error.message }, { status: 500 })
  await admin.from('audit_logs').insert({ actor_id: profile.id, actor_name: profile.full_name, actor_role: profile.role, action: 'update', entity_type: 'rescue_unit_shift', entity_id: rescueUnitId, new_values: { team: unit.name, shift_date: shiftDate, shift_type: shiftType ?? 'off' }, organization_id: organizationId } as never)
  return NextResponse.json({ success: true })
}

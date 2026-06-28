/* eslint-disable @typescript-eslint/no-explicit-any -- database.types.ts intentionally exposes table rows as Record<string, unknown>. */
import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { auditRequestMeta, writeAuditLog } from '@/lib/audit-logger'
import {
  MAX_STAFF_PER_TENANT,
  OPERATIONS_ROLES,
  canManageOperationsStaff,
  validateOperationsRole,
  validateTeamAssignment,
} from '@/lib/operations-staff'
import { validateTenantPassword } from '@/lib/tenant-admin'
import type { UserRole } from '@/lib/types'

export const dynamic = 'force-dynamic'

async function requireStaffManager() {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return { error: NextResponse.json({ message: 'Please sign in first.' }, { status: 401 }) }

  const { data: profile } = await client
    .from('user_profiles')
    .select('id, user_id, role, full_name, organization_id, is_active, registration_status')
    .eq('user_id', user.id)
    .single() as any

  if (!profile || !profile.is_active || !canManageOperationsStaff(profile.role as UserRole) || (profile.registration_status && profile.registration_status !== 'approved')) {
    return { error: NextResponse.json({ message: 'Tenant administrator access required.' }, { status: 403 }) }
  }

  return { profile }
}

async function requireTenantTeam(admin: any, organizationId: string, teamId: string | null) {
  if (!teamId) return null
  const { data: team } = await admin
    .from('rescue_units')
    .select('id, name')
    .eq('id', teamId)
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .single()
  if (!team) throw new Error('Choose a rescue team from your municipality.')
  return team
}

export async function GET() {
  const auth = await requireStaffManager()
  if ('error' in auth) return auth.error

  const admin = await createAdminClient() as any
  const { data: staff, error } = await admin
    .from('user_profiles')
    .select('id, user_id, full_name, email, phone, role, is_active, registration_status, rescue_unit_id, created_at')
    .eq('organization_id', auth.profile.organization_id)
    .in('role', OPERATIONS_ROLES)
    .order('full_name')
  if (error) return NextResponse.json({ message: error.message }, { status: 500 })

  const staffIds = (staff ?? []).map((item: any) => item.id)
  const { data: memberships } = staffIds.length
    ? await admin.from('rescue_unit_members').select('id, unit_id, user_id, role, is_active').in('user_id', staffIds).eq('is_active', true)
    : { data: [] }
  const { data: teams } = await admin
    .from('rescue_units')
    .select('id, name, code, status')
    .eq('organization_id', auth.profile.organization_id)
    .eq('is_active', true)
    .order('name')
  const { count } = await admin
    .from('user_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', auth.profile.organization_id)
    .in('role', ['admin', ...OPERATIONS_ROLES])

  return NextResponse.json({
    staff: (staff ?? []).map((item: any) => ({
      ...item,
      membership: (memberships ?? []).find((membership: any) => membership.user_id === item.id) ?? null,
    })),
    teams: teams ?? [],
    used: count ?? 0,
    max: MAX_STAFF_PER_TENANT,
  })
}

export async function POST(request: Request) {
  const auth = await requireStaffManager()
  if ('error' in auth) return auth.error

  let createdAuthUserId: string | null = null
  try {
    const body = await request.json()
    const fullName = String(body?.fullName ?? '').trim()
    const email = String(body?.email ?? '').trim().toLowerCase()
    const phone = String(body?.phone ?? '').trim()
    const role = validateOperationsRole(body?.role)
    const password = String(body?.password ?? '')
    const assignment = validateTeamAssignment(body?.teamId, body?.position)

    if (!fullName) return NextResponse.json({ message: 'Full name is required.' }, { status: 400 })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ message: 'Enter a valid email address.' }, { status: 400 })
    if (!role) return NextResponse.json({ message: 'Choose a valid operations account role.' }, { status: 400 })
    const passwordError = validateTenantPassword(password)
    if (passwordError) return NextResponse.json({ message: passwordError }, { status: 400 })

    const admin = await createAdminClient() as any
    const { count } = await admin
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', auth.profile.organization_id)
      .in('role', ['admin', ...OPERATIONS_ROLES])
    if ((count ?? 0) >= MAX_STAFF_PER_TENANT) {
      return NextResponse.json({ message: `Maximum ${MAX_STAFF_PER_TENANT} staff accounts per municipality.` }, { status: 400 })
    }

    const team = await requireTenantTeam(admin, auth.profile.organization_id, assignment.teamId)
    const { data: municipality } = await admin.from('municipalities').select('id, name, province').eq('organization_id', auth.profile.organization_id).limit(1).maybeSingle()
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role, organization_id: auth.profile.organization_id },
    })
    if (authError || !authUser.user?.id) throw new Error(authError?.message ?? 'Unable to create staff login.')
    createdAuthUserId = authUser.user.id

    const now = new Date().toISOString()
    const { data: staffProfile, error: profileError } = await admin.from('user_profiles').upsert({
      user_id: createdAuthUserId,
      organization_id: auth.profile.organization_id,
      municipality_id: municipality?.id ?? null,
      full_name: fullName,
      email,
      phone: phone || null,
      role,
      municipality: municipality?.name ?? null,
      province: municipality?.province ?? null,
      rescue_unit_id: assignment.teamId,
      is_active: true,
      registration_status: 'approved',
      verified_at: now,
      updated_at: now,
    }, { onConflict: 'user_id' }).select('id, user_id, full_name, email, phone, role, is_active, rescue_unit_id').single()
    if (profileError || !staffProfile) throw new Error(profileError?.message ?? 'Unable to create staff profile.')

    if (team && assignment.position) {
      const { error: memberError } = await admin.from('rescue_unit_members').upsert({
        unit_id: team.id,
        user_id: staffProfile.id,
        user_name: fullName,
        role: assignment.position,
        is_active: true,
        joined_at: now,
        left_at: null,
      }, { onConflict: 'unit_id,user_id' })
      if (memberError) throw new Error(memberError.message)
      if (assignment.position === 'team_leader') {
        await admin.from('rescue_units').update({ team_leader_id: staffProfile.id, team_leader_name: fullName }).eq('id', team.id)
      }
    }

    await writeAuditLog({
      actorId: auth.profile.id,
      actorName: auth.profile.full_name,
      actorRole: auth.profile.role,
      action: 'create',
      entityType: 'operations_staff',
      entityId: staffProfile.id,
      newValues: { role, teamId: assignment.teamId, position: assignment.position },
      organizationId: auth.profile.organization_id,
      ...auditRequestMeta(request.headers),
    })

    return NextResponse.json({ staff: staffProfile }, { status: 201 })
  } catch (error) {
    if (createdAuthUserId) {
      const admin = await createAdminClient()
      await admin.auth.admin.deleteUser(createdAuthUserId).catch(() => null)
    }
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to create staff account.' }, { status: 500 })
  }
}

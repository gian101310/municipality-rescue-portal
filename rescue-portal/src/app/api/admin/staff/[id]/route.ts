/* eslint-disable @typescript-eslint/no-explicit-any -- database.types.ts intentionally exposes table rows as Record<string, unknown>. */
import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { auditRequestMeta, writeAuditLog } from '@/lib/audit-logger'
import { canManageOperationsStaff, validateOperationsRole, validateTeamAssignment } from '@/lib/operations-staff'
import { validateTenantPassword } from '@/lib/tenant-admin'
import type { UserRole } from '@/lib/types'

async function requireStaffManager() {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return { error: NextResponse.json({ message: 'Please sign in first.' }, { status: 401 }) }
  const { data: profile } = await client.from('user_profiles').select('id, role, full_name, organization_id, is_active, registration_status').eq('user_id', user.id).single() as any
  if (!profile || !profile.is_active || !canManageOperationsStaff(profile.role as UserRole) || (profile.registration_status && profile.registration_status !== 'approved')) {
    return { error: NextResponse.json({ message: 'Tenant administrator access required.' }, { status: 403 }) }
  }
  return { profile }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffManager()
  if ('error' in auth) return auth.error

  try {
    const { id } = await context.params
    const body = await request.json()
    const admin = await createAdminClient() as any
    const { data: existing } = await admin
      .from('user_profiles')
      .select('id, user_id, full_name, email, phone, role, is_active, rescue_unit_id, organization_id')
      .eq('id', id)
      .eq('organization_id', auth.profile.organization_id)
      .single()
    if (!existing || !validateOperationsRole(existing.role)) return NextResponse.json({ message: 'Operations staff account not found.' }, { status: 404 })

    const role = body.role === undefined ? existing.role : validateOperationsRole(body.role)
    if (!role) return NextResponse.json({ message: 'Choose a valid operations account role.' }, { status: 400 })
    const fullName = body.fullName === undefined ? existing.full_name : String(body.fullName).trim()
    if (!fullName) return NextResponse.json({ message: 'Full name is required.' }, { status: 400 })
    const phone = body.phone === undefined ? existing.phone : String(body.phone).trim() || null
    const isActive = body.isActive === undefined ? existing.is_active : Boolean(body.isActive)
    const password = String(body.password ?? '')
    if (password) {
      const passwordError = validateTenantPassword(password)
      if (passwordError) return NextResponse.json({ message: passwordError }, { status: 400 })
    }

    const assignmentProvided = body.teamId !== undefined || body.position !== undefined
    const assignment = assignmentProvided
      ? validateTeamAssignment(body.teamId, body.position)
      : { teamId: existing.rescue_unit_id as string | null, position: null }

    if (assignment.teamId) {
      const { data: team } = await admin.from('rescue_units').select('id').eq('id', assignment.teamId).eq('organization_id', auth.profile.organization_id).eq('is_active', true).single()
      if (!team) return NextResponse.json({ message: 'Choose a rescue team from your municipality.' }, { status: 400 })
    }

    if (password) {
      const { error } = await admin.auth.admin.updateUserById(existing.user_id, { password })
      if (error) throw new Error(error.message)
    }
    if (body.isActive !== undefined) {
      const { error } = await admin.auth.admin.updateUserById(existing.user_id, { ban_duration: isActive ? 'none' : '876000h' })
      if (error) throw new Error(error.message)
    }

    const now = new Date().toISOString()
    const { data: updated, error: updateError } = await admin.from('user_profiles').update({
      full_name: fullName,
      phone,
      role,
      is_active: isActive,
      rescue_unit_id: assignmentProvided ? assignment.teamId : existing.rescue_unit_id,
      updated_at: now,
    }).eq('id', id).eq('organization_id', auth.profile.organization_id).select('id, user_id, full_name, email, phone, role, is_active, rescue_unit_id').single()
    if (updateError || !updated) throw new Error(updateError?.message ?? 'Unable to update staff account.')

    if (assignmentProvided) {
      await admin.from('rescue_unit_members').update({ is_active: false, left_at: now }).eq('user_id', id).eq('is_active', true)
      if (assignment.teamId && assignment.position) {
        const { error: memberError } = await admin.from('rescue_unit_members').upsert({
          unit_id: assignment.teamId,
          user_id: id,
          user_name: fullName,
          role: assignment.position,
          is_active: true,
          joined_at: now,
          left_at: null,
        }, { onConflict: 'unit_id,user_id' })
        if (memberError) throw new Error(memberError.message)
        if (assignment.position === 'team_leader') {
          await admin.from('rescue_units').update({ team_leader_id: id, team_leader_name: fullName }).eq('id', assignment.teamId)
        }
      }
    }

    await writeAuditLog({
      actorId: auth.profile.id,
      actorName: auth.profile.full_name,
      actorRole: auth.profile.role,
      action: 'update',
      entityType: 'operations_staff',
      entityId: id,
      previousValues: { role: existing.role, isActive: existing.is_active, teamId: existing.rescue_unit_id },
      newValues: { role, isActive, teamId: updated.rescue_unit_id, position: assignment.position, passwordChanged: Boolean(password) },
      organizationId: auth.profile.organization_id,
      ...auditRequestMeta(request.headers),
    })

    return NextResponse.json({ staff: updated })
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to update staff account.' }, { status: 500 })
  }
}

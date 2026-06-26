import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { writeAuditLog, auditRequestMeta } from '@/lib/audit-logger'
import type { RegistrationStatus, UserRole } from '@/lib/types'

export const dynamic = 'force-dynamic'

type QueryResult<T> = {
  data: T | null
  error: { message?: string } | null
}

type SupabaseQueryBuilder = PromiseLike<QueryResult<unknown>> & {
  select(columns: string): SupabaseQueryBuilder
  eq(column: string, value: unknown): SupabaseQueryBuilder
  insert(values: Record<string, unknown> | Record<string, unknown>[]): SupabaseQueryBuilder
  update(values: Record<string, unknown>): SupabaseQueryBuilder
  maybeSingle<T = Record<string, unknown>>(): Promise<QueryResult<T>>
  single<T = Record<string, unknown>>(): Promise<QueryResult<T>>
}

type SupabaseDataClient = {
  from(table: string): SupabaseQueryBuilder
}

type StaffProfile = {
  id: string
  user_id: string
  role: UserRole
  organization_id: string
  is_active: boolean
  registration_status: string | null
}

type ResidentRow = {
  id: string
  organization_id: string
  role: UserRole
}

const statusUpdateRoles: UserRole[] = ['super_admin', 'admin', 'verifier']
const allowedStatuses: RegistrationStatus[] = ['under_review', 'more_info_required', 'approved', 'rejected', 'suspended']

async function requireResidentReviewer() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: NextResponse.json({ message: 'Please sign in first.' }, { status: 401 }) }
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, user_id, role, organization_id, is_active, registration_status')
    .eq('user_id', user.id)
    .single() as QueryResult<StaffProfile>

  if (
    profileError ||
    !profile ||
    !profile.is_active ||
    !statusUpdateRoles.includes(profile.role) ||
    (profile.registration_status && profile.registration_status !== 'approved')
  ) {
    return { error: NextResponse.json({ message: 'Resident review access required.' }, { status: 403 }) }
  }

  return { profile }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireResidentReviewer()
  if ('error' in auth) return auth.error

  try {
    const { id } = await context.params
    const body = await request.json()
    const status = String(body?.status ?? '') as RegistrationStatus
    const note = String(body?.note ?? '').trim()

    if (!allowedStatuses.includes(status)) {
      return NextResponse.json({ message: 'Choose a valid review status.' }, { status: 400 })
    }

    if (status === 'more_info_required' && !note) {
      return NextResponse.json({ message: 'Enter what information is required.' }, { status: 400 })
    }

    const admin = await createAdminClient() as unknown as SupabaseDataClient

    const { data: resident, error: residentError } = await admin
      .from('user_profiles')
      .select('id, organization_id, role')
      .eq('id', id)
      .eq('role', 'resident')
      .single<ResidentRow>()

    if (residentError || !resident) {
      return NextResponse.json({ message: 'Resident not found.' }, { status: 404 })
    }

    if (auth.profile.role !== 'super_admin' && resident.organization_id !== auth.profile.organization_id) {
      return NextResponse.json({ message: 'Resident belongs to another organization.' }, { status: 403 })
    }

    const now = new Date().toISOString()
    const profileUpdate: Record<string, unknown> = {
      registration_status: status,
      updated_at: now,
      is_active: status !== 'rejected' && status !== 'suspended',
    }

    if (status === 'approved') {
      profileUpdate.verified_at = now
      profileUpdate.verified_by = auth.profile.user_id
      profileUpdate.rejection_reason = null
      profileUpdate.more_info_request = null
    }

    if (status === 'rejected') {
      profileUpdate.rejection_reason = note || 'Rejected during administrator review.'
      profileUpdate.more_info_request = null
    }

    if (status === 'more_info_required') {
      profileUpdate.more_info_request = note
      profileUpdate.rejection_reason = null
    }

    const { data: updatedResident, error: updateError } = await admin
      .from('user_profiles')
      .update(profileUpdate)
      .eq('id', id)
      .select('*')
      .single<Record<string, unknown>>()

    if (updateError || !updatedResident) {
      throw new Error(updateError?.message ?? 'Unable to update resident.')
    }

    const verificationUpdate = {
      status,
      verifier_id: auth.profile.user_id,
      reviewed_at: now,
      notes: note || null,
      rejection_reason: status === 'rejected' ? (note || 'Rejected during administrator review.') : null,
      updated_at: now,
    }

    const { data: existingVerification } = await admin
      .from('resident_verifications')
      .select('id')
      .eq('resident_id', id)
      .maybeSingle<{ id: string }>()

    if (existingVerification?.id) {
      await admin
        .from('resident_verifications')
        .update(verificationUpdate)
        .eq('id', existingVerification.id)
    } else {
      await admin
        .from('resident_verifications')
        .insert({
          resident_id: id,
          submitted_at: now,
          created_at: now,
          ...verificationUpdate,
        })
    }

    // Audit log for resident status changes (approve/reject/suspend)
    const auditAction = status === 'approved' ? 'approve' as const
      : status === 'rejected' ? 'reject' as const
      : 'status_change' as const
    const meta = auditRequestMeta(request.headers)
    writeAuditLog({
      actorId: auth.profile.user_id,
      actorName: (auth.profile as unknown as { full_name?: string }).full_name ?? 'staff',
      actorRole: auth.profile.role,
      action: auditAction,
      entityType: 'resident',
      entityId: id,
      previousValues: { registration_status: resident.role === 'resident' ? 'pending' : null },
      newValues: { registration_status: status, note: note || null },
      organizationId: auth.profile.organization_id,
      ...meta,
    })

    return NextResponse.json({ resident: updatedResident })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to update resident.' },
      { status: 500 }
    )
  }
}


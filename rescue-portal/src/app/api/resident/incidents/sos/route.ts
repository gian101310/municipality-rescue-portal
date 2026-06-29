import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateIncomingSosLocation } from '@/lib/incident-submission'
import { getResidentAccess } from '@/lib/owner-test-mode'
import { rateLimitSos, getClientIp } from '@/lib/server-rate-limiter'
import type { RegistrationStatus, UserRole } from '@/lib/types'

export const dynamic = 'force-dynamic'

type QueryResult<T> = {
  data: T | null
  error: { message?: string } | null
}

type ResidentProfileRow = {
  id: string
  user_id: string
  role: UserRole
  full_name: string
  phone: string | null
  organization_id: string
  is_active: boolean
  registration_status: RegistrationStatus | null
}

type SosRpcResult = {
  created: boolean
  incident: Record<string, unknown>
}

async function requireApprovedResident(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: NextResponse.json({ message: 'Please sign in first.' }, { status: 401 }) }
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single() as QueryResult<ResidentProfileRow>

  const access = profile
    ? getResidentAccess(profile, new URL(request.url).searchParams)
    : { allowed: false, ownerTestMode: false }

  if (profileError || !profile || !access.allowed) {
    return { error: NextResponse.json({ message: 'Approved resident or Owner Test Mode access required.' }, { status: 403 }) }
  }

  return { profile, access, supabase }
}

export async function POST(request: Request) {
  // Server-side rate limiting
  const ip = getClientIp(request.headers)
  const rl = await rateLimitSos(ip)
  if (!rl.success) {
    return NextResponse.json(
      { message: `Too many SOS requests. Try again in ${rl.resetInSeconds} seconds.` },
      {
        status: 429,
        headers: {
          'Retry-After': String(rl.resetInSeconds),
          'X-RateLimit-Remaining': '0',
        },
      }
    )
  }

  const auth = await requireApprovedResident(request)
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const latitude = Number(body?.latitude)
    const longitude = Number(body?.longitude)
    const gpsAccuracy = Number.isFinite(Number(body?.gps_accuracy)) ? Number(body.gps_accuracy) : null
    const validation = validateIncomingSosLocation({ latitude, longitude })

    // Offline SOS fields
    const localSosId = typeof body?.local_sos_id === 'string' && body.local_sos_id.trim()
      ? body.local_sos_id.trim()
      : crypto.randomUUID()
    const parsedCreatedAt = typeof body?.created_timestamp === 'string'
      ? new Date(body.created_timestamp)
      : new Date()
    const networkStatus = body?.network_status === 'offline' ? 'offline' : 'online'

    if (!validation.ok) {
      return NextResponse.json({ message: validation.message }, { status: 400 })
    }
    if (Number.isNaN(parsedCreatedAt.getTime())) {
      return NextResponse.json({ message: 'Invalid SOS creation timestamp.' }, { status: 400 })
    }

    const rpcClient = auth.supabase as unknown as {
      rpc(
        name: 'create_resident_sos',
        args: { p_payload: Record<string, unknown> }
      ): PromiseLike<QueryResult<SosRpcResult>>
    }
    const { data: result, error: rpcError } = await rpcClient.rpc('create_resident_sos', {
      p_payload: {
        latitude,
        longitude,
        gps_accuracy: gpsAccuracy,
        local_sos_id: localSosId,
        created_timestamp: parsedCreatedAt.toISOString(),
        network_status: networkStatus,
      },
    })

    if (rpcError || !result?.incident) {
      throw new Error(rpcError?.message ?? 'Unable to send SOS.')
    }

    return NextResponse.json({
      incident: result.incident,
      referenceNumber: result.incident.reference_number,
      idempotentReplay: !result.created,
    }, { status: result.created ? 201 : 200 })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to send SOS.' },
      { status: 500 }
    )
  }
}

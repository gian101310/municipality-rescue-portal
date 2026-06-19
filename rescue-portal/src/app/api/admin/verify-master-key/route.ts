import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { verifyMasterKey } from '@/lib/master-key'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ message: 'Please sign in first.' }, { status: 401 })
    }

    const adminClient = await createAdminClient()

    const { data: profileData, error: profileErr } = await adminClient
      .from('user_profiles')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single()

    if (profileErr || !profileData) {
      return NextResponse.json({ message: 'User profile not found.' }, { status: 403 })
    }

    if (profileData.role !== 'admin' && profileData.role !== 'super_admin') {
      return NextResponse.json({ message: 'Admin access required.' }, { status: 403 })
    }

    const organizationId = profileData.organization_id
    if (!organizationId) {
      return NextResponse.json({ message: 'No organization assigned.' }, { status: 403 })
    }

    const { data: org, error: orgError } = await adminClient
      .from('organizations')
      .select('master_key_hash')
      .eq('id', organizationId)
      .single()

    if (orgError || !org) {
      return NextResponse.json({ message: 'Organization not found.' }, { status: 404 })
    }

    if (!org.master_key_hash) {
      return NextResponse.json({ message: 'No master key configured for this organization.' }, { status: 400 })
    }

    const body = await request.json()
    const masterKey = String(body?.masterKey ?? '').trim()

    if (!masterKey) {
      return NextResponse.json({ message: 'Master key is required.' }, { status: 400 })
    }

    const isValid = verifyMasterKey(masterKey, org.master_key_hash)

    if (!isValid) {
      return NextResponse.json({ message: 'Invalid master key.' }, { status: 401 })
    }

    return NextResponse.json({ unlocked: true })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Verification failed.' },
      { status: 500 }
    )
  }
}

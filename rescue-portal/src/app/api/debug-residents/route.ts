import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const adminClient = await createAdminClient()

    // Test 1: Simple count
    const countResult = await adminClient
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'resident')

    // Test 2: Full select (same as residents API)
    const selectResult = await adminClient
      .from('user_profiles')
      .select('id, full_name, email, role, registration_status, organization_id')
      .eq('role', 'resident')
      .order('created_at', { ascending: false })

    // Test 3: Select ALL profiles (no role filter)
    const allResult = await adminClient
      .from('user_profiles')
      .select('id, full_name, role')

    // Test 4: Check service key prefix
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
    const keyInfo = `${key.substring(0, 10)}...${key.substring(key.length - 5)} (len=${key.length})`

    return NextResponse.json({
      countTest: {
        count: countResult.count,
        error: countResult.error?.message ?? null,
      },
      selectTest: {
        rowCount: selectResult.data?.length ?? 0,
        data: selectResult.data,
        error: selectResult.error?.message ?? null,
      },
      allProfilesTest: {
        rowCount: allResult.data?.length ?? 0,
        data: allResult.data,
        error: allResult.error?.message ?? null,
      },
      keyInfo,
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}

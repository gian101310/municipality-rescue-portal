import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

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

export async function GET() {
  try {
    const admin = await createAdminClient()

    const { data, error } = await (admin
      .from('emergency_types')
      .select('id, name, icon, color, description')
      .eq('is_active', true)
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

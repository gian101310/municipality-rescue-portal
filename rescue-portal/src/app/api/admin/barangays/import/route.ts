import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

async function profile() {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return null
  const { data } = await client.from('user_profiles').select('role, organization_id, municipality_id, is_active').eq('user_id', user.id).single() as any
  return data
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    if (values.every(v => !v)) continue
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = values[idx] ?? '' })
    rows.push(row)
  }
  return rows
}

export async function POST(request: NextRequest) {
  const staff = await profile()
  if (!staff?.is_active || !['admin', 'super_admin'].includes(staff.role)) {
    return NextResponse.json({ message: 'Admin access required.' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const csvText = String(body.csv ?? '')
    if (!csvText.trim()) return NextResponse.json({ message: 'No CSV data provided.' }, { status: 400 })

    const rows = parseCSV(csvText)
    if (rows.length === 0) return NextResponse.json({ message: 'No valid rows found. CSV must have a header row with at least a "name" column.' }, { status: 400 })
    if (rows.length > 500) return NextResponse.json({ message: 'Maximum 500 rows per import.' }, { status: 400 })

    const admin = await createAdminClient() as any
    const now = new Date().toISOString()

    let imported = 0
    let skipped = 0
    const errors: string[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const name = (row.name || row.barangay || row.barangay_name || '').trim()
      if (!name) { errors.push(`Row ${i + 2}: missing name`); skipped++; continue }

      const captain_name = (row.captain_name || row.captain || row.contact_person || '').trim() || null
      const captain_phone = (row.captain_phone || row.phone || row.contact_number || '').trim() || null

      const { error } = await admin.from('barangays').insert({
        organization_id: staff.organization_id,
        municipality_id: staff.municipality_id ?? null,
        name,
        captain_name,
        captain_phone,
        is_active: true,
        created_at: now,
        updated_at: now,
      })

      if (error) {
        if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
          errors.push(`Row ${i + 2}: "${name}" already exists`)
          skipped++
        } else {
          errors.push(`Row ${i + 2}: ${error.message}`)
          skipped++
        }
      } else {
        imported++
      }
    }

    return NextResponse.json({ imported, skipped, total: rows.length, errors: errors.slice(0, 20) })
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Import failed.' }, { status: 500 })
  }
}

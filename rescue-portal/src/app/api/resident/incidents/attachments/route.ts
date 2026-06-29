import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getResidentAccess } from '@/lib/owner-test-mode'
import type { RegistrationStatus, UserRole } from '@/lib/types'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'])

function safeFileName(name: string) {
  const cleaned = name.normalize('NFKC').replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').slice(-120)
  return cleaned || 'attachment'
}

export async function POST(request: NextRequest) {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })

  const { data: rawProfile } = await client.from('user_profiles').select('id, user_id, role, organization_id, is_active, registration_status').eq('user_id', user.id).single()
  const profile = rawProfile as null | { id: string; user_id: string; role: UserRole; organization_id: string; is_active: boolean; registration_status: RegistrationStatus }
  const access = profile ? getResidentAccess(profile, request.nextUrl.searchParams) : { allowed: false, ownerTestMode: false }
  if (!profile || !access.allowed) return NextResponse.json({ error: 'Approved resident access required.' }, { status: 403 })

  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const incidentId = String(formData.get('incident_id') ?? '').trim()
    if (!(file instanceof File) || !incidentId) return NextResponse.json({ error: 'Missing file or incident.' }, { status: 400 })
    if (file.size < 1 || file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'File must be between 1 byte and 10MB.' }, { status: 400 })
    if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: 'Only supported image and video files can be uploaded.' }, { status: 400 })

    const admin = await createAdminClient()
    const { data: rawIncident } = await admin.from('incidents').select('id, reporter_id, organization_id, is_drill').eq('id', incidentId).eq('organization_id', profile.organization_id).maybeSingle()
    const incident = rawIncident as null | { id: string; reporter_id: string | null; organization_id: string; is_drill: boolean }
    const ownsIncident = incident?.reporter_id === user.id
    const ownsDrill = profile.role === 'super_admin' && access.ownerTestMode && incident?.is_drill
    if (!incident || (!ownsIncident && !ownsDrill)) return NextResponse.json({ error: 'Incident not found.' }, { status: 404 })

    const storagePath = `${profile.organization_id}/${incident.id}/${crypto.randomUUID()}-${safeFileName(file.name)}`
    const bytes = new Uint8Array(await file.arrayBuffer())
    const upload = await admin.storage.from('incident-attachments').upload(storagePath, bytes, { contentType: file.type, upsert: false })
    if (upload.error) throw new Error(upload.error.message)

    const { data: attachment, error: metadataError } = await admin.from('incident_attachments').insert({
      incident_id: incident.id,
      uploaded_by: profile.id,
      file_name: safeFileName(file.name),
      file_url: storagePath,
      file_type: file.type,
      file_size: file.size,
    } as never).select('*').single()
    if (metadataError) {
      await admin.storage.from('incident-attachments').remove([storagePath])
      throw new Error(metadataError.message)
    }

    return NextResponse.json({ success: true, attachment }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Upload failed.' }, { status: 500 })
  }
}

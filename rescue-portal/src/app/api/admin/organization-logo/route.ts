import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

const MAX_LOGO_BYTES = 2 * 1024 * 1024
const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

async function getAdminProfile() {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return null
  const { data } = await client
    .from('user_profiles')
    .select('id, full_name, role, organization_id, is_active')
    .eq('user_id', user.id)
    .single()
  const profile = data as null | { id: string; full_name: string; role: string; organization_id: string; is_active: boolean }
  return profile?.is_active && ['admin', 'super_admin'].includes(profile.role) ? profile : null
}

export async function POST(request: Request) {
  const profile = await getAdminProfile()
  if (!profile) return NextResponse.json({ message: 'Admin access required.' }, { status: 403 })

  const form = await request.formData()
  const file = form.get('logo')
  if (!(file instanceof File)) return NextResponse.json({ message: 'Choose a logo file.' }, { status: 400 })
  const extension = EXTENSIONS[file.type]
  if (!extension) return NextResponse.json({ message: 'Use a PNG, JPEG, or WebP logo.' }, { status: 400 })
  if (file.size <= 0 || file.size > MAX_LOGO_BYTES) return NextResponse.json({ message: 'Logo must be smaller than 2 MB.' }, { status: 400 })

  // The generated schema intentionally keeps legacy tables as Record<string, unknown>.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = await createAdminClient() as any
  const { data: current, error: currentError } = await admin
    .from('organizations')
    .select('logo_url, branding')
    .eq('id', profile.organization_id)
    .single()
  if (currentError || !current) return NextResponse.json({ message: 'Organization settings are unavailable.' }, { status: 404 })

  const path = `${profile.organization_id}/logo-${Date.now()}.${extension}`
  const { error: uploadError } = await admin.storage
    .from('organization-assets')
    .upload(path, new Uint8Array(await file.arrayBuffer()), { contentType: file.type, upsert: false })
  if (uploadError) return NextResponse.json({ message: uploadError.message }, { status: 400 })

  const { data: publicUrl } = admin.storage.from('organization-assets').getPublicUrl(path)
  const branding = { ...(current.branding ?? {}), logo_storage_path: path }
  const { error: updateError } = await admin
    .from('organizations')
    .update({ logo_url: publicUrl.publicUrl, branding, updated_at: new Date().toISOString() })
    .eq('id', profile.organization_id)
  if (updateError) {
    await admin.storage.from('organization-assets').remove([path])
    return NextResponse.json({ message: updateError.message }, { status: 400 })
  }

  const oldPath = typeof current.branding?.logo_storage_path === 'string' ? current.branding.logo_storage_path : null
  if (oldPath && oldPath !== path) await admin.storage.from('organization-assets').remove([oldPath])
  await admin.from('audit_logs').insert({
    actor_id: profile.id,
    actor_name: profile.full_name,
    actor_role: profile.role,
    action: 'update',
    entity_type: 'organization_logo',
    entity_id: profile.organization_id,
    previous_values: { logo_url: current.logo_url },
    new_values: { logo_url: publicUrl.publicUrl },
    organization_id: profile.organization_id,
  })
  return NextResponse.json({ logo_url: publicUrl.publicUrl })
}

export async function DELETE() {
  const profile = await getAdminProfile()
  if (!profile) return NextResponse.json({ message: 'Admin access required.' }, { status: 403 })
  // The generated schema intentionally keeps legacy tables as Record<string, unknown>.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = await createAdminClient() as any
  const { data: current, error: currentError } = await admin
    .from('organizations')
    .select('logo_url, branding')
    .eq('id', profile.organization_id)
    .single()
  if (currentError || !current) return NextResponse.json({ message: 'Organization settings are unavailable.' }, { status: 404 })

  const oldPath = typeof current.branding?.logo_storage_path === 'string' ? current.branding.logo_storage_path : null
  const branding = { ...(current.branding ?? {}) }
  delete branding.logo_storage_path
  const { error } = await admin.from('organizations').update({ logo_url: null, branding, updated_at: new Date().toISOString() }).eq('id', profile.organization_id)
  if (error) return NextResponse.json({ message: error.message }, { status: 400 })
  if (oldPath) await admin.storage.from('organization-assets').remove([oldPath])
  await admin.from('audit_logs').insert({
    actor_id: profile.id,
    actor_name: profile.full_name,
    actor_role: profile.role,
    action: 'update',
    entity_type: 'organization_logo',
    entity_id: profile.organization_id,
    previous_values: { logo_url: current.logo_url },
    new_values: { logo_url: null },
    organization_id: profile.organization_id,
  })
  return NextResponse.json({ logo_url: null })
}

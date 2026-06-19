import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const incidentId = formData.get('incident_id') as string | null

    if (!file || !incidentId) {
      return NextResponse.json({ error: 'Missing file or incident_id' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (10MB max)' }, { status: 400 })
    }

    // TODO: Upload to Supabase Storage and insert into incident_attachments table
    return NextResponse.json({
      success: true,
      message: 'Attachment received',
      fileName: file.name,
      fileSize: file.size,
    })
  } catch {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

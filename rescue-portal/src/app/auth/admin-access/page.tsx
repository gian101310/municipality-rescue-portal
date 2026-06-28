'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'

export default function AdminAccessPage() {
  return <Suspense fallback={<AccessLoading />}><AdminAccessContent /></Suspense>
}

function AdminAccessContent() {
  const [tokenHash] = useState(() => typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('token_hash') ?? '')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!tokenHash) return
    let cancelled = false

    void createClient().auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' }).then(({ error: verifyError }) => {
      if (cancelled) return
      if (verifyError) {
        setError('This one-time Admin Portal link is invalid or has expired. Generate a new link from Super Admin.')
        return
      }
      window.location.replace('/admin')
    })

    return () => { cancelled = true }
  }, [tokenHash])

  if (!tokenHash || error) {
    return (
      <main className="min-h-screen bg-slate-950 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md border-red-900/60 bg-slate-900 text-white">
          <CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-red-400" /> Admin access unavailable</CardTitle></CardHeader>
          <CardContent className="space-y-4"><p className="text-sm text-slate-400">{error ?? 'The one-time Admin Portal token is missing.'}</p><Button render={<Link href="/auth/login" />} className="w-full bg-blue-600 hover:bg-blue-700">Return to login</Button></CardContent>
        </Card>
      </main>
    )
  }

  return <AccessLoading />
}

function AccessLoading() {
  return <main className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300"><div className="text-center"><Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin text-blue-400" /><p>Opening municipality Admin Portal…</p></div></main>
}

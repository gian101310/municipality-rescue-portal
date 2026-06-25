'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Shield, UserPlus, LogIn, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

export default function ScanEntryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const municipality = searchParams.get('municipality') ?? ''
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          // Check role from profile
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('user_id', user.id)
            .single() as { data: { role: string } | null }

          const role = profile?.role ?? 'resident'
          if (['super_admin', 'admin', 'dispatcher', 'staff', 'team_leader', 'responder'].includes(role)) {
            router.replace('/admin')
          } else {
            router.replace('/resident')
          }
          return
        }
      } catch {
        // Not authenticated — show choices
      }
      setChecking(false)
    }
    checkAuth()
  }, [router])

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="text-sm text-slate-400">Checking your account...</span>
        </div>
      </div>
    )
  }

  const registerUrl = municipality
    ? `/auth/register?municipality=${encodeURIComponent(municipality)}`
    : '/auth/register'

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="p-3 bg-red-600/20 rounded-xl">
              <Shield className="w-10 h-10 text-red-500" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">Emergency Rescue Portal</h1>
          <p className="text-slate-400 text-sm">
            Register as a resident or log in to your existing account
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold"
            onClick={() => router.push(registerUrl)}
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Register as New Resident
          </Button>

          <Button
            variant="outline"
            className="w-full h-14 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white text-base font-semibold"
            onClick={() => router.push('/auth/login')}
          >
            <LogIn className="w-5 h-5 mr-2" />
            Log In to Existing Account
          </Button>
        </div>

        <p className="text-center text-xs text-slate-600">
          By registering, you can send emergency SOS alerts directly to your municipality&apos;s rescue dispatch team.
        </p>
      </div>
    </div>
  )
}

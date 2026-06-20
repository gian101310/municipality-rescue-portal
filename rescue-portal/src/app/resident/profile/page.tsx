'use client'

import { useEffect, useState } from 'react'
import { User, Phone, MapPin, Shield, CheckCircle2, Clock, AlertCircle, LogOut, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { RegistrationStatus } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

const STATUS_INFO: Record<RegistrationStatus, { label: string; color: string; icon: React.FC<{ className?: string }> }> = {
  draft: { label: 'Draft', color: 'text-slate-500', icon: Clock },
  submitted: { label: 'Pending Approval', color: 'text-blue-600', icon: Clock },
  under_review: { label: 'Under Review', color: 'text-yellow-600', icon: Clock },
  more_info_required: { label: 'More Info Required', color: 'text-orange-600', icon: AlertCircle },
  approved: { label: 'Verified', color: 'text-green-600', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'text-red-600', icon: AlertCircle },
  suspended: { label: 'Suspended', color: 'text-slate-500', icon: AlertCircle },
}

type ResidentProfile = {
  full_name: string
  email: string
  phone: string | null
  address: string | null
  barangay: string | null
  municipality: string | null
  province: string | null
  registration_status: RegistrationStatus
  verified_at: string | null
  id_type: string | null
  id_number: string | null
  created_at: string | null
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<ResidentProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProfile() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth/login')
          return
        }

        const { data, error } = await supabase
          .from('user_profiles')
          .select('full_name, email, phone, address, barangay, municipality, province, registration_status, verified_at, id_type, id_number, created_at')
          .eq('user_id', user.id)
          .single()

        if (error || !data) {
          toast.error('Could not load profile')
          return
        }

        setProfile(data as unknown as ResidentProfile)
      } catch {
        toast.error('Failed to load profile')
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [router])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    sessionStorage.removeItem('demo_role')
    sessionStorage.removeItem('demo_email')
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="px-4 py-6 text-center text-slate-500">
        <p>Profile not found.</p>
        <Button variant="outline" className="mt-4" onClick={handleLogout}>Sign Out</Button>
      </div>
    )
  }

  const status = profile.registration_status ?? 'submitted'
  const statusInfo = STATUS_INFO[status] ?? STATUS_INFO.submitted

  return (
    <div className="px-4 py-6 space-y-5">
      {/* Profile Header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
          {profile.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-900 truncate">{profile.full_name}</h1>
          <p className="text-slate-500 text-sm">{profile.email}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <statusInfo.icon className={cn('w-3.5 h-3.5', statusInfo.color)} />
            <span className={cn('text-xs font-medium', statusInfo.color)}>{statusInfo.label}</span>
          </div>
        </div>
      </div>

      {/* Verification Status */}
      {status === 'approved' && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-700">Verified Resident</p>
              <p className="text-xs text-green-600">Account verified on {formatDate(profile.verified_at)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {(status === 'submitted' || status === 'under_review') && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-yellow-700">Verification Pending</p>
              <p className="text-xs text-yellow-600">Your account is currently under review.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Personal Info */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <User className="w-4 h-4" /> Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-slate-400">Full Name</p><p className="font-medium text-slate-900">{profile.full_name}</p></div>
            <div><p className="text-xs text-slate-400">Member Since</p><p className="font-medium text-slate-900">{formatDate(profile.created_at)}</p></div>
            <div className="col-span-2"><p className="text-xs text-slate-400">Email</p><p className="font-medium text-slate-900">{profile.email}</p></div>
          </div>
          <Separator />
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-900">{profile.phone || '—'}</span>
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Address
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-1 text-sm">
          <p className="text-slate-900">{profile.address || '—'}</p>
          {(profile.barangay || profile.municipality) && (
            <p className="text-slate-600">
              {[profile.barangay, profile.municipality].filter(Boolean).join(', ')}
            </p>
          )}
          {profile.province && <p className="text-slate-500">{profile.province}</p>}
        </CardContent>
      </Card>

      {/* ID Verification */}
      {(profile.id_type || profile.id_number) && (
        <Card className="border-slate-200">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Shield className="w-4 h-4" /> ID Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">ID Type</p>
                <p className="font-medium text-slate-900">{profile.id_type || '—'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">ID Number</p>
                <p className="font-mono text-slate-900">{profile.id_number || '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Logout */}
      <Button
        variant="outline"
        className="w-full border-red-200 text-red-600 hover:bg-red-50 h-11"
        onClick={handleLogout}
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sign Out
      </Button>
    </div>
  )
}

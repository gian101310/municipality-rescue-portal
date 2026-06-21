'use client'

import { useEffect, useState } from 'react'
import { User, Mail, Shield, Building2, Phone, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

type ProfileData = {
  full_name: string
  email: string
  role: string
  phone: string
  avatar_url: string | null
  organization_name: string | null
}

export default function AdminProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/dashboard', { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to load profile')
        const data = await res.json()
        const p = data.profile as ProfileData | undefined
        if (p) {
          setProfile(p)
          setFullName(p.full_name || '')
          setPhone(p.phone || '')
        }
      } catch {
        toast.error('Unable to load profile')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('user_profiles')
        .update({ full_name: fullName.trim(), phone: phone.trim() })
        .eq('user_id', user.id)

      if (error) throw error
      toast.success('Profile updated')
      setProfile((prev) => prev ? { ...prev, full_name: fullName.trim(), phone: phone.trim() } : prev)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to save profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <User className="w-12 h-12 text-slate-600 mx-auto mb-3 animate-pulse" />
        <h2 className="text-white font-semibold">Loading Profile...</h2>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="p-8 text-center">
        <User className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h2 className="text-white font-semibold">Profile not found</h2>
      </div>
    )
  }

  const initials = profile.full_name
    ? profile.full_name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : 'AD'

  const roleLabel = profile.role === 'super_admin' ? 'Super Admin' : profile.role === 'admin' ? 'Admin' : profile.role === 'staff' ? 'Staff' : profile.role

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">My Profile</h1>
        <p className="text-slate-400 text-sm">Manage your account information</p>
      </div>

      {/* Profile Card */}
      <Card className="bg-slate-900 border-slate-700">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="bg-blue-600 text-white text-xl font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-semibold text-white">{profile.full_name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-blue-600/20 text-blue-300 border border-blue-500/30 text-xs">
                  <Shield className="w-3 h-3 mr-1" />
                  {roleLabel}
                </Badge>
                {profile.organization_name && (
                  <Badge className="bg-slate-700 text-slate-300 border border-slate-600 text-xs">
                    <Building2 className="w-3 h-3 mr-1" />
                    {profile.organization_name}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Form */}
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-sm">Edit Profile</CardTitle>
          <CardDescription className="text-slate-400">Update your name and contact details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Full Name
            </Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Email
            </Label>
            <Input
              value={profile.email}
              disabled
              className="bg-slate-800/50 border-slate-700 text-slate-500 cursor-not-allowed"
            />
            <p className="text-xs text-slate-600">Email cannot be changed here</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Phone
            </Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+63 9XX XXX XXXX"
              className="bg-slate-800 border-slate-600 text-white"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Save className="w-4 h-4 mr-1" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

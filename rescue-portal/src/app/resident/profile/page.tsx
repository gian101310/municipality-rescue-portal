'use client'

import { useState } from 'react'
import { User, Phone, MapPin, Shield, Edit2, CheckCircle2, Clock, AlertCircle, LogOut, UserPlus, Trash2, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { DEMO_RESIDENTS } from '@/lib/demo-data'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { RegistrationStatus } from '@/lib/types'

const currentResident = DEMO_RESIDENTS[0]

const STATUS_INFO: Record<RegistrationStatus, { label: string; color: string; icon: React.FC<{ className?: string }> }> = {
  draft: { label: 'Draft', color: 'text-slate-500', icon: Clock },
  submitted: { label: 'Submitted', color: 'text-blue-600', icon: Clock },
  under_review: { label: 'Under Review', color: 'text-yellow-600', icon: Clock },
  more_info_required: { label: 'More Info Required', color: 'text-orange-600', icon: AlertCircle },
  approved: { label: 'Verified', color: 'text-green-600', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'text-red-600', icon: AlertCircle },
  suspended: { label: 'Suspended', color: 'text-slate-500', icon: AlertCircle },
}

const ID_TYPE_LABELS: Record<string, string> = {
  national_id: 'PhilSys National ID',
  drivers_license: "Driver's License",
  passport: 'Passport',
  philhealth: 'PhilHealth ID',
  sss: 'SSS ID',
  gsis: 'GSIS ID',
  voters_id: "Voter's ID",
  postal_id: 'Postal ID',
  barangay_id: 'Barangay ID',
  senior_citizen_id: 'Senior Citizen ID',
  pwd_id: 'PWD ID',
  other: 'Other Government ID',
}

interface DependentContact {
  id: string
  name: string
  phone: string
  relationship: string
}

const INITIAL_DEPENDENTS: DependentContact[] = [
  { id: 'dep-1', name: 'Maria dela Cruz', phone: '09175551234', relationship: 'Mother' },
  { id: 'dep-2', name: 'Pedro dela Cruz Jr.', phone: '09185559876', relationship: 'Son (Minor)' },
]

export default function ProfilePage() {
  const router = useRouter()
  const resident = currentResident
  const statusInfo = STATUS_INFO[resident.registration_status]
  const [dependents, setDependents] = useState<DependentContact[]>(INITIAL_DEPENDENTS)
  const [showAddDependent, setShowAddDependent] = useState(false)
  const [newDepName, setNewDepName] = useState('')
  const [newDepPhone, setNewDepPhone] = useState('')
  const [newDepRelationship, setNewDepRelationship] = useState('')

  function handleLogout() {
    sessionStorage.removeItem('demo_role')
    sessionStorage.removeItem('demo_email')
    router.push('/auth/login')
  }

  function addDependent() {
    if (!newDepName.trim() || !newDepPhone.trim()) {
      toast.info('Please fill in name and phone number')
      return
    }
    setDependents((prev) => [...prev, {
      id: `dep-${Date.now()}`,
      name: newDepName.trim(),
      phone: newDepPhone.trim(),
      relationship: newDepRelationship.trim() || 'Family',
    }])
    setNewDepName('')
    setNewDepPhone('')
    setNewDepRelationship('')
    setShowAddDependent(false)
    toast.success('Dependent contact added')
  }

  function removeDependent(id: string) {
    setDependents((prev) => prev.filter((d) => d.id !== id))
    toast.success('Contact removed')
  }

  return (
    <div className="px-4 py-6 space-y-5">
      {/* Profile Header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
          {resident.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-900 truncate">{resident.full_name}</h1>
          <p className="text-slate-500 text-sm">{resident.email}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <statusInfo.icon className={cn('w-3.5 h-3.5', statusInfo.color)} />
            <span className={cn('text-xs font-medium', statusInfo.color)}>{statusInfo.label}</span>
          </div>
        </div>
        <Button size="sm" variant="outline" className="border-slate-300 shrink-0" onClick={() => toast.info('Demo: Edit profile')}>
          <Edit2 className="w-4 h-4 mr-1" /> Edit
        </Button>
      </div>

      {/* Verification Status */}
      {resident.registration_status === 'approved' && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-700">Verified Resident</p>
              <p className="text-xs text-green-600">Account verified on {formatDate(resident.verified_at)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {resident.registration_status === 'under_review' && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-yellow-700">Verification Pending</p>
              <p className="text-xs text-yellow-600">Your account is currently under review. This may take 1-3 business days.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {resident.more_info_request && (
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-3 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-orange-700">Additional Information Required</p>
              <p className="text-xs text-orange-600 mt-0.5">{resident.more_info_request}</p>
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
            <div><p className="text-xs text-slate-400">Full Name</p><p className="font-medium text-slate-900">{resident.full_name}</p></div>
            <div><p className="text-xs text-slate-400">Date of Birth</p><p className="font-medium text-slate-900">{formatDate(resident.date_of_birth)}</p></div>
            <div className="col-span-2"><p className="text-xs text-slate-400">Email</p><p className="font-medium text-slate-900">{resident.email}</p></div>
          </div>
          <Separator />
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-900">{resident.phone || '—'}</span>
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
          <p className="text-slate-900">{resident.address}</p>
          <p className="text-slate-600">Brgy. {resident.barangay}, {resident.municipality}</p>
          <p className="text-slate-500">{resident.province}</p>
        </CardContent>
      </Card>

      {/* ID Verification */}
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
              <p className="font-medium text-slate-900">{resident.id_type ? ID_TYPE_LABELS[resident.id_type] : '—'}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">ID Number</p>
              <p className="font-mono text-slate-900">{resident.id_number || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <statusInfo.icon className={cn('w-4 h-4 shrink-0', statusInfo.color)} />
            <span className={cn('text-sm font-medium', statusInfo.color)}>{statusInfo.label}</span>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Contact */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Phone className="w-4 h-4" /> Emergency Contact
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-1 text-sm">
          <p className="font-medium text-slate-900">{resident.emergency_contact_name || '—'}</p>
          <p className="text-slate-600">{resident.emergency_contact_relationship}</p>
          <a href={`tel:${resident.emergency_contact_phone}`} className="text-blue-600 font-medium">
            {resident.emergency_contact_phone || '—'}
          </a>
        </CardContent>
      </Card>

      {/* Dependent / Household Contacts */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Users className="w-4 h-4" /> Dependent & Household Contacts
            </CardTitle>
            <Button size="sm" variant="outline" className="h-7 text-xs border-slate-300" onClick={() => setShowAddDependent(true)}>
              <UserPlus className="w-3.5 h-3.5 mr-1" /> Add
            </Button>
          </div>
          <p className="text-xs text-slate-400 mt-1">People in your household who may need rescue assistance. Their info is shared with responders during emergencies.</p>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {dependents.length === 0 && !showAddDependent && (
            <p className="text-sm text-slate-400 text-center py-3">No dependent contacts added yet.</p>
          )}
          {dependents.map((dep) => (
            <div key={dep.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div>
                <p className="font-medium text-slate-900 text-sm">{dep.name}</p>
                <p className="text-xs text-slate-500">{dep.relationship}</p>
                <a href={`tel:${dep.phone}`} className="text-xs text-blue-600 font-medium">{dep.phone}</a>
              </div>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-red-500" onClick={() => removeDependent(dep.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
          {showAddDependent && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-slate-700 text-xs">Full Name *</Label>
                <Input value={newDepName} onChange={(e) => setNewDepName(e.target.value)} placeholder="Dependent's full name" className="h-9 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-slate-700 text-xs">Phone *</Label>
                  <Input value={newDepPhone} onChange={(e) => setNewDepPhone(e.target.value)} placeholder="09171234567" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-700 text-xs">Relationship</Label>
                  <Input value={newDepRelationship} onChange={(e) => setNewDepRelationship(e.target.value)} placeholder="e.g. Child, Parent" className="h-9 text-sm" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs" onClick={addDependent}>
                  <UserPlus className="w-3.5 h-3.5 mr-1" /> Add Contact
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs text-slate-500" onClick={() => setShowAddDependent(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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

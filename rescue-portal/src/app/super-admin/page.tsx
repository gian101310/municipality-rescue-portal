'use client'

import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  Shield, Building2, Plus, Search,
  Lock, Eye, EyeOff, CheckCircle2, XCircle, Clock, LogOut, Loader2, X, KeyRound, UserX, ExternalLink, Trash2, LogIn, Pencil
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PH_LOCALITIES, PH_PROVINCES, getLocalityLabel } from '@/lib/philippines-geography'

type TenantPlan = 'starter' | 'professional' | 'enterprise' | 'one_time'
type TenantStatus = 'trial' | 'active' | 'suspended' | 'cancelled'

interface Tenant {
  id: string
  name: string
  slug: string
  province: string
  region: string
  municipality: string
  plan: TenantPlan
  status: TenantStatus
  contact_email: string
  emergency_hotline: string
  admin_email: string
  admin_full_name: string
  admin_user_id: string | null
  master_key_configured: boolean
  created_at: string
}

type TenantForm = {
  name: string
  slug: string
  contactEmail: string
  emergencyHotline: string
  adminFullName: string
  adminEmail: string
  adminPassword: string
  masterKey: string
  provinceCode: string
  municipalityCode: string
  plan: TenantPlan
  status: TenantStatus
}

const initialTenantForm: TenantForm = {
  name: '',
  slug: '',
  contactEmail: '',
  emergencyHotline: '911',
  adminFullName: '',
  adminEmail: '',
  adminPassword: '',
  masterKey: '',
  provinceCode: '',
  municipalityCode: '',
  plan: 'starter',
  status: 'trial',
}

const statusConfig = {
  trial: { label: 'Trial', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Clock },
  active: { label: 'Active', color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: CheckCircle2 },
  suspended: { label: 'Suspended', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20', icon: XCircle },
}

const planColors = {
  starter: 'bg-slate-700 text-slate-300',
  professional: 'bg-blue-600/20 text-blue-400',
  enterprise: 'bg-purple-600/20 text-purple-400',
  one_time: 'bg-amber-600/20 text-amber-400',
}

export default function SuperAdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [userName, setUserName] = useState('')
  const [search, setSearch] = useState('')
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null)
  const [tenantForm, setTenantForm] = useState<TenantForm>(initialTenantForm)
  const [tenantSaving, setTenantSaving] = useState(false)
  const [showAdminPassword, setShowAdminPassword] = useState(false)
  const [showMasterKey, setShowMasterKey] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadTenants = useCallback(async () => {
    const response = await fetch('/api/super-admin/tenants', { cache: 'no-store' })
    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(payload?.message ?? 'Unable to load tenants.')
    }

    setTenants(Array.isArray(payload.tenants) ? payload.tenants : [])
  }, [])

  const checkAuth = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      toast.error('Please sign in first')
      router.push('/auth/login')
      return
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, full_name')
      .eq('user_id', user.id)
      .single() as { data: { role: string; full_name: string } | null }

    if (profile?.role !== 'super_admin') {
      toast.error('Access denied. Super Admin only.')
      router.push('/')
      return
    }

    setUserName(profile.full_name || user.email || 'Admin')
    setAuthorized(true)

    try {
      await loadTenants()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load tenants.')
    }

    setLoading(false)
  }, [loadTenants, router])

  useEffect(() => {
    const id = window.setTimeout(() => {
      void checkAuth()
    }, 0)

    return () => window.clearTimeout(id)
  }, [checkAuth])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Signed out')
    router.push('/')
  }

  function updateTenantForm<K extends keyof TenantForm>(key: K, value: TenantForm[K]) {
    setTenantForm((current) => {
      const next = { ...current, [key]: value }

      if (key === 'provinceCode') {
        next.municipalityCode = ''
      }

      if (key === 'municipalityCode') {
        const locality = PH_LOCALITIES.find((item) => item.code === value)
        const province = PH_PROVINCES.find((item) => item.code === locality?.provinceCode)

        if (!current.name && locality) {
          next.name = `${locality.type === 'city' ? 'City' : 'Municipality'} of ${locality.name} Emergency Rescue Portal`
        }

        if (!current.slug && locality) {
          next.slug = [locality.name, province?.name]
            .filter(Boolean)
            .join('-')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
        }
      }

      return next
    })
  }

  function replaceTenant(updatedTenant: Tenant) {
    setTenants((current) => current.map((tenant) => (
      tenant.id === updatedTenant.id ? updatedTenant : tenant
    )))
  }

  function openTenantEditor(tenant: Tenant) {
    const province = PH_PROVINCES.find((item) => item.name === tenant.province)
    const locality = PH_LOCALITIES.find((item) => (
      item.name === tenant.municipality && (!province || item.provinceCode === province.code)
    )) ?? PH_LOCALITIES.find((item) => item.name === tenant.municipality)

    setTenantForm({
      name: tenant.name,
      slug: tenant.slug,
      contactEmail: tenant.contact_email,
      emergencyHotline: tenant.emergency_hotline,
      adminFullName: tenant.admin_full_name,
      adminEmail: tenant.admin_email,
      adminPassword: '',
      masterKey: '',
      provinceCode: province?.code ?? locality?.provinceCode ?? '',
      municipalityCode: locality?.code ?? '',
      plan: tenant.plan,
      status: tenant.status,
    })
    setEditingTenant(tenant)
  }

  function closeTenantDialog() {
    setAddOpen(false)
    setEditingTenant(null)
    setTenantForm(initialTenantForm)
  }

  async function patchTenant(tenant: Tenant, body: Record<string, unknown>, successMessage: string) {
    setActionLoading(`${tenant.id}:${String(body.action)}`)
    try {
      const response = await fetch('/api/super-admin/tenants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: tenant.id, ...body }),
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload?.message ?? 'Unable to update client municipality.')
      }

      if (payload.tenant) replaceTenant(payload.tenant as Tenant)
      toast.success(successMessage)
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update client municipality.')
      return false
    } finally {
      setActionLoading(null)
    }
  }

  async function handleTenantAction(tenant: Tenant, action: 'enable' | 'disable' | 'kick' | 'change_password' | 'rotate_secret' | 'delete') {
    if (action === 'delete') {
      if (!window.confirm(`PERMANENTLY DELETE ${tenant.name}? This will remove all users, data, and configuration. This cannot be undone.`)) {
        return
      }
      setActionLoading(`${tenant.id}:delete`)
      try {
        const response = await fetch('/api/super-admin/tenants', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId: tenant.id }),
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload?.message ?? 'Unable to delete tenant.')
        setTenants((current) => current.filter((t) => t.id !== tenant.id))
        toast.success(`${tenant.name} permanently deleted`)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Unable to delete tenant.')
      } finally {
        setActionLoading(null)
      }
      return
    }

    if (action === 'change_password') {
      const password = window.prompt(`New temporary password for ${tenant.admin_email || tenant.name}`)
      if (!password) return
      await patchTenant(tenant, { action, adminUserId: tenant.admin_user_id, password }, 'Municipality admin password changed')
      return
    }

    if (action === 'rotate_secret') {
      const secretKey = window.prompt(`New settings secret key for ${tenant.name}`)
      if (!secretKey) return
      await patchTenant(tenant, { action, secretKey }, 'Settings secret key updated')
      return
    }

    if (action === 'kick' && !window.confirm(`Kick all users for ${tenant.name} for 15 minutes?`)) {
      return
    }

    if (action === 'disable' && !window.confirm(`Disable ${tenant.name}? Users under this municipality will not be able to sign in.`)) {
      return
    }

    await patchTenant(
      tenant,
      { action },
      action === 'enable'
        ? 'Client municipality enabled'
        : action === 'disable'
        ? 'Client municipality disabled'
        : 'Client users kicked for 15 minutes'
    )
  }

  async function handleLoginAsAdmin(tenant: Tenant) {
    if (!tenant.admin_user_id) {
      toast.error('No admin account configured for this tenant.')
      return
    }

    setActionLoading(`${tenant.id}:login`)
    try {
      const response = await fetch('/api/super-admin/login-as-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: tenant.id }),
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload?.message ?? 'Unable to generate admin login.')
      }

      if (payload.loginUrl) {
        // Open in new tab so the super admin session is preserved
        window.open(payload.loginUrl, '_blank')
        toast.success(`Opening admin dashboard for ${tenant.name}`)
      } else {
        toast.error('No login URL received.')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to login as admin.')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleCreateTenant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!tenantForm.municipalityCode) {
      toast.error('Choose the tenant municipality first.')
      return
    }

    if (!tenantForm.adminEmail.trim() || !tenantForm.adminPassword) {
      toast.error('Enter the municipality admin email and temporary password.')
      return
    }

    setTenantSaving(true)
    try {
      const response = await fetch('/api/super-admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tenantForm),
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload?.message ?? 'Unable to create tenant.')
      }

      setTenants((current) => [payload.tenant as Tenant, ...current])
      setTenantForm(initialTenantForm)
      setAddOpen(false)

      if (payload.master_key) {
        toast.success(
          `Client created! Settings Secret Key: ${payload.master_key} - save this now, it cannot be shown again.`,
          { duration: 30000 }
        )
      } else {
        toast.success('Client municipality created')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create tenant.')
    } finally {
      setTenantSaving(false)
    }
  }

  async function handleEditTenant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!editingTenant) return
    if (!tenantForm.municipalityCode) {
      toast.error('Choose the tenant municipality first.')
      return
    }

    setTenantSaving(true)
    try {
      const saved = await patchTenant(editingTenant, {
        action: 'edit',
        name: tenantForm.name,
        slug: tenantForm.slug,
        contactEmail: tenantForm.contactEmail,
        emergencyHotline: tenantForm.emergencyHotline,
        adminFullName: tenantForm.adminFullName,
        adminEmail: tenantForm.adminEmail,
        provinceCode: tenantForm.provinceCode,
        municipalityCode: tenantForm.municipalityCode,
        plan: tenantForm.plan,
        status: tenantForm.status,
      }, 'Client municipality updated')

      if (saved) closeTenantDialog()
    } finally {
      setTenantSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
          <p className="text-slate-400 text-sm">Verifying super admin access...</p>
        </div>
      </div>
    )
  }

  if (!authorized) return null

  const filtered = tenants.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.province.toLowerCase().includes(search.toLowerCase()) ||
    t.slug.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total: tenants.length,
    active: tenants.filter((t) => t.status === 'active').length,
    trial: tenants.filter((t) => t.status === 'trial').length,
    suspended: tenants.filter((t) => t.status === 'suspended').length,
  }

  const localitiesForSelectedProvince = PH_LOCALITIES.filter((locality) => (
    tenantForm.provinceCode
      ? locality.provinceCode === tenantForm.provinceCode
      : locality.provinceCode === null
  ))

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Platform Admin</h1>
              <p className="text-xs text-slate-500">Welcome, {userName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800 px-2.5 sm:px-3" render={<Link href="/" />}>
              <ExternalLink className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">View Landing Page</span>
            </Button>
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white px-2.5 sm:px-3" onClick={() => {
              setTenantForm(initialTenantForm)
              setEditingTenant(null)
              setAddOpen(true)
            }}>
              <Plus className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Add Client</span>
            </Button>
            <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white px-2.5 sm:px-3" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-white">Portal Testing</p>
              <p className="text-sm text-slate-400">Open either portal with your owner account. Resident reports are marked as drills.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="border-slate-600 text-slate-200 hover:bg-slate-800" render={<Link href="/admin" />}>
                Open Admin Portal
              </Button>
              <Button className="bg-amber-600 hover:bg-amber-700" render={<Link href="/resident?owner-test-mode=1" />}>
                Open Resident Test Portal
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Client Municipalities', value: stats.total, color: 'text-white' },
            { label: 'Active', value: stats.active, color: 'text-green-400' },
            { label: 'On Trial', value: stats.trial, color: 'text-blue-400' },
            { label: 'Suspended', value: stats.suspended, color: 'text-red-400' },
          ].map(({ label, value, color }) => (
            <Card key={label} className="bg-slate-900 border-slate-800">
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-black ${color}`}>{value}</p>
                <p className="text-xs text-slate-500 mt-1">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients by name, province, or slug..."
              className="pl-10 bg-slate-900 border-slate-700 text-white"
            />
          </div>
        </div>

        {/* Tenants Table (desktop/tablet) */}
        <Card className="bg-slate-900 border-slate-800 overflow-hidden hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left">
                  <th className="px-4 py-3 text-slate-400 font-medium">Municipality</th>
                  <th className="px-4 py-3 text-slate-400 font-medium">Province Lock</th>
                  <th className="px-4 py-3 text-slate-400 font-medium">Admin Login</th>
                  <th className="px-4 py-3 text-slate-400 font-medium">Plan</th>
                  <th className="px-4 py-3 text-slate-400 font-medium">Status</th>
                  <th className="px-4 py-3 text-slate-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tenant) => {
                  const st = statusConfig[tenant.status]
                  const StIcon = st.icon
                  return (
                    <tr key={tenant.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">{tenant.name}</p>
                            <p className="text-xs text-slate-500">{tenant.slug}.emergencyrescueportal.ph · {tenant.contact_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-amber-500" />
                          <div>
                            <p className="text-white text-xs font-medium">{tenant.municipality}, {tenant.province}</p>
                            <p className="text-slate-500 text-xs">{tenant.region}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-white text-xs font-medium">{tenant.admin_email || 'No admin account'}</p>
                          <p className="text-slate-500 text-xs">{tenant.master_key_configured ? 'Secret key configured' : 'No secret key'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${planColors[tenant.plan]}`}>
                          {tenant.plan === 'one_time' ? 'One-Time' : tenant.plan.charAt(0).toUpperCase() + tenant.plan.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${st.color}`}>
                          <StIcon className="w-3 h-3" />
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="text-amber-300 hover:text-amber-200 h-8 w-8 p-0" title="Edit client municipality" disabled={Boolean(actionLoading)} onClick={() => openTenantEditor(tenant)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-emerald-400 hover:text-emerald-300 h-8 w-8 p-0" title="Login as this tenant's admin" disabled={Boolean(actionLoading) || !tenant.admin_user_id} onClick={() => handleLoginAsAdmin(tenant)}>
                            <LogIn className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white h-8 w-8 p-0" title="View client" onClick={() => toast.info(`Viewing ${tenant.name}`)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          {tenant.status === 'active' ? (
                            <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 h-8 w-8 p-0" title="Disable client" disabled={Boolean(actionLoading)} onClick={() => handleTenantAction(tenant, 'disable')}>
                              <XCircle className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" className="text-green-400 hover:text-green-300 h-8 w-8 p-0" title="Enable client" disabled={Boolean(actionLoading)} onClick={() => handleTenantAction(tenant, 'enable')}>
                              <CheckCircle2 className="w-4 h-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" className="text-orange-300 hover:text-orange-200 h-8 w-8 p-0" title="Kick all users" disabled={Boolean(actionLoading)} onClick={() => handleTenantAction(tenant, 'kick')}>
                            <UserX className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-blue-300 hover:text-blue-200 h-8 w-8 p-0" title="Change admin password" disabled={Boolean(actionLoading) || !tenant.admin_user_id} onClick={() => handleTenantAction(tenant, 'change_password')}>
                            <Lock className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-amber-300 hover:text-amber-200 h-8 w-8 p-0" title="Set settings secret key" disabled={Boolean(actionLoading)} onClick={() => handleTenantAction(tenant, 'rotate_secret')}>
                            <KeyRound className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-400 h-8 w-8 p-0" title="Delete client permanently" disabled={Boolean(actionLoading)} onClick={() => handleTenantAction(tenant, 'delete')}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-500">
                      {tenants.length === 0 ? 'No clients yet. Add your first municipality!' : 'No clients found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Tenants Cards (mobile) */}
        <div className="md:hidden space-y-3">
          {filtered.map((tenant) => {
            const st = statusConfig[tenant.status]
            const StIcon = st.icon
            return (
              <Card key={tenant.id} className="bg-slate-900 border-slate-800">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-medium leading-tight">{tenant.name}</p>
                      <p className="text-xs text-slate-500 break-all">{tenant.slug}.emergencyrescueportal.ph</p>
                      <p className="text-xs text-slate-500 break-all">{tenant.contact_email}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-white text-xs font-medium">{tenant.municipality}, {tenant.province}</p>
                      <p className="text-slate-500 text-xs">{tenant.region}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-white text-xs font-medium">{tenant.admin_email || 'No admin account'}</p>
                    <p className="text-slate-500 text-xs">{tenant.master_key_configured ? 'Secret key configured' : 'No secret key'}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${planColors[tenant.plan]}`}>
                      {tenant.plan === 'one_time' ? 'One-Time' : tenant.plan.charAt(0).toUpperCase() + tenant.plan.slice(1)}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${st.color}`}>
                      <StIcon className="w-3 h-3" />
                      {st.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 border-t border-slate-800 pt-3">
                    <Button variant="ghost" size="sm" className="text-amber-300 hover:text-amber-200 h-8 w-8 p-0" title="Edit client municipality" disabled={Boolean(actionLoading)} onClick={() => openTenantEditor(tenant)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-emerald-400 hover:text-emerald-300 h-8 w-8 p-0" title="Login as this tenant's admin" disabled={Boolean(actionLoading) || !tenant.admin_user_id} onClick={() => handleLoginAsAdmin(tenant)}>
                      <LogIn className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white h-8 w-8 p-0" title="View client" onClick={() => toast.info(`Viewing ${tenant.name}`)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    {tenant.status === 'active' ? (
                      <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 h-8 w-8 p-0" title="Disable client" disabled={Boolean(actionLoading)} onClick={() => handleTenantAction(tenant, 'disable')}>
                        <XCircle className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" className="text-green-400 hover:text-green-300 h-8 w-8 p-0" title="Enable client" disabled={Boolean(actionLoading)} onClick={() => handleTenantAction(tenant, 'enable')}>
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="text-orange-300 hover:text-orange-200 h-8 w-8 p-0" title="Kick all users" disabled={Boolean(actionLoading)} onClick={() => handleTenantAction(tenant, 'kick')}>
                      <UserX className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-blue-300 hover:text-blue-200 h-8 w-8 p-0" title="Change admin password" disabled={Boolean(actionLoading) || !tenant.admin_user_id} onClick={() => handleTenantAction(tenant, 'change_password')}>
                      <Lock className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-amber-300 hover:text-amber-200 h-8 w-8 p-0" title="Set settings secret key" disabled={Boolean(actionLoading)} onClick={() => handleTenantAction(tenant, 'rotate_secret')}>
                      <KeyRound className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-400 h-8 w-8 p-0" title="Delete client permanently" disabled={Boolean(actionLoading)} onClick={() => handleTenantAction(tenant, 'delete')}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          {filtered.length === 0 && (
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-6 text-center text-slate-500 text-sm">
                {tenants.length === 0 ? 'No clients yet. Add your first municipality!' : 'No clients found'}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Security Info */}
        <Card className="bg-amber-950/20 border-amber-800/30">
          <CardContent className="p-4 flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-amber-300 font-semibold text-sm">Coverage Lock Security</p>
              <p className="text-amber-400/70 text-xs mt-1 leading-relaxed">
                Province and municipality assignments are protected by a database-level trigger.
                Only the platform owner can modify these fields. Municipality admins cannot see
                or change their location lock.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {(addOpen || editingTenant) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 p-5">
              <div>
                <h2 className="text-lg font-bold text-white">{editingTenant ? 'Edit Client Municipality' : 'Add Client Municipality'}</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {editingTenant ? 'Update the client settings and municipality admin details.' : 'Create a locked municipality account for an authorized client.'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeTenantDialog}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Close tenant form"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={editingTenant ? handleEditTenant : handleCreateTenant} className="space-y-4 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="tenant-province" className="text-slate-300">Province</Label>
                  <select
                    id="tenant-province"
                    value={tenantForm.provinceCode}
                    onChange={(event) => updateTenantForm('provinceCode', event.target.value)}
                    className="h-10 w-full rounded-md border border-slate-600 bg-slate-800 px-3 text-sm text-white outline-none focus:border-amber-500"
                  >
                    <option value="">Province-independent city...</option>
                    {PH_PROVINCES.map((province) => (
                      <option key={province.code} value={province.code}>{province.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tenant-municipality" className="text-slate-300">City / Municipality</Label>
                  <select
                    id="tenant-municipality"
                    value={tenantForm.municipalityCode}
                    onChange={(event) => updateTenantForm('municipalityCode', event.target.value)}
                    className="h-10 w-full rounded-md border border-slate-600 bg-slate-800 px-3 text-sm text-white outline-none focus:border-amber-500"
                  >
                    <option value="">Choose city or municipality...</option>
                    {localitiesForSelectedProvince.map((locality) => (
                        <option key={locality.code} value={locality.code}>{getLocalityLabel(locality)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="tenant-name" className="text-slate-300">Client Name</Label>
                  <Input
                    id="tenant-name"
                    value={tenantForm.name}
                    onChange={(event) => updateTenantForm('name', event.target.value)}
                    placeholder="Municipality of Ramon Emergency Rescue Portal"
                    className="bg-slate-800 border-slate-600 text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tenant-slug" className="text-slate-300">Slug</Label>
                  <Input
                    id="tenant-slug"
                    value={tenantForm.slug}
                    onChange={(event) => updateTenantForm('slug', event.target.value)}
                    placeholder="ramon-isabela"
                    className="bg-slate-800 border-slate-600 text-white"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="tenant-email" className="text-slate-300">Contact Email</Label>
                  <Input
                    id="tenant-email"
                    type="email"
                    value={tenantForm.contactEmail}
                    onChange={(event) => updateTenantForm('contactEmail', event.target.value)}
                    placeholder="mdrrmo@municipality.gov.ph"
                    className="bg-slate-800 border-slate-600 text-white"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-amber-700/30 bg-amber-950/10 p-4">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-amber-200">Municipality Admin Login</h3>
                  <p className="mt-1 text-xs text-amber-200/70">
                    {editingTenant ? 'Update the primary municipality admin contact.' : 'This creates the first admin account for the client municipality.'}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="tenant-admin-name" className="text-slate-300">Admin Full Name</Label>
                    <Input
                      id="tenant-admin-name"
                      value={tenantForm.adminFullName}
                      onChange={(event) => updateTenantForm('adminFullName', event.target.value)}
                      placeholder="Municipality Admin"
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="tenant-admin-email" className="text-slate-300">Admin Email *</Label>
                    <Input
                      id="tenant-admin-email"
                      type="email"
                      value={tenantForm.adminEmail}
                      onChange={(event) => updateTenantForm('adminEmail', event.target.value)}
                      placeholder="admin@municipality.gov.ph"
                      className="bg-slate-800 border-slate-600 text-white"
                      required
                    />
                  </div>
                </div>

                {!editingTenant && (
                  <>
                <div className="space-y-1.5">
                  <Label htmlFor="tenant-admin-password" className="text-slate-300">Temporary Password *</Label>
                  <div className="relative">
                    <Input
                      id="tenant-admin-password"
                      type={showAdminPassword ? 'text' : 'password'}
                      value={tenantForm.adminPassword}
                      onChange={(event) => updateTenantForm('adminPassword', event.target.value)}
                      placeholder="At least 8 chars, upper/lower/number/symbol"
                      className="bg-slate-800 border-slate-600 text-white pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword((current) => !current)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      aria-label={showAdminPassword ? 'Hide password' : 'Show password'}
                    >
                      {showAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    Give this temporary password only to the authorized municipality admin.
                  </p>
                </div>

                <div className="space-y-1.5 mt-4">
                  <Label htmlFor="tenant-master-key" className="text-slate-300">Settings Secret Key</Label>
                  <div className="relative">
                    <Input
                      id="tenant-master-key"
                      type={showMasterKey ? 'text' : 'password'}
                      value={tenantForm.masterKey}
                      onChange={(event) => updateTenantForm('masterKey', event.target.value)}
                      placeholder="Optional custom key, otherwise auto-generated"
                      className="bg-slate-800 border-slate-600 text-white pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowMasterKey((current) => !current)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      aria-label={showMasterKey ? 'Hide secret key' : 'Show secret key'}
                    >
                      {showMasterKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    This unlocks admin settings editing. Coverage remains hidden from municipality admins.
                  </p>
                </div>
                  </>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tenant-hotline" className="text-slate-300">Emergency Hotline</Label>
                <Input
                  id="tenant-hotline"
                  value={tenantForm.emergencyHotline}
                  onChange={(event) => updateTenantForm('emergencyHotline', event.target.value)}
                  placeholder="911"
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="tenant-plan" className="text-slate-300">Plan</Label>
                  <select
                    id="tenant-plan"
                    value={tenantForm.plan}
                    onChange={(event) => updateTenantForm('plan', event.target.value as TenantPlan)}
                    className="h-10 w-full rounded-md border border-slate-600 bg-slate-800 px-3 text-sm text-white outline-none focus:border-amber-500"
                  >
                    <option value="starter">Starter</option>
                    <option value="professional">Professional</option>
                    <option value="enterprise">Enterprise</option>
                    <option value="one_time">One-Time</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tenant-status" className="text-slate-300">Status</Label>
                  <select
                    id="tenant-status"
                    value={tenantForm.status}
                    onChange={(event) => updateTenantForm('status', event.target.value as TenantStatus)}
                    className="h-10 w-full rounded-md border border-slate-600 bg-slate-800 px-3 text-sm text-white outline-none focus:border-amber-500"
                  >
                    <option value="trial">Trial</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
                <Button type="button" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800" onClick={closeTenantDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={tenantSaving} className="bg-amber-600 hover:bg-amber-700 text-white">
                  {tenantSaving ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {editingTenant ? 'Saving...' : 'Creating...'}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {editingTenant ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      {editingTenant ? 'Save Changes' : 'Create Client'}
                    </span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

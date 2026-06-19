'use client'

import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  Shield, Building2, Plus, Search,
  Lock, Eye, EyeOff, CheckCircle2, XCircle, Clock, LogOut, Loader2, X, KeyRound, UserX, ExternalLink, Trash2, LogIn
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
  admin_email: string
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update client municipality.')
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
    t.name.toLowerCase().
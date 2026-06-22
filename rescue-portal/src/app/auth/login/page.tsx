'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Shield, Eye, EyeOff, ArrowLeft, LogIn, QrCode, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { RegistrationStatus, UserRole } from '@/lib/types'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><p className="text-slate-400">Loading...</p></div>}>
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect')
  const isResidentReturn = searchParams.get('role') === 'resident'
  const [activeTab, setActiveTab] = useState<'resident' | 'staff'>(isResidentReturn ? 'resident' : 'staff')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginForm) {
    setLoading(true)
    try {
      const supabase = createClient()

      // Sign in with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (authError) {
        toast.error(authError.message)
        return
      }

      if (!authData.user) {
        toast.error('Login failed. Please try again.')
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role, is_active, registration_status')
        .eq('user_id', authData.user.id)
        .single() as {
          data: { role: UserRole; is_active: boolean; registration_status: RegistrationStatus | null } | null
          error: { message?: string } | null
        }

      if (profileError || !profile) {
        await supabase.auth.signOut()
        toast.error('No Emergency Rescue Portal profile was found for this account.')
        return
      }

      const registrationStatus = profile.registration_status ?? 'submitted'

      if (!profile.is_active || registrationStatus === 'suspended') {
        await supabase.auth.signOut()
        toast.error('This account is suspended. Please contact your administrator.')
        return
      }

      if (registrationStatus !== 'approved') {
        await supabase.auth.signOut()
        if (registrationStatus === 'rejected') {
          toast.error('This account was rejected. Please contact the local emergency response administrator.')
        } else {
          toast.error('Your account is still pending approval. Please wait for the administrator to approve it before logging in.')
        }
        return
      }

      const validPrefixes = ['/admin', '/super-admin', '/resident', '/dispatch', '/rescue-team', '/staff-portal', '/responder']
      if (redirectTo && validPrefixes.some(p => redirectTo.startsWith(p))) {
        toast.success('Signed in successfully')
        router.push(redirectTo)
      } else if (profile.role === 'super_admin') {
        toast.success('Welcome back, Boss!')
        router.push('/super-admin')
      } else if (profile.role === 'resident') {
        toast.success('Signed in successfully')
        router.push('/resident')
      } else if (profile.role === 'dispatcher') {
        toast.success('Signed in as Dispatch Ops')
        router.push('/dispatch')
      } else if (profile.role === 'responder' || profile.role === 'team_leader') {
        toast.success('Signed in as Rescue Team')
        router.push('/rescue-team')
      } else if (profile.role === 'staff') {
        toast.success('Signed in as Staff')
        router.push('/staff-portal')
      } else {
        toast.success('Signed in successfully')
        router.push('/admin')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Back */}
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>

          <Card className="bg-slate-900 border-slate-700 shadow-2xl">
            <CardHeader className="text-center pb-4">
              <div className="flex items-center justify-center mb-3">
                <div className="w-12 h-12 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-red-400" />
                </div>
              </div>
              <CardTitle className="text-white text-2xl">Municipality Login</CardTitle>
              <CardDescription className="text-slate-400">For authorized staff, dispatchers, and administrators</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'resident' | 'staff')}>
                <TabsList className="w-full bg-slate-800 border border-slate-700">
                  <TabsTrigger value="staff" className="flex-1 data-[active]:bg-slate-700 data-[active]:text-white text-slate-400">
                    Staff / Admin
                  </TabsTrigger>
                  <TabsTrigger value="resident" className="flex-1 data-[active]:bg-slate-700 data-[active]:text-white text-slate-400">
                    Resident
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {activeTab === 'staff' && (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-slate-300">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@municipality.gov.ph"
                      className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                      {...register('email')}
                    />
                    {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-slate-300">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 pr-10"
                        {...register('password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
                  </div>

                  <div className="flex justify-end">
                    <Link href="/auth/forgot-password" className="text-sm text-blue-400 hover:text-blue-300 underline">
                      Forgot password?
                    </Link>
                  </div>

                  <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white" disabled={loading}>
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Signing in...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <LogIn className="w-4 h-4" />
                        Sign In
                      </span>
                    )}
                  </Button>
                </form>
              )}

              {activeTab === 'resident' && (
                <div className="space-y-4">
                  {isResidentReturn ? (
                    /* Returning resident after registration — show login form */
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                      <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-3">
                        <p className="text-xs font-semibold text-green-300">Registration submitted — sign in below once approved.</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-slate-300">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="your@email.com"
                          className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                          {...register('email')}
                        />
                        {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="password" className="text-slate-300">Password</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 pr-10"
                            {...register('password')}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
                      </div>
                      <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white" disabled={loading}>
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Signing in...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <LogIn className="w-4 h-4" />
                            Resident Sign In
                          </span>
                        )}
                      </Button>
                    </form>
                  ) : (
                    /* First-time visitor — show QR code instructions */
                    <div className="space-y-4 py-2">
                      <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-center">
                        <QrCode className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                        <h3 className="text-sm font-bold text-amber-200">Resident registration is through your municipality</h3>
                        <p className="mt-2 text-xs text-amber-100/70 leading-relaxed">
                          To register or sign in as a resident, scan the official QR code provided by your municipal hall,
                          barangay office, or local MDRRMO. Each municipality has a unique link that connects you to the correct rescue portal.
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                        <div className="flex items-start gap-3">
                          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                          <div className="text-xs text-slate-400 leading-relaxed">
                            <p className="font-semibold text-slate-300 mb-1">Where to get the QR code:</p>
                            <p>Visit your municipal hall, barangay office, or contact your local DRRMO.
                            The QR code will take you directly to your municipality&apos;s registration form with the location already set.</p>
                          </div>
                        </div>
                      </div>
                      <p className="text-center text-xs text-slate-500">
                        Already registered and approved? Switch to the <button onClick={() => setActiveTab('staff')} className="text-blue-400 underline">Staff / Admin</button> tab — the same login form works for all approved accounts.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

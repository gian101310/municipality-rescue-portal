'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Shield, Eye, EyeOff, ArrowLeft, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

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
  const defaultRole = searchParams.get('role') === 'resident' ? 'resident' : 'staff'
  const [activeTab, setActiveTab] = useState<'resident' | 'staff'>(defaultRole as 'resident' | 'staff')
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

      // Fetch profile to determine role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, platform_role')
        .eq('id', authData.user.id)
        .single() as { data: { role: string; platform_role: string } | null }

      const platformRole = profile?.platform_role
      const userRole = profile?.role

      // Route based on role
      if (platformRole === 'super_admin') {
        toast.success('Welcome back, Boss!')
        router.push('/super-admin')
      } else if (userRole === 'admin' || platformRole === 'tenant_admin') {
        toast.success('Signed in as Admin')
        router.push('/admin')
      } else {
        toast.success('Signed in successfully')
        router.push('/resident')
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
              <CardTitle className="text-white text-2xl">Welcome back</CardTitle>
              <CardDescription className="text-slate-400">Sign in to RescuePortal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'resident' | 'staff')}>
                <TabsList className="w-full bg-slate-800 border border-slate-700">
                  <TabsTrigger value="resident" className="flex-1 data-[active]:bg-slate-700 data-[active]:text-white text-slate-400">
                    Resident
                  </TabsTrigger>
                  <TabsTrigger value="staff" className="flex-1 data-[active]:bg-slate-700 data-[active]:text-white text-slate-400">
                    Staff / Admin
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-slate-300">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={activeTab === 'resident' ? 'your@email.com' : 'admin@municipality.gov.ph'}
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
                      Sign In
                    </span>
                  )}
                </Button>
              </form>

              {activeTab === 'resident' && (
                <p className="text-center text-sm text-slate-400">
                  No account?{' '}
                  <Link href="/auth/register" className="text-blue-400 hover:text-blue-300 underline">
                    Register here
                  </Link>
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

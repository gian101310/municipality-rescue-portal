'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, LogOut, Bell, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function RescueTeamLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [profile, setProfile] = useState<{ full_name: string; role: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: p } = await supabase
        .from('user_profiles')
        .select('full_name, role')
        .eq('user_id', user.id)
        .single()

      if (!p || !['responder', 'team_leader'].includes(p.role)) {
        toast.error('Access denied — Rescue Team only')
        router.push('/auth/login')
        return
      }

      setProfile(p)
      setLoading(false)
    }
    checkAuth()
  }, [router])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    )
  }

  const initials = profile?.full_name
    ?.split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? 'RT'

  const roleLabel = profile?.role === 'team_leader' ? 'Team Leader' : 'Rescue Team'

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="h-14 flex items-center gap-3 px-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <Shield className="w-6 h-6 text-red-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="font-bold text-sm text-white">Rescue Portal</span>
          <Badge className="ml-2 bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 text-[10px]">
            {roleLabel}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Avatar className="w-7 h-7">
            <AvatarFallback className="bg-cyan-600 text-white text-[10px] font-bold">{initials}</AvatarFallback>
          </Avatar>
          <span className="text-xs text-slate-400 hidden sm:block">{profile?.full_name}</span>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-400 hover:text-red-400 h-8 w-8">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>
      <main className="pb-20">{children}</main>
    </div>
  )
}

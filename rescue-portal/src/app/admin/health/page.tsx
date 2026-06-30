'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { CheckCircle2, AlertTriangle, RefreshCw, Database, Radio, Map, Shield, Users, Siren, Building2, MapPin } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Database, Radio, Map, Shield,
}

const STATUS_CONFIG = {
  healthy: { label: 'Healthy', color: 'bg-green-600/20 text-green-400 border-green-500/30', dot: 'bg-green-400' },
  degraded: { label: 'Degraded', color: 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30', dot: 'bg-yellow-400 animate-pulse' },
  down: { label: 'Down', color: 'bg-red-600/20 text-red-400 border-red-500/30', dot: 'bg-red-400 animate-pulse' },
}

interface ServiceStatus {
  name: string
  status: 'healthy' | 'degraded' | 'down'
  latency: number
  description: string
  icon: string
}

interface Stats {
  totalUsers: number
  totalIncidents: number
  activeTeams: number
  totalBarangays: number
}

export default function HealthPage() {
  const [services, setServices] = useState<ServiceStatus[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [checkedAt, setCheckedAt] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const initialLoadRef = useRef(true)

  const runHealthCheck = useCallback(async () => {
    setChecking(true)
    try {
      const response = await fetch('/api/admin/health', { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) return toast.error(payload.message ?? 'Health check failed.')
      setServices(payload.services ?? [])
      setStats(payload.stats ?? null)
      setCheckedAt(payload.checkedAt ?? new Date().toISOString())
      if (!initialLoadRef.current) toast.success('Health check completed')
    } catch {
      toast.error('Unable to reach health endpoint.')
    } finally {
      setChecking(false)
      initialLoadRef.current = false
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => { void runHealthCheck() }, 0)
    return () => window.clearTimeout(timer)
  }, [runHealthCheck])

  const allHealthy = services.length > 0 && services.every(s => s.status === 'healthy')
  const hasDown = services.some(s => s.status === 'down')

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">System Health</h1>
          <p className="text-slate-400 text-sm">
            {checkedAt
              ? `Last checked: ${new Date(checkedAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
              : 'Loading…'
            }
          </p>
        </div>
        <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800" onClick={() => void runHealthCheck()} disabled={checking}>
          <RefreshCw className={cn('w-4 h-4 mr-1', checking && 'animate-spin')} />
          {checking ? 'Checking…' : 'Re-check'}
        </Button>
      </div>

      {/* Overall Status */}
      {services.length > 0 && (
        <Card className={cn('border', allHealthy ? 'bg-green-900/20 border-green-800/40' : hasDown ? 'bg-red-900/20 border-red-800/40' : 'bg-yellow-900/20 border-yellow-800/40')}>
          <CardContent className="p-5 flex items-center gap-4">
            {allHealthy ? <CheckCircle2 className="w-8 h-8 text-green-400" /> : <AlertTriangle className="w-8 h-8 text-yellow-400" />}
            <div>
              <p className="font-semibold text-white text-lg">
                {allHealthy ? 'All Systems Operational' : hasDown ? 'Service Disruption Detected' : 'Partial Degradation'}
              </p>
              <p className="text-sm text-slate-400">
                {services.filter(s => s.status === 'healthy').length}/{services.length} services healthy
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Database Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Users', value: stats.totalUsers, icon: Users, color: 'text-blue-400' },
            { label: 'Incidents', value: stats.totalIncidents, icon: Siren, color: 'text-red-400' },
            { label: 'Teams', value: stats.activeTeams, icon: Building2, color: 'text-amber-400' },
            { label: 'Barangays', value: stats.totalBarangays, icon: MapPin, color: 'text-green-400' },
          ].map(item => (
            <Card key={item.label} className="bg-slate-900 border-slate-700">
              <CardContent className="p-4 flex items-center gap-3">
                <item.icon className={cn('w-5 h-5', item.color)} />
                <div>
                  <p className="text-xs text-slate-500">{item.label}</p>
                  <p className="text-lg font-bold text-white">{item.value.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Service Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {services.map(svc => {
          const cfg = STATUS_CONFIG[svc.status]
          const IconComp = ICON_MAP[svc.icon] || Database
          return (
            <Card key={svc.name} className="bg-slate-900 border-slate-700">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                      <IconComp className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{svc.name}</p>
                      <p className="text-xs text-slate-500">{svc.description}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={cn('text-xs border shrink-0', cfg.color)}>
                    <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5', cfg.dot)} />
                    {cfg.label}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-slate-500">Latency</p>
                    <p className={cn('font-mono font-medium', svc.latency > 500 ? 'text-red-400' : svc.latency > 100 ? 'text-yellow-400' : 'text-green-400')}>
                      {svc.latency > 0 ? `${svc.latency}ms` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Status</p>
                    <p className={cn('font-medium', svc.status === 'healthy' ? 'text-green-400' : svc.status === 'degraded' ? 'text-yellow-400' : 'text-red-400')}>
                      {cfg.label}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

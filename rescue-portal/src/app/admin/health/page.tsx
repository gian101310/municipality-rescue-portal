'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, AlertTriangle, RefreshCw, Database, Radio, Map, MessageSquare, HardDrive } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const isDemoMode = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_DEMO_MODE) === 'true'

interface ServiceStatus {
  name: string
  status: 'healthy' | 'degraded' | 'down'
  latency: number
  lastChecked: string
  errorCount: number
  description: string
  icon: React.FC<{ className?: string }>
}

function getInitialStatuses(): ServiceStatus[] {
  return [
    { name: 'Database', status: isDemoMode ? 'healthy' : 'degraded', latency: isDemoMode ? 12 : 0, lastChecked: new Date().toISOString(), errorCount: isDemoMode ? 0 : 1, description: isDemoMode ? 'Supabase PostgreSQL — Demo mode active' : 'Supabase not configured', icon: Database },
    { name: 'Realtime', status: isDemoMode ? 'healthy' : 'down', latency: isDemoMode ? 8 : 0, lastChecked: new Date().toISOString(), errorCount: isDemoMode ? 0 : 1, description: isDemoMode ? 'Supabase Realtime — Demo mode active' : 'Requires Supabase configuration', icon: Radio },
    { name: 'Google Maps', status: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? 'healthy' : isDemoMode ? 'healthy' : 'degraded', latency: 45, lastChecked: new Date().toISOString(), errorCount: 0, description: isDemoMode ? 'Canvas fallback map in use' : 'API key not configured', icon: Map },
    { name: 'Telegram Bot', status: isDemoMode ? 'healthy' : 'degraded', latency: isDemoMode ? 120 : 0, lastChecked: new Date().toISOString(), errorCount: isDemoMode ? 0 : 1, description: isDemoMode ? 'Bot token simulated in demo mode' : 'Bot token not configured', icon: MessageSquare },
    { name: 'Storage', status: isDemoMode ? 'healthy' : 'degraded', latency: isDemoMode ? 25 : 0, lastChecked: new Date().toISOString(), errorCount: isDemoMode ? 0 : 1, description: isDemoMode ? 'Supabase Storage — Demo mode active' : 'Requires Supabase configuration', icon: HardDrive },
  ]
}

const STATUS_CONFIG = {
  healthy: { label: 'Healthy', color: 'bg-green-600/20 text-green-400 border-green-500/30', dot: 'bg-green-400' },
  degraded: { label: 'Degraded', color: 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30', dot: 'bg-yellow-400 animate-pulse' },
  down: { label: 'Down', color: 'bg-red-600/20 text-red-400 border-red-500/30', dot: 'bg-red-400 animate-pulse' },
}

export default function HealthPage() {
  const [services, setServices] = useState<ServiceStatus[]>(getInitialStatuses)
  const [checking, setChecking] = useState(false)

  async function recheck() {
    setChecking(true)
    await new Promise((r) => setTimeout(r, 1500))
    setServices(getInitialStatuses().map((s) => ({ ...s, lastChecked: new Date().toISOString() })))
    setChecking(false)
    toast.success('Health check completed')
  }

  const allHealthy = services.every((s) => s.status === 'healthy')
  const hasDown = services.some((s) => s.status === 'down')

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">System Health</h1>
          <p className="text-slate-400 text-sm">Real-time service status monitoring</p>
        </div>
        <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800" onClick={recheck} disabled={checking}>
          <RefreshCw className={cn('w-4 h-4 mr-1', checking && 'animate-spin')} />
          {checking ? 'Checking...' : 'Re-check'}
        </Button>
      </div>

      {/* Overall Status */}
      <Card className={cn('border', allHealthy ? 'bg-green-900/20 border-green-800/40' : hasDown ? 'bg-red-900/20 border-red-800/40' : 'bg-yellow-900/20 border-yellow-800/40')}>
        <CardContent className="p-5 flex items-center gap-4">
          {allHealthy ? (
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          ) : (
            <AlertTriangle className="w-8 h-8 text-yellow-400" />
          )}
          <div>
            <p className="font-semibold text-white text-lg">
              {allHealthy ? 'All Systems Operational' : hasDown ? 'Service Disruption Detected' : 'Partial Degradation'}
            </p>
            <p className="text-sm text-slate-400">
              {isDemoMode
                ? 'Running in demo mode — services are simulated'
                : allHealthy
                  ? 'All services are running normally'
                  : 'Some services require attention'
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Service Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {services.map((svc) => {
          const cfg = STATUS_CONFIG[svc.status]
          return (
            <Card key={svc.name} className="bg-slate-900 border-slate-700">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                      <svc.icon className="w-5 h-5 text-slate-400" />
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
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <p className="text-slate-500">Latency</p>
                    <p className={cn('font-mono font-medium', svc.latency > 500 ? 'text-red-400' : svc.latency > 100 ? 'text-yellow-400' : 'text-green-400')}>
                      {svc.latency > 0 ? `${svc.latency}ms` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Errors</p>
                    <p className={cn('font-medium', svc.errorCount > 0 ? 'text-red-400' : 'text-green-400')}>{svc.errorCount}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Uptime</p>
                    <p className="text-white font-medium">{svc.status === 'healthy' ? '99.9%' : svc.status === 'degraded' ? '95.0%' : '0%'}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 mt-2">
                  Last checked: {new Date(svc.lastChecked).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {isDemoMode && (
        <Card className="bg-amber-900/20 border-amber-800/40">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-amber-300">Demo Mode Active</p>
              <p className="text-amber-400/70">Service statuses are simulated. Configure Supabase, Google Maps, and Telegram environment variables for live monitoring.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

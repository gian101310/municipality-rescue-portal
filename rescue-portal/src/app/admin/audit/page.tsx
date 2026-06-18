'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Filter } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DEMO_AUDIT_LOGS } from '@/lib/demo-data'
import { formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { AuditAction } from '@/lib/types'

const ACTION_COLORS: Record<AuditAction, string> = {
  create: 'bg-green-900/30 text-green-400',
  update: 'bg-blue-900/30 text-blue-400',
  delete: 'bg-red-900/30 text-red-400',
  login: 'bg-teal-900/30 text-teal-400',
  logout: 'bg-slate-800 text-slate-400',
  assign: 'bg-indigo-900/30 text-indigo-400',
  unassign: 'bg-purple-900/30 text-purple-400',
  status_change: 'bg-amber-900/30 text-amber-400',
  approve: 'bg-green-900/30 text-green-400',
  reject: 'bg-red-900/30 text-red-400',
  verify: 'bg-cyan-900/30 text-cyan-400',
  export: 'bg-slate-800 text-slate-400',
  view: 'bg-slate-800 text-slate-500',
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'text-red-400',
  admin: 'text-orange-400',
  dispatcher: 'text-amber-400',
  team_leader: 'text-blue-400',
  responder: 'text-teal-400',
  verifier: 'text-purple-400',
  resident: 'text-slate-400',
  system: 'text-slate-500',
}

export default function AuditPage() {
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  const filtered = DEMO_AUDIT_LOGS.filter((log) => {
    if (actionFilter !== 'all' && log.action !== actionFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!log.actor_name.toLowerCase().includes(q) &&
          !log.entity_type.toLowerCase().includes(q) &&
          !(log.entity_id || '').toLowerCase().includes(q)) return false
    }
    return true
  })

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-screen-xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
        <p className="text-slate-400 text-sm">Read-only system activity log</p>
      </div>

      <Card className="bg-slate-900 border-slate-700">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Input
                placeholder="Search by actor, entity..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>
            <Select value={actionFilter} onValueChange={(v) => { if (v) setActionFilter(v) }}>
              <SelectTrigger className="w-44 bg-slate-800 border-slate-600 text-white">
                <Filter className="w-4 h-4 mr-1 text-slate-400" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="all" className="text-white">All Actions</SelectItem>
                {(Object.keys(ACTION_COLORS) as AuditAction[]).map((a) => (
                  <SelectItem key={a} value={a} className="text-white capitalize">{a.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-700">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="w-6 px-3 py-3" />
                  {['Timestamp', 'Actor', 'Role', 'Action', 'Entity', 'Details'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-slate-500 font-medium uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => {
                  const isExpanded = expanded === log.id
                  const hasDiff = log.previous_values || log.new_values

                  return (
                    <>
                      <tr
                        key={log.id}
                        className={cn('border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors', hasDiff && 'cursor-pointer')}
                        onClick={() => hasDiff && setExpanded(isExpanded ? null : log.id)}
                      >
                        <td className="px-3 py-3 text-slate-600">
                          {hasDiff ? (
                            isExpanded
                              ? <ChevronDown className="w-3.5 h-3.5" />
                              : <ChevronRight className="w-3.5 h-3.5" />
                          ) : null}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs font-mono text-slate-400">{formatDateTime(log.created_at)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-white">{log.actor_name}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('text-xs font-medium capitalize', ROLE_COLORS[log.actor_role] || 'text-slate-400')}>
                            {log.actor_role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={cn('text-xs border-0 capitalize', ACTION_COLORS[log.action] || 'bg-slate-800 text-slate-400')}>
                            {log.action.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-300 capitalize">{log.entity_type}</span>
                          {log.entity_id && <span className="text-xs text-slate-600 ml-1 font-mono">#{log.entity_id.slice(-6)}</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-500">{log.ip_address || '—'}</span>
                        </td>
                      </tr>
                      {isExpanded && hasDiff && (
                        <tr key={`${log.id}-expanded`} className="border-b border-slate-800/50 bg-slate-800/20">
                          <td />
                          <td colSpan={6} className="px-4 py-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {log.previous_values && (
                                <div>
                                  <p className="text-xs text-slate-500 mb-1">Previous Values</p>
                                  <pre className="text-xs text-red-300 bg-red-900/10 border border-red-900/30 rounded p-2 overflow-x-auto">
                                    {JSON.stringify(log.previous_values, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.new_values && (
                                <div>
                                  <p className="text-xs text-slate-500 mb-1">New Values</p>
                                  <pre className="text-xs text-green-300 bg-green-900/10 border border-green-900/30 rounded p-2 overflow-x-auto">
                                    {JSON.stringify(log.new_values, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-500">No audit logs found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

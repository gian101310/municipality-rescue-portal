'use client'

import { useEffect, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

const SHIFT_TYPES = [
  { id: 'day', label: 'Day Shift', time: '06:00 – 14:00', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'swing', label: 'Swing Shift', time: '14:00 – 22:00', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'night', label: 'Night Shift', time: '22:00 – 06:00', color: 'bg-purple-100 text-purple-700 border-purple-200' },
]
const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

type ShiftUnit = { id: string; name: string; code: string; status: string }
type ShiftRow = { rescue_unit_id: string; shift_date: string; shift_type: string }

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function ShiftSchedulePage() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [units, setUnits] = useState<ShiftUnit[]>([])
  const [shifts, setShifts] = useState<Record<string, Record<string, string>>>({})
  const [canEdit, setCanEdit] = useState(false)
  const [loading, setLoading] = useState(true)
  const [savingCell, setSavingCell] = useState<string | null>(null)

  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setHours(0, 0, 0, 0)
  startOfWeek.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1) + weekOffset * 7)
  const weekDates = DAYS_OF_WEEK.map((_, index) => {
    const date = new Date(startOfWeek)
    date.setDate(startOfWeek.getDate() + index)
    return date
  })
  const weekStart = dateKey(weekDates[0])
  const weekLabel = `${weekDates[0].toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} – ${weekDates[6].toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`

  useEffect(() => {
    let cancelled = false
    async function loadShifts() {
      setLoading(true)
      try {
        const response = await fetch(`/api/admin/shifts?week=${weekStart}`, { cache: 'no-store' })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload?.message ?? 'Unable to load shifts.')
        if (cancelled) return
        setUnits((payload.units ?? []) as ShiftUnit[])
        const next: Record<string, Record<string, string>> = {}
        for (const shift of (payload.shifts ?? []) as ShiftRow[]) {
          next[shift.rescue_unit_id] = { ...(next[shift.rescue_unit_id] ?? {}), [shift.shift_date]: shift.shift_type }
        }
        setShifts(next)
        setCanEdit(Boolean(payload.canEdit))
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Unable to load shifts.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadShifts()
    return () => { cancelled = true }
  }, [weekStart])

  async function cycleShift(unitId: string, shiftDate: string) {
    const cellKey = `${unitId}:${shiftDate}`
    if (!canEdit || savingCell) return
    setSavingCell(cellKey)
    const current = shifts[unitId]?.[shiftDate]
    const order = ['day', 'swing', 'night', undefined]
    const nextShift = order[(order.indexOf(current) + 1) % order.length]
    let response: Response
    try {
      response = await fetch('/api/admin/shifts', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rescueUnitId: unitId, shiftDate, shiftType: nextShift ?? null }),
      })
    } catch {
      setSavingCell(null)
      toast.error('Unable to update shift. Check the connection and try again.')
      return
    }
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) { toast.error(payload?.message ?? 'Unable to update shift.'); setSavingCell(null); return }
    setShifts((previous) => {
      const unitShifts = { ...(previous[unitId] ?? {}) }
      if (nextShift) unitShifts[shiftDate] = nextShift
      else delete unitShifts[shiftDate]
      return { ...previous, [unitId]: unitShifts }
    })
    setSavingCell(null)
    toast.success('Shift saved')
  }

  const todayKey = dateKey(now)
  const onDutyToday = units.filter((unit) => shifts[unit.id]?.[todayKey]).length

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-screen-xl mx-auto">
      <div><h1 className="text-2xl font-bold text-white">Shift Scheduling</h1><p className="text-slate-400 text-sm">Manage rescue team duty rosters and shift assignments</p></div>

      <div className="grid grid-cols-3 gap-3">
        {[[onDutyToday, 'On Duty Today', 'text-green-400'], [units.length - onDutyToday, 'Off Duty', 'text-slate-400'], [units.length, 'Total Teams', 'text-blue-400']].map(([value, label, color]) => (
          <Card key={String(label)} className="bg-slate-900 border-slate-700"><CardContent className="p-3 md:p-4 text-center"><p className={`text-2xl font-black ${color}`}>{value}</p><p className="text-xs text-slate-400 mt-1">{label}</p></CardContent></Card>
        ))}
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        {SHIFT_TYPES.map((shift) => <div key={shift.id} className="flex items-center gap-1.5"><div className={`w-3 h-3 rounded ${shift.color.split(' ')[0]}`} /><span className="text-xs text-slate-400">{shift.label} ({shift.time})</span></div>)}
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-slate-700" /><span className="text-xs text-slate-400">Off Duty</span></div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" className="border-slate-600 text-slate-300" onClick={() => setWeekOffset((value) => value - 1)}><ChevronLeft className="w-4 h-4" /></Button>
        <div className="flex items-center gap-2 text-center"><Calendar className="w-4 h-4 text-slate-400 shrink-0" /><span className="text-sm text-white font-semibold">{weekLabel}</span>{weekOffset !== 0 && <Button variant="ghost" size="sm" className="text-xs text-blue-400" onClick={() => setWeekOffset(0)}>Today</Button>}</div>
        <Button variant="outline" size="sm" className="border-slate-600 text-slate-300" onClick={() => setWeekOffset((value) => value + 1)}><ChevronRight className="w-4 h-4" /></Button>
      </div>

      <Card className="bg-slate-900 border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead><tr className="border-b border-slate-700"><th className="text-left text-slate-400 font-medium py-3 px-4 w-48">Team</th>{DAYS_OF_WEEK.map((day, index) => <th key={day} className={`text-center py-3 px-2 ${dateKey(weekDates[index]) === todayKey ? 'bg-blue-600/10' : ''}`}><span className="text-xs font-medium text-slate-400">{day}</span><br /><span className="text-xs text-slate-500">{weekDates[index].getDate()}</span></th>)}</tr></thead>
            <tbody>
              {units.map((unit) => <tr key={unit.id} className="border-b border-slate-800 hover:bg-slate-800/30"><td className="py-2 px-4"><div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${unit.status === 'available' ? 'bg-green-500' : unit.status === 'dispatched' ? 'bg-orange-500' : 'bg-slate-500'}`} /><span className="text-white font-medium text-xs">{unit.name}</span></div></td>{weekDates.map((date) => { const key = dateKey(date); const cellKey = `${unit.id}:${key}`; const shift = SHIFT_TYPES.find((item) => item.id === shifts[unit.id]?.[key]); return <td key={key} className={`text-center py-2 px-1 ${key === todayKey ? 'bg-blue-600/10' : ''}`}><button type="button" disabled={!canEdit || savingCell !== null} onClick={() => void cycleShift(unit.id, key)} className={`w-full py-1.5 px-1 rounded text-xs font-medium border transition-colors disabled:cursor-default ${shift ? shift.color : 'bg-slate-800 text-slate-600 border-slate-700'}`}>{savingCell === cellKey ? '…' : shift ? shift.id.charAt(0).toUpperCase() : '—'}</button></td> })}</tr>)}
              {!loading && units.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-slate-500">No active rescue teams found.</td></tr>}
              {loading && <tr><td colSpan={8} className="py-10 text-center text-slate-500">Loading shift schedule…</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="text-xs text-slate-500 text-center">{canEdit ? 'Click any cell to cycle through Day → Swing → Night → Off. Every change is saved immediately.' : 'This schedule is read-only for your role.'}</p>
    </div>
  )
}

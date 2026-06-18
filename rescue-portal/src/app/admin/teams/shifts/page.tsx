'use client'

import { useState } from 'react'
import { Calendar, Clock, Users, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DEMO_RESCUE_UNITS } from '@/lib/demo-data'
import { toast } from 'sonner'

const SHIFT_TYPES = [
  { id: 'day', label: 'Day Shift', time: '06:00 – 14:00', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'swing', label: 'Swing Shift', time: '14:00 – 22:00', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'night', label: 'Night Shift', time: '22:00 – 06:00', color: 'bg-purple-100 text-purple-700 border-purple-200' },
]

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Generate demo shift assignments
function generateDemoShifts() {
  const shifts: Record<string, Record<string, string>> = {}
  DEMO_RESCUE_UNITS.forEach((unit, idx) => {
    shifts[unit.id] = {}
    DAYS_OF_WEEK.forEach((day, dayIdx) => {
      const seed = (idx * 7 + dayIdx) % 4
      if (seed === 0) shifts[unit.id][day] = 'day'
      else if (seed === 1) shifts[unit.id][day] = 'swing'
      else if (seed === 2) shifts[unit.id][day] = 'night'
      // seed === 3 = off duty
    })
  })
  return shifts
}

export default function ShiftSchedulePage() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [shifts, setShifts] = useState(generateDemoShifts)

  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay() + 1 + weekOffset * 7) // Monday

  const weekDates = DAYS_OF_WEEK.map((_, i) => {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    return d
  })

  const weekLabel = `${weekDates[0].toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} – ${weekDates[6].toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`

  function cycleShift(unitId: string, day: string) {
    setShifts((prev) => {
      const current = prev[unitId]?.[day]
      const order = ['day', 'swing', 'night', undefined]
      const nextIdx = (order.indexOf(current) + 1) % order.length
      const next = { ...prev }
      if (!next[unitId]) next[unitId] = {}
      if (order[nextIdx]) {
        next[unitId] = { ...next[unitId], [day]: order[nextIdx] as string }
      } else {
        const copy = { ...next[unitId] }
        delete copy[day]
        next[unitId] = copy
      }
      return next
    })
    toast.success('Shift updated')
  }

  // Stats
  const todayDay = DAYS_OF_WEEK[now.getDay() === 0 ? 6 : now.getDay() - 1]
  const onDutyToday = DEMO_RESCUE_UNITS.filter((u) => shifts[u.id]?.[todayDay]).length
  const offDutyToday = DEMO_RESCUE_UNITS.length - onDutyToday

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Shift Scheduling</h1>
          <p className="text-slate-400 text-sm">Manage rescue team duty rosters and shift assignments</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-black text-green-400">{onDutyToday}</p>
            <p className="text-xs text-slate-400 mt-1">On Duty Today</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-black text-slate-400">{offDutyToday}</p>
            <p className="text-xs text-slate-400 mt-1">Off Duty</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-black text-blue-400">{DEMO_RESCUE_UNITS.length}</p>
            <p className="text-xs text-slate-400 mt-1">Total Teams</p>
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        {SHIFT_TYPES.map((st) => (
          <div key={st.id} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded ${st.color.split(' ')[0]}`} />
            <span className="text-xs text-slate-400">{st.label} ({st.time})</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-slate-700" />
          <span className="text-xs text-slate-400">Off Duty</span>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" className="border-slate-600 text-slate-300" onClick={() => setWeekOffset((w) => w - 1)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-white font-semibold">{weekLabel}</span>
          {weekOffset !== 0 && (
            <Button variant="ghost" size="sm" className="text-xs text-blue-400" onClick={() => setWeekOffset(0)}>
              Today
            </Button>
          )}
        </div>
        <Button variant="outline" size="sm" className="border-slate-600 text-slate-300" onClick={() => setWeekOffset((w) => w + 1)}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Schedule Grid */}
      <Card className="bg-slate-900 border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left text-slate-400 font-medium py-3 px-4 w-48">Team</th>
                {DAYS_OF_WEEK.map((day, i) => {
                  const isToday = weekOffset === 0 && (now.getDay() === 0 ? 6 : now.getDay() - 1) === i
                  return (
                    <th key={day} className={`text-center py-3 px-2 ${isToday ? 'bg-blue-600/10' : ''}`}>
                      <span className={`text-xs font-medium ${isToday ? 'text-blue-400' : 'text-slate-400'}`}>{day}</span>
                      <br />
                      <span className={`text-xs ${isToday ? 'text-blue-300' : 'text-slate-500'}`}>
                        {weekDates[i].getDate()}
                      </span>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {DEMO_RESCUE_UNITS.map((unit) => (
                <tr key={unit.id} className="border-b border-slate-800 hover:bg-slate-800/30">
                  <td className="py-2 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: unit.status === 'available' ? '#22c55e' : unit.status === 'dispatched' ? '#f97316' : '#6b7280' }} />
                      <span className="text-white font-medium text-xs">{unit.name}</span>
                    </div>
                  </td>
                  {DAYS_OF_WEEK.map((day, i) => {
                    const shiftId = shifts[unit.id]?.[day]
                    const shift = SHIFT_TYPES.find((s) => s.id === shiftId)
                    const isToday = weekOffset === 0 && (now.getDay() === 0 ? 6 : now.getDay() - 1) === i
                    return (
                      <td key={day} className={`text-center py-2 px-1 ${isToday ? 'bg-blue-600/10' : ''}`}>
                        <button
                          onClick={() => cycleShift(unit.id, day)}
                          className={`w-full py-1.5 px-1 rounded text-xs font-medium border transition-colors ${
                            shift
                              ? shift.color
                              : 'bg-slate-800 text-slate-600 border-slate-700 hover:border-slate-500'
                          }`}
                        >
                          {shift ? shift.id.charAt(0).toUpperCase() : '—'}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-xs text-slate-500 text-center">
        Click any cell to cycle through shifts (Day → Swing → Night → Off). Changes are saved in demo mode only.
      </p>
    </div>
  )
}

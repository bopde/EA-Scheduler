import { useEffect, useRef, useState } from 'react'
import { getAllAvailability, saveAvailability } from '../../api/gasClient'
import { useSessionStore } from '../../store/sessionStore'
import { Config } from '../../types'
import {
  addDays,
  getMondayOf,
  getShiftsForDate,
  toISODate,
} from '../../utils/dateUtils'
import WeekNavigator from '../scheduler/WeekNavigator'

interface Props {
  scriptUrl: string
  config: Config
}

const DAY_ABBR = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function dayAbbr(d: Date) {
  const dow = d.getDay()
  return DAY_ABBR[dow === 0 ? 6 : dow - 1]
}

export default function TeamAvailabilityView({ scriptUrl, config }: Props) {
  const members = useSessionStore(s => s.members)
  const [weekOffset, setWeekOffset] = useState(0)

  const startMonday = addDays(getMondayOf(new Date()), weekOffset * 7)
  const days = Array.from({ length: 7 }, (_, i) => addDays(startMonday, i))
  const from = toISODate(startMonday)
  const to = toISODate(days[6])

  // Slot state: key = `${member}|${date}|${shiftIndex}`
  const slotRef = useRef<Map<string, boolean>>(new Map())
  const [slotData, setSlotData] = useState<Map<string, boolean>>(new Map())
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Per-member save tracking
  const pendingRef = useRef<Map<string, Set<string>>>(new Map())
  const timerRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const [savingSet, setSavingSet] = useState<Set<string>>(new Set())
  const [saveErrors, setSaveErrors] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    setLoading(true)
    setFetchError(null)
    getAllAvailability(scriptUrl, from, to)
      .then(slots => {
        const m = new Map<string, boolean>()
        for (const s of slots) {
          m.set(`${s.memberName}|${s.date}|${s.shiftIndex}`, s.available)
        }
        slotRef.current = m
        setSlotData(new Map(m))
      })
      .catch(e => setFetchError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [from, to]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timers = timerRef.current
    return () => { timers.forEach(t => clearTimeout(t)) }
  }, [])

  function toggle(memberName: string, date: string, shiftIndex: 0 | 1) {
    const key = `${memberName}|${date}|${shiftIndex}`
    const newVal = !(slotRef.current.get(key) ?? false)
    slotRef.current.set(key, newVal)
    setSlotData(new Map(slotRef.current))

    const slotKey = `${date}|${shiftIndex}`
    if (!pendingRef.current.has(memberName)) pendingRef.current.set(memberName, new Set())
    pendingRef.current.get(memberName)!.add(slotKey)

    const existing = timerRef.current.get(memberName)
    if (existing) clearTimeout(existing)
    timerRef.current.set(memberName, setTimeout(() => doSave(memberName), 1200))
  }

  async function doSave(memberName: string) {
    const pending = pendingRef.current.get(memberName)
    if (!pending || pending.size === 0) return
    pendingRef.current.delete(memberName)

    const slots = Array.from(pending).map(slotKey => {
      const [date, shift] = slotKey.split('|')
      return {
        date,
        shiftIndex: Number(shift) as 0 | 1,
        available: slotRef.current.get(`${memberName}|${date}|${shift}`) ?? false,
      }
    })

    setSavingSet(prev => new Set(prev).add(memberName))
    setSaveErrors(prev => { const m = new Map(prev); m.delete(memberName); return m })
    try {
      await saveAvailability(scriptUrl, memberName, slots)
    } catch (e) {
      setSaveErrors(prev => new Map(prev).set(memberName, e instanceof Error ? e.message : 'Save failed'))
    } finally {
      setSavingSet(prev => { const s = new Set(prev); s.delete(memberName); return s })
    }
  }

  const weekLabel = `${startMonday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${days[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <WeekNavigator
          label={weekLabel}
          onPrev={() => setWeekOffset(o => o - 1)}
          onNext={() => setWeekOffset(o => o + 1)}
        />
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-emerald-200 border border-emerald-400 inline-block" />
            Available
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-gray-100 border border-gray-200 inline-block" />
            Unavailable
          </span>
        </div>
      </div>

      {loading && <div className="text-center py-16 text-gray-400">Loading availability…</div>}
      {fetchError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-600">{fetchError}</div>
      )}

      {!loading && !fetchError && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              {/* Day header */}
              <tr className="border-b border-gray-200">
                <th className="sticky left-0 z-20 bg-white border-r border-gray-200 px-3 py-2.5 text-left text-sm font-semibold text-gray-700 min-w-[130px]">
                  Member
                </th>
                {days.map((day, di) => {
                  const iso = toISODate(day)
                  const isWknd = day.getDay() === 0 || day.getDay() === 6
                  return (
                    <th
                      key={iso}
                      colSpan={2}
                      className={`px-1 py-2 text-center font-semibold ${isWknd ? 'text-indigo-600 bg-indigo-50/40' : 'text-gray-700'} ${di < 6 ? 'border-r border-gray-200' : ''}`}
                    >
                      <div>{dayAbbr(day)}</div>
                      <div className="text-gray-400 font-normal">{day.getDate()}</div>
                    </th>
                  )
                })}
              </tr>
              {/* Shift time sub-header */}
              <tr className="border-b border-gray-100">
                <th className="sticky left-0 z-20 bg-white border-r border-gray-200 px-3 py-1 text-left text-gray-400 font-normal">
                  Shift →
                </th>
                {days.map((day, di) => {
                  const iso = toISODate(day)
                  const shifts = getShiftsForDate(day, config)
                  const isWknd = day.getDay() === 0 || day.getDay() === 6
                  return [0, 1].map(si => (
                    <th
                      key={`${iso}-s${si}`}
                      className={`px-0.5 py-1 text-center text-gray-400 font-normal whitespace-nowrap ${isWknd ? 'bg-indigo-50/20' : ''} ${si === 1 && di < 6 ? 'border-r border-gray-200' : ''}`}
                    >
                      {shifts[si].start}
                    </th>
                  ))
                })}
              </tr>
            </thead>

            <tbody>
              {members.map((member, mi) => {
                const rowBg = mi % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'
                const stickyBg = mi % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                return (
                  <tr key={member.name} className={rowBg}>
                    <td className={`sticky left-0 z-10 ${stickyBg} border-r border-gray-200 px-3 py-2 font-medium text-gray-800`}>
                      <div className="flex items-center gap-1.5">
                        <span className="truncate max-w-[88px]">{member.name}</span>
                        {savingSet.has(member.name) && (
                          <span className="text-indigo-400 flex-shrink-0 font-normal">·</span>
                        )}
                        {saveErrors.has(member.name) && (
                          <span className="text-red-400 flex-shrink-0 font-normal" title={saveErrors.get(member.name)}>!</span>
                        )}
                      </div>
                    </td>
                    {days.map((day, di) => {
                      const iso = toISODate(day)
                      const isWknd = day.getDay() === 0 || day.getDay() === 6
                      return [0, 1].map(si => {
                        const available = slotData.get(`${member.name}|${iso}|${si}`) ?? false
                        return (
                          <td
                            key={`${iso}-s${si}`}
                            onClick={() => toggle(member.name, iso, si as 0 | 1)}
                            title={available ? 'Click to mark unavailable' : 'Click to mark available'}
                            className={`w-10 py-2 text-center cursor-pointer select-none transition-colors ${
                              available
                                ? 'bg-emerald-100 hover:bg-emerald-200'
                                : isWknd
                                  ? 'bg-indigo-50/20 hover:bg-indigo-100/40'
                                  : 'hover:bg-gray-100'
                            } ${si === 1 && di < 6 ? 'border-r border-gray-200' : ''}`}
                          >
                            {available && (
                              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                            )}
                          </td>
                        )
                      })
                    })}
                  </tr>
                )
              })}

              {/* Coverage count row */}
              <tr className="border-t-2 border-gray-200 bg-gray-50">
                <td className="sticky left-0 z-10 bg-gray-50 border-r border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500">
                  Available
                </td>
                {days.map((day, di) => {
                  const iso = toISODate(day)
                  const isWknd = day.getDay() === 0 || day.getDay() === 6
                  return [0, 1].map(si => {
                    const count = members.filter(m => slotData.get(`${m.name}|${iso}|${si}`) === true).length
                    return (
                      <td
                        key={`count-${iso}-s${si}`}
                        className={`py-2 text-center font-semibold ${isWknd ? 'bg-indigo-50/20' : ''} ${si === 1 && di < 6 ? 'border-r border-gray-200' : ''} ${
                          count === 0 ? 'text-gray-300' : count < (config.min_team_size ?? 4) ? 'text-amber-500' : 'text-emerald-700'
                        }`}
                      >
                        {count > 0 ? count : '—'}
                      </td>
                    )
                  })
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { AvailSlot, TeamAssignment } from '../../types'
import { formatDisplayDate, parseISODate } from '../../utils/dateUtils'
import TeamCard from './TeamCard'

interface Props {
  date: string
  teams: TeamAssignment[]
  allAvailability: AvailSlot[]
}

export default function DayOverview({ date, teams, allAvailability }: Props) {
  const [open, setOpen] = useState(true)

  const byShift = [0, 1].map((si) => teams.filter((t) => t.shiftIndex === si))

  const unassignedByShift = [0, 1].map((si) => {
    const assigned = new Set(
      teams
        .filter((t) => t.shiftIndex === si)
        .flatMap((t) => [t.coordinatorName, ...t.members]),
    )
    return allAvailability
      .filter((s) => s.date === date && s.shiftIndex === si && !assigned.has(s.memberName))
      .map((s) => s.memberName)
  })

  const hasContent = teams.length > 0 || unassignedByShift.some((u) => u.length > 0)

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-50"
      >
        <span className="font-semibold text-gray-800">
          {formatDisplayDate(parseISODate(date))}
        </span>
        <span className="text-xs text-gray-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-5 pb-4 space-y-4 border-t border-gray-100">
          {!hasContent && (
            <p className="text-sm text-gray-400 italic pt-3">No availability recorded for this day.</p>
          )}
          {[0, 1].map((si) => {
            const shiftTeams = byShift[si]
            const unassigned = unassignedByShift[si]
            if (shiftTeams.length === 0 && unassigned.length === 0) return null
            return (
              <div key={si}>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide pt-3 pb-2">
                  Shift {si + 1}
                </p>
                {shiftTeams.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {shiftTeams.map((t) => (
                      <TeamCard key={`${t.teamNumber}-${si}`} team={t} />
                    ))}
                  </div>
                )}
                {unassigned.length > 0 && (
                  <div className={`rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3 ${shiftTeams.length > 0 ? 'mt-3' : ''}`}>
                    <p className="text-xs font-medium text-gray-500 mb-2">
                      Available but not assigned ({unassigned.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {unassigned.map((name) => (
                        <span
                          key={name}
                          className="rounded-full bg-white border border-gray-200 px-2.5 py-0.5 text-xs text-gray-600"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

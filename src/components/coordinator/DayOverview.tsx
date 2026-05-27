import { useState } from 'react'
import { TeamAssignment } from '../../types'
import { formatDisplayDate, parseISODate } from '../../utils/dateUtils'
import TeamCard from './TeamCard'

interface Props {
  date: string
  teams: TeamAssignment[]
}

export default function DayOverview({ date, teams }: Props) {
  const [open, setOpen] = useState(true)

  const byShift = [0, 1].map((si) => teams.filter((t) => t.shiftIndex === si))
  const hasAny = teams.length > 0

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
          {!hasAny && (
            <p className="text-sm text-gray-400 italic pt-3">No teams assigned for this day.</p>
          )}
          {byShift.map((shiftTeams, si) => (
            shiftTeams.length > 0 && (
              <div key={si}>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide pt-3 pb-2">
                  Shift {si + 1}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {shiftTeams.map((t) => (
                    <TeamCard key={`${t.teamNumber}-${si}`} team={t} />
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  )
}

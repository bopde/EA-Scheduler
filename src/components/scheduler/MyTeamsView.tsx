import { useTeams } from '../../hooks/useTeams'
import { Config } from '../../types'
import { addDays, formatDisplayDate, getMondayOf, getShiftsForDate, parseISODate, toISODate } from '../../utils/dateUtils'

interface Props {
  scriptUrl: string
  memberName: string
  memberRole: 'member' | 'coordinator' | ''
  config: Config
  weekOffset: number
}

export default function MyTeamsView({ scriptUrl, memberName, memberRole, config, weekOffset }: Props) {
  const startMonday = addDays(getMondayOf(new Date()), weekOffset * 7)
  const endDate = addDays(startMonday, config.scheduling_weeks_ahead * 7 - 1)
  const from = toISODate(startMonday)
  const to = toISODate(endDate)

  const { teams, loading, error } = useTeams(scriptUrl, from, to)

  // Find every assignment where this user appears (as member or coordinator)
  const mySlots = teams.filter(
    (t) => t.coordinatorName === memberName || t.members.includes(memberName),
  )

  // Group by date
  const byDate = new Map<string, typeof mySlots>()
  for (const slot of mySlots) {
    if (!byDate.has(slot.date)) byDate.set(slot.date, [])
    byDate.get(slot.date)!.push(slot)
  }
  const dates = Array.from(byDate.keys()).sort()

  if (loading) {
    return <div className="text-center py-16 text-gray-400">Loading your team assignments…</div>
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-600">
        {error}
      </div>
    )
  }

  if (teams.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="mb-1 text-base font-medium text-gray-500">No teams computed yet</p>
        <p className="text-sm">Ask your coordinator to click <strong>Recompute Teams</strong>.</p>
      </div>
    )
  }

  if (mySlots.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="mb-1 text-base font-medium text-gray-500">You're not assigned to any teams this period</p>
        <p className="text-sm">Make sure your availability is saved, then ask your coordinator to recompute.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {dates.map((date) => {
        const day = parseISODate(date)
        const shifts = getShiftsForDate(day, config)
        return (
          <div key={date} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <span className="font-semibold text-gray-800">{formatDisplayDate(day)}</span>
            </div>
            <div className="divide-y divide-gray-100">
              {byDate.get(date)!.map((team) => {
                const shift = shifts[team.shiftIndex]
                const isCoord = team.coordinatorName === memberName
                const isFillingIn = !isCoord && team.members.includes(memberName) && memberRole === 'coordinator'
                const others = [team.coordinatorName, ...team.members]

                return (
                  <div key={`${date}-${team.shiftIndex}-${team.teamNumber}`} className="px-5 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-sm font-medium text-gray-700">
                          {shift.start}–{shift.end}
                        </span>
                        <span className="ml-2 text-xs text-gray-400">Team {team.teamNumber}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isCoord && (
                          <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs text-indigo-700 font-medium">
                            Coordinator
                          </span>
                        )}
                        {isFillingIn && (
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs text-amber-700 font-medium">
                            Filling in
                          </span>
                        )}
                        {!isCoord && !isFillingIn && (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs text-emerald-700 font-medium">
                            Team member
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {others.map((name, i) => {
                        const isMe = name === memberName
                        const isThisCoord = name === team.coordinatorName
                        return (
                          <div
                            key={i}
                            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 ${
                              isMe ? 'bg-indigo-50 border border-indigo-200' : 'bg-gray-50'
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                isThisCoord ? 'bg-indigo-400' : 'bg-emerald-400'
                              }`}
                            />
                            <span className={`text-sm ${isMe ? 'font-semibold text-indigo-800' : 'text-gray-700'}`}>
                              {name}
                              {isMe && ' (you)'}
                            </span>
                            {isThisCoord && (
                              <span className="ml-auto text-xs text-gray-400">coordinator</span>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {team.members.length === 0 && isCoord && (
                      <p className="text-xs text-gray-400 italic mt-2">No members assigned yet</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

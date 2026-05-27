import { useEffect, useState } from 'react'
import { getAllAvailability } from '../../api/gasClient'
import { AvailSlot } from '../../types'
import { useTeams } from '../../hooks/useTeams'
import DayOverview from './DayOverview'

interface Props {
  scriptUrl: string
  from: string
  to: string
}

export default function CoordinatorPage({ scriptUrl, from, to }: Props) {
  const { teams, loading, recomputing, error, recompute } = useTeams(scriptUrl, from, to)
  const [allAvail, setAllAvail] = useState<AvailSlot[]>([])

  useEffect(() => {
    if (!scriptUrl || !from || !to) return
    getAllAvailability(scriptUrl, from, to)
      .then((slots) => setAllAvail(slots.filter((s) => s.available)))
      .catch(console.error)
  }, [scriptUrl, from, to])

  // Group teams by date
  const dateMap = new Map<string, typeof teams>()
  for (const t of teams) {
    if (!dateMap.has(t.date)) dateMap.set(t.date, [])
    dateMap.get(t.date)!.push(t)
  }

  // Also collect dates that have available people but no teams
  const availDates = new Set(allAvail.map((s) => s.date))
  const allDates = Array.from(new Set([...dateMap.keys(), ...availDates])).sort()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Team Assignments</h2>
        <button
          onClick={recompute}
          disabled={recomputing || loading}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {recomputing ? 'Recomputing…' : 'Recompute Teams'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-center py-16 text-gray-400">Loading team assignments…</div>
      )}

      {!loading && allDates.length === 0 && !error && (
        <div className="text-center py-12 text-gray-400">
          <p className="mb-3">No availability or team assignments yet.</p>
          <p className="text-sm">Once members submit availability, click <strong>Recompute Teams</strong> to generate them.</p>
        </div>
      )}

      {allDates.map((date) => (
        <DayOverview
          key={date}
          date={date}
          teams={dateMap.get(date) ?? []}
          allAvailability={allAvail}
        />
      ))}
    </div>
  )
}

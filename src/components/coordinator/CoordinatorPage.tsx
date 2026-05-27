import { useTeams } from '../../hooks/useTeams'
import DayOverview from './DayOverview'

interface Props {
  scriptUrl: string
  from: string
  to: string
}

export default function CoordinatorPage({ scriptUrl, from, to }: Props) {
  const { teams, loading, recomputing, error, recompute } = useTeams(scriptUrl, from, to)

  // Group teams by date
  const dateMap = new Map<string, typeof teams>()
  for (const t of teams) {
    if (!dateMap.has(t.date)) dateMap.set(t.date, [])
    dateMap.get(t.date)!.push(t)
  }
  const dates = Array.from(dateMap.keys()).sort()

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

      {!loading && dates.length === 0 && !error && (
        <div className="text-center py-12 text-gray-400">
          <p className="mb-3">No team assignments yet.</p>
          <p className="text-sm">Click <strong>Recompute Teams</strong> to generate them based on current availability.</p>
        </div>
      )}

      {dates.map((date) => (
        <DayOverview key={date} date={date} teams={dateMap.get(date)!} />
      ))}
    </div>
  )
}

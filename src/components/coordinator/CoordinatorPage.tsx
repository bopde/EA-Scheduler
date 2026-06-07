import { useCallback, useEffect, useState } from 'react'
import { getAllAvailability } from '../../api/gasClient'
import { AvailSlot } from '../../types'
import { useTeams } from '../../hooks/useTeams'
import DayOverview from './DayOverview'

interface Props {
  scriptUrl: string
  from: string
  to: string
  memberRole: 'member' | 'coordinator' | 'project_lead' | ''
}

export default function CoordinatorPage({ scriptUrl, from, to, memberRole }: Props) {
  const { teams, loading, recomputing, error, recompute } = useTeams(scriptUrl, from, to)
  const [allAvail, setAllAvail] = useState<AvailSlot[]>([])
  const [availLoading, setAvailLoading] = useState(false)
  const [availError, setAvailError] = useState<string | null>(null)

  const fetchAvail = useCallback(() => {
    if (!scriptUrl || !from || !to) return
    setAvailLoading(true)
    setAvailError(null)
    getAllAvailability(scriptUrl, from, to)
      .then((slots) => setAllAvail(slots.filter((s) => s.available)))
      .catch((e: unknown) => setAvailError(e instanceof Error ? e.message : 'Failed to load availability'))
      .finally(() => setAvailLoading(false))
  }, [scriptUrl, from, to])

  useEffect(() => { fetchAvail() }, [fetchAvail])

  const handleRecompute = useCallback(async () => {
    await recompute()
    fetchAvail()
  }, [recompute, fetchAvail])

  const isLoading = loading || availLoading

  const dateMap = new Map<string, typeof teams>()
  for (const t of teams) {
    if (!dateMap.has(t.date)) dateMap.set(t.date, [])
    dateMap.get(t.date)!.push(t)
  }

  const availDates = new Set(allAvail.map((s) => s.date))
  const allDates = Array.from(new Set([...dateMap.keys(), ...availDates])).sort()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Team Assignments</h2>
        {memberRole === 'project_lead' && (
          <button
            onClick={handleRecompute}
            disabled={recomputing || isLoading}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {recomputing ? 'Recomputing…' : 'Recompute Teams'}
          </button>
        )}
      </div>

      {(error || availError) && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-600">
          {error || availError}
        </div>
      )}

      {isLoading && (
        <div className="text-center py-16 text-gray-400">Loading team assignments…</div>
      )}

      {!isLoading && allDates.length === 0 && !error && !availError && (
        <div className="text-center py-12 text-gray-400">
          <p className="mb-3">No availability or team assignments yet.</p>
          {memberRole === 'project_lead'
            ? <p className="text-sm">Once members submit availability, click <strong>Recompute Teams</strong> to generate them.</p>
            : <p className="text-sm">Ask your project lead to run <strong>Recompute Teams</strong> once availability has been submitted.</p>
          }
        </div>
      )}

      {!isLoading && allDates.map((date) => (
        <DayOverview
          key={date}
          date={date}
          teams={dateMap.get(date) ?? []}
          allAvailability={allAvail}
          memberRole={memberRole}
          scriptUrl={scriptUrl}
        />
      ))}
    </div>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { getTeams, recomputeTeams } from '../api/gasClient'
import { TeamAssignment } from '../types'

export function useTeams(scriptUrl: string, from: string, to: string) {
  const [teams, setTeams] = useState<TeamAssignment[]>([])
  const [loading, setLoading] = useState(false)
  const [recomputing, setRecomputing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTeams = useCallback(async () => {
    if (!scriptUrl || !from || !to) return
    setLoading(true)
    setError(null)
    try {
      const data = await getTeams(scriptUrl, from, to)
      setTeams(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load teams')
    } finally {
      setLoading(false)
    }
  }, [scriptUrl, from, to])

  useEffect(() => {
    fetchTeams()
  }, [fetchTeams])

  const recompute = useCallback(async () => {
    setRecomputing(true)
    setError(null)
    try {
      await recomputeTeams(scriptUrl, from, to)
      await fetchTeams()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Recompute failed')
    } finally {
      setRecomputing(false)
    }
  }, [scriptUrl, from, to, fetchTeams])

  return { teams, loading, recomputing, error, recompute }
}
